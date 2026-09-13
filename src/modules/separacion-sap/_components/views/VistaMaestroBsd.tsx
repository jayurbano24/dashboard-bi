'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { useSeparacionSap } from '../../application/context';
import { inventarioSapCargado } from '../../domain/inventario/sap-inventory';
import { fetchInventarioSap, guardarInventarioSapArchivo } from '../../infrastructure/inventario/inventario-api';
import { CentroBadge } from '../badges';

const REGISTROS_POR_PAGINA = 25;

export function VistaMaestroBsd() {
  const { state, dispatch } = useSeparacionSap();
  const [filtroCentro, setFiltroCentro] = useState('G945');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [paginaMateriales, setPaginaMateriales] = useState(1);
  const [paginaSeries, setPaginaSeries] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sapCargado = inventarioSapCargado(state);
  const totalSap = state.bsdEquipos.length;
  const sapG945 = state.bsdEquipos.filter((e) => e.centro === 'G945').length;
  const materialesG945 = state.materialesSap.length;

  const totalPaginasMateriales = Math.max(1, Math.ceil(state.materialesSap.length / REGISTROS_POR_PAGINA));

  const materialesPaginados = useMemo(() => {
    const inicio = (paginaMateriales - 1) * REGISTROS_POR_PAGINA;
    return state.materialesSap.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [state.materialesSap, paginaMateriales]);

  useEffect(() => {
    setPaginaMateriales(1);
  }, [state.materialesSap.length, state.sapArchivoNombre]);

  useEffect(() => {
    if (paginaMateriales > totalPaginasMateriales) {
      setPaginaMateriales(totalPaginasMateriales);
    }
  }, [paginaMateriales, totalPaginasMateriales]);

  const registrosFiltrados = useMemo(() => {
    return state.bsdEquipos.filter((item) => {
      const matchCentro = filtroCentro === 'TODOS' || item.centro === filtroCentro;
      const q = busqueda.toLowerCase().trim();
      const matchTexto =
        !q ||
        item.normalizedSerial.toLowerCase().includes(q) ||
        item.materialCodigo.toLowerCase().includes(q) ||
        (item.materialTexto && item.materialTexto.toLowerCase().includes(q));
      return matchCentro && matchTexto;
    });
  }, [state.bsdEquipos, filtroCentro, busqueda]);

  const totalPaginasSeries = Math.max(1, Math.ceil(registrosFiltrados.length / REGISTROS_POR_PAGINA));

  const registrosPaginados = useMemo(() => {
    const inicio = (paginaSeries - 1) * REGISTROS_POR_PAGINA;
    return registrosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [registrosFiltrados, paginaSeries]);

  useEffect(() => {
    setPaginaSeries(1);
  }, [filtroCentro, busqueda, state.sapArchivoNombre]);

  useEffect(() => {
    if (paginaSeries > totalPaginasSeries) {
      setPaginaSeries(totalPaginasSeries);
    }
  }, [paginaSeries, totalPaginasSeries]);

  async function procesarArchivoSap(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargando(true);
    try {
      const saved = await guardarInventarioSapArchivo(file);
      const loaded = await fetchInventarioSap();

      if (!loaded.ok || loaded.equipos.length === 0) {
        throw new Error('El inventario se guardó pero no se pudo recargar desde Supabase.');
      }

      dispatch({
        type: 'CARGAR_BSD_Y_SINCRONIZAR_G945',
        payload: {
          equipos: loaded.equipos,
          filename: saved.import.filename ?? file.name,
          cargadoEn: saved.import.cargadoEn,
          persistidoSupabase: true,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo leer el archivo Excel de SAP.';
      dispatch({ type: 'SET_ERROR_GLOBAL', payload: message });
    } finally {
      setCargando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="max-w-5xl space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Inventario SAP (Excel)</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              Fuente de Verdad
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Suba el archivo Excel exportado desde SAP. Solo se permitirá capturar series que existan en este inventario.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileInputRef}
            onChange={procesarArchivoSap}
            className="hidden"
            id="sap-excel-input"
          />
          <label
            htmlFor="sap-excel-input"
            className="flex items-center gap-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {cargando ? 'Guardando en Supabase…' : 'Subir Excel SAP'}
          </label>

          <button
            type="button"
            onClick={() => dispatch({ type: 'RESINCRONIZAR_MATERIALES_SAP' })}
            disabled={!sapCargado}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg shadow-xs transition disabled:opacity-50"
            title="Recalcular materiales desde inventario G945"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-700" /> Sincronizar Materiales
          </button>
        </div>
      </div>

      {!sapCargado && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <div className="font-bold">Inventario SAP requerido</div>
            <p className="mt-1 text-amber-800">
              Debe cargar el archivo Excel de SAP antes de crear cajas o capturar series. El escáner rechazará
              cualquier serie que no aparezca en el inventario cargado.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-50 via-teal-50/50 to-slate-50 p-4 rounded-xl border border-teal-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-teal-900">Validación de series contra SAP</div>
            <div className="text-[11px] text-teal-700">
              {sapCargado ? (
                <>
                  Archivo: <strong>{state.sapArchivoNombre}</strong> ·{' '}
                  <strong>{materialesG945} materiales</strong> en G945 ·{' '}
                  <strong>{sapG945} series</strong> en bodega G945
                </>
              ) : (
                'Sin archivo cargado — la captura de series está bloqueada'
              )}
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          {sapCargado && state.sapCargadoEn && (
            <>
              Cargado:{' '}
              <span className="font-mono font-bold text-slate-800">
                {new Date(state.sapCargadoEn).toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Total Series SAP</span>
            <Database className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{totalSap}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Inventario cargado</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-xs">
          <div className="text-xs text-teal-800 font-semibold flex items-center justify-between">
            <span>Series en G945</span>
            <Building2 className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <div className="text-2xl font-black font-mono text-teal-800 mt-1">{sapG945}</div>
          <div className="text-[11px] text-teal-600 mt-0.5">Validables para empaque</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Materiales SAP G945</span>
            <BookmarkCheck className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{materialesG945}</div>
          <div className="text-[11px] text-teal-700 mt-0.5">Para creación de cajas</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Series G935 / G944</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-700 mt-1">{totalSap - sapG945}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Otras bodegas</div>
        </div>
      </div>

      {state.materialesSap.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-teal-700" />
              Materiales SAP detectados en G945 ({state.materialesSap.length})
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Página {paginaMateriales} de {totalPaginasMateriales} · {REGISTROS_POR_PAGINA} por página
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 w-12">#</th>
                  <th className="px-4 py-2.5">Código SAP</th>
                  <th className="px-4 py-2.5">Descripción</th>
                  <th className="px-4 py-2.5">Almacén(es)</th>
                  <th className="px-4 py-2.5 text-right">Unidades en SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materialesPaginados.map((mat, idx) => {
                  const rowNumber = (paginaMateriales - 1) * REGISTROS_POR_PAGINA + idx + 1;
                  return (
                    <tr key={mat.codigo} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{rowNumber}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-teal-800">{mat.codigo}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 max-w-md truncate" title={mat.texto}>
                        {mat.texto}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {mat.almacenes?.length ? mat.almacenes.join(', ') : 'D000'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          {mat.cantidadEnBsdG945} uds
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginasMateriales > 1 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Mostrando {(paginaMateriales - 1) * REGISTROS_POR_PAGINA + 1}–
                {Math.min(paginaMateriales * REGISTROS_POR_PAGINA, state.materialesSap.length)} de{' '}
                {state.materialesSap.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPaginaMateriales((p) => Math.max(1, p - 1))}
                  disabled={paginaMateriales <= 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPaginaMateriales((p) => Math.min(totalPaginasMateriales, p + 1))}
                  disabled={paginaMateriales >= totalPaginasMateriales}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Filtrar Bodega:</span>
            {['TODOS', 'G945', 'G935', 'G944'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setFiltroCentro(b)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  filtroCentro === b
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b === 'TODOS' ? 'Todas' : b}
              </button>
            ))}
          </div>
          {sapCargado && registrosFiltrados.length > 0 && (
            <span className="text-[11px] text-slate-500 font-mono">
              {registrosFiltrados.length} series · Pág. {paginaSeries}/{totalPaginasSeries}
            </span>
          )}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar serial, material o texto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Número de Serie</th>
                <th className="px-4 py-2.5">Material SAP</th>
                <th className="px-4 py-2.5">Texto Breve de Material</th>
                <th className="px-4 py-2.5">Centro</th>
                <th className="px-4 py-2.5">Almacén</th>
                <th className="px-4 py-2.5">Status SAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {!sapCargado ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                    <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Suba el archivo Excel exportado desde SAP para habilitar la validación de series.
                  </td>
                </tr>
              ) : registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                    No se encontraron registros con los filtros indicados.
                  </td>
                </tr>
              ) : (
                registrosPaginados.map((r, idx) => (
                  <tr key={`${r.normalizedSerial}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2 text-slate-400">
                      {(paginaSeries - 1) * REGISTROS_POR_PAGINA + idx + 1}
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-900">{r.normalizedSerial}</td>
                    <td className="px-4 py-2 font-bold text-teal-800">{r.materialCodigo}</td>
                    <td className="px-4 py-2 font-sans text-slate-700">{r.materialTexto}</td>
                    <td className="px-4 py-2 font-sans">
                      <CentroBadge centro={r.centro} />
                    </td>
                    <td className="px-4 py-2 text-slate-600">{r.almacen}</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {r.statusSistema}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sapCargado && registrosFiltrados.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Mostrando {(paginaSeries - 1) * REGISTROS_POR_PAGINA + 1}–
              {Math.min(paginaSeries * REGISTROS_POR_PAGINA, registrosFiltrados.length)} de{' '}
              {registrosFiltrados.length} series · máx. {REGISTROS_POR_PAGINA} por página
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaginaSeries((p) => Math.max(1, p - 1))}
                disabled={paginaSeries <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="px-2 font-mono font-bold text-slate-600">
                {paginaSeries} / {totalPaginasSeries}
              </span>
              <button
                type="button"
                onClick={() => setPaginaSeries((p) => Math.min(totalPaginasSeries, p + 1))}
                disabled={paginaSeries >= totalPaginasSeries}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
