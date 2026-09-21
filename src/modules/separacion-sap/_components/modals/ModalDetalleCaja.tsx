'use client';

import { useState } from 'react';
import { Boxes, Printer, Trash2, X } from 'lucide-react';
import { useSeparacionSap } from '../../application/context';
import { capturasPorSubgrupo, totalesCaja } from '../../domain/cajas/caja-utils';
import { TIPOS_PRODUCTO } from '../../domain/shared/constants';
import { eliminarSubgrupoCajaSeparacionSap } from '../../infrastructure/cajas/cajas-api';
import type { CajaEntidad } from '../../types';
import { CentroBadge, EstadoBadge, SubgrupoEstadoBadge } from '../badges';

type ModalDetalleCajaProps = {
  caja: CajaEntidad;
  onClose: () => void;
};

export function ModalDetalleCaja({ caja: cajaInicial, onClose }: ModalDetalleCajaProps) {
  const { state, dispatch } = useSeparacionSap();
  const caja = state.cajas.find((c) => c.id === cajaInicial.id) ?? cajaInicial;
  const [eliminandoSubgrupoId, setEliminandoSubgrupoId] = useState<string | null>(null);

  const { cantidadEsperada, cantidadCapturada } = totalesCaja(caja);
  const pct = cantidadEsperada > 0 ? Math.round((cantidadCapturada / cantidadEsperada) * 100) : 0;
  const abierta = caja.estado === 'ABIERTA';

  function imprimirDetalle() {
    if (typeof window !== 'undefined') window.print();
  }

  async function handleEliminarSubgrupo(subgrupoId: string, materialCodigo: string, capturadas: number) {
    const mensaje =
      capturadas > 0
        ? `¿Eliminar sub-grupo ${materialCodigo} y sus ${capturadas} captura(s)? Las series quedarán libres.`
        : `¿Eliminar sub-grupo ${materialCodigo}?`;
    if (!window.confirm(mensaje)) return;

    setEliminandoSubgrupoId(subgrupoId);
    try {
      const { caja: cajaActualizada } = await eliminarSubgrupoCajaSeparacionSap(caja.id, subgrupoId);
      dispatch({
        type: 'ACTUALIZAR_CAJA',
        payload: { caja: cajaActualizada, notificacion: `Sub-Grupo ${materialCodigo} eliminado.` },
      });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR_GLOBAL',
        payload: err instanceof Error ? err.message : 'No se pudo eliminar el sub-grupo.',
      });
    } finally {
      setEliminandoSubgrupoId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-mono text-slate-900">{caja.numeroCaja}</h3>
                <CentroBadge centro={caja.centro} />
                <EstadoBadge estado={caja.estado} />
              </div>
              <p className="text-xs text-slate-500">
                {caja.subgrupos.length} Sub-Grupo(s)
                {abierta ? ' · puede eliminar sub-grupos individualmente' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={imprimirDetalle}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-teal-800 font-semibold">Esperado</div>
              <div className="text-2xl font-black font-mono text-teal-900">{cantidadEsperada}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-emerald-800 font-semibold">Capturado</div>
              <div className="text-2xl font-black font-mono text-emerald-900">{cantidadCapturada}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-500 font-semibold">Avance</div>
              <div className="text-2xl font-black font-mono text-slate-800">{pct}%</div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider">Sub-Grupos</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Marca / Modelo</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-center">Progreso</th>
                    <th className="px-3 py-2">Estado</th>
                    {abierta && <th className="px-3 py-2 text-right">Acc.</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caja.subgrupos.length === 0 ? (
                    <tr>
                      <td colSpan={abierta ? 6 : 5} className="px-3 py-4 text-center text-slate-400 italic">
                        Sin sub-grupos
                      </td>
                    </tr>
                  ) : (
                    caja.subgrupos.map((sg) => {
                      const capturadas = capturasPorSubgrupo(caja, sg.id);
                      return (
                        <tr key={sg.id}>
                          <td className="px-3 py-2 font-medium">
                            {sg.marca} {sg.modelo}
                          </td>
                          <td className="px-3 py-2">{TIPOS_PRODUCTO[sg.tipoProducto]?.label}</td>
                          <td className="px-3 py-2 font-mono text-teal-800">
                            {sg.materialCodigo}
                            <span className="block text-[10px] text-slate-500 font-sans truncate max-w-[200px]">
                              {sg.materialTexto}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold">
                            {capturadas} / {sg.cantidadEsperada}
                          </td>
                          <td className="px-3 py-2">
                            <SubgrupoEstadoBadge estado={sg.estado} />
                          </td>
                          {abierta && (
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => void handleEliminarSubgrupo(sg.id, sg.materialCodigo, capturadas)}
                                disabled={eliminandoSubgrupoId === sg.id}
                                className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded disabled:opacity-50"
                                title="Eliminar sub-grupo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {caja.capturas.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">S-1</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caja.capturas.map((cap) => (
                    <tr key={cap.id}>
                      <td className="px-3 py-2 font-bold">{cap.normalizedSerial}</td>
                      <td className="px-3 py-2 text-teal-800">{cap.materialCodigo}</td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {new Date(cap.capturedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t flex justify-between text-xs text-slate-500">
          <span>
            Creada: {new Date(caja.creadaEn).toLocaleDateString()}
            {caja.createdBy ? ` · ${caja.createdBy}` : ''}
          </span>
          <button type="button" onClick={onClose} className="px-4 py-2 font-bold bg-slate-900 text-white rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
