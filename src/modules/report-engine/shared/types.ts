export interface RawOrderData {
  conduceId: string;
  orderId: number | null;
  orderName: string;
  fecha: string;
  created_at: string | null;
  closed_at: string | null;
  done_at: string | null;
  fecha_reparacion: string | null;
  fecha_entrega: string | null;
  operador: string;
  retail: string;
  dealer: string;
  sucursal: string;
  origen: string;
  canalIngreso: string;
  tipoIngreso: string;
  imei: string;
  serie: string;
  marca: string;
  marcaDispositivo: string;
  modelo: string;
  modeloDispositivo: string;
  modeloSap: string;
  falla: string;
  serviciosObras: string;
  garantia: string;
  tipo_orden: string;
  estado: string;
  cliente: string;
  telefono: string;
  motivoNoAplica: string;
  tecnico: string;
  numeroGuia: string;
  justificacionTiempo: string;
  fechaEnvioTienda: string;
  [key: string]: any; // Allow other fields from the legacy query
}

export interface ClaroReportRow {
  'Taller': string;
  'Oficina Ventas': string;
  'CAC o Canal': string;
  'Tipo Cliente': string;
  'Cliente': string;
  'Teléfono': string;
  'Fecha creación Folio': string;
  'Fecha envío por parte tienda CAC': string;
  'Fecha Recepción Taller CSA': string;
  'Fecha reparación CSA': string;
  'Fecha Envío CAC': string;
  'Fecha entrega CAC': string;
  'SLA': number | string;
  'GAM / NO GAM': string;
  'Folio': string;
  'IMEI': string;
  'Código SAP': string;
  'Fecha Activación': string;
  'Marca': string;
  'Modelo SAP': string;
  'Fecha Facturación': string;
  'Falla': string;
  'Garantía': string;
  'Motivo por que no aplica': string;
  'Usuario o Técnico': string;
  'No Guía envío CAC': string;
  'No Guía recibió Taller': string;
  'Falla reportada por Tienda': string;
  'Reparación realizada': string;
  'Estatus': string;
  'Justificación fuera SLA': string;
  'Tipos de Garantía': string;
  
  // KPI Internos
  'SLA Objetivo': number;
  'SLA Real': number;
  'Diferencia SLA': number | string;
  'Horas Excedidas': number | string;
  'Estado SLA': string;
  'Cumplimiento': string;
  'Tiempo Restante': number | string;
}

export interface ValidationLog {
  orderId: string;
  issues: string[];
}
