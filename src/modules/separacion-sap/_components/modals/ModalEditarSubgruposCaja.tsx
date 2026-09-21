'use client';

import { useState } from 'react';
import { Layers, Loader2, Save, Trash2, X } from 'lucide-react';
import { useSeparacionSap } from '../../application/context';
import { capturasPorSubgrupo } from '../../domain/cajas/caja-utils';
import { TIPOS_PRODUCTO } from '../../domain/shared/constants';
import {
  actualizarSubgruposCajaSeparacionSap,
  eliminarSubgrupoCajaSeparacionSap,
} from '../../infrastructure/cajas/cajas-api';
import type { CajaEntidad } from '../../types';
import { CentroBadge, EstadoBadge, SubgrupoEstadoBadge } from '../badges';

type ModalEditarSubgruposCajaProps = {
  caja: CajaEntidad;
  onClose: () => void;
  /** Si true, solo muestra cantidades sin permitir guardar. */
  soloLectura?: boolean;
};

type FilaSubgrupo = {
  id: string;
  marca: string;
  modelo: string;
  tipoProducto: CajaEntidad['subgrupos'][number]['tipoProducto'];
  materialCodigo: string;
  materialTexto: string;
  cantidadEsperada: number;
  cantidadCapturada: number;
  longitudDigitos: number;
  esquemaSeries: CajaEntidad['subgrupos'][number]['esquemaSeries'];
  estado: CajaEntidad['subgrupos'][number]['estado'];
};

export function ModalEditarSubgruposCaja({ caja, onClose, soloLectura = false }: ModalEditarSubgruposCajaProps) {
  const { dispatch } = useSeparacionSap();
  const [filas, setFilas] = useState<FilaSubgrupo[]>(() =>
    caja.subgrupos.map((sg) => ({
      id: sg.id,
      marca: sg.marca,
      modelo: sg.modelo,
      tipoProducto: sg.tipoProducto,
      materialCodigo: sg.materialCodigo,
      materialTexto: sg.materialTexto,
      cantidadEsperada: sg.cantidadEsperada,
      cantidadCapturada: capturasPorSubgrupo(caja, sg.id),
      longitudDigitos: sg.longitudDigitos,
      esquemaSeries: sg.esquemaSeries,
      estado: sg.estado,
    })),
  );
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable = !soloLectura && caja.estado === 'ABIERTA';

  function actualizarCantidad(id: string, raw: string) {
    const parsed = Number.parseInt(raw, 10);
    setFilas((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, cantidadEsperada: Number.isFinite(parsed) && parsed > 0 ? parsed : f.cantidadEsperada } : f,
      ),
    );
  }

  async function handleEliminar(fila: FilaSubgrupo) {
    const mensaje =
      fila.cantidadCapturada > 0
        ? `¿Eliminar ${fila.materialCodigo} y sus ${fila.cantidadCapturada} captura(s)?`
        : `¿Eliminar sub-grupo ${fila.materialCodigo}?`;
    if (!window.confirm(mensaje)) return;

    setError(null);
    setEliminandoId(fila.id);
    try {
      const { caja: cajaActualizada } = await eliminarSubgrupoCajaSeparacionSap(caja.id, fila.id);
      dispatch({
        type: 'ACTUALIZAR_CAJA',
        payload: { caja: cajaActualizada, notificacion: `Sub-Grupo ${fila.materialCodigo} eliminado.` },
      });
      setFilas((prev) => prev.filter((f) => f.id !== fila.id));
      if (cajaActualizada.subgrupos.length === 0) onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    } finally {
      setEliminandoId(null);
    }
  }

  async function handleGuardar() {
    setError(null);
    for (const f of filas) {
      if (f.cantidadEsperada < f.cantidadCapturada) {
        setError(
          `${f.materialCodigo}: la cantidad no puede ser menor a ${f.cantidadCapturada} (ya capturadas).`,
        );
        return;
      }
      if (f.cantidadEsperada < 1) {
        setError(`${f.materialCodigo}: cantidad mínima 1.`);
        return;
      }
    }

    setGuardando(true);
    try {
      const { caja: cajaActualizada } = await actualizarSubgruposCajaSeparacionSap(
        caja.id,
        filas.map((f) => ({
          id: f.id,
          marca: f.marca,
          modelo: f.modelo,
          tipoProducto: f.tipoProducto,
          materialCodigo: f.materialCodigo,
          materialTexto: f.materialTexto,
          cantidadEsperada: f.cantidadEsperada,
          longitudDigitos: f.longitudDigitos,
          esquemaSeries: f.esquemaSeries,
        })),
      );
      dispatch({
        type: 'ACTUALIZAR_CAJA',
        payload: { caja: cajaActualizada, notificacion: 'Cantidades por sub-grupo actualizadas.' },
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-violet-700 text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-black font-mono text-slate-900">{caja.numeroCaja}</h3>
                <CentroBadge centro={caja.centro} />
                <EstadoBadge estado={caja.estado} />
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {editable ? 'Editar cantidad esperada por sub-grupo' : 'Solo lectura — caja no abierta'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {filas.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">
              Sin sub-grupos. Use Capturar para crear el primero.
            </p>
          ) : (
            <table className="w-full text-[11px] text-left">
              <thead className="text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-1.5 pr-2">Material</th>
                  <th className="py-1.5 pr-2">Tipo</th>
                  <th className="py-1.5 pr-2 text-center">Capturadas</th>
                  <th className="py-1.5 pr-2 text-center">Esperada</th>
                  <th className="py-1.5 pr-2">Estado</th>
                  {editable && <th className="py-1.5 text-right w-8">Acc.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="py-1.5 pr-2">
                      <div className="font-mono font-bold text-teal-800">{f.materialCodigo}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {f.marca} {f.modelo}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">{TIPOS_PRODUCTO[f.tipoProducto]?.label}</td>
                    <td className="py-1.5 pr-2 text-center font-mono font-bold text-slate-700">
                      {f.cantidadCapturada}
                    </td>
                    <td className="py-1.5 pr-2 text-center">
                      {editable ? (
                        <input
                          type="number"
                          min={f.cantidadCapturada || 1}
                          value={f.cantidadEsperada}
                          onChange={(e) => actualizarCantidad(f.id, e.target.value)}
                          className="w-16 mx-auto px-1.5 py-0.5 text-center font-mono font-bold border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                      ) : (
                        <span className="font-mono font-bold">{f.cantidadEsperada}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <SubgrupoEstadoBadge estado={f.estado} />
                    </td>
                    {editable && (
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => void handleEliminar(f)}
                          disabled={eliminandoId === f.id || guardando}
                          className="p-0.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded disabled:opacity-50"
                          title="Eliminar sub-grupo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {error && (
            <p className="mt-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cerrar
          </button>
          {editable && filas.length > 0 && (
            <button
              type="button"
              onClick={() => void handleGuardar()}
              disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-violet-700 hover:bg-violet-800 rounded-lg disabled:opacity-50"
            >
              {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
