import type { SapRazonNoOrderry } from '@/modules/sap/domain/sap-status';
import type { OrderryValidationDto } from '@/modules/sap/application/dtos';

export type SapBatchItem = {
  agencia: string;
  imeiFisico: string;
  noDocumento: string;
  marca: string;
  modelo: string;
  notaEntrega: string;
  comentario: string;
  material: string;
  fechaAceptacion: string;
  numeroTraslado: string;
  razonNoOrderry?: SapRazonNoOrderry | string;
  observacionesNoOrderry?: string;
  orderId?: number | null;
  cliente?: string;
  orderryStatus?: string;
  foundInOrderry: boolean;
};

export type SapLotFormDefaults = {
  material: string;
  fechaAceptacion: string;
  numeroTraslado: string;
  notaEntrega: string;
};

export type OrderryLookupState = {
  loading: boolean;
  result: OrderryValidationDto | null;
  error: string;
};

export type DispatchFormData = {
  fechaEntrega: string;
  conduce: string;
  transportista: string;
  recibidoPor: string;
  observaciones: string;
};

export type ReasonModalData = {
  imei: string;
  razon: SapRazonNoOrderry | '';
  observaciones: string;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const emptyLotDefaults = (): SapLotFormDefaults => ({
  material: '',
  fechaAceptacion: todayIso(),
  numeroTraslado: '',
  notaEntrega: '',
});
