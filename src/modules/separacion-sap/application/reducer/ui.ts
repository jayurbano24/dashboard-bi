import type { SeparacionSapState } from '../../types';

export type UiAction =
  | { type: 'TOGGLE_SONIDO' }
  | { type: 'LIMPIAR_NOTIFICACION' }
  | { type: 'LIMPIAR_ERROR' }
  | { type: 'SET_ERROR_GLOBAL'; payload: string };

export function reduceUi(state: SeparacionSapState, action: UiAction): SeparacionSapState | null {
  switch (action.type) {
    case 'TOGGLE_SONIDO':
      return { ...state, sonidoHabilitado: !state.sonidoHabilitado };
    case 'LIMPIAR_NOTIFICACION':
      return { ...state, notificacionExito: null };
    case 'LIMPIAR_ERROR':
      return { ...state, errorGlobal: null };
    case 'SET_ERROR_GLOBAL':
      return { ...state, errorGlobal: action.payload, notificacionExito: null };
    default:
      return null;
  }
}
