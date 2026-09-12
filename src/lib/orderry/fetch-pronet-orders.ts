import { deduplicateReportRowsByOrder } from '@/lib/supabase-store';
import { orderryOrderToRawOrderData } from '@/lib/orderry-order-snapshot';
import { isPronetOrderFromOrderry } from '@/modules/report-engine/shared/pronet-config';
import type { RawOrderData } from '@/modules/report-engine/shared/types';
import { OrderryClient } from './client';
import type { OrderryOrder } from './types';

export type FetchPronetOrdersResult = {
  rows: RawOrderData[];
  scannedPages: number;
  scannedOrders: number;
  matchedOrders: number;
};

function withinCreatedRange(
  createdAt: string | null | undefined,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!createdAt) return true;
  const day = createdAt.slice(0, 10);
  if (startDate && day < startDate) return false;
  if (endDate && day > endDate) return false;
  return true;
}

/**
 * Órdenes PRONET no siempre están en despacho_conduce_rows.
 * Las buscamos directamente en Orderry por CANAL DE INGRESO / cliente / sucursal.
 */
export async function fetchPronetOrdersFromOrderry(options?: {
  startDate?: string;
  endDate?: string;
  lookbackDays?: number;
  maxPages?: number;
  client?: OrderryClient;
}): Promise<FetchPronetOrdersResult> {
  const client = options?.client ?? OrderryClient.fromEnv();
  const lookbackDays = options?.lookbackDays ?? 180;
  const maxPages = options?.maxPages ?? 100;

  const since = options?.startDate
    ? new Date(`${options.startDate}T00:00:00`)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - lookbackDays);
        return d;
      })();

  const matched: RawOrderData[] = [];
  let page = 1;
  let totalPages = 1;
  let scannedOrders = 0;

  while (page <= totalPages && page <= maxPages) {
    const batch = await client.listOrders({
      page,
      pageSize: 50,
      updatedSince: since.toISOString(),
      sort: 'modified_at',
    });

    const orders = batch.data;
    scannedOrders += orders.length;
    totalPages = Number(batch.paging?.total_pages || 1);

    for (const order of orders) {
      const o = order as OrderryOrder & { branch?: { name?: string } };
      if (!isPronetOrderFromOrderry(o)) continue;

      const row = orderryOrderToRawOrderData(o as unknown as Record<string, unknown>) as RawOrderData;
      if (!withinCreatedRange(row.created_at, options?.startDate, options?.endDate)) continue;

      matched.push(row);
    }

    page += 1;
  }

  return {
    rows: deduplicateReportRowsByOrder(matched),
    scannedPages: page - 1,
    scannedOrders,
    matchedOrders: matched.length,
  };
}

export function mergePronetReportRows(
  fromSupabase: RawOrderData[],
  fromOrderry: RawOrderData[],
): RawOrderData[] {
  const map = new Map<string, RawOrderData>();

  for (const row of fromSupabase) {
    const key = row.orderId ? String(row.orderId) : String(row.orderName || '').trim();
    if (key) map.set(key, row);
  }

  for (const row of fromOrderry) {
    const key = row.orderId ? String(row.orderId) : String(row.orderName || '').trim();
    if (key) map.set(key, row);
  }

  return [...map.values()];
}
