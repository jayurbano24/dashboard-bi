'use client';

import { useMemo } from 'react';
import type { SapBatchItem } from '../types';

type Props = {
  items: SapBatchItem[];
  onRemove: (index: number) => void;
  onClear: () => void;
};

export function SAPLotTable({ items, onRemove, onClear }: Props) {
  const virtualize = items.length > 500;
  const visible = useMemo(() => (virtualize ? items.slice(0, 500) : items), [items, virtualize]);

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl overflow-hidden flex-1 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 font-bold text-sm flex justify-between items-center">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          LOTE SAP ACTUAL <span className="bg-white/20 px-2 py-0.5 rounded-md ml-2 text-xs">{items.length} equipos</span>
        </span>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className="text-rose-400 hover:text-rose-300 font-bold text-[11px] uppercase tracking-wider bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg transition-colors">
            Vaciar Lote
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-16 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-sm font-medium text-slate-500">El lote está vacío</p>
          <p className="text-xs mt-1">Escanee un IMEI para comenzar a agregar equipos</p>
        </div>
      ) : (
        <div className="overflow-auto flex-1 max-h-[360px] text-xs relative">
          {virtualize && (
            <div className="sticky top-0 z-10 p-2.5 bg-amber-50/95 backdrop-blur border-b border-amber-100 text-amber-800 text-[11px] font-semibold flex items-center justify-center gap-2">
              <span>⚠️</span> Mostrando los primeros 500 de {items.length} equipos por rendimiento.
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 font-bold border-b border-slate-200/60 text-slate-600">
                <th className="px-4 py-3 font-semibold">IMEI</th>
                <th className="px-4 py-3 font-semibold">Agencia</th>
                <th className="px-4 py-3 font-semibold">Marca / Modelo</th>
                <th className="px-4 py-3 font-semibold">Doc.</th>
                <th className="px-4 py-3 font-semibold">Material</th>
                <th className="px-4 py-3 font-semibold text-center">Orderry</th>
                <th className="px-4 py-3 font-semibold text-center w-12">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((item, idx) => (
                <tr key={`${item.imeiFisico}-${idx}`} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.imeiFisico}</td>
                  <td className="px-4 py-3 text-slate-600">{item.agencia}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{item.marca} <span className="font-normal text-slate-400 ml-1">{item.modelo}</span></td>
                  <td className="px-4 py-3 text-slate-600">{item.noDocumento || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{item.material}</td>
                  <td className="px-4 py-3 text-center">
                    {item.foundInOrderry ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">✓</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-semibold text-[10px] uppercase tracking-wide cursor-help" title={item.razonNoOrderry}>Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      type="button" 
                      onClick={() => onRemove(idx)} 
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Eliminar del lote"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
