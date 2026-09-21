'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ChevronLeft,
  Lock,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { emitirTonoScanner } from '../../application/audio';
import { useSeparacionSap } from '../../application/context';
import { validarCierreCaja } from '../../application/reducer/index';
import {
  capturasPorSubgrupo,
  puedeTerminarCaja,
  subgrupoCompleto,
  subgruposLlenos,
  totalesCaja,
} from '../../domain/cajas/caja-utils';
import { ejecutarCapturaSerieTransaccional } from '../../domain/cajas/capture';
import { DOMAIN_ERRORS, ESTADOS_CAJA, TIPOS_PRODUCTO } from '../../domain/shared/constants';
import { inventarioSapCargado } from '../../domain/inventario/sap-inventory';
import {
  actualizarEstadoCajaSeparacionSap,
  eliminarSubgrupoCajaSeparacionSap,
  registrarCapturaSeparacionSap,
} from '../../infrastructure/cajas/cajas-api';
import type { CapturaSerie, CajaSubgrupo } from '../../types';
import { CentroBadge, EstadoBadge, SubgrupoEstadoBadge, ValoracionBadge } from '../badges';
import { ModalDetalleCaja } from '../modals/ModalDetalleCaja';
import { ModalEditarSubgruposCaja } from '../modals/ModalEditarSubgruposCaja';
import { ModalEtiquetaCaja } from '../modals/ModalEtiquetaCaja';
import { StepperCrearSubgrupo } from '../modals/StepperCrearSubgrupo';

type VistaCapturaCajaProps = {
  cajaId: string;
  onVolver: () => void;
};

type ModoVista = 'lista' | 'crear-subgrupo' | 'pistoleando' | 'subgrupo-lleno';

type UltimoResultado = {
  tipo: 'OK' | 'ERROR';
  code: string;
  mensaje: string;
  serial?: string;
} | null;

function subgrupoActivoEnProgreso(subgrupos: CajaSubgrupo[], capturas: CapturaSerie[]): CajaSubgrupo | undefined {
  return subgrupos.find(
    (sg) => sg.estado === 'EN_PROGRESO' && capturasPorSubgrupo({ capturas }, sg.id) < sg.cantidadEsperada,
  );
}

export function VistaCapturaCaja({ cajaId, onVolver }: VistaCapturaCajaProps) {
  const { state, dispatch } = useSeparacionSap();
  const caja = state.cajas.find((c) => c.id === cajaId);

  const [modo, setModo] = useState<ModoVista>('lista');
  const [subgrupoActivoId, setSubgrupoActivoId] = useState('');
  const [inputSerial, setInputSerial] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState<UltimoResultado>(null);
  const [procesando, setProcesando] = useState(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [mostrarEditarSubgrupos, setMostrarEditarSubgrupos] = useState(false);
  const [mostrarEtiqueta, setMostrarEtiqueta] = useState(false);
  const [eliminandoSubgrupoId, setEliminandoSubgrupoId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const subgrupoActivo = useMemo(() => {
    if (!caja) return undefined;
    if (subgrupoActivoId) return caja.subgrupos.find((sg) => sg.id === subgrupoActivoId);
    return subgrupoActivoEnProgreso(caja.subgrupos, caja.capturas);
  }, [caja, subgrupoActivoId]);

  useEffect(() => {
    if (subgrupoActivo && subgrupoActivo.id !== subgrupoActivoId) {
      setSubgrupoActivoId(subgrupoActivo.id);
    }
  }, [subgrupoActivo, subgrupoActivoId]);

  useEffect(() => {
    if (modo === 'pistoleando') inputRef.current?.focus();
  }, [modo, ultimoResultado, procesando]);

  useEffect(() => {
    if (!caja || caja.estado !== ESTADOS_CAJA.ABIERTA) return;
    const enProgreso = subgrupoActivoEnProgreso(caja.subgrupos, caja.capturas);
    if (enProgreso && modo === 'lista') {
      setSubgrupoActivoId(enProgreso.id);
      setModo('pistoleando');
    }
  }, [caja?.id, caja?.estado, caja?.subgrupos.length, caja?.capturas.length, modo]);

  if (!caja) return <div className="text-sm text-slate-500">Caja no encontrada.</div>;

  const cajaActiva = caja;
  const sapCargado = inventarioSapCargado(state);
  const abierta = cajaActiva.estado === ESTADOS_CAJA.ABIERTA;
  const totales = totalesCaja(cajaActiva);
  const llenos = subgruposLlenos(cajaActiva);
  const puedeTerminar = puedeTerminarCaja(cajaActiva);
  const hayEnProgreso = cajaActiva.subgrupos.some(
    (sg) => sg.estado === 'EN_PROGRESO' && !subgrupoCompleto(cajaActiva, sg.id),
  );
  const puedeCrearSubgrupo = abierta && sapCargado && !hayEnProgreso && modo !== 'crear-subgrupo';

  async function procesarPistoleo(e: React.FormEvent) {
    e.preventDefault();
    const raw = inputSerial;
    if (!raw.trim() || !subgrupoActivo) return;

    if (!sapCargado) {
      emitirTonoScanner('ERROR', state.sonidoHabilitado);
      setUltimoResultado({ tipo: 'ERROR', code: 'SAP_NOT_LOADED', mensaje: DOMAIN_ERRORS.SAP_NOT_LOADED });
      return;
    }

    setProcesando(true);

    const resultado = ejecutarCapturaSerieTransaccional({
      cajas: state.cajas,
      bsdEquipos: state.bsdEquipos,
      cajaId: cajaActiva.id,
      subgrupoId: subgrupoActivo.id,
      rawSerial: raw,
      userId: 'OPERADOR_SCANNER',
    });

    if (resultado.success) {
      try {
        const persistido = await registrarCapturaSeparacionSap(cajaActiva.id, resultado.captura);
        emitirTonoScanner('OK', state.sonidoHabilitado);
        dispatch({ type: 'REGISTRAR_CAPTURA', payload: { caja: persistido.caja } });

        const sgActualizado = persistido.caja.subgrupos.find((sg) => sg.id === subgrupoActivo.id);
        const capturadas = capturasPorSubgrupo(persistido.caja, subgrupoActivo.id);
        const completo = sgActualizado?.estado === 'LLENO' || capturadas >= subgrupoActivo.cantidadEsperada;

        setUltimoResultado({
          tipo: 'OK',
          code: 'BASE_ENCONTRADO',
          mensaje: completo
            ? `Sub-Grupo completo: ${capturadas}/${subgrupoActivo.cantidadEsperada} unidades.`
            : `Serie capturada: ${capturadas}/${subgrupoActivo.cantidadEsperada}`,
        });

        if (completo) {
          setModo('subgrupo-lleno');
          setSubgrupoActivoId('');
        }
      } catch (err) {
        emitirTonoScanner('ERROR', state.sonidoHabilitado);
        const message = err instanceof Error ? err.message : 'No se pudo guardar la captura.';
        setUltimoResultado({ tipo: 'ERROR', code: 'PERSIST_ERROR', mensaje: message, serial: raw });
      }
    } else {
      emitirTonoScanner('ERROR', state.sonidoHabilitado);
      dispatch({
        type: 'REGISTRAR_RECHAZO_AUDITORIA',
        payload: { cajaId: cajaActiva.id, rawSerial: raw, code: resultado.code, message: resultado.message },
      });
      setUltimoResultado({ tipo: 'ERROR', code: resultado.code, mensaje: resultado.message, serial: raw });
    }

    setInputSerial('');
    setProcesando(false);
  }

  async function handleTerminarCaja() {
    const error = validarCierreCaja(cajaActiva);
    if (error) {
      dispatch({ type: 'SET_ERROR_GLOBAL', payload: error });
      return;
    }
    try {
      const result = await actualizarEstadoCajaSeparacionSap(cajaActiva.id, 'CERRADA');
      dispatch({ type: 'CERRAR_CAJA', payload: { caja: result.caja } });
      setMostrarEtiqueta(true);
    } catch (err) {
      dispatch({
        type: 'SET_ERROR_GLOBAL',
        payload: err instanceof Error ? err.message : 'No se pudo cerrar la caja.',
      });
    }
  }

  async function handleEliminarSubgrupo(subgrupoId: string, materialCodigo: string, capturadas: number) {
    const mensaje =
      capturadas > 0
        ? `¿Eliminar sub-grupo ${materialCodigo} y sus ${capturadas} captura(s)? Las series quedarán libres para re-captura.`
        : `¿Eliminar sub-grupo ${materialCodigo}?`;
    if (!window.confirm(mensaje)) return;

    setEliminandoSubgrupoId(subgrupoId);
    try {
      const { caja: cajaActualizada } = await eliminarSubgrupoCajaSeparacionSap(cajaActiva.id, subgrupoId);
      dispatch({
        type: 'ACTUALIZAR_CAJA',
        payload: { caja: cajaActualizada, notificacion: `Sub-Grupo ${materialCodigo} eliminado.` },
      });
      if (subgrupoActivoId === subgrupoId) {
        setSubgrupoActivoId('');
        setModo('lista');
        setUltimoResultado(null);
      } else if (modo === 'subgrupo-lleno') {
        setModo('lista');
      }
    } catch (err) {
      dispatch({
        type: 'SET_ERROR_GLOBAL',
        payload: err instanceof Error ? err.message : 'No se pudo eliminar el sub-grupo.',
      });
    } finally {
      setEliminandoSubgrupoId(null);
    }
  }

  function handleSubgrupoCreado(cajaActualizada: typeof cajaActiva, subgrupoId: string, yaLleno: boolean) {
    dispatch({ type: 'ACTUALIZAR_CAJA', payload: { caja: cajaActualizada } });
    if (yaLleno) {
      setModo('subgrupo-lleno');
      setSubgrupoActivoId('');
    } else {
      setSubgrupoActivoId(subgrupoId);
      setModo('pistoleando');
    }
    setUltimoResultado(null);
  }

  const progresoSubgrupo = subgrupoActivo
    ? capturasPorSubgrupo(cajaActiva, subgrupoActivo.id)
    : 0;
  const metaSubgrupo = subgrupoActivo?.cantidadEsperada ?? 0;

  return (
    <div className="max-w-5xl space-y-3 animate-fadeIn">
      <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={onVolver}
              className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-800 font-semibold shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Cajas
            </button>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-black font-mono text-slate-900">{cajaActiva.numeroCaja}</h1>
            <CentroBadge centro={cajaActiva.centro} />
            <EstadoBadge estado={cajaActiva.estado} />
            <span className="text-[10px] font-mono text-slate-500">
              {llenos.length} lleno{llenos.length !== 1 ? 's' : ''} · {totales.cantidadCapturada} uds
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {abierta && cajaActiva.subgrupos.length > 0 && (
              <button
                type="button"
                onClick={() => setMostrarEditarSubgrupos(true)}
                className="p-1 rounded border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
                title="Editar cantidad por sub-grupo"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMostrarModalDetalle(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            >
              <Tag className="w-3 h-3 text-teal-700" /> Detalle
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_SONIDO' })}
              className={`p-1 rounded border ${
                state.sonidoHabilitado
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {state.sonidoHabilitado ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {cajaActiva.subgrupos.length > 0 && (
          <div className="mt-2 overflow-x-auto border-t border-slate-100 pt-2">
            <table className="w-full text-[10px] text-left">
              <thead className="text-slate-500 font-semibold">
                <tr>
                  <th className="py-1 pr-2">Material</th>
                  <th className="py-1 pr-2">Tipo</th>
                  <th className="py-1 pr-2">Val.</th>
                  <th className="py-1 pr-2 text-center">Cant.</th>
                  <th className="py-1 pr-2">Estado</th>
                  {abierta && <th className="py-1 text-right w-8">Acc.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cajaActiva.subgrupos.map((sg) => {
                  const capturadas = capturasPorSubgrupo(cajaActiva, sg.id);
                  const activo = subgrupoActivo?.id === sg.id;
                  return (
                    <tr key={sg.id} className={activo ? 'bg-teal-50/60' : ''}>
                      <td className="py-1 pr-2">
                        <div className="font-mono font-bold text-teal-800">{sg.materialCodigo}</div>
                        <div className="text-[9px] text-slate-500 truncate max-w-[160px]">{sg.materialTexto}</div>
                      </td>
                      <td className="py-1 pr-2">{TIPOS_PRODUCTO[sg.tipoProducto]?.label}</td>
                      <td className="py-1 pr-2">
                        <ValoracionBadge valoracion={sg.valoracion} />
                      </td>
                      <td className="py-1 pr-2 text-center font-mono font-bold">
                        {capturadas}/{sg.cantidadEsperada}
                      </td>
                      <td className="py-1 pr-2">
                        <SubgrupoEstadoBadge estado={sg.estado} />
                      </td>
                      {abierta && (
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            onClick={() => void handleEliminarSubgrupo(sg.id, sg.materialCodigo, capturadas)}
                            disabled={eliminandoSubgrupoId === sg.id}
                            className="p-0.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded disabled:opacity-50"
                            title="Eliminar sub-grupo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!sapCargado && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-900">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div>
            <div className="font-bold">Inventario SAP requerido</div>
            <p className="mt-1">Suba el archivo Excel en Inventario SAP antes de pistoleo.</p>
          </div>
        </div>
      )}

      {/* Modo: crear sub-grupo (stepper) */}
      {modo === 'crear-subgrupo' && abierta && (
        <StepperCrearSubgrupo
          caja={cajaActiva}
          sonidoHabilitado={state.sonidoHabilitado}
          onCancel={() => setModo('lista')}
          onSubgrupoCreado={handleSubgrupoCreado}
          onError={(msg) => dispatch({ type: 'SET_ERROR_GLOBAL', payload: msg })}
        />
      )}

      {/* Modo: sub-grupo lleno */}
      {modo === 'subgrupo-lleno' && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="font-black text-sm">Sub-Grupo LLENO</div>
              <div className="text-xs mt-0.5">Cantidad exacta alcanzada. Unidades agrupadas por material.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setModo('crear-subgrupo');
                setUltimoResultado(null);
              }}
              className="flex-1 py-3 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-800 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Crear otro Sub-Grupo
            </button>
            <button
              type="button"
              onClick={() => setModo('lista')}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              Volver al listado
            </button>
          </div>
        </div>
      )}

      {/* Modo: pistoleando */}
      {modo === 'pistoleando' && subgrupoActivo && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-teal-600 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800">
                Pistoleando · {subgrupoActivo.materialCodigo} · {TIPOS_PRODUCTO[subgrupoActivo.tipoProducto]?.label}
              </div>
              <div className="text-lg font-black font-mono text-teal-800">
                {progresoSubgrupo} / {metaSubgrupo}
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-teal-600 transition-all"
                style={{ width: `${metaSubgrupo > 0 ? Math.min(100, (progresoSubgrupo / metaSubgrupo) * 100) : 0}%` }}
              />
            </div>
            <form onSubmit={(e) => void procesarPistoleo(e)} className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600" />
              <input
                ref={inputRef}
                type="text"
                value={inputSerial}
                onChange={(e) => setInputSerial(e.target.value)}
                disabled={procesando || !sapCargado}
                placeholder={`Escanee serie (${subgrupoActivo.longitudDigitos} dígitos) + ENTER…`}
                className="w-full pl-10 pr-24 py-3 text-lg font-mono font-bold border-2 border-teal-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:opacity-50"
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                disabled={procesando || !inputSerial.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-teal-700 text-white text-xs font-bold rounded-md disabled:opacity-40"
              >
                {procesando ? '…' : 'Capturar'}
              </button>
            </form>
          </div>

          {ultimoResultado && (
            <div
              className={`rounded-xl p-4 border text-xs shadow-xs ${
                ultimoResultado.tipo === 'OK'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {ultimoResultado.tipo === 'OK' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <div>
                  <div className="font-black uppercase">
                    {ultimoResultado.tipo === 'OK' ? 'OK' : ultimoResultado.code}
                  </div>
                  <div className="mt-0.5">{ultimoResultado.mensaje}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modo: lista — acciones principales */}
      {modo === 'lista' && abierta && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModo('crear-subgrupo')}
            disabled={!puedeCrearSubgrupo}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white text-[11px] font-bold rounded-lg hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Crear Sub-Grupo
          </button>
          {hayEnProgreso && subgrupoActivo && (
            <button
              type="button"
              onClick={() => setModo('pistoleando')}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-700 text-white text-[11px] font-bold rounded-lg hover:bg-sky-800"
            >
              <Barcode className="w-3.5 h-3.5" /> Continuar ({progresoSubgrupo}/{metaSubgrupo})
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleTerminarCaja()}
            disabled={!puedeTerminar}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg ${
              puedeTerminar
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Terminar Caja
          </button>
          {!puedeTerminar && llenos.length === 0 && sapCargado && (
            <span className="text-[10px] text-slate-500">Complete al menos un Sub-Grupo para terminar.</span>
          )}
        </div>
      )}

      {mostrarModalDetalle && <ModalDetalleCaja caja={cajaActiva} onClose={() => setMostrarModalDetalle(false)} />}
      {mostrarEditarSubgrupos && (
        <ModalEditarSubgruposCaja caja={cajaActiva} onClose={() => setMostrarEditarSubgrupos(false)} />
      )}
      {mostrarEtiqueta && (
        <ModalEtiquetaCaja
          caja={state.cajas.find((c) => c.id === cajaId) ?? cajaActiva}
          onClose={() => setMostrarEtiqueta(false)}
        />
      )}
    </div>
  );
}
