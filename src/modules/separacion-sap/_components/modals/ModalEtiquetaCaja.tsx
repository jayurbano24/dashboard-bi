'use client';

import { useCallback, useMemo } from 'react';
import { Box, Package, Printer, X } from 'lucide-react';
import { BarcodeCode128 } from '../barcode-code128';
import { capturasPorSubgrupo, subgrupoCompleto } from '../../domain/cajas/caja-utils';
import { labelValoracion } from '../../domain/cajas/valoracion';
import { TIPOS_PRODUCTO } from '../../domain/shared/constants';
import type { CajaEntidad, CajaSubgrupo } from '../../types';

type ModalEtiquetaCajaProps = {
  caja: CajaEntidad;
  onClose: () => void;
  /** Listado / caja abierta: muestra todos los sub-grupos y totales planificados. */
  vistaPrevia?: boolean;
};

function subgruposParaEtiqueta(caja: CajaEntidad, vistaPrevia: boolean): CajaSubgrupo[] {
  if (vistaPrevia) return caja.subgrupos;
  return caja.subgrupos.filter((sg) => sg.estado === 'LLENO' || subgrupoCompleto(caja, sg.id));
}

function valoracionClass(valoracion: CajaSubgrupo['valoracion']): string {
  switch (valoracion) {
    case 'VALORADO':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'NO_VALORADO':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function imprimirEtiquetaEnIframe(cajaNumero: string) {
  const node = document.getElementById('etiqueta-caja-print');
  if (!node) return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden',
  );
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${cajaNumero} · Etiqueta</title>
  ${stylesheets}
  <style>
    @page { size: 100mm auto; margin: 4mm; }
    html, body {
      margin: 0; padding: 0; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    body { display: flex; justify-content: center; padding: 0; }
    #etiqueta-caja-print {
      width: 100mm !important; max-width: 100mm !important;
      margin: 0 !important; box-shadow: none !important;
      border-radius: 0 !important;
    }
    .line-clamp-2 {
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
  </style>
</head>
<body>${node.outerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 400);

  const doPrint = () => {
    win.focus();
    win.print();
    win.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
  };

  if (doc.readyState === 'complete') setTimeout(doPrint, 150);
  else iframe.onload = () => setTimeout(doPrint, 150);
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center border-r border-slate-200/80 last:border-r-0 px-2 py-2.5 min-h-[52px] select-none">
      <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500 text-center leading-tight">
        {label}
      </span>
      <span className="mt-0.5 text-xl font-bold font-mono tabular-nums text-slate-900 leading-none">{value}</span>
    </div>
  );
}

export function ModalEtiquetaCaja({ caja, onClose, vistaPrevia = false }: ModalEtiquetaCajaProps) {
  const lineas = subgruposParaEtiqueta(caja, vistaPrevia);
  const totalUnidades = lineas.reduce((s, sg) => s + sg.cantidadEsperada, 0);
  const totalCapturadas = lineas.reduce((s, sg) => s + capturasPorSubgrupo(caja, sg.id), 0);
  const totalMateriales = new Set(lineas.map((l) => l.materialCodigo)).size;
  const pctCaptura = totalUnidades > 0 ? Math.min(100, Math.round((totalCapturadas / totalUnidades) * 100)) : 0;
  const fechaRef = caja.cerradaEn ? new Date(caja.cerradaEn) : new Date(caja.creadaEn);
  const fechaLegible = useMemo(
    () =>
      fechaRef.toLocaleString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [fechaRef],
  );

  const handleImprimir = useCallback(() => {
    imprimirEtiquetaEnIframe(caja.numeroCaja);
  }, [caja.numeroCaja]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-[2px] p-4 animate-fadeIn">
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="etiqueta-caja-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <Box className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="etiqueta-caja-title" className="text-base font-bold text-slate-900 tracking-tight">
                Etiqueta de caja
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                {vistaPrevia
                  ? 'Vista previa con totales planificados y avance de captura.'
                  : 'Etiqueta final para impresión en almacén.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f1f5f9_0%,#f8fafc_40%,#fff_100%)] px-5 py-5">
          <div className="mx-auto w-full max-w-[100mm]">
            <div
              id="etiqueta-caja-print"
              className="overflow-hidden rounded-lg border border-slate-300/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
            >
              {/* Encabezado marca */}
              <div className="relative bg-[#0f172a] px-4 py-3.5 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.35),transparent_55%)]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-teal-300/95">
                      TECHCORP · Separación SAP
                    </p>
                    <p className="mt-1.5 font-mono text-[34px] font-black leading-none tracking-tight text-white">
                      {caja.numeroCaja}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-300">
                      <span className="inline-flex rounded border border-teal-500/40 bg-teal-500/15 px-1.5 py-0.5 font-mono font-bold text-teal-100">
                        {caja.centro}
                      </span>
                      <span>Alm. {caja.almacen}</span>
                      <span className="text-slate-500">·</span>
                      <span>{fechaLegible}</span>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                    <Box className="h-5 w-5 text-teal-200" strokeWidth={1.75} />
                  </div>
                </div>
              </div>

              {vistaPrevia && totalUnidades > 0 && (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 select-none">
                  <div className="flex items-center justify-between gap-2 text-[9px] font-semibold text-slate-600">
                    <span>Avance de captura</span>
                    <span className="font-mono tabular-nums text-slate-800">
                      {totalCapturadas} / {totalUnidades} ({pctCaptura}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-500 transition-all"
                      style={{ width: `${pctCaptura}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex border-b border-slate-200 bg-white select-none">
                <StatCell label={vistaPrevia ? 'Equipos plan.' : 'Unidades'} value={totalUnidades} />
                <StatCell label="Sub-grupos" value={lineas.length} />
                <StatCell label="Materiales" value={totalMateriales} />
              </div>

              <div className="border-b border-slate-100 bg-slate-50/50 px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">Detalle por material</p>
              </div>

              <div className="space-y-0 divide-y divide-slate-100 p-0">
                {lineas.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[11px] text-slate-400 italic">Sin sub-grupos definidos.</p>
                ) : (
                  lineas.map((sg, index) => {
                    const capturadas = capturasPorSubgrupo(caja, sg.id);
                    return (
                      <div
                        key={sg.id}
                        className="px-3 py-2.5"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-700 text-[10px] font-bold text-white">
                            {index + 1}
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="font-mono text-[11px] font-bold text-slate-900 leading-tight">
                              {sg.materialCodigo}
                            </p>
                            <p className="mt-0.5 text-[9px] font-medium text-slate-600 line-clamp-2 leading-snug">
                              {sg.materialTexto}
                            </p>
                            <p className="mt-1 text-[9px] text-slate-500">
                              {sg.marca} · {sg.modelo}
                            </p>
                          </div>
                          <div className="text-right pt-0.5">
                            <p className="font-mono text-lg font-bold tabular-nums leading-none text-teal-800">
                              {sg.cantidadEsperada}
                            </p>
                            <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-wider text-slate-400">
                              uds
                            </p>
                            {vistaPrevia && (
                              <p className="mt-1 font-mono text-[8px] tabular-nums text-slate-500">
                                cap. {capturadas}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 pl-9">
                          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] font-medium text-slate-700">
                            <Package className="h-2.5 w-2.5 text-slate-400" />
                            {TIPOS_PRODUCTO[sg.tipoProducto]?.label ?? sg.tipoProducto}
                          </span>
                          <span
                            className={`inline-flex rounded border px-1.5 py-0.5 text-[8px] font-semibold ${valoracionClass(sg.valoracion)}`}
                          >
                            {labelValoracion(sg.valoracion)}
                          </span>
                          <span className="inline-flex rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[8px] font-semibold text-slate-600">
                            SG-{String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-3 py-3">
                <BarcodeCode128 value={caja.numeroCaja} className="mx-auto h-14 w-full" />
                <p className="mt-1 text-center font-mono text-lg font-black tracking-[0.18em] text-slate-900">
                  {caja.numeroCaja}
                </p>
                <p className="mt-1 text-center text-[8px] font-medium text-slate-500">
                  {caja.centro} · {totalUnidades} uds · {lineas.length} sub-grupo{lineas.length !== 1 ? 's' : ''} ·{' '}
                  {totalMateriales} material{totalMateriales !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            disabled={lineas.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Printer className="h-4 w-4" />
            Imprimir etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}
