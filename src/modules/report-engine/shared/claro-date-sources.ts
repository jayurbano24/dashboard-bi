import { normalizeEstadoLabel } from '@/lib/historial-estado-normalize';
import { resolveStatusDateColumnLabel } from './historial-status-columns';

/** Mapeo historial → columnas Claro Mensual (estados exactos vía aggregateHistorialStatusDates). */
export const CLARO_HISTORIAL_DATE_KEYS = {
  envioTiendaCac: 'Fecha En Tránsito a CSA',
  reparacionCsa: 'Fecha En Reparación',
  envioCac: 'Fecha Para Devolución',
  grupoGanado: 'Fecha Grupo Ganado',
  devolver: 'Fecha Devolver',
} as const;

export const CLARO_GRUPO_GANADO_LABEL = CLARO_HISTORIAL_DATE_KEYS.grupoGanado;
export const CLARO_GRUPO_ENTREGA_LABEL = CLARO_HISTORIAL_DATE_KEYS.devolver;

/**
 * Grupo Orderry "Entrega" — única fuente de Fecha Envío CAC.
 * PARA DEVOLUCIÓN, PARA DEVOLUCIÓN AL CAC, PARA DEVOLUCIÓN NOTA DE CRÉDITO,
 * PARA DEVOLUCIÓN LIFE ONE, DEVOLUCION CAMBIO EN AGENCIA, PARA DEVOLVER A BODEGA/SAP.
 */
export const CLARO_ENVIO_CAC_STATUS_IDS = [1297296, 1300762, 1311208, 1314652, 1322780, 1359544] as const;

/** Etapas del grupo Entrega (primera fecha gana). */
export const CLARO_ENVIO_CAC_HISTORIAL_LABELS = [
  CLARO_HISTORIAL_DATE_KEYS.envioCac,
  'Fecha Para Devolución al CAC',
  'Fecha Devolución Cambio en Agencia',
  'Fecha Para Devolución Nota Crédito',
  'Fecha Para Devolución Life-One',
  'Fecha Para Devolver a Bodega SAP',
] as const;

/** Primera llegada / ingreso al taller (no duplicar folio si el historial existe). */
export const CLARO_RECEPCION_TALLER_HISTORIAL_LABELS = [
  CLARO_HISTORIAL_DATE_KEYS.envioTiendaCac,
  'Fecha Validación SAP',
  'Fecha Pre-Diagnóstico',
  'Fecha En Diagnóstico',
] as const;

export const CLARO_FOLIO_CREACION_HISTORIAL_LABELS = ['Fecha Orden Creada'] as const;

export const CLARO_REPARACION_CSA_HISTORIAL_LABELS = [
  CLARO_HISTORIAL_DATE_KEYS.reparacionCsa,
  'Fecha En Control de Calidad',
  'Fecha Reemplazo Tarjeta / CU',
] as const;

export const CLARO_ENTREGA_CAC_HISTORIAL_LABELS = [
  'Fecha Entregado',
  'Fecha Entregado Cambio en Agencia',
  'Fecha Entregado Nota de Crédito',
  'Fecha Entregado Life-One',
  'Fecha Salida Definitiva Life-One',
  'Fecha Salida Defectuoso DTI',
  'Fecha Salida Definitivo B+D',
] as const;

export function pickEarliestHistorialDate(
  hist: Record<string, string>,
  labels: readonly string[],
): string {
  let min: string | null = null;
  for (const label of labels) {
    const fecha = hist[label];
    if (!fecha) continue;
    if (!min || new Date(fecha).getTime() < new Date(min).getTime()) {
      min = fecha;
    }
  }
  return min ?? '';
}

export function isClaroEnvioCacEstado(estado: string | null | undefined): boolean {
  const norm = normalizeEstadoLabel(estado);
  if (norm.startsWith('PARA DEVOLUCION') || norm.startsWith('PARA DEVOLVER')) return true;
  if (norm.startsWith('PARA ENTREGAR')) return true;
  if (norm === 'DEVOLUCION CAMBIO EN AGENCIA' || norm.startsWith('DEVOLUCION CAMBIO')) return true;
  return false;
}

type ClaroDateRowLike = {
  estado?: string | null;
  status_id?: number | null;
  done_at?: string | null;
  fecha_reparacion?: string | null;
  closed_at?: string | null;
};

type HistorialRowLike = {
  fecha_hora_cambio: string;
  grupo_nuevo?: string | null;
  estado_nuevo?: string | null;
  status_id_nuevo?: number | null;
};

function aggregateGrupoDate(rows: HistorialRowLike[], grupoObjetivo: string): string {
  const target = grupoObjetivo.trim().toLowerCase();
  let min: string | null = null;
  for (const row of rows) {
    const grupo = String(row.grupo_nuevo ?? '')
      .trim()
      .toLowerCase();
    if (grupo !== target) continue;
    const fecha = row.fecha_hora_cambio;
    if (!fecha) continue;
    if (!min || new Date(fecha).getTime() < new Date(min).getTime()) {
      min = fecha;
    }
  }
  return min ?? '';
}

/** Primera fecha en que la orden entró al grupo Orderry "Ganado". */
export function aggregateGrupoGanadoDate(rows: HistorialRowLike[]): string {
  return aggregateGrupoDate(rows, 'ganado');
}

function isEntregaGroupStatusId(statusId: number | null | undefined): boolean {
  const id = Number(statusId);
  return (CLARO_ENVIO_CAC_STATUS_IDS as readonly number[]).includes(id);
}

/**
 * Primera fecha del flujo Entrega (grupo Orderry "Entrega" o sus 6 estados).
 * No usar grupo Ganado: Entrega ocurre antes que Ganado en el ciclo de vida.
 */
export function aggregateGrupoEntregaDate(rows: HistorialRowLike[]): string {
  const fromGrupo = aggregateGrupoDate(rows, 'entrega');
  if (fromGrupo) return fromGrupo;

  let min: string | null = null;
  for (const row of rows) {
    const inGroup = isEntregaGroupStatusId(row.status_id_nuevo) || isClaroEnvioCacEstado(row.estado_nuevo);
    if (!inGroup) continue;
    const fecha = row.fecha_hora_cambio;
    if (!fecha) continue;
    if (!min || new Date(fecha).getTime() < new Date(min).getTime()) {
      min = fecha;
    }
  }
  return min ?? '';
}

/** Devolver (grupo Entrega): solo historial Entrega/devolución — nunca grupo Ganado. */
export function resolveClaroDevolverDate(
  row: ClaroDateRowLike,
  hist: Record<string, string>,
): string | null {
  const fromGrupo = hist[CLARO_GRUPO_ENTREGA_LABEL];
  if (fromGrupo) return fromGrupo;

  if (!isClaroEnvioCacEstado(row.estado)) return null;

  const fromHist = pickEarliestHistorialDate(hist, CLARO_ENVIO_CAC_HISTORIAL_LABELS);
  if (fromHist) return fromHist;

  const currentCol = resolveStatusDateColumnLabel(row.estado, row.status_id);
  if (currentCol && hist[currentCol]) return hist[currentCol];

  return row.done_at || null;
}

export function resolveClaroFolioCreacionDate(
  hist: Record<string, string>,
  createdAt: string | null | undefined,
): string | null {
  const fromHist = pickEarliestHistorialDate(hist, CLARO_FOLIO_CREACION_HISTORIAL_LABELS);
  if (fromHist) return fromHist;
  return createdAt?.trim() ? createdAt : null;
}

export function resolveClaroRecepcionTallerDate(
  hist: Record<string, string>,
  createdAt: string | null | undefined,
): string | null {
  const fromHist = pickEarliestHistorialDate(hist, CLARO_RECEPCION_TALLER_HISTORIAL_LABELS);
  if (fromHist) return fromHist;
  return createdAt?.trim() ? createdAt : null;
}

function sameDisplayedMinute(a: string, b: string): boolean {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return false;
  return Math.floor(da / 60000) === Math.floor(db / 60000);
}

export function resolveClaroReparacionCsaDate(
  hist: Record<string, string>,
  row: ClaroDateRowLike,
): string | null {
  const fromHist = pickEarliestHistorialDate(hist, CLARO_REPARACION_CSA_HISTORIAL_LABELS);
  if (fromHist) return fromHist;
  const done = row.done_at || row.fecha_reparacion;
  if (!done?.trim()) return null;
  const closed = row.closed_at?.trim();
  if (closed && sameDisplayedMinute(done, closed)) return null;
  return done;
}

function earliestDate(dates: Array<string | null | undefined>): string {
  let min: string | null = null;
  for (const fecha of dates) {
    if (!fecha?.trim()) continue;
    if (!min || new Date(fecha).getTime() < new Date(min).getTime()) min = fecha;
  }
  return min ?? '';
}

/** Entrega CAC: ENTREGADO (grupo Ganado). El grupo Entrega es Fecha Envío CAC. */
export function resolveClaroEntregaCacDate(
  hist: Record<string, string>,
  closedAt: string | null | undefined,
): string | null {
  const fromEntregado = pickEarliestHistorialDate(hist, CLARO_ENTREGA_CAC_HISTORIAL_LABELS);
  if (fromEntregado) return fromEntregado;
  return closedAt?.trim() ? closedAt : null;
}

export type OrderryTimelineHintsLike = {
  repairPartsAt?: string | null;
  firstWorkAt?: string | null;
};

/** Completa historial vacío con fechas inferidas de Orderry (items/works) — no sustituye eventos reales. */
export function mergeOrderryLiveHintsIntoHistorial(
  hist: Record<string, string>,
  hints: OrderryTimelineHintsLike | null | undefined,
): Record<string, string> {
  if (!hints) return hist;
  const out = { ...hist };
  const repairAt = hints.repairPartsAt || hints.firstWorkAt;
  if (repairAt) {
    if (!out['Fecha En Reparación']) out['Fecha En Reparación'] = repairAt;
    if (!out['Fecha Reemplazo Tarjeta / CU']) out['Fecha Reemplazo Tarjeta / CU'] = repairAt;
  }
  return out;
}

/** Fecha Envío CAC: primera entrada al grupo Entrega. Sin cierre ni reparación. */
export function resolveClaroEnvioCacDate(
  _row: ClaroDateRowLike,
  hist: Record<string, string>,
): string | null {
  const fromGrupo = hist[CLARO_GRUPO_ENTREGA_LABEL];
  const fromStatuses = pickEarliestHistorialDate(hist, CLARO_ENVIO_CAC_HISTORIAL_LABELS);
  const fromReady = earliestDate([fromGrupo, fromStatuses]);
  return fromReady || null;
}

/**
 * Nota de trazabilidad para las columnas de fecha del reporte Claro Mensual.
 */
export function buildClaroOrigenFechas(
  historialOrigen: string | undefined,
  stageDates: { transito: string; reparacion: string; entrega: string },
): string {
  const histFilled = [stageDates.transito, stageDates.reparacion, stageDates.entrega].filter(Boolean).length;
  const base = historialOrigen?.trim() || 'Sin historial — ejecute backfill o active webhook';
  const syncPart = 'Folio/recepción/reparación/entrega: historial Orderry; fallback sync (created_at, closed_at, done_at)';

  if (histFilled >= 3) {
    return `${syncPart} · ${base} — historial ${histFilled}/3+ (tránsito, reparación, entrega)`;
  }
  if (histFilled >= 1) {
    return `${syncPart} · ${base} — historial parcial ${histFilled}/3`;
  }
  return `${syncPart} · ${base} — historial 0/3 (solo sync; fechas pueden coincidir)`;
}
