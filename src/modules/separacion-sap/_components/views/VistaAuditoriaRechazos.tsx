'use client';

import { ShieldCheck } from 'lucide-react';
import { useSeparacionSap } from '../../application/context';

export function VistaAuditoriaRechazos() {
  const { state } = useSeparacionSap();
  const rechazos = state.auditoriaRechazos;

  return (
    <div className="max-w-5xl space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Auditoría Scanner & Trazabilidad</h1>
          <p className="text-xs text-slate-500">
            Registro de series bloqueadas y violaciones de reglas de validación en tiempo real.
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 bg-rose-100 text-rose-800 rounded-lg">
          {rechazos.length} rechazos registrados
        </span>
      </div>

      {rechazos.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
          No hay incidentes de rechazo registrados en la sesión actual. Todas las capturas han sido exitosas.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Serie Pistoleada</th>
                <th className="px-4 py-3">Código Error</th>
                <th className="px-4 py-3">Motivo / Descripción de Dominio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {rechazos.map((r) => (
                <tr key={r.id} className="hover:bg-rose-50/40">
                  <td className="px-4 py-2.5 text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{r.rawSerial || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                      {r.code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-sans text-slate-700">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
