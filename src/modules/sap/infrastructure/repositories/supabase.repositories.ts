import {
  appendSapHistory,
  deleteSapEquipo,
  findSapEquiposByImeis,
  getSapEquiposV2,
  getSapHistoryByImei,
  getSapHistoryByLote,
  getSapLoteById,
  insertSapEquiposV2,
  insertSapLote,
  listSapLotes,
  logSapAudit,
  updateSapEquiposDispatch,
  updateSapLoteDispatch,
} from '@/lib/supabase-store';
import type { DispatchSapLotCommand, SapBatchItemDto } from '../../application/dtos';
import type {
  ISapAuditRepository,
  ISapEquipmentRepository,
  ISapHistoryRepository,
  ISapLotRepository,
} from './interfaces';

export class SupabaseSapEquipmentRepository implements ISapEquipmentRepository {
  findByImeis(imeis: string[]) {
    return findSapEquiposByImeis(imeis);
  }

  insertBatch(
    loteId: string,
    equipos: SapBatchItemDto[],
    meta: { material: string; fechaAceptacion: string; numeroTraslado: string; notaEntrega: string; usuario: string },
  ) {
    return insertSapEquiposV2(loteId, equipos, meta);
  }

  updateDispatchByLote(loteId: string, payload: Parameters<typeof updateSapEquiposDispatch>[1]) {
    return updateSapEquiposDispatch(loteId, payload);
  }

  list(filters?: Parameters<typeof getSapEquiposV2>[0]) {
    return getSapEquiposV2(filters);
  }

  deleteById(id: string) {
    return deleteSapEquipo(id).then(() => undefined);
  }
}

export class SupabaseSapLotRepository implements ISapLotRepository {
  create(meta: Parameters<typeof insertSapLote>[0]) {
    return insertSapLote(meta);
  }

  findById(id: string) {
    return getSapLoteById(id);
  }

  updateDispatch(id: string, payload: DispatchSapLotCommand) {
    return updateSapLoteDispatch(id, payload);
  }

  list(filters?: Parameters<typeof listSapLotes>[0]) {
    return listSapLotes(filters);
  }
}

export class SupabaseSapHistoryRepository implements ISapHistoryRepository {
  append(entries: Parameters<typeof appendSapHistory>[0]) {
    return appendSapHistory(entries);
  }

  listByImei(imei: string) {
    return getSapHistoryByImei(imei);
  }

  listByLote(loteId: string) {
    return getSapHistoryByLote(loteId);
  }
}

export class SupabaseSapAuditRepository implements ISapAuditRepository {
  log(entry: Parameters<typeof logSapAudit>[0]) {
    return logSapAudit(entry);
  }
}
