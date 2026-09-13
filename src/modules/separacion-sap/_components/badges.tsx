'use client';

import { Building2, Lock, Truck } from 'lucide-react';
import { labelValoracion } from '../domain/cajas/valoracion';
import type { EstadoCaja, EstadoSubgrupo, ValoracionSubgrupo } from '../types';

export function EstadoBadge({ estado }: { estado: EstadoCaja }) {
  const map: Record<EstadoCaja, string> = {
    ABIERTA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CERRADA: 'bg-amber-50 text-amber-700 border-amber-200',
    DESPACHADA: 'bg-slate-100 text-slate-600 border-slate-300',
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${map[estado]}`}>
      {estado === 'CERRADA' && <Lock className="w-3 h-3" />}
      {estado === 'DESPACHADA' && <Truck className="w-3 h-3" />}
      {estado}
    </span>
  );
}

export function ValoracionBadge({ valoracion }: { valoracion: ValoracionSubgrupo | null }) {
  const map: Record<string, string> = {
    VALORADO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    NO_VALORADO: 'bg-amber-50 text-amber-800 border-amber-200',
    PENDIENTE: 'bg-slate-100 text-slate-600 border-slate-300',
  };
  const key = valoracion ?? 'PENDIENTE';
  return (
    <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded border ${map[key] ?? map.PENDIENTE}`}>
      {labelValoracion(valoracion)}
    </span>
  );
}

export function SubgrupoEstadoBadge({ estado }: { estado: EstadoSubgrupo }) {
  const map: Record<EstadoSubgrupo, string> = {
    EN_PROGRESO: 'bg-sky-50 text-sky-800 border-sky-200',
    LLENO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    PENDIENTE_VALIDAR_SAP: 'bg-orange-50 text-orange-800 border-orange-200',
  };
  const labels: Record<EstadoSubgrupo, string> = {
    EN_PROGRESO: 'En progreso',
    LLENO: 'Lleno',
    PENDIENTE_VALIDAR_SAP: 'Pend. SAP',
  };
  return (
    <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded border ${map[estado]}`}>
      {labels[estado]}
    </span>
  );
}

export function CentroBadge({ centro }: { centro: string }) {
  const map: Record<string, string> = {
    G945: 'bg-teal-50 text-teal-800 border-teal-300',
    G935: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    G944: 'bg-sky-50 text-sky-800 border-sky-300',
  };

  return (
    <span
      className={`inline-flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded border ${
        map[centro] || 'bg-slate-50 text-slate-700 border-slate-300'
      }`}
    >
      <Building2 className="w-3 h-3 mr-1 opacity-70" />
      {centro}
    </span>
  );
}
