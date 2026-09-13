import type { ValoracionSubgrupo } from '../../types';

/** Palabras clave en status_sistema que indican equipo valorado en SAP. */
const PATRONES_VALORADO = [/VALOR/i, /VALID/i, /^VAL$/i, /APROB/i];

/** Palabras clave que indican explícitamente no valorado. */
const PATRONES_NO_VALORADO = [/NO\s*VALOR/i, /NOVAL/i, /SIN\s*VALOR/i];

/**
 * Infiere valoración desde el status del inventario SAP cargado.
 * TODO: confirmar mapeo exacto con el equipo de integración SAP cuando esté disponible.
 */
export function inferirValoracion(statusSistema: string): ValoracionSubgrupo {
  const status = (statusSistema || '').trim();
  if (!status) return 'PENDIENTE';

  if (PATRONES_NO_VALORADO.some((p) => p.test(status))) return 'NO_VALORADO';
  if (PATRONES_VALORADO.some((p) => p.test(status))) return 'VALORADO';

  // Status genérico de almacén (ej. ALMA) — tratar como no valorado hasta validación explícita
  return 'NO_VALORADO';
}

export function labelValoracion(valoracion: ValoracionSubgrupo | null): string {
  switch (valoracion) {
    case 'VALORADO':
      return 'Valorado';
    case 'NO_VALORADO':
      return 'No valorado';
    case 'PENDIENTE':
      return 'Pendiente';
    default:
      return '—';
  }
}
