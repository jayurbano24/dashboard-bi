/** Plantilla reporte PRONET — columnas según mapeo Orderry acordado con cliente. */
export const REPORT_TEMPLATE_PRONET = 'PLANTILLA_PRONET' as const;

export const PRONET_REPORT_COLUMNS = [
  'Fecha de Ingreso',
  'Orden de servicio',
  'Numero de Guia',
  'IMEI',
  'Marca',
  'Modelo',
  'DNI',
  'Nombre del Cliente',
  'Población',
  'Sucursal',
  'Garantia Si/No',
  'Diagnostico',
  'Ingreso',
  'REPARACION',
  'Nuevo IMEI',
  'ESTATUS',
  'Teléfono del cliente',
] as const;

export type PronetReportColumn = (typeof PRONET_REPORT_COLUMNS)[number];

export type PronetReportRow = Record<PronetReportColumn, string>;

/** PRONET en Orderry = CANAL DE INGRESO «FUNDACION GENESIS» (f3129964). */
const DEFAULT_PRONET_MARKERS = [
  'FUNDACION GENESIS',
  'FUNDACIÓN GENESIS',
  'PRONET',
  'PRO NET',
  'PRO-NET',
] as const;

const PRONET_CANAL_FIELD_ID = 'f3129964';

/** Marcadores de canal/cliente. Override: PRONET_REPORT_MARKERS en .env.local */
export function getPronetMarkers(): string[] {
  const fromEnv = process.env.PRONET_REPORT_MARKERS?.split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;
  return [...DEFAULT_PRONET_MARKERS];
}

function matchesPronetMarker(value: unknown): boolean {
  const norm = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (!norm) return false;
  return getPronetMarkers().some((m) => norm.includes(m.replace(/\s+/g, ' ')));
}

/** Evalúa respuesta cruda de GET /v2/orders/{id} o listado Orderry. */
export function isPronetOrderFromOrderry(order: {
  client?: { name?: string; full_name?: string } | null;
  branch?: { name?: string } | null;
  custom_fields?: Record<string, unknown> | null;
  labels?: Array<{ name?: string } | string> | null;
}): boolean {
  const cf = order.custom_fields || {};
  const parts = [
    cf[PRONET_CANAL_FIELD_ID],
    cf['CANAL DE INGRESO'],
    cf['Canal de Ingreso'],
    order.client?.name,
    order.client?.full_name,
    order.branch?.name,
    ...(order.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
  ];
  return parts.some(matchesPronetMarker);
}

/** Órdenes del canal/cliente PRONET (CANAL DE INGRESO o nombre cliente). */
export function isPronetOrder(row: {
  cliente?: string | null;
  canalIngreso?: string | null;
  tipoIngreso?: string | null;
  retail?: string | null;
  dealer?: string | null;
  sucursal?: string | null;
  origen?: string | null;
  rawRecord?: unknown;
}): boolean {
  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  const parts = [
    row.cliente,
    row.canalIngreso,
    row.tipoIngreso,
    row.retail,
    row.dealer,
    row.sucursal,
    row.origen,
    raw['CANAL DE INGRESO'],
    raw['CANAL INGRESO'],
    raw.canalIngreso,
  ];

  return parts.some(matchesPronetMarker);
}
