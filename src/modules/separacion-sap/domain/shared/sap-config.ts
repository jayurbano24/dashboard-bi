import type { SapSerieNotFoundBehavior } from '../../types';

/**
 * Comportamiento cuando una serie no existe / no está validada en SAP.
 *
 * TODO (caso borde #1 — definir con negocio):
 * - BLOCK:   bloquear por completo (default)
 * - PENDING: permitir avanzar marcando sub-grupo como PENDIENTE_VALIDAR_SAP
 * - ALLOW:   permitir agregar sin marca de valoración
 *
 * Ajustar vía env `NEXT_PUBLIC_SAP_SERIE_NOT_FOUND_BEHAVIOR` sin tocar el flujo principal.
 */
const VALID_BEHAVIORS: SapSerieNotFoundBehavior[] = ['BLOCK', 'PENDING', 'ALLOW'];

function readBehavior(): SapSerieNotFoundBehavior {
  const raw = (process.env.NEXT_PUBLIC_SAP_SERIE_NOT_FOUND_BEHAVIOR ?? 'BLOCK').toUpperCase();
  if (VALID_BEHAVIORS.includes(raw as SapSerieNotFoundBehavior)) {
    return raw as SapSerieNotFoundBehavior;
  }
  return 'BLOCK';
}

export const SAP_SERIE_NOT_FOUND_BEHAVIOR: SapSerieNotFoundBehavior = readBehavior();

/**
 * TODO (caso borde #2): duplicado detectado después de cerrar sub-grupo/caja.
 * Por ahora no se permite editar cajas cerradas; corrección requiere proceso aparte.
 */
export const DUPLICADO_POST_CIERRE_EDITABLE = false;
