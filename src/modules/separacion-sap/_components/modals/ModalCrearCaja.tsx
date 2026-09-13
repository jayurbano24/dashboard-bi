'use client';

import { useEffect, useState } from 'react';
import { Building2, X } from 'lucide-react';
import { useSeparacionSap } from '../../application/context';
import { ALMACENES_DISPONIBLES, CENTROS_AUTORIZADOS } from '../../domain/shared/constants';
import { crearCajaSeparacionSap, fetchCentrosSap } from '../../infrastructure/cajas/cajas-api';
import { CentroBadge } from '../badges';

type ModalCrearCajaProps = {
  onClose: () => void;
  onCreated?: (cajaId: string) => void;
};

export function ModalCrearCaja({ onClose, onCreated }: ModalCrearCajaProps) {
  const { dispatch } = useSeparacionSap();
  const [centros, setCentros] = useState<string[]>([...CENTROS_AUTORIZADOS]);
  const [centro, setCentro] = useState<string>(CENTROS_AUTORIZADOS[0]);
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    void fetchCentrosSap()
      .then((res) => {
        if (res.centros.length > 0) {
          setCentros(res.centros);
          setCentro((prev) => (res.centros.includes(prev) ? prev : res.centros[0]));
        }
      })
      .catch(() => {
        /* fallback a CENTROS_AUTORIZADOS */
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorLocal(null);

    try {
      setGuardando(true);
      const result = await crearCajaSeparacionSap({
        centro,
        almacen: ALMACENES_DISPONIBLES[0],
        subgrupos: [],
      });
      dispatch({ type: 'AGREGAR_CAJA', payload: { caja: result.caja } });
      onCreated?.(result.caja.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la caja.';
      setErrorLocal(message);
      dispatch({ type: 'SET_ERROR_GLOBAL', payload: message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nueva Caja de Transporte</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Seleccione el centro SAP. Los Sub-Grupos se crearán al pistoleo.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4 text-xs">
          {errorLocal && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">{errorLocal}</div>
          )}

          <div>
            <label htmlFor="centro-caja" className="block text-[11px] font-bold uppercase text-slate-600 mb-2">
              <Building2 className="w-3.5 h-3.5 inline mr-1" />
              Centro SAP
            </label>
            <div className="grid grid-cols-3 gap-2">
              {centros.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCentro(c)}
                  className={`py-3 rounded-lg border-2 font-mono font-bold text-sm transition-colors ${
                    centro === c
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Centro seleccionado: <CentroBadge centro={centro} />
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!centro || guardando}
              className="px-4 py-2 font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50"
            >
              {guardando ? 'Creando…' : 'Abrir Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
