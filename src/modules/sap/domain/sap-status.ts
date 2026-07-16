export const SAP_ESTADOS = [
  'RECIBIDO SAP',
  'VALIDADO',
  'EN LOTE',
  'GUARDADO SAP',
  'PENDIENTE ENTREGA',
  'ENTREGADO SAP',
] as const;

export type SapEstado = (typeof SAP_ESTADOS)[number];

export const SAP_ACCIONES = [
  'RECEPCIONADO',
  'VALIDADO',
  'AGREGADO AL LOTE',
  'GUARDADO SAP',
  'DESPACHADO',
  'ENTREGADO SAP',
] as const;

export type SapAccion = (typeof SAP_ACCIONES)[number];

export const SAP_RAZONES_NO_ORDERRY = [
  'Recepción Manual',
  'Equipo recibido directo del cliente',
  'Equipo antiguo',
  'Migración',
  'Carga histórica',
  'Error de sincronización',
  'Otro',
] as const;

export type SapRazonNoOrderry = (typeof SAP_RAZONES_NO_ORDERRY)[number];

export function isSapEstado(value: string): value is SapEstado {
  return (SAP_ESTADOS as readonly string[]).includes(value);
}
