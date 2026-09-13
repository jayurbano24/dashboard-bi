'use client';

import { useMemo, useState } from 'react';
import { BarChart } from '@tremor/react';
import { Building2, ChevronDown, ChevronUp, Download, Package, TrendingUp } from 'lucide-react';
import { useSeparacionSap } from '../../application/context';
import { CENTROS_AUTORIZADOS } from '../../domain/shared/constants';
import {
  calcularMetricasPorBodega,
  detalleMaterialesPorBodega,
  seriesPendientesEmpaquePorBodega,
} from '../../domain/inventario/inventario-bodega';
import { exportarSeriesPendientesBodega } from '../../domain/inventario/series-pendientes-excel';
import { inventarioSapCargado } from '../../domain/inventario/sap-inventory';
import { CentroBadge } from '../badges';

export function VistaDashboard() {
  const { state } = useSeparacionSap();
  const [bodegaExpandida, setBodegaExpandida] = useState<string | null>(null);
  const [descargandoBodega, setDescargandoBodega] = useState<string | null>(null);

  const sapCargado = inventarioSapCargado(state);

  const metricasPorBodega = useMemo(
    () => calcularMetricasPorBodega(state.cajas, state.bsdEquipos),
    [state.cajas, state.bsdEquipos],
  );

  const totalEsperado = metricasPorBodega.reduce((acc, m) => acc + m.esperadasEnCajas, 0);
  const totalCapturado = metricasPorBodega.reduce((acc, m) => acc + m.capturadasEnCajas, 0);
  const totalSap = metricasPorBodega.reduce((acc, m) => acc + m.equiposEnSap, 0);
  const totalEmpacados = metricasPorBodega.reduce((acc, m) => acc + m.equiposEmpacados, 0);
  const totalPendientes = metricasPorBodega.reduce((acc, m) => acc + m.equiposPendientesEmpaque, 0);
  const totalCajas = state.cajas.length;
  const totalRechazos = state.auditoriaRechazos.length;
  const rendimientoGlobal = totalEsperado > 0 ? Math.round((totalCapturado / totalEsperado) * 100) : 0;
  const rendimientoEmpaqueGlobal = totalSap > 0 ? Math.round((totalEmpacados / totalSap) * 100) : 0;

  const datosGraficoBodegas = useMemo(() => {
    return metricasPorBodega.map((m) => ({
      bodega: `Bodega ${m.bodega}`,
      Empacados: m.equiposEmpacados,
      'Pendientes SAP': m.equiposPendientesEmpaque,
    }));
  }, [metricasPorBodega]);

  async function handleDescargarPendientes(bodega: string) {
    if (!sapCargado) return;
    setDescargandoBodega(bodega);
    try {
      const series = seriesPendientesEmpaquePorBodega(bodega, state.cajas, state.bsdEquipos);
      await exportarSeriesPendientesBodega(bodega, series);
    } finally {
      setDescargandoBodega(null);
    }
  }

  const detallePorBodega = useMemo(() => {
    const map = new Map<string, ReturnType<typeof detalleMaterialesPorBodega>>();
    for (const bodega of CENTROS_AUTORIZADOS) {
      map.set(bodega, detalleMaterialesPorBodega(bodega, state.cajas, state.bsdEquipos));
    }
    return map;
  }, [state.cajas, state.bsdEquipos]);

  return (
    <div className="max-w-5xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Métricas de Captura y Rendimiento</h1>
        <p className="text-xs text-slate-500">
          Supervisión por bodega: equipos en inventario SAP vs empacados en cajas (G945, G935, G944).
        </p>
      </div>

      {!sapCargado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900">
          Cargue el inventario SAP en <strong>Inventario SAP</strong> para ver equipos totales y pendientes por bodega.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold">Cajas</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalCajas}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-600 font-semibold">Equipos en SAP</div>
          <div className="text-2xl font-black text-slate-800 font-mono mt-0.5">{totalSap}</div>
          <div className="text-[10px] text-slate-400 mt-1">Inventario cargado</div>
        </div>
        <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
          <div className="text-xs text-teal-800 font-semibold">Empacados</div>
          <div className="text-2xl font-black text-teal-800 font-mono mt-0.5">{totalEmpacados}</div>
          <div className="text-[10px] text-teal-600 mt-1">En cajas PX</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="text-xs text-amber-900 font-semibold">Pendientes</div>
          <div className="text-2xl font-black text-amber-800 font-mono mt-0.5">{totalPendientes}</div>
          <div className="text-[10px] text-amber-700 mt-1">Sin empacar aún</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Empaque SAP
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">{rendimientoEmpaqueGlobal}%</div>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <div className="text-xs text-rose-800 font-semibold">Rechazos</div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-0.5">{totalRechazos}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-700" /> Detalle de Equipos por Bodega
          </h2>
          <span className="text-xs font-mono text-slate-400">G945 · G935 · G944</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metricasPorBodega.map((m) => {
            const expandida = bodegaExpandida === m.bodega;
            const materiales = detallePorBodega.get(m.bodega) ?? [];
            const topPendientes = materiales.filter((row) => row.pendientes > 0).slice(0, 5);

            return (
              <div
                key={m.bodega}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden hover:border-slate-300 transition"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <CentroBadge centro={m.bodega} />
                      <span className="text-xs font-bold text-slate-800">Bodega {m.bodega}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {m.rendimientoEmpaque}% empacado
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-[9px] uppercase text-slate-400 font-semibold">En SAP</div>
                      <div className="text-lg font-black font-mono text-slate-900">{m.equiposEnSap}</div>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-2 border border-teal-100">
                      <div className="text-[9px] uppercase text-teal-700 font-semibold">Empacados</div>
                      <div className="text-lg font-black font-mono text-teal-900">{m.equiposEmpacados}</div>
                    </div>
                    <button
                      type="button"
                      disabled={m.equiposPendientesEmpaque === 0 || !sapCargado || descargandoBodega === m.bodega}
                      onClick={() => void handleDescargarPendientes(m.bodega)}
                      title={
                        m.equiposPendientesEmpaque > 0
                          ? 'Descargar Excel con detalle de series pendientes'
                          : 'Sin series pendientes'
                      }
                      className="bg-amber-50 rounded-lg p-2 border border-amber-100 text-left transition hover:bg-amber-100 hover:border-amber-300 hover:ring-2 hover:ring-amber-200 disabled:opacity-60 disabled:hover:ring-0 disabled:cursor-default group"
                    >
                      <div className="text-[9px] uppercase text-amber-800 font-semibold flex items-center justify-between gap-1">
                        Faltan
                        {m.equiposPendientesEmpaque > 0 && (
                          <Download className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        )}
                      </div>
                      <div className="text-lg font-black font-mono text-amber-900">
                        {descargandoBodega === m.bodega ? '…' : m.equiposPendientesEmpaque}
                      </div>
                      {m.equiposPendientesEmpaque > 0 && (
                        <div className="text-[9px] text-amber-700 mt-0.5 opacity-0 group-hover:opacity-100">
                          Clic → Excel
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 text-[10px] block">Cajas</span>
                      <span className="font-mono font-black text-slate-900">{m.totalCajas}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {m.abiertas} ab. · {m.cerradas} cer. · {m.despachadas} desp.
                      </span>
                    </div>
                    <div className="bg-violet-50/50 p-2 rounded-lg border border-violet-100">
                      <span className="text-violet-700 text-[10px] block">Avance cajas (cap/esp)</span>
                      <span className="font-mono font-black text-violet-900">
                        {m.capturadasEnCajas} / {m.esperadasEnCajas}
                      </span>
                      <span className="text-[10px] text-violet-600 block">Faltan {m.faltanEnCajas} en cajas</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Progreso empacado vs SAP</span>
                      <span className="font-mono font-bold text-slate-800">{m.rendimientoEmpaque}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${m.rendimientoEmpaque}%` }}
                      />
                    </div>
                  </div>

                  {topPendientes.length > 0 && (
                    <div className="border-t border-slate-100 pt-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Top materiales pendientes
                      </div>
                      <ul className="space-y-1">
                        {topPendientes.map((row) => (
                          <li
                            key={row.materialCodigo}
                            className="flex justify-between gap-2 text-[10px] font-mono bg-slate-50 rounded px-2 py-1"
                          >
                            <span className="text-slate-700 truncate">{row.materialCodigo}</span>
                            <span className="font-bold text-amber-800 flex-shrink-0">{row.pendientes} faltan</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setBodegaExpandida(expandida ? null : m.bodega)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-teal-800 hover:bg-teal-50 py-1.5 rounded-lg border border-teal-100"
                  >
                    {expandida ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Ocultar detalle por material
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Ver todos los materiales ({materiales.length})
                      </>
                    )}
                  </button>
                </div>

                {expandida && materiales.length > 0 && (
                  <div className="border-t border-slate-100 max-h-56 overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-semibold">Material</th>
                          <th className="text-right px-2 py-1.5 font-semibold">SAP</th>
                          <th className="text-right px-2 py-1.5 font-semibold">Emp.</th>
                          <th className="text-right px-3 py-1.5 font-semibold">Faltan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-mono">
                        {materiales.map((row) => (
                          <tr key={row.materialCodigo} className={row.pendientes > 0 ? 'bg-amber-50/40' : ''}>
                            <td className="px-3 py-1.5">
                              <div className="font-bold text-slate-800">{row.materialCodigo}</div>
                              <div className="text-slate-400 font-sans truncate max-w-[140px]">{row.materialTexto}</div>
                            </td>
                            <td className="text-right px-2 py-1.5">{row.totalSap}</td>
                            <td className="text-right px-2 py-1.5 text-teal-800">{row.empacados}</td>
                            <td className="text-right px-3 py-1.5 font-bold text-amber-800">{row.pendientes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Empacados vs pendientes por bodega</span>
          <span className="text-slate-400 text-[11px] font-normal">Fuente: inventario SAP + cajas PX</span>
        </h3>
        <BarChart
          className="mt-2 h-64"
          data={datosGraficoBodegas}
          index="bodega"
          categories={['Empacados', 'Pendientes SAP']}
          colors={['teal', 'amber']}
          yAxisWidth={48}
          showLegend
          showGridLines
        />
      </div>

      <p className="text-[10px] text-slate-400">
        Avance cajas ({rendimientoGlobal}%): progreso de pistoleo dentro de cajas declaradas. Empaque SAP (
        {rendimientoEmpaqueGlobal}%): equipos ya en cajas vs total del inventario cargado por centro.
      </p>
    </div>
  );
}
