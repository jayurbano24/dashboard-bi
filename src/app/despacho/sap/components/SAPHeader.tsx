'use client';

import { Smartphone } from 'lucide-react';

export function SAPHeader() {
  return (
    <div className="relative overflow-hidden p-6 md:p-8 border-b border-slate-200/60 bg-gradient-to-br from-slate-50 to-white">
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Smartphone className="w-64 h-64 text-blue-900" />
      </div>
      
      <div className="relative z-10 flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Ingreso de Equipos SAP
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Recepción, validación, conformación de lote y despacho hacia SAP
          </p>
        </div>
      </div>
    </div>
  );
}
