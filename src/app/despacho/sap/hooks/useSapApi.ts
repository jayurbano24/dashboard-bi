'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SapBatchItem, SapLotFormDefaults } from '../types';

async function fetchAgencies(): Promise<string[]> {
  const res = await fetch('/api/despacho/sap/agencies', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error cargando agencias');
  return data.agencies || [];
}

async function fetchHistory(filters: { startDate?: string; endDate?: string; searchTerm?: string }) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.searchTerm) params.set('searchTerm', filters.searchTerm);
  const res = await fetch(`/api/despacho/sap?${params}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error cargando historial');
  return data.rows || [];
}

export function useSapAgencies() {
  return useQuery({ queryKey: ['sap-agencies'], queryFn: fetchAgencies });
}

export function useSapHistory(filters: { startDate?: string; endDate?: string; searchTerm?: string }) {
  return useQuery({
    queryKey: ['sap-history', filters],
    queryFn: () => fetchHistory(filters),
  });
}

export function useSaveSapLot(onSuccess?: (loteId: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      lotDefaults: SapLotFormDefaults;
      equipos: SapBatchItem[];
    }) => {
      const res = await fetch('/api/despacho/sap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: payload.lotDefaults.material,
          fechaAceptacion: payload.lotDefaults.fechaAceptacion,
          numeroTraslado: payload.lotDefaults.numeroTraslado,
          notaEntrega: payload.lotDefaults.notaEntrega,
          equipos: payload.equipos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sap-history'] });
      onSuccess?.(data.loteId);
    },
  });
}

export function useDispatchSapLot(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      loteId: string;
      fechaEntrega: string;
      conduce: string;
      transportista?: string;
      recibidoPor?: string;
      observaciones?: string;
    }) => {
      const res = await fetch('/api/despacho/sap/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al despachar');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sap-history'] });
      onSuccess?.();
    },
  });
}

export async function validateImeiApi(imei: string) {
  const res = await fetch(`/api/despacho/sap/validate?imei=${encodeURIComponent(imei)}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error validando IMEI');
  return data;
}
