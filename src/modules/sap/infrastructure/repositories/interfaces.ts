import type { DispatchSapLotCommand, SaveSapLotCommand, SapEquipoRecordDto, SapHistoryRecordDto, SapLotRecordDto } from '../application/dtos';

export interface ISapEquipmentRepository {
  findByImeis(imeis: string[]): Promise<SapEquipoRecordDto[]>;
  insertBatch(loteId: string, equipos: SaveSapLotCommand['equipos'], meta: {
    material: string;
    fechaAceptacion: string;
    numeroTraslado: string;
    notaEntrega: string;
    usuario: string;
  }): Promise<SapEquipoRecordDto[]>;
  updateDispatchByLote(loteId: string, payload: {
    fechaEntrega: string;
    conduce: string;
    transportista: string;
    recibidoPor: string;
    estado: string;
  }): Promise<SapEquipoRecordDto[]>;
  list(filters?: { startDate?: string; endDate?: string; searchTerm?: string; loteId?: string; estado?: string }): Promise<SapEquipoRecordDto[]>;
  deleteById(id: string): Promise<void>;
}

export interface ISapLotRepository {
  create(meta: {
    material: string;
    fechaAceptacion: string;
    numeroTraslado: string;
    notaEntrega: string;
    usuario: string;
    estado: string;
  }): Promise<SapLotRecordDto>;
  findById(id: string): Promise<SapLotRecordDto | null>;
  updateDispatch(id: string, payload: DispatchSapLotCommand): Promise<SapLotRecordDto>;
  list(filters?: { estado?: string }): Promise<SapLotRecordDto[]>;
}

export interface ISapHistoryRepository {
  append(entries: Array<Omit<SapHistoryRecordDto, 'id' | 'createdAt'>>): Promise<void>;
  listByImei(imei: string): Promise<SapHistoryRecordDto[]>;
  listByLote(loteId: string): Promise<SapHistoryRecordDto[]>;
}

export interface ISapAuditRepository {
  log(entry: {
    usuario: string;
    ip: string;
    accion: string;
    imei?: string;
    antes?: unknown;
    despues?: unknown;
  }): Promise<void>;
}
