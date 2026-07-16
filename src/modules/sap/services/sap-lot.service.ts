import { FechaAceptacion, Imei, MaterialSap, NumeroTraslado } from '../domain/value-objects';
import type { ISapAuditRepository, ISapEquipmentRepository, ISapLotRepository } from '../infrastructure/repositories/interfaces';
import type { SaveSapLotCommand, SapBatchItemDto } from '../application/dtos';
import { SAPHistoryService } from './sap-history.service';

export class SAPLotService {
  constructor(
    private readonly lotRepo: ISapLotRepository,
    private readonly equipmentRepo: ISapEquipmentRepository,
    private readonly historyService: SAPHistoryService,
    private readonly auditRepo: ISapAuditRepository,
  ) {}

  validateBatchItem(item: SapBatchItemDto, batchImeis: string[]): string | null {
    const imeiResult = Imei.create(item.imeiFisico);
    if (!imeiResult.ok) return imeiResult.error;

    const materialResult = MaterialSap.create(item.material);
    if (!materialResult.ok) return materialResult.error;

    const fechaResult = FechaAceptacion.create(item.fechaAceptacion);
    if (!fechaResult.ok) return fechaResult.error;

    if (item.numeroTraslado) {
      const trasladoResult = NumeroTraslado.create(item.numeroTraslado);
      if (!trasladoResult.ok) return trasladoResult.error;
    }

    if (!item.agencia?.trim()) return 'Agencia es obligatoria.';
    if (!item.marca?.trim() || !item.modelo?.trim()) return 'Marca y modelo son obligatorios.';

    if (batchImeis.includes(imeiResult.imei.value)) {
      return 'IMEI duplicado en el lote.';
    }

    if (!item.foundInOrderry) {
      if (!item.razonNoOrderry?.trim()) return 'Debe indicar la razón cuando el equipo no existe en Orderry.';
      if (item.razonNoOrderry === 'Otro' && !item.observacionesNoOrderry?.trim()) {
        return 'Observaciones obligatorias cuando la razón es "Otro".';
      }
    }

    return null;
  }

  async saveLot(command: SaveSapLotCommand) {
    const materialResult = MaterialSap.create(command.material);
    if (!materialResult.ok) throw new Error(materialResult.error);

    const fechaResult = FechaAceptacion.create(command.fechaAceptacion);
    if (!fechaResult.ok) throw new Error(fechaResult.error);

    if (command.numeroTraslado) {
      const trasladoResult = NumeroTraslado.create(command.numeroTraslado);
      if (!trasladoResult.ok) throw new Error(trasladoResult.error);
    }

    if (!command.equipos.length) throw new Error('El lote debe contener al menos un equipo.');

    const seen = new Set<string>();
    for (const item of command.equipos) {
      const err = this.validateBatchItem(item, [...seen]);
      if (err) throw new Error(err);
      const parsed = Imei.create(item.imeiFisico);
      if (parsed.ok) seen.add(parsed.imei.value);
    }

    const imeis = command.equipos.map((e) => e.imeiFisico.trim());
    const existing = await this.equipmentRepo.findByImeis(imeis);
    if (existing.length) {
      throw new Error(`IMEI(s) ya registrados en SAP: ${existing.map((e) => e.imeiFisico).join(', ')}`);
    }

    const lote = await this.lotRepo.create({
      material: materialResult.material.value,
      fechaAceptacion: fechaResult.fecha.value,
      numeroTraslado: command.numeroTraslado?.trim() ?? '',
      notaEntrega: command.notaEntrega?.trim() ?? '',
      usuario: command.usuario,
      estado: 'GUARDADO SAP',
    });

    const equipos = await this.equipmentRepo.insertBatch(lote.id, command.equipos, {
      material: materialResult.material.value,
      fechaAceptacion: fechaResult.fecha.value,
      numeroTraslado: command.numeroTraslado?.trim() ?? '',
      notaEntrega: command.notaEntrega?.trim() ?? '',
      usuario: command.usuario,
    });

    await this.historyService.recordMany(
      command.equipos.flatMap((item) => {
        const eq = equipos.find((e) => e.imeiFisico === item.imeiFisico.trim());
        if (!eq) return [];
        return [
          {
            equipoId: eq.id,
            loteId: lote.id,
            imei: eq.imeiFisico,
            accion: 'AGREGADO AL LOTE',
            estadoAnterior: null,
            estadoNuevo: 'EN LOTE',
            usuario: command.usuario,
            ip: command.ip,
          },
          {
            equipoId: eq.id,
            loteId: lote.id,
            imei: eq.imeiFisico,
            accion: item.foundInOrderry ? 'VALIDADO' : 'RECEPCIONADO',
            estadoAnterior: 'EN LOTE',
            estadoNuevo: item.foundInOrderry ? 'VALIDADO' : 'RECIBIDO SAP',
            usuario: command.usuario,
            ip: command.ip,
          },
          {
            equipoId: eq.id,
            loteId: lote.id,
            imei: eq.imeiFisico,
            accion: 'GUARDADO SAP',
            estadoAnterior: item.foundInOrderry ? 'VALIDADO' : 'RECIBIDO SAP',
            estadoNuevo: 'GUARDADO SAP',
            usuario: command.usuario,
            ip: command.ip,
          },
        ];
      }),
    );

    for (const eq of equipos) {
      await this.auditRepo.log({
        usuario: command.usuario,
        ip: command.ip,
        accion: 'GUARDADO SAP',
        imei: eq.imeiFisico,
        despues: eq,
      });
    }

    return { lote, equipos, count: equipos.length };
  }
}
