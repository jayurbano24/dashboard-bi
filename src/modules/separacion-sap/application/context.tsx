'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { createInitialSeparacionSapState } from './seeds';
import { separacionSapReducer, type SeparacionSapAction } from './reducer';
import { fetchCajasSeparacionSap } from '../infrastructure/cajas/cajas-api';
import { fetchInventarioSap } from '../infrastructure/inventario/inventario-api';
import type { SeparacionSapState } from '../types';

type SeparacionSapContextValue = {
  state: SeparacionSapState;
  dispatch: React.Dispatch<SeparacionSapAction>;
};

const SeparacionSapContext = createContext<SeparacionSapContextValue | null>(null);

export function SeparacionSapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(separacionSapReducer, undefined, createInitialSeparacionSapState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSupabase() {
      dispatch({ type: 'SET_INVENTARIO_CARGANDO', payload: true });
      try {
        dispatch({ type: 'SET_CAJAS_CARGANDO', payload: true });

        const [inventario, cajasResp] = await Promise.all([
          fetchInventarioSap(),
          fetchCajasSeparacionSap().catch(() => ({ ok: true as const, cajas: [], secuenciaCaja: 1 })),
        ]);
        if (cancelled) return;

        if (cajasResp.ok) {
          dispatch({
            type: 'HYDRATE_CAJAS_DESDE_SUPABASE',
            payload: { cajas: cajasResp.cajas, secuenciaCaja: cajasResp.secuenciaCaja },
          });
        } else {
          dispatch({ type: 'SET_CAJAS_CARGANDO', payload: false });
        }

        if (inventario.ok && inventario.equipos.length > 0) {
          dispatch({
            type: 'HYDRATE_BSD_DESDE_SUPABASE',
            payload: {
              equipos: inventario.equipos,
              filename: inventario.import?.filename ?? 'inventario-sap.xlsx',
              cargadoEn: inventario.import?.cargadoEn ?? new Date().toISOString(),
            },
          });
        } else {
          dispatch({ type: 'SET_INVENTARIO_CARGANDO', payload: false });
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: 'SET_INVENTARIO_CARGANDO', payload: false });
          dispatch({ type: 'SET_CAJAS_CARGANDO', payload: false });
          const message = err instanceof Error ? err.message : 'No se pudo cargar datos desde Supabase.';
          dispatch({ type: 'SET_ERROR_GLOBAL', payload: message });
        }
      }
    }

    void hydrateFromSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  return <SeparacionSapContext.Provider value={value}>{children}</SeparacionSapContext.Provider>;
}

export function useSeparacionSap() {
  const context = useContext(SeparacionSapContext);
  if (!context) {
    throw new Error('useSeparacionSap debe usarse dentro de SeparacionSapProvider');
  }
  return context;
}
