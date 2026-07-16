import type { DispatchSapLotCommand } from '../application/dtos';
import type { ISapAuditRepository, ISapEquipmentRepository, ISapLotRepository } from '../infrastructure/repositories/interfaces';
import { SAPHistoryService } from './sap-history.service';

export class SAPDispatchService {
  constructor(
    private readonly lotRepo: ISapLotRepository,
    private readonly equipmentRepo: ISapEquipmentRepository,
    private readonly historyService: SAPHistoryService,
    private readonly auditRepo: ISapAuditRepository,
  ) {}

  async dispatchLot(command: DispatchSapLotCommand) {
    if (!command.loteId?.trim()) throw new Error('Lote ID requerido.');
    if (!command.conduce?.trim()) throw new Error('Conduce es obligatorio para registrar salida.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(command.fechaEntrega)) {
      throw new Error('Fecha de entrega inválida.');
    }

    const lote = await this.lotRepo.findById(command.loteId);
    if (!lote) throw new Error('Lote SAP no encontrado.');
    if (lote.estado === 'ENTREGADO SAP') {
      throw new Error('Este lote ya fue despachado como ENTREGADO SAP.');
    }

    const equipos = await this.equipmentRepo.list({ loteId: command.loteId });
    if (!equipos.length) throw new Error('El lote no tiene equipos registrados.');

    const updatedEquipos = await this.equipmentRepo.updateDispatchByLote(command.loteId, {
      fechaEntrega: command.fechaEntrega,
      conduce: command.conduce.trim(),
      transportista: command.transportista?.trim() ?? '',
      recibidoPor: command.recibidoPor?.trim() ?? '',
      estado: 'ENTREGADO SAP',
    });

    const updatedLote = await this.lotRepo.updateDispatch(command.loteId, command);

    await this.historyService.recordMany(
      updatedEquipos.map((eq) => ({
        equipoId: eq.id,
        loteId: command.loteId,
        imei: eq.imeiFisico,
        accion: 'DESPACHADO',
        estadoAnterior: 'GUARDADO SAP',
        estadoNuevo: 'PENDIENTE ENTREGA',
        usuario: command.usuario,
        ip: command.ip,
      })),
    );

    await this.historyService.recordMany(
      updatedEquipos.map((eq) => ({
        equipoId: eq.id,
        loteId: command.loteId,
        imei: eq.imeiFisico,
        accion: 'ENTREGADO SAP',
        estadoAnterior: 'PENDIENTE ENTREGA',
        estadoNuevo: 'ENTREGADO SAP',
        usuario: command.usuario,
        ip: command.ip,
      })),
    );

    await this.auditRepo.log({
      usuario: command.usuario,
      ip: command.ip,
      accion: 'DESPACHADO',
      despues: { lote: updatedLote, equipos: updatedEquipos.length },
    });

    return { lote: updatedLote, equipos: updatedEquipos, count: updatedEquipos.length };
  }
}
