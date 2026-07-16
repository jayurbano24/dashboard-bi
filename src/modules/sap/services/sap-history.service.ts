import type { ISapHistoryRepository } from '../infrastructure/repositories/interfaces';
import type { SapAccion } from '../domain/sap-status';

export class SAPHistoryService {
  constructor(private readonly historyRepo: ISapHistoryRepository) {}

  async record(params: {
    equipoId?: string | null;
    loteId?: string | null;
    imei: string;
    accion: SapAccion | string;
    estadoAnterior?: string | null;
    estadoNuevo?: string | null;
    usuario: string;
    ip: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.historyRepo.append([
      {
        equipoId: params.equipoId ?? null,
        loteId: params.loteId ?? null,
        imei: params.imei,
        accion: params.accion,
        estadoAnterior: params.estadoAnterior ?? null,
        estadoNuevo: params.estadoNuevo ?? null,
        usuario: params.usuario,
        ip: params.ip,
      },
    ]);
  }

  async recordMany(entries: Array<Parameters<SAPHistoryService['record']>[0]>): Promise<void> {
    await this.historyRepo.append(
      entries.map((e) => ({
        equipoId: e.equipoId ?? null,
        loteId: e.loteId ?? null,
        imei: e.imei,
        accion: e.accion,
        estadoAnterior: e.estadoAnterior ?? null,
        estadoNuevo: e.estadoNuevo ?? null,
        usuario: e.usuario,
        ip: e.ip,
      })),
    );
  }

  listByImei(imei: string) {
    return this.historyRepo.listByImei(imei);
  }

  listByLote(loteId: string) {
    return this.historyRepo.listByLote(loteId);
  }
}
