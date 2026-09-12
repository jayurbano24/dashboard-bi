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

/** Etapas de devolución hacia CAC (primera fecha gana). */
export const CLARO_ENVIO_CAC_HISTORIAL_LABELS = [
  CLARO_HISTORIAL_DATE_KEYS.envioCac,
  'Fecha Para Devolución al CAC',
  'Fecha Devolución Cambio en Agencia',
  'Fecha Para Devolución Nota Crédito',
  'Fecha Para Devolución Life-One',
  'Fecha Para Devolver a Bodega SAP',
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
  if (norm.startsWith('PARA DEVOLUCION')) return true;
  if (norm === 'DEVOLUCION CAMBIO EN AGENCIA' || norm.startsWith('DEVOLUCION CAMBIO')) return true;
  return false;
}

type ClaroDateRowLike = {
  estado?: string | null;
  status_id?: number | null;
  done_at?: string | null;
  fecha_reparacion?: string | null;
};

type HistorialRowLike = {
  fecha_hora_cambio: string;
  grupo_nuevo?: string | null;
  estado_nuevo?: string | null;
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

/**
 * Primera fecha del flujo Entrega (grupo Orderry "Entrega" o estado PARA DEVOLUCIÓN*).
 * No usar grupo Ganado: Entrega ocurre antes que Ganado en el ciclo de vida.
 */
export function aggregateGrupoEntregaDate(rows: HistorialRowLike[]): string {
  const fromGrupo = aggregateGrupoDate(rows, 'entrega');
  if (fromGrupo) return fromGrupo;

  let min: string | null = null;
  for (const row of rows) {
    if (!isClaroEnvioCacEstado(row.estado_nuevo)) continue;
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

/**
 * Nota de trazabilidad para las 6 columnas de fecha del reporte.
 * Sync: created_at / closed_at. Historial: EN TRANSITO A CSA, EN REPARACION.
 * Fecha Envío CAC queda pendiente (sin fallback a payload).
 */
export function buildClaroOrigenFechas(
  historialOrigen: string | undefined,
  stageDates: { transito: string; reparacion: string },
): string {
  const histFilled = [stageDates.transito, stageDates.reparacion].filter(Boolean).length;
  const base = historialOrigen?.trim() || 'Sin historial — ejecute backfill o active webhook';
  const syncPart = 'Fechas folio/recepción/entrega: sync Orderry (created_at, closed_at)';

  if (histFilled === 2) {
    return `${syncPart} · ${base} — historial 2/2 (tránsito + reparación)`;
  }
  if (histFilled === 1) {
    return `${syncPart} · ${base} — historial 1/2 (falta tránsito o reparación)`;
  }
  return `${syncPart} · ${base} — historial 0/2; Envío CAC pendiente de definición`;
}
