'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useSeparacionSap } from '../../application/context';
import {
  detalleCantidadesSubgrupos,
  resumenMaterialesCaja,
  resumenSubgruposCaja,
  totalesCaja,
} from '../../domain/cajas/caja-utils';
import {
  aplicarFiltrosColumnaCajas,
  CAJAS_POR_PAGINA,
  etiquetaCreadoPor,
  filtrosColumnaVacios,
  formatFechaCaja,
  opcionesUnicasColumna,
  ordenarCajasParaListado,
  paginarCajas,
  totalPaginasCajas,
  type FiltrosColumnaCajas,
} from '../../domain/cajas/listado-cajas';
import { inventarioSapCargado } from '../../domain/inventario/sap-inventory';
import {
  puedeMostrarEliminarCaja,
} from '../../domain/cajas/caja-delete-permissions';
import { eliminarCajaSeparacionSap } from '../../infrastructure/cajas/cajas-api';
import type { CajaEntidad, EstadoCaja } from '../../types';
import { CentroBadge, EstadoBadge } from '../badges';
import { ColumnHeaderFilter } from '../molecules/ColumnHeaderFilter';
import { ModalCrearCaja } from '../modals/ModalCrearCaja';
import { ModalDetalleCaja } from '../modals/ModalDetalleCaja';
import { ModalEditarSubgruposCaja } from '../modals/ModalEditarSubgruposCaja';

type VistaCajasListadoProps = {
  onSeleccionarCaja: (cajaId: string) => void;
  /** Caja en captura reciente — se muestra primero en el listado. */
  cajaPrioritariaId?: string | null;
};

export function VistaCajasListado({ onSeleccionarCaja, cajaPrioritariaId = null }: VistaCajasListadoProps) {
  const { state, dispatch } = useSeparacionSap();
  const [modalCrear, setModalCrear] = useState(false);
  const [filtroBodega, setFiltroBodega] = useState('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | EstadoCaja>('TODOS');
  const [filtrosColumna, setFiltrosColumna] = useState<FiltrosColumnaCajas>(filtrosColumnaVacios);
  const [pagina, setPagina] = useState(1);
  const [cajaParaDetalle, setCajaParaDetalle] = useState<CajaEntidad | null>(null);
  const [cajaParaEditarSubgrupos, setCajaParaEditarSubgrupos] = useState<CajaEntidad | null>(null);
  const [editarSubgruposSoloLectura, setEditarSubgruposSoloLectura] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [canDeleteClosedCajas, setCanDeleteClosedCajas] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as {
          user?: { canDeleteClosedCajas?: boolean };
        };
        if (!cancelled) {
          setCanDeleteClosedCajas(Boolean(data.user?.canDeleteClosedCajas));
        }
      } catch {
        // Sin permiso especial: solo eliminar cajas abiertas.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCajas = state.cajas.length;
  const cantG945 = state.cajas.filter((c) => c.centro === 'G945').length;
  const cantG935 = state.cajas.filter((c) => c.centro === 'G935').length;
  const cantG944 = state.cajas.filter((c) => c.centro === 'G944').length;

  const sapCargado = inventarioSapCargado(state);
  const inventarioCargando = state.inventarioCargando;
  const cajasCargando = state.cajasCargando;

  const cajasBase = useMemo(() => {
    return state.cajas.filter((c) => {
      const matchBodega = filtroBodega === 'TODAS' || c.centro === filtroBodega;
      const matchEstado = filtroEstado === 'TODOS' || c.estado === filtroEstado;
      return matchBodega && matchEstado;
    });
  }, [state.cajas, filtroBodega, filtroEstado]);

  const cajasFiltradas = useMemo(() => {
    const filtradas = aplicarFiltrosColumnaCajas(cajasBase, filtrosColumna);
    return ordenarCajasParaListado(filtradas, cajaPrioritariaId);
  }, [cajasBase, filtrosColumna, cajaPrioritariaId]);

  const totalPaginas = totalPaginasCajas(cajasFiltradas.length);
  const cajasPagina = useMemo(
    () => paginarCajas(cajasFiltradas, pagina),
    [cajasFiltradas, pagina],
  );

  useEffect(() => {
    setPagina(1);
  }, [filtroBodega, filtroEstado, filtrosColumna, cajaPrioritariaId]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  function setFiltroColumna<K extends keyof FiltrosColumnaCajas>(key: K, value: Set<string>) {
    setFiltrosColumna((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEliminarCaja(caja: CajaEntidad) {
    if (!puedeMostrarEliminarCaja(caja.estado, canDeleteClosedCajas)) {
      dispatch({
        type: 'SET_ERROR_GLOBAL',
        payload:
          caja.estado === 'CERRADA'
            ? 'Solo Gerente General puede eliminar cajas cerradas.'
            : 'No se puede eliminar esta caja.',
      });
      return;
    }

    const { cantidadCapturada } = totalesCaja(caja);
    const mensaje =
      caja.estado === 'CERRADA'
        ? `¿Eliminar la caja CERRADA ${caja.numeroCaja}? Tiene ${cantidadCapturada} serie(s). Esta acción no se puede deshacer.`
        : cantidadCapturada > 0
          ? `¿Eliminar ${caja.numeroCaja}? Tiene ${cantidadCapturada} serie(s) capturada(s). Las series quedarán disponibles para otras cajas.`
          : `¿Eliminar la caja ${caja.numeroCaja}? Esta acción no se puede deshacer.`;

    if (!window.confirm(mensaje)) return;

    setEliminandoId(caja.id);
    try {
      const result = await eliminarCajaSeparacionSap(caja.id);
      dispatch({ type: 'ELIMINAR_CAJA', payload: { cajaId: result.id, numeroCaja: result.numeroCaja } });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR_GLOBAL',
        payload: err instanceof Error ? err.message : 'No se pudo eliminar la caja.',
      });
    } finally {
      setEliminandoId(null);
    }
  }

  const hayFiltrosColumna = Object.values(filtrosColumna).some((s) => s.size > 0);

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Control y Cantidad de Cajas PX</h1>
          <p className="text-xs text-slate-500">
            Materiales y series provienen del archivo Excel SAP cargado. Series no registradas en SAP serán rechazadas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalCrear(true)}
          disabled={!sapCargado}
          title={sapCargado ? undefined : 'Cargue el inventario SAP antes de crear cajas'}
          className="flex items-center gap-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-lg shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Nueva Caja PX
        </button>
      </div>

      {(inventarioCargando || cajasCargando) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 animate-pulse">
          Cargando datos desde Supabase…
        </div>
      )}

      {!inventarioCargando && !sapCargado && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <div className="font-bold">Primero cargue el Excel SAP</div>
            <p className="mt-1 text-amber-800">
              Vaya a Inventario SAP y suba el archivo exportado desde SAP. Sin ese archivo no se pueden crear cajas ni
              capturar series.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFiltroBodega('TODAS')}
          onKeyDown={(e) => e.key === 'Enter' && setFiltroBodega('TODAS')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filtroBodega === 'TODAS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900'
          }`}
        >
          <div className={`text-xs font-semibold ${filtroBodega === 'TODAS' ? 'text-slate-300' : 'text-slate-500'}`}>
            Total Cajas
          </div>
          <div className="text-2xl font-black font-mono mt-0.5">{totalCajas}</div>
          <div className={`text-[11px] mt-1 ${filtroBodega === 'TODAS' ? 'text-slate-300' : 'text-slate-400'}`}>
            Todas las bodegas
          </div>
        </div>

        {(['G945', 'G935', 'G944'] as const).map((centro, i) => {
          const cant = centro === 'G945' ? cantG945 : centro === 'G935' ? cantG935 : cantG944;
          const active = filtroBodega === centro;
          const colors =
            i === 0
              ? { active: 'bg-teal-700 text-white border-teal-800', label: 'text-teal-100', hover: 'hover:bg-teal-50/50', text: 'text-teal-800' }
              : i === 1
                ? { active: 'bg-indigo-700 text-white border-indigo-800', label: 'text-indigo-100', hover: 'hover:bg-indigo-50/50', text: 'text-indigo-800' }
                : { active: 'bg-sky-700 text-white border-sky-800', label: 'text-sky-100', hover: 'hover:bg-sky-50/50', text: 'text-sky-800' };
          return (
            <div
              key={centro}
              role="button"
              tabIndex={0}
              onClick={() => setFiltroBodega(centro)}
              onKeyDown={(e) => e.key === 'Enter' && setFiltroBodega(centro)}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                active ? `${colors.active} shadow-xs` : `bg-white border-slate-200 ${colors.hover} text-slate-900`
              }`}
            >
              <div className={`text-xs font-semibold flex items-center justify-between ${active ? colors.label : colors.text}`}>
                <span>Bodega {centro}</span>
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-black font-mono mt-0.5">{cant}</div>
              <div className={`text-[11px] mt-1 ${active ? colors.label : 'text-slate-400'}`}>
                {cant === 1 ? '1 caja registrada' : `${cant} cajas registradas`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-700">Filtrar Bodega:</span>
          {['TODAS', 'G945', 'G935', 'G944'].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setFiltroBodega(b)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filtroBodega === b ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {b === 'TODAS' ? 'Todas' : b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700">Estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as 'TODOS' | EstadoCaja)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium text-slate-700"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ABIERTA">Abiertas</option>
            <option value="CERRADA">Cerradas</option>
            <option value="DESPACHADA">Despachadas</option>
          </select>
          {hayFiltrosColumna && (
            <button
              type="button"
              onClick={() => setFiltrosColumna(filtrosColumnaVacios())}
              className="px-2.5 py-1 rounded-lg font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
            >
              Limpiar filtros columnas
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left table-fixed">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-2 py-1.5 whitespace-nowrap">
                  <ColumnHeaderFilter
                    label="Número Caja"
                    options={opcionesUnicasColumna(cajasBase, 'numeroCaja')}
                    selected={filtrosColumna.numeroCaja}
                    onChange={(v) => setFiltroColumna('numeroCaja', v)}
                  />
                </th>
                <th className="px-2 py-1.5 whitespace-nowrap">
                  <ColumnHeaderFilter
                    label="Fecha creación"
                    options={opcionesUnicasColumna(cajasBase, 'fechaCreacion')}
                    selected={filtrosColumna.fechaCreacion}
                    onChange={(v) => setFiltroColumna('fechaCreacion', v)}
                  />
                </th>
                <th className="px-2 py-1.5 whitespace-nowrap">
                  <ColumnHeaderFilter
                    label="Creado por"
                    options={opcionesUnicasColumna(cajasBase, 'creadoPor')}
                    selected={filtrosColumna.creadoPor}
                    onChange={(v) => setFiltroColumna('creadoPor', v)}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <ColumnHeaderFilter
                    label="Bodega"
                    options={opcionesUnicasColumna(cajasBase, 'centro')}
                    selected={filtrosColumna.centro}
                    onChange={(v) => setFiltroColumna('centro', v)}
                  />
                </th>
                <th className="px-2 py-1.5 text-center">Sub-Gr.</th>
                <th className="px-2 py-1.5">
                  <ColumnHeaderFilter
                    label="Marca / Modelo"
                    options={opcionesUnicasColumna(cajasBase, 'marcaModelo')}
                    selected={filtrosColumna.marcaModelo}
                    onChange={(v) => setFiltroColumna('marcaModelo', v)}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <ColumnHeaderFilter
                    label="Material SAP"
                    options={opcionesUnicasColumna(cajasBase, 'materialSap')}
                    selected={filtrosColumna.materialSap}
                    onChange={(v) => setFiltroColumna('materialSap', v)}
                  />
                </th>
                <th className="px-2 py-1.5 text-center">Progreso</th>
                <th className="px-2 py-1.5">
                  <ColumnHeaderFilter
                    label="Estado"
                    options={opcionesUnicasColumna(cajasBase, 'estado')}
                    selected={filtrosColumna.estado}
                    onChange={(v) => setFiltroColumna('estado', v)}
                  />
                </th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cajasPagina.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400 italic">
                    No hay cajas que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                cajasPagina.map((c) => {
                  const { cantidadEsperada, cantidadCapturada } = totalesCaja(c);
                  const pct =
                    cantidadEsperada > 0
                      ? Math.min(100, Math.round((cantidadCapturada / cantidadEsperada) * 100))
                      : 0;
                  const esPrioritaria = c.id === cajaPrioritariaId;
                  const enTrabajo = c.estado === 'ABIERTA';

                  return (
                    <tr
                      key={c.id}
                      className={`transition ${
                        esPrioritaria
                          ? 'bg-teal-50/90 ring-1 ring-inset ring-teal-200'
                          : enTrabajo
                            ? 'bg-amber-50/40 hover:bg-amber-50/70'
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td
                        onClick={() => onSeleccionarCaja(c.id)}
                        className="px-2 py-1.5 font-mono font-bold text-teal-800 cursor-pointer hover:underline whitespace-nowrap"
                      >
                        {c.numeroCaja}
                        {esPrioritaria && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase text-teal-600 bg-teal-100 px-1 py-0.5 rounded">
                            En trabajo
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap font-mono text-[10px]">
                        {formatFechaCaja(c.creadaEn)}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700 truncate" title={etiquetaCreadoPor(c)}>
                        {etiquetaCreadoPor(c)}
                      </td>
                      <td className="px-2 py-1.5">
                        <CentroBadge centro={c.centro} />
                      </td>
                      <td className="px-2 py-1.5 font-mono font-bold text-violet-800 text-center">
                        {c.subgrupos.length}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700 font-medium truncate" title={resumenSubgruposCaja(c)}>
                        {resumenSubgruposCaja(c)}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-slate-600 truncate" title={resumenMaterialesCaja(c)}>
                        {resumenMaterialesCaja(c)}
                      </td>
                      <td
                        className="px-2 py-1.5 text-center"
                        title={c.subgrupos.length > 0 ? detalleCantidadesSubgrupos(c) : undefined}
                      >
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {cantidadCapturada} / {cantidadEsperada}
                        </span>
                        {c.subgrupos.length > 0 && (
                          <div className="text-[9px] font-mono text-slate-500 truncate max-w-[100px] mx-auto mt-0.5">
                            {detalleCantidadesSubgrupos(c)}
                          </div>
                        )}
                        <div className="w-14 bg-slate-100 rounded-full h-1 mx-auto mt-0.5 overflow-hidden">
                          <div className="bg-teal-600 h-1 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <EstadoBadge estado={c.estado} />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="inline-flex items-center gap-0.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setCajaParaDetalle(c)}
                            className="px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                            title="Ver detalle"
                          >
                            Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => onSeleccionarCaja(c.id)}
                            className="px-2 py-1 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded transition"
                            title="Ir a captura"
                          >
                            Capturar
                          </button>
                          {c.estado === 'ABIERTA' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (c.subgrupos.length === 0) {
                                  onSeleccionarCaja(c.id);
                                  return;
                                }
                                setEditarSubgruposSoloLectura(false);
                                setCajaParaEditarSubgrupos(c);
                              }}
                              className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-300 rounded transition"
                              title={
                                c.subgrupos.length === 0
                                  ? 'Sin sub-grupos — ir a captura para definir cantidad'
                                  : 'Editar cantidad por sub-grupo'
                              }
                            >
                              <Pencil className="w-3 h-3 shrink-0" />
                              Editar
                            </button>
                          )}
                          {c.subgrupos.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditarSubgruposSoloLectura(true);
                                setCajaParaEditarSubgrupos(c);
                              }}
                              className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition"
                              title={`Cantidad por sub-grupo: ${detalleCantidadesSubgrupos(c)}`}
                            >
                              <Layers className="w-3 h-3 shrink-0" />
                              Cant.
                            </button>
                          )}
                          {puedeMostrarEliminarCaja(c.estado, canDeleteClosedCajas) && (
                            <button
                              type="button"
                              onClick={() => void handleEliminarCaja(c)}
                              disabled={eliminandoId === c.id}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition disabled:opacity-50"
                              title={c.estado === 'CERRADA' ? 'Eliminar caja cerrada (Gerente General)' : 'Eliminar caja'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-1.5 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-600">
          <div>
            {cajasFiltradas.length === 0 ? (
              '0 cajas'
            ) : (
              <>
                Mostrando {(pagina - 1) * CAJAS_POR_PAGINA + 1}–
                {Math.min(pagina * CAJAS_POR_PAGINA, cajasFiltradas.length)} de {cajasFiltradas.length} cajas · máx.{' '}
                {CAJAS_POR_PAGINA} por página
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold tabular-nums">
              Página {pagina} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {modalCrear && (
        <ModalCrearCaja onClose={() => setModalCrear(false)} onCreated={(id) => onSeleccionarCaja(id)} />
      )}
      {cajaParaDetalle && (
        <ModalDetalleCaja caja={cajaParaDetalle} onClose={() => setCajaParaDetalle(null)} />
      )}
      {cajaParaEditarSubgrupos && (
        <ModalEditarSubgruposCaja
          caja={state.cajas.find((c) => c.id === cajaParaEditarSubgrupos.id) ?? cajaParaEditarSubgrupos}
          soloLectura={editarSubgruposSoloLectura}
          onClose={() => {
            setCajaParaEditarSubgrupos(null);
            setEditarSubgruposSoloLectura(false);
          }}
        />
      )}
    </div>
  );
}
