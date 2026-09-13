import type { CajaEntidad, SeparacionSapState } from '../../types';

export type CajasAction =
  | { type: 'SET_CAJAS_CARGANDO'; payload: boolean }
  | { type: 'HYDRATE_CAJAS_DESDE_SUPABASE'; payload: { cajas: CajaEntidad[]; secuenciaCaja: number } }
  | { type: 'AGREGAR_CAJA'; payload: { caja: CajaEntidad } }
  | { type: 'ELIMINAR_CAJA'; payload: { cajaId: string; numeroCaja: string } }
  | { type: 'ACTUALIZAR_CAJA'; payload: { caja: CajaEntidad; notificacion?: string } }
  | { type: 'REGISTRAR_CAPTURA'; payload: { caja: CajaEntidad } }
  | { type: 'CERRAR_CAJA'; payload: { caja: CajaEntidad } }
  | { type: 'SET_UBICACION_TARIMA'; payload: { caja: CajaEntidad } }
  | { type: 'DESPACHAR_CAJA'; payload: { caja: CajaEntidad } };

export function reduceCajas(state: SeparacionSapState, action: CajasAction): SeparacionSapState | null {
  switch (action.type) {
    case 'SET_CAJAS_CARGANDO':
      return { ...state, cajasCargando: action.payload };
    case 'HYDRATE_CAJAS_DESDE_SUPABASE':
      return {
        ...state,
        cajas: action.payload.cajas,
        secuenciaCaja: action.payload.secuenciaCaja,
        cajasCargando: false,
      };
    case 'AGREGAR_CAJA':
      return {
        ...state,
        cajas: [action.payload.caja, ...state.cajas.filter((c) => c.id !== action.payload.caja.id)],
        notificacionExito:
          action.payload.caja.subgrupos.length > 0
            ? `Caja ${action.payload.caja.numeroCaja} creada (${action.payload.caja.subgrupos.length} Sub-Grupo${action.payload.caja.subgrupos.length > 1 ? 's' : ''}).`
            : `Caja ${action.payload.caja.numeroCaja} abierta en ${action.payload.caja.centro}. Cree Sub-Grupos al pistoleo.`,
      };
    case 'ELIMINAR_CAJA':
      return {
        ...state,
        cajas: state.cajas.filter((c) => c.id !== action.payload.cajaId),
        notificacionExito: `Caja ${action.payload.numeroCaja} eliminada.`,
      };
    case 'ACTUALIZAR_CAJA':
      return {
        ...state,
        cajas: state.cajas.map((c) => (c.id === action.payload.caja.id ? action.payload.caja : c)),
        notificacionExito: action.payload.notificacion ?? state.notificacionExito,
      };
    case 'REGISTRAR_CAPTURA':
      return {
        ...state,
        cajas: state.cajas.map((c) => (c.id === action.payload.caja.id ? action.payload.caja : c)),
        notificacionExito: 'Serie capturada exitosamente.',
      };
    case 'CERRAR_CAJA':
      return {
        ...state,
        cajas: state.cajas.map((c) => (c.id === action.payload.caja.id ? action.payload.caja : c)),
        notificacionExito: `Caja ${action.payload.caja.numeroCaja} sellada y cerrada exitosamente.`,
      };
    case 'SET_UBICACION_TARIMA':
      return {
        ...state,
        cajas: state.cajas.map((c) => (c.id === action.payload.caja.id ? action.payload.caja : c)),
        notificacionExito: 'Ubicación y tarima actualizadas.',
      };
    case 'DESPACHAR_CAJA':
      return {
        ...state,
        cajas: state.cajas.map((c) => (c.id === action.payload.caja.id ? action.payload.caja : c)),
        notificacionExito: 'Caja despachada al transporte.',
      };
    default:
      return null;
  }
}
