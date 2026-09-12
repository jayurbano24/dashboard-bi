import { getHistorialStatusDateColumnLabels } from './historial-status-columns';

/** Columnas snapshot (datos de la orden) */
export type HistorialSnapshotColumns = {
  'Orden #': string;
  'Creado en': string;
  'Tipo de orden': string;
  'Estado actual': string;
  'Nombre del cliente': string;
  'Grupo de dispositivo': string;
  'Marca': string;
  'Modelo': string;
  'Número de serie': string;
  'IMEI': string;
  'Completado en': string;
  'Cerrado': string;
  'Servicios/Obras': string;
  'Mal funcionamiento': string;
  'Fecha de venta - POP': string;
  'Color': string;
  'PDV-TK': string;
  'Garantía': string;
  'Tipo de ingreso': string;
  'Canal de ingreso': string;
  'IN Courier': string;
  'Nota historial': string;
};

export type HistorialMovimientosReportRow = HistorialSnapshotColumns & Record<string, string>;

export const HISTORIAL_SNAPSHOT_COLUMN_KEYS: (keyof HistorialSnapshotColumns)[] = [
  'Orden #',
  'Creado en',
  'Tipo de orden',
  'Estado actual',
  'Nombre del cliente',
  'Grupo de dispositivo',
  'Marca',
  'Modelo',
  'Número de serie',
  'IMEI',
  'Completado en',
  'Cerrado',
  'Servicios/Obras',
  'Mal funcionamiento',
  'Fecha de venta - POP',
  'Color',
  'PDV-TK',
  'Garantía',
  'Tipo de ingreso',
  'Canal de ingreso',
  'IN Courier',
  'Nota historial',
];

export function getAllHistorialReportColumnLabels(): string[] {
  return [...HISTORIAL_SNAPSHOT_COLUMN_KEYS, ...getHistorialStatusDateColumnLabels()];
}
