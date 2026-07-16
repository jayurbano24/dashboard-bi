'use client';

import { useRef } from 'react';
import { AgencySelector } from './AgencySelector';
import { OrderryValidation } from './OrderryValidation';
import type { OrderryLookupState, SapLotFormDefaults } from '../types';

type Props = {
  lotDefaults: SapLotFormDefaults;
  onLotDefaultsChange: (patch: Partial<SapLotFormDefaults>) => void;
  agencies: string[];
  agenciesLoading: boolean;
  imei: string;
  onImeiChange: (value: string) => void;
  onImeiScanComplete: (imei: string) => void;
  agencia: string;
  onAgenciaChange: (value: string) => void;
  noDocumento: string;
  onNoDocumentoChange: (value: string) => void;
  marca: string;
  onMarcaChange: (value: string) => void;
  modelo: string;
  onModeloChange: (value: string) => void;
  comentario: string;
  onComentarioChange: (value: string) => void;
  lookup: OrderryLookupState;
  foundInOrderry: boolean;
  cliente: string;
  orderryStatus: string;
  canAdd: boolean;
  onSubmit: () => void;
};

export function SAPUnitForm({
  lotDefaults,
  onLotDefaultsChange,
  agencies,
  agenciesLoading,
  imei,
  onImeiChange,
  onImeiScanComplete,
  agencia,
  onAgenciaChange,
  noDocumento,
  onNoDocumentoChange,
  marca,
  onMarcaChange,
  modelo,
  onModeloChange,
  comentario,
  onComentarioChange,
  lookup,
  foundInOrderry,
  cliente,
  orderryStatus,
  canAdd,
  onSubmit,
}: Props) {
  const imeiRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        onImeiChange('');
        imeiRef.current?.focus();
      }}
      className="space-y-4 text-xs"
    >
      <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <h3 className="font-black text-slate-800 text-xs tracking-widest border-b border-slate-200/60 pb-2 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          DATOS DEL LOTE
        </h3>

        <div>
          <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Material SAP *</label>
          <input
            type="text"
            maxLength={50}
            required
            value={lotDefaults.material}
            onChange={(e) => onLotDefaultsChange({ material: e.target.value })}
            placeholder="Ej. 5603000123"
            className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white/80"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Fecha Aceptación *</label>
            <input
              type="date"
              required
              value={lotDefaults.fechaAceptacion}
              onChange={(e) => onLotDefaultsChange({ fechaAceptacion: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white/80"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Comentario</label>
            <input
              type="text"
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white/80"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Nota de Entrega</label>
          <input
            type="text"
            value={lotDefaults.notaEntrega}
            onChange={(e) => onLotDefaultsChange({ notaEntrega: e.target.value })}
            placeholder="Opcional"
            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white/80"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Número de Traslado</label>
          <input
            type="text"
            maxLength={30}
            value={lotDefaults.numeroTraslado}
            onChange={(e) => onLotDefaultsChange({ numeroTraslado: e.target.value })}
            placeholder="Opcional"
            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white/80"
          />
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 relative overflow-hidden">
        <h3 className="font-black text-slate-800 text-xs tracking-widest border-b border-slate-200/60 pb-2 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          DATOS DE LA UNIDAD
        </h3>

        <div>
          <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">IMEI Físico *</label>
          <div className="relative">
            <input
              ref={imeiRef}
              type="text"
              autoFocus
              placeholder="Escanee o digite IMEI..."
              value={imei}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                onImeiChange(val);
                if (val.length >= 14) onImeiScanComplete(val);
              }}
              className="w-full p-3 pl-10 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 7v10"/><path d="M11 7v10"/><path d="M15 7v10"/><path d="M19 7v10"/></svg>
            </div>
          </div>
          <div className="mt-2">
            <OrderryValidation
              lookup={lookup}
              foundInOrderry={foundInOrderry}
              marca={marca}
              modelo={modelo}
              cliente={cliente}
              orderryStatus={orderryStatus}
            />
          </div>
        </div>

        <div className="p-1">
          <AgencySelector agencies={agencies} value={agencia} onChange={onAgenciaChange} loading={agenciesLoading} />
        </div>

        <div>
          <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">No. Documento</label>
          <input
            type="text"
            value={noDocumento}
            onChange={(e) => onNoDocumentoChange(e.target.value)}
            placeholder="Opcional"
            className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white/80"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Marca *</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => onMarcaChange(e.target.value)}
              readOnly={foundInOrderry}
              className={`w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold transition-all ${foundInOrderry ? 'bg-slate-100/80 text-slate-500 border-dashed' : 'bg-white/80 focus:ring-2 focus:ring-blue-100'}`}
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1.5 tracking-wider">Modelo *</label>
            <input
              type="text"
              value={modelo}
              onChange={(e) => onModeloChange(e.target.value)}
              readOnly={foundInOrderry}
              className={`w-full p-2.5 border border-slate-200 rounded-xl text-sm transition-all ${foundInOrderry ? 'bg-slate-100/80 text-slate-500 border-dashed' : 'bg-white/80 focus:ring-2 focus:ring-blue-100'}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canAdd}
          className="relative overflow-hidden group w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="text-xl group-hover:scale-110 transition-transform">✓</span> 
            Agregar Equipo al Lote
          </span>
        </button>
      </div>
    </form>
  );
}
