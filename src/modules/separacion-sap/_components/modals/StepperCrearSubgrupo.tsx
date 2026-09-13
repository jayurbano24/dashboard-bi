'use client';

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
  Package,
} from 'lucide-react';
import { emitirTonoScanner } from '../../application/audio';
import { SAP_SERIE_NOT_FOUND_BEHAVIOR } from '../../domain/shared/sap-config';
import { TIPOS_PRODUCTO } from '../../domain/shared/constants';
import { labelValoracion } from '../../domain/cajas/valoracion';
import { crearSubgrupoGuiadoSeparacionSap, lookupSerieSap } from '../../infrastructure/cajas/cajas-api';
import type { CajaEntidad, TipoProductoId, ValoracionSubgrupo } from '../../types';

type LookupOk = {
  normalizedSerial: string;
  materialCodigo: string;
  materialTexto: string;
  centro: string;
  almacen: string;
  lote: string;
  statusSistema: string;
  valoracion: ValoracionSubgrupo;
  cantidadDisponibleSap: number;
  marcaInferida: string;
  modeloInferido: string;
  longitudDigitos: number;
};
import { ValoracionBadge } from '../badges';

type StepperCrearSubgrupoProps = {
  caja: CajaEntidad;
  sonidoHabilitado: boolean;
  onCancel: () => void;
  onSubgrupoCreado: (caja: CajaEntidad, subgrupoId: string, yaLleno: boolean) => void;
  onError: (message: string) => void;
};

type Paso = 'tipo' | 'escanear' | 'detalle' | 'confirmando';

const STEPS: { id: Paso; label: string }[] = [
  { id: 'tipo', label: 'Tipo' },
  { id: 'escanear', label: 'Escanear serie' },
  { id: 'detalle', label: 'Detalle SAP' },
  { id: 'confirmando', label: 'Confirmar' },
];

export function StepperCrearSubgrupo({
  caja,
  sonidoHabilitado,
  onCancel,
  onSubgrupoCreado,
  onError,
}: StepperCrearSubgrupoProps) {
  const [paso, setPaso] = useState<Paso>('tipo');
  const [tipoProducto, setTipoProducto] = useState<TipoProductoId>('UNIDAD_COMPLETA');
  const [inputSerial, setInputSerial] = useState('');
  const [lookup, setLookup] = useState<LookupOk | null>(null);
  const [errorLookup, setErrorLookup] = useState<{ code: string; message: string } | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [procesando, setProcesando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pasoIndex = STEPS.findIndex((s) => s.id === paso);

  async function handleEscanear(e: React.FormEvent) {
    e.preventDefault();
    if (!inputSerial.trim()) return;

    setProcesando(true);
    setErrorLookup(null);

    const result = await lookupSerieSap({
      serial: inputSerial,
      centroCaja: caja.centro,
      cajaId: caja.id,
    });

    if (!result.ok) {
      emitirTonoScanner('ERROR', sonidoHabilitado);
      setErrorLookup({ code: result.code ?? 'ERROR', message: result.error });
      setProcesando(false);
      return;
    }

    emitirTonoScanner('OK', sonidoHabilitado);
    setLookup(result.lookup);
    setCantidad(1);
    setPaso('detalle');
    setProcesando(false);
  }

  async function handleConfirmarCantidad() {
    if (!lookup) return;
    if (cantidad < 1) {
      onError('La cantidad debe ser al menos 1.');
      return;
    }

    setProcesando(true);
    setPaso('confirmando');

    try {
      const result = await crearSubgrupoGuiadoSeparacionSap(caja.id, {
        tipoProducto,
        cantidadEsperada: cantidad,
        marca: lookup.marcaInferida,
        modelo: lookup.modeloInferido,
        materialCodigo: lookup.materialCodigo,
        materialTexto: lookup.materialTexto,
        longitudDigitos: lookup.longitudDigitos,
        valoracion: lookup.valoracion,
        cantidadDisponibleSap: lookup.cantidadDisponibleSap,
        primeraSerie: {
          normalizedSerial: lookup.normalizedSerial,
          almacen: lookup.almacen,
          lote: lookup.lote,
          statusBsd: lookup.statusSistema,
          statusCaptura: 'BASE_ENCONTRADO',
        },
      });

      emitirTonoScanner('OK', sonidoHabilitado);
      onSubgrupoCreado(result.caja, result.subgrupoId, cantidad === 1);
    } catch (err) {
      emitirTonoScanner('ERROR', sonidoHabilitado);
      onError(err instanceof Error ? err.message : 'No se pudo crear el Sub-Grupo.');
      setPaso('detalle');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-teal-600 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Crear Sub-Grupo</h2>
        <button type="button" onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-800 font-semibold">
          Cancelar
        </button>
      </div>

      {/* Stepper indicator */}
      <div className="flex items-center gap-1">
        {STEPS.slice(0, 3).map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                i <= pasoIndex ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-1 text-[10px] font-semibold hidden sm:inline ${i <= pasoIndex ? 'text-teal-800' : 'text-slate-400'}`}>
              {step.label}
            </span>
            {i < 2 && <ChevronRight className="w-3 h-3 mx-1 text-slate-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Paso 1: Tipo */}
      {paso === 'tipo' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">Seleccione el tipo de equipo para este Sub-Grupo:</p>
          <div className="grid grid-cols-2 gap-3">
            {(['UNIDAD_COMPLETA', 'TARJETA'] as TipoProductoId[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  setTipoProducto(tipo);
                  setPaso('escanear');
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  tipoProducto === tipo
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                {tipo === 'UNIDAD_COMPLETA' ? (
                  <Package className="w-8 h-8 text-teal-700" />
                ) : (
                  <Cpu className="w-8 h-8 text-violet-700" />
                )}
                <span className="text-xs font-bold">{TIPOS_PRODUCTO[tipo].label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: Escanear primera serie */}
      {paso === 'escanear' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Layers className="w-4 h-4 text-teal-700" />
            Tipo: <strong>{TIPOS_PRODUCTO[tipoProducto].label}</strong> · Centro: <strong>{caja.centro}</strong>
          </div>
          <p className="text-xs text-slate-600">Pistolee la <strong>primera serie</strong> del Sub-Grupo:</p>

          <form onSubmit={(e) => void handleEscanear(e)} className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600" />
            <input
              ref={inputRef}
              type="text"
              value={inputSerial}
              onChange={(e) => setInputSerial(e.target.value)}
              disabled={procesando}
              placeholder="Escanee serie + ENTER…"
              className="w-full pl-10 pr-24 py-3 text-lg font-mono font-bold border-2 border-teal-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              disabled={procesando || !inputSerial.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 bg-teal-700 text-white text-xs font-bold rounded-md disabled:opacity-40"
            >
              {procesando ? '…' : 'Validar'}
            </button>
          </form>

          {errorLookup && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-black uppercase">{errorLookup.code}</div>
                  <div className="mt-0.5">{errorLookup.message}</div>
                </div>
              </div>
            </div>
          )}

          {SAP_SERIE_NOT_FOUND_BEHAVIOR !== 'BLOCK' && (
            <p className="text-[10px] text-slate-400">
              Config serie no encontrada: {SAP_SERIE_NOT_FOUND_BEHAVIOR} (TODO: caso borde #1)
            </p>
          )}
        </div>
      )}

      {/* Paso 3: Detalle SAP + cantidad */}
      {paso === 'detalle' && lookup && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> Serie validada en SAP
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-slate-500">Serie:</span>{' '}
                <span className="font-mono font-bold">{lookup.normalizedSerial}</span>
              </div>
              <div>
                <span className="text-slate-500">Material:</span>{' '}
                <span className="font-mono font-bold">{lookup.materialCodigo}</span>
              </div>
              <div className="col-span-2 text-slate-600 truncate">{lookup.materialTexto}</div>
              <div>
                <span className="text-slate-500">Disponible SAP:</span>{' '}
                <span className="font-bold">{lookup.cantidadDisponibleSap} uds</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Valoración:</span>
                <ValoracionBadge valoracion={lookup.valoracion} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="cantidad-subgrupo" className="block text-xs font-bold text-slate-700 mb-1.5">
              Cantidad exacta a pistoleo para este Sub-Grupo
            </label>
            <input
              id="cantidad-subgrupo"
              type="number"
              min={1}
              max={lookup.cantidadDisponibleSap}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 text-lg font-mono font-bold border-2 border-slate-300 rounded-lg focus:border-teal-600 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              La primera serie ya cuenta como 1/{cantidad}. Deberá escanear {Math.max(0, cantidad - 1)} más.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleConfirmarCantidad()}
            disabled={procesando}
            className="w-full py-3 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-800 disabled:opacity-50"
          >
            {procesando ? 'Creando Sub-Grupo…' : `Confirmar ${cantidad} unidad${cantidad > 1 ? 'es' : ''} e iniciar pistoleo`}
          </button>
        </div>
      )}

      {paso === 'confirmando' && (
        <div className="py-8 text-center text-xs text-slate-500">Creando Sub-Grupo y registrando primera serie…</div>
      )}
    </div>
  );
}
