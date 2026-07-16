'use client';

import type { OrderryLookupState } from '../types';

type Props = {
  lookup: OrderryLookupState;
  foundInOrderry: boolean;
  marca: string;
  modelo: string;
  cliente: string;
  orderryStatus: string;
};

export function OrderryValidation({ lookup, foundInOrderry, marca, modelo, cliente, orderryStatus }: Props) {
  if (lookup.loading) {
    return <p className="mt-1 font-semibold text-[10px] text-blue-600">Consultando Orderry...</p>;
  }

  if (lookup.error) {
    return <p className="mt-1 font-semibold text-[10px] text-red-600">{lookup.error}</p>;
  }

  if (foundInOrderry && lookup.result?.found) {
    return (
      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] space-y-0.5">
        <p className="font-bold text-emerald-700">✓ Equipo encontrado</p>
        <p><span className="font-semibold">Marca:</span> {marca}</p>
        <p><span className="font-semibold">Modelo:</span> {modelo}</p>
        <p><span className="font-semibold">Estado:</span> {orderryStatus || lookup.result.rawStatus}</p>
        <p><span className="font-semibold">Cliente:</span> {cliente || '—'}</p>
      </div>
    );
  }

  if (!foundInOrderry && lookup.result && !lookup.result.found) {
    return (
      <p className="mt-1 font-semibold text-[10px] text-amber-700">
        Equipo no encontrado — complete la razón en el modal para continuar.
      </p>
    );
  }

  return null;
}
