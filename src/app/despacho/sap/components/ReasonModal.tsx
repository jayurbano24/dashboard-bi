'use client';

import { SAP_RAZONES_NO_ORDERRY, type SapRazonNoOrderry } from '@/modules/sap/domain/sap-status';

type Props = {
  open: boolean;
  imei: string;
  razon: SapRazonNoOrderry | '';
  observaciones: string;
  onRazonChange: (value: SapRazonNoOrderry | '') => void;
  onObservacionesChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReasonModal({
  open,
  imei,
  razon,
  observaciones,
  onRazonChange,
  onObservacionesChange,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  const needsObs = razon === 'Otro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 border border-slate-200/60 animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-3xl"></div>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100/80 text-amber-600 rounded-2xl shadow-sm border border-amber-200/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Equipo no encontrado</h3>
            <p className="text-sm text-slate-500 mt-1">
              IMEI: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">{imei}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Razón de Recepción Manual *</label>
            <div className="relative">
              <select
                value={razon}
                onChange={(e) => onRazonChange(e.target.value as SapRazonNoOrderry | '')}
                className="w-full p-3 pl-4 pr-10 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all appearance-none font-medium text-slate-700"
              >
                <option value="">Seleccione un motivo...</option>
                {SAP_RAZONES_NO_ORDERRY.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {needsObs && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Observaciones *</label>
              <textarea
                value={observaciones}
                onChange={(e) => onObservacionesChange(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 resize-none"
                placeholder="Describa brevemente el motivo..."
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!razon || (needsObs && !observaciones.trim())}
            className="px-5 py-2.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
