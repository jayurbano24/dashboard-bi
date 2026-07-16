import type { SapAccion, SapEstado, SapRazonNoOrderry } from '../domain/sap-status';

export type OrderryValidationDto = {
  found: boolean;
  orderId?: number | null;
  marca: string;
  modelo: string;
  producto: string;
  rawStatus: string;
  estadoGanado: string;
  ordenNumero?: string;
  cliente?: string;
  canalIngreso?: string;
};

export type SapBatchItemDto = {
  agencia: string;
  imeiFisico: string;
  noDocumento?: string;
  marca: string;
  modelo: string;
  notaEntrega?: string;
  guia?: string;
  dia?: string;
  comentario?: string;
  material: string;
  fechaAceptacion: string;
  numeroTraslado?: string;
  razonNoOrderry?: SapRazonNoOrderry | string;
  observacionesNoOrderry?: string;
  orderId?: number | null;
  cliente?: string;
  orderryStatus?: string;
  foundInOrderry: boolean;
};

export type SaveSapLotCommand = {
  material: string;
  fechaAceptacion: string;
  numeroTraslado?: string;
  notaEntrega?: string;
  equipos: SapBatchItemDto[];
  usuario: string;
  ip: string;
};

export type DispatchSapLotCommand = {
  loteId: string;
  fechaEntrega: string;
  conduce: string;
  transportista?: string;
  recibidoPor?: string;
  observaciones?: string;
  usuario: string;
  ip: string;
};

export type SapEquipoRecordDto = {
  id: string;
  loteId: string | null;
  agencia: string;
  imeiFisico: string;
  noDocumento: string;
  marca: string;
  modelo: string;
  guia: string;
  notaEntrega: string;
  dia: string;
  comentario: string;
  material: string;
  fechaAceptacion: string;
  numeroTraslado: string;
  razonNoOrderry: string;
  observacionesNoOrderry: string;
  fechaEntrega: string | null;
  conduce: string;
  transportista: string;
  recibidoPor: string;
  estado: SapEstado | string;
  orderId: number | null;
  cliente: string;
  orderryStatus: string;
  usuarioRegistro: string;
  createdAt: string;
  updatedAt: string;
};

export type SapHistoryRecordDto = {
  id: string;
  equipoId: string | null;
  loteId: string | null;
  imei: string;
  accion: SapAccion | string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  usuario: string;
  ip: string;
  createdAt: string;
};

export type SapLotRecordDto = {
  id: string;
  material: string;
  fechaAceptacion: string;
  numeroTraslado: string;
  notaEntrega: string;
  estado: SapEstado | string;
  fechaEntrega: string | null;
  conduce: string;
  transportista: string;
  recibidoPor: string;
  observacionesDespacho: string;
  usuarioRegistro: string;
  createdAt: string;
  equiposCount?: number;
};
