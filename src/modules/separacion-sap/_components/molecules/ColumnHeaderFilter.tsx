'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';

type ColumnHeaderFilterProps = {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  align?: 'left' | 'right' | 'center';
};

const PANEL_WIDTH = 240;

export function ColumnHeaderFilter({
  label,
  options,
  selected,
  onChange,
  align = 'left',
}: ColumnHeaderFilterProps) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activo = selected.size > 0;

  const opcionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [busqueda, options]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      let left = rect.left;
      if (align === 'right') left = rect.right - PANEL_WIDTH;
      if (align === 'center') left = rect.left + rect.width / 2 - PANEL_WIDTH / 2;

      left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
      setPanelPos({ top: rect.bottom + 4, left });
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggleValor(valor: string) {
    const next = new Set(selected);
    if (next.has(valor)) next.delete(valor);
    else next.add(valor);
    onChange(next);
  }

  function seleccionarVisibles() {
    const next = new Set(selected);
    for (const o of opcionesFiltradas) next.add(o);
    onChange(next);
  }

  function limpiar() {
    onChange(new Set());
    setBusqueda('');
  }

  const panel =
    open && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left, width: PANEL_WIDTH }}
            className="fixed z-[9999] rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            <div className="p-2 border-b border-slate-100 space-y-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
                className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={seleccionarVisibles}
                  className="flex-1 px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Seleccionar
                </button>
                <button
                  type="button"
                  onClick={limpiar}
                  className="flex-1 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded inline-flex items-center justify-center gap-0.5"
                >
                  <X className="w-2.5 h-2.5" /> Limpiar
                </button>
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1 text-[11px]">
              {opcionesFiltradas.length === 0 ? (
                <li className="px-3 py-2 text-slate-400 italic">Sin coincidencias</li>
              ) : (
                opcionesFiltradas.map((opcion) => (
                  <li key={opcion}>
                    <label className="flex items-start gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(opcion)}
                        onChange={() => toggleValor(opcion)}
                        className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                      />
                      <span className="break-all leading-tight">{opcion}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <span className="whitespace-nowrap">{label}</span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={`Filtrar ${label}`}
          className={`p-0.5 rounded transition shrink-0 ${
            activo ? 'bg-teal-100 text-teal-800' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'
          }`}
        >
          <Filter className="w-3 h-3" />
          {activo && (
            <span className="sr-only">
              {selected.size} seleccionado{selected.size > 1 ? 's' : ''}
            </span>
          )}
        </button>
      </div>
      {panel}
    </>
  );
}
