'use client';

import type { DispatchFormData } from '../types';
import { todayIso } from '../types';

type Props = {
  open: boolean;
  saving: boolean;
  form: DispatchFormData;
  onChange: (patch: Partial<DispatchFormData>) => void;
  onConfirm: () => void;
  onClose: () => void;
  equiposCount: number;
};

export function DispatchModal({ open, saving, form, onChange, onConfirm, onClose, equiposCount }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6 border border-slate-200/60 animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-3xl"></div>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100/80 text-blue-600 rounded-2xl shadow-sm border border-blue-200/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Registrar Salida SAP</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{equiposCount}</span> equipo(s) pasarán a estado <span className="font-bold text-emerald-600">ENTREGADO SAP</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Conduce *</label>
            <input
              type="text"
              required
              value={form.conduce}
              onChange={(e) => onChange({ conduce: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono text-base font-bold shadow-inner"
              placeholder="Ingrese el número de conduce..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Entrega *</label>
            <input
              type="date"
              required
              value={form.fechaEntrega || todayIso()}
              onChange={(e) => onChange({ fechaEntrega: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Transportista</label>
            <input
              type="text"
              value={form.transportista}
              onChange={(e) => onChange({ transportista: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              placeholder="Opcional"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recibido por</label>
            <input
              type="text"
              value={form.recibidoPor}
              onChange={(e) => onChange({ recibidoPor: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              placeholder="Opcional"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Observaciones</label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={(e) => onChange({ observaciones: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 resize-none"
              placeholder="Información adicional sobre la salida..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !form.conduce.trim()}
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registrando...
              </>
            ) : 'Confirmar Salida'}
          </button>
        </div>
      </div>
    </div>
  );
}
