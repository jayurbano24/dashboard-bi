/** Plantilla reporte Servitotal — columnas según formato cliente. */
export const REPORT_TEMPLATE_SERVITOTAL = 'PLANTILLA_SERVITOTAL' as const;

export const SERVITOTAL_REPORT_COLUMNS = [
  'FECHA INGRESO',
  'ORDEN',
  'ESTADO',
  'CLIENTE',
  'PRODUCTO',
  'MARCA',
  'MODELO',
  'FOLIO',
  'Fecha para Devolver',
  'ENTREGADO',
  'REPARACION',
  'MAL FUNCIONAMIENTO',
] as const;

export type ServitotalReportColumn = (typeof SERVITOTAL_REPORT_COLUMNS)[number];

export type ServitotalReportRow = Record<ServitotalReportColumn, string>;

/** Cliente Orderry objetivo del reporte. */
export function isServitotalClient(cliente: string | null | undefined): boolean {
  return String(cliente ?? '')
    .trim()
    .toUpperCase()
    .includes('SERVITOTAL');
}
