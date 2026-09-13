import { extraerMaterialesDesdeBsdG945 } from '../../domain/inventario/materials';
import type { BsdEquipo, SeparacionSapState } from '../../types';

export type InventarioAction =
  | {
      type: 'CARGAR_BSD_Y_SINCRONIZAR_G945';
      payload: {
        equipos: BsdEquipo[];
        filename: string;
        cargadoEn?: string;
        persistidoSupabase?: boolean;
      };
    }
  | {
      type: 'HYDRATE_BSD_DESDE_SUPABASE';
      payload: { equipos: BsdEquipo[]; filename: string; cargadoEn: string };
    }
  | { type: 'SET_INVENTARIO_CARGANDO'; payload: boolean }
  | { type: 'RESINCRONIZAR_MATERIALES_SAP' };

export function reduceInventario(
  state: SeparacionSapState,
  action: InventarioAction,
): SeparacionSapState | null {
  switch (action.type) {
    case 'CARGAR_BSD_Y_SINCRONIZAR_G945': {
      const nuevaBsd = action.payload.equipos;
      const materiales = extraerMaterialesDesdeBsdG945(nuevaBsd);
      const persistido = action.payload.persistidoSupabase ? ' Guardado en Supabase.' : '';
      return {
        ...state,
        bsdEquipos: nuevaBsd,
        materialesSap: materiales,
        ultimaSincronizacionG945: new Date().toLocaleTimeString(),
        sapArchivoNombre: action.payload.filename,
        sapCargadoEn: action.payload.cargadoEn ?? new Date().toISOString(),
        inventarioCargando: false,
        errorGlobal: null,
        notificacionExito: `Inventario SAP cargado desde "${action.payload.filename}" (${nuevaBsd.length} series). Materiales G945 detectados: ${materiales.length}.${persistido}`,
      };
    }
    case 'HYDRATE_BSD_DESDE_SUPABASE': {
      const nuevaBsd = action.payload.equipos;
      if (nuevaBsd.length === 0) {
        return { ...state, inventarioCargando: false };
      }
      const materiales = extraerMaterialesDesdeBsdG945(nuevaBsd);
      return {
        ...state,
        bsdEquipos: nuevaBsd,
        materialesSap: materiales,
        ultimaSincronizacionG945: new Date().toLocaleTimeString(),
        sapArchivoNombre: action.payload.filename,
        sapCargadoEn: action.payload.cargadoEn,
        inventarioCargando: false,
      };
    }
    case 'SET_INVENTARIO_CARGANDO':
      return { ...state, inventarioCargando: action.payload };
    case 'RESINCRONIZAR_MATERIALES_SAP': {
      const materiales = extraerMaterialesDesdeBsdG945(state.bsdEquipos);
      return {
        ...state,
        materialesSap: materiales,
        ultimaSincronizacionG945: new Date().toLocaleTimeString(),
        notificacionExito: `Materiales SAP resincronizados desde BSD G945 (${materiales.length} materiales detectados).`,
      };
    }
    default:
      return null;
  }
}
