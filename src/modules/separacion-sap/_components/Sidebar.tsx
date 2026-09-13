'use client';

import { Boxes, Database, LayoutDashboard, ShieldCheck } from 'lucide-react';
import type { SeparacionSapVista } from '../types';

const NAV_ITEMS: { id: SeparacionSapVista; label: string; icon: typeof Boxes }[] = [
  { id: 'cajas', label: 'Control de Cajas', icon: Boxes },
  { id: 'bsd', label: 'Inventario SAP', icon: Database },
  { id: 'auditoria', label: 'Auditoría Scanner', icon: ShieldCheck },
  { id: 'dashboard', label: 'Métricas', icon: LayoutDashboard },
];

type SidebarProps = {
  vista: SeparacionSapVista;
  setVista: (vista: SeparacionSapVista) => void;
};

export function SeparacionSapSidebar({ vista, setVista }: SidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-white min-h-screen py-5 flex flex-col justify-between shadow-xs">
      <div>
        <div className="px-5 pb-4 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              PX
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight">Separación SAP</div>
              <div className="text-[11px] text-teal-700 font-medium">Captura & Trazabilidad</div>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setVista(id)}
              className={`flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-lg text-left transition ${
                vista === id
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${vista === id ? 'text-teal-700' : 'text-slate-400'}`} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-4 py-3 mx-3 bg-teal-50/50 rounded-lg border border-teal-200 text-xs text-slate-600 space-y-1">
        <div className="font-semibold text-teal-900 flex items-center gap-1">
          <Database className="w-3.5 h-3.5 text-teal-700" /> Validación SAP
        </div>
        <div className="text-[11px] text-teal-700">Series capturadas deben existir en el Excel SAP cargado</div>
      </div>
    </aside>
  );
}
