'use client';

import { useCallback } from 'react';
import { Box, Package, Printer, X } from 'lucide-react';
import { subgrupoCompleto } from '../../domain/cajas/caja-utils';
import { labelValoracion } from '../../domain/cajas/valoracion';
import { TIPOS_PRODUCTO } from '../../domain/shared/constants';
import type { CajaEntidad, CajaSubgrupo } from '../../types';

type ModalEtiquetaCajaProps = {
  caja: CajaEntidad;
  onClose: () => void;
};

function subgruposParaEtiqueta(caja: CajaEntidad): CajaSubgrupo[] {
  return caja.subgrupos.filter(
    (sg) => sg.estado === 'LLENO' || subgrupoCompleto(caja, sg.id),
  );
}

function valoracionClass(valoracion: CajaSubgrupo['valoracion']): string {
  switch (valoracion) {
    case 'VALORADO':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'NO_VALORADO':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
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
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 0;
    }
    #etiqueta-caja-print {
      width: 100%;
      max-width: 100mm;
      margin: 0 auto;
      box-shadow: none !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      overflow: hidden;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  </style>
</head>
<body>${node.outerHTML}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 400);
  };

  const doPrint = () => {
    win.focus();
    win.print();
    win.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
  };

  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 150);
  } else {
    iframe.onload = () => setTimeout(doPrint, 150);
  }
}

export function ModalEtiquetaCaja({ caja, onClose }: ModalEtiquetaCajaProps) {
  const lineas = subgruposParaEtiqueta(caja);
  const totalUnidades = lineas.reduce((s, sg) => s + sg.cantidadEsperada, 0);
  const cerradaEn = caja.cerradaEn ? new Date(caja.cerradaEn) : new Date();

  const handleImprimir = useCallback(() => {
    imprimirEtiquetaEnIframe(caja.numeroCaja);
  }, [caja.numeroCaja]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Etiqueta de Caja</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Vista previa · Al imprimir, desactiva &quot;Encabezados y pies&quot; en el diálogo del navegador
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-center">
          <div className="w-full max-w-[100mm] scale-[0.95] origin-top">
            <div id="etiqueta-caja-print" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-teal-300/90">
                      TECHCORP · Separación SAP
                    </div>
                    <div className="mt-1.5 text-2xl font-black font-mono tracking-tight">{caja.numeroCaja}</div>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                    <Box className="w-5 h-5 text-teal-200" />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="inline-flex px-1.5 py-0.5 rounded bg-teal-500/30 border border-teal-400/40 font-mono font-bold">
                    {caja.centro}
                  </span>
                  <span className="text-slate-300">Alm. {caja.almacen}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">
                    {cerradaEn.toLocaleDateString()}{' '}
                    {cerradaEn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/80">
                <div className="px-2 py-2 text-center">
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Unidades</div>
                  <div className="text-lg font-black font-mono text-slate-900">{totalUnidades}</div>
                </div>
                <div className="px-2 py-2 text-center">
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Sub-Grupos</div>
                  <div className="text-lg font-black font-mono text-slate-900">{lineas.length}</div>
                </div>
                <div className="px-2 py-2 text-center">
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Materiales</div>
                  <div className="text-lg font-black font-mono text-slate-900">
                    {new Set(lineas.map((l) => l.materialCodigo)).size}
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {lineas.map((sg, index) => (
                  <div
                    key={sg.id}
                    className="rounded-lg border border-slate-200 bg-white p-2.5"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center text-[9px] font-black text-teal-800">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-xs text-slate-900">{sg.materialCodigo}</div>
                          <div className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                            {sg.materialTexto}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-base font-black font-mono text-teal-800">{sg.cantidadEsperada}</div>
                        <div className="text-[8px] uppercase text-slate-400 font-semibold">uds</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Package className="w-2.5 h-2.5" />
                        {TIPOS_PRODUCTO[sg.tipoProducto]?.label}
                      </span>
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${valoracionClass(sg.valoracion)}`}
                      >
                        {labelValoracion(sg.valoracion)}
                      </span>
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                        SG-{String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-3 pb-3">
                <div className="rounded-md border-2 border-dashed border-slate-300 px-3 py-2 bg-slate-50 text-center">
                  <div className="font-mono text-[10px] font-bold tracking-[0.3em] text-slate-800 uppercase">
                    {caja.numeroCaja.replace(/-/g, ' ')}
                  </div>
                  <div className="text-[8px] text-slate-400 mt-0.5">
                    {caja.centro} · {totalUnidades} uds · {lineas.length} sub-grupo{lineas.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}
