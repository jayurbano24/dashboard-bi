'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { SeparacionSapProvider, useSeparacionSap } from './application/context';
import { SeparacionSapSidebar } from './_components/Sidebar';
import { VistaCapturaCaja } from './_components/views/VistaCapturaCaja';
import { VistaCajasListado } from './_components/views/VistaCajasListado';
import { VistaMaestroBsd } from './_components/views/VistaMaestroBsd';
import { VistaAuditoriaRechazos } from './_components/views/VistaAuditoriaRechazos';
import { VistaDashboard } from './_components/views/VistaDashboard';
import type { SeparacionSapVista } from './types';

function SeparacionSapShell() {
  const { state, dispatch } = useSeparacionSap();
  const [vista, setVista] = useState<SeparacionSapVista>('cajas');
  const [cajaActivaId, setCajaActivaId] = useState<string | null>(null);
  const [ultimaCajaTrabajadaId, setUltimaCajaTrabajadaId] = useState<string | null>(null);

  function handleSeleccionarCaja(id: string) {
    setCajaActivaId(id);
    setUltimaCajaTrabajadaId(id);
  }

  function handleSetVista(next: SeparacionSapVista) {
    setVista(next);
    setCajaActivaId(null);
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60 text-slate-900 font-sans antialiased">
      <SeparacionSapSidebar vista={vista} setVista={handleSetVista} />
      <main className="flex-1 min-w-0 w-full p-8 overflow-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Dashboard
          </Link>
          <Link
            href="/despacho"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Módulo de Despacho
          </Link>
        </div>

        {state.errorGlobal && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-xs mb-4 shadow-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-semibold">{state.errorGlobal}</div>
            <button type="button" onClick={() => dispatch({ type: 'LIMPIAR_ERROR' })}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {state.notificacionExito && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-xs mb-4 shadow-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-semibold">{state.notificacionExito}</div>
            <button type="button" onClick={() => dispatch({ type: 'LIMPIAR_NOTIFICACION' })}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {vista === 'cajas' && !cajaActivaId && (
          <VistaCajasListado
            onSeleccionarCaja={handleSeleccionarCaja}
            cajaPrioritariaId={ultimaCajaTrabajadaId}
          />
        )}

        {vista === 'cajas' && cajaActivaId && (
          <VistaCapturaCaja cajaId={cajaActivaId} onVolver={() => setCajaActivaId(null)} />
        )}

        {vista === 'bsd' && <VistaMaestroBsd />}
        {vista === 'auditoria' && <VistaAuditoriaRechazos />}
        {vista === 'dashboard' && <VistaDashboard />}
      </main>
    </div>
  );
}

export default function SeparacionSapApp() {
  return (
    <SeparacionSapProvider>
      <SeparacionSapShell />
    </SeparacionSapProvider>
  );
}
