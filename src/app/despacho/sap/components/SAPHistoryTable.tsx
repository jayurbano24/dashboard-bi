'use client';

import { useState } from 'react';
import { FileText, Search, Calendar, Filter } from 'lucide-react';
import { useSapHistory } from '../hooks/useSapApi';

export function SAPHistoryTable() {
  const [historyFilters, setHistoryFilters] = useState({ startDate: '', endDate: '', searchTerm: '' });
  const historyQuery = useSapHistory(historyFilters);

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6 space-y-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl shadow-sm border border-blue-100/50">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Registro Histórico SAP</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Consulta de movimientos y auditoría</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative group">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="date" 
              value={historyFilters.startDate} 
              onChange={(e) => setHistoryFilters((f) => ({ ...f, startDate: e.target.value }))} 
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all w-full md:w-auto bg-slate-50/50" 
            />
          </div>
          <div className="relative group">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="date" 
              value={historyFilters.endDate} 
              onChange={(e) => setHistoryFilters((f) => ({ ...f, endDate: e.target.value }))} 
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all w-full md:w-auto bg-slate-50/50" 
            />
          </div>
          <div className="relative group flex-1 md:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar IMEI, Lote..." 
              value={historyFilters.searchTerm} 
              onChange={(e) => setHistoryFilters((f) => ({ ...f, searchTerm: e.target.value }))} 
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all w-full md:w-64 bg-slate-50/50" 
            />
          </div>
          <button 
            type="button" 
            onClick={() => historyQuery.refetch()} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </button>
        </div>
      </div>

      {historyQuery.isLoading ? (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-3 shadow-sm" />
          <p className="text-sm font-medium text-slate-500">Cargando registros históricos...</p>
        </div>
      ) : !historyQuery.data?.length ? (
        <div className="py-16 text-center text-slate-500 bg-slate-50/50 border border-slate-200/60 rounded-2xl border-dashed">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">No se encontraron registros SAP.</p>
          <p className="text-xs text-slate-400 mt-1">Ajusta los filtros de búsqueda e intenta nuevamente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-sm bg-white">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60">
                <th className="px-4 py-3 font-semibold text-slate-600">IMEI</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Agencia</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Material</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Fecha Acept.</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Traslado</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Marca/Modelo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyQuery.data.map((r: Record<string, string>) => (
                <tr key={r.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-4 py-3 font-mono font-medium text-slate-700">{r.imeiFisico}</td>
                  <td className="px-4 py-3 text-slate-600">{r.agencia}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{r.material}</td>
                  <td className="px-4 py-3 text-slate-600">{r.fechaAceptacion}</td>
                  <td className="px-4 py-3 text-slate-600">{r.numeroTraslado || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider
                      ${r.estado === 'ENTREGADO SAP' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 
                        r.estado === 'GUARDADO SAP' ? 'bg-blue-100/80 text-blue-700 border border-blue-200' : 
                        r.estado === 'RECIBIDO SAP' ? 'bg-amber-100/80 text-amber-700 border border-amber-200' : 
                        'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{r.marca} <span className="text-slate-400 font-normal ml-1">{r.modelo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
