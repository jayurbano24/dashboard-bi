import { getSupabaseAdmin } from '@/lib/supabase-store';
import { resolveEstadoCatalogoBatch } from '@/lib/orderry-status-catalog';
import { OrderryClient } from './client';
import { getSyncState, setSyncState } from './sync-state';
import type { OrderryOrder } from './types';

const SYNC_KEY = 'orderry_orders_last_sync';
const DEFAULT_LOOKBACK_DAYS = 90;
const COLOR_FIELD_ID = 'f3129228';

export type SyncOrderryOrdersResult = {
  fetched: number;
  updated: number;
  inserted: number;
  pages: number;
  updatedSince: string;
  finishedAt: string;
};

function pickColor(order: OrderryOrder): string {
  const cf = order.custom_fields || {};
  const fromCf = cf[COLOR_FIELD_ID] ?? cf.COLOR ?? cf.color;
  const raw = String(order.asset?.color || fromCf || '').trim();
  return raw && raw !== 'N/A' ? raw : '';
}

function extractLiveFields(order: OrderryOrder, catalogName?: string) {
  const statusId = order.status?.id ?? null;
  const statusLive = catalogName || order.status?.name || '';
  return {
    status_id: statusId,
    status_live: statusLive || null,
    modified_at: order.modified_at || null,
    done_at: order.done_at || null,
    closed_at: order.closed_at || null,
    color: pickColor(order) || null,
    last_synced_at: new Date().toISOString(),
    // Mantener columna legacy alineada con Orderry
    estado: statusLive || null,
    order_name: order.number || order.name || null,
    marca: order.asset?.brand || null,
    modelo: order.asset?.model || null,
    grupo: order.asset?.group || null,
    imei: order.asset?.uid || order.asset?.serial || null,
    serie: order.asset?.uid || order.asset?.serial || null,
  };
}

async function resolveUpdatedSince(explicit?: string | Date): Promise<string> {
  if (explicit) {
    return explicit instanceof Date ? explicit.toISOString() : explicit;
  }

  const state = await getSyncState<{ updatedSince?: string }>(SYNC_KEY);
  if (state?.updatedSince) {
    return state.updatedSince;
  }

  const d = new Date();
  d.setDate(d.getDate() - DEFAULT_LOOKBACK_DAYS);
  return d.toISOString();
}

export async function syncOrderryOrdersIncremental(options?: {
  updatedSince?: string | Date;
  pageSize?: number;
  maxPages?: number;
  client?: OrderryClient;
}): Promise<SyncOrderryOrdersResult> {
  const client = options?.client ?? OrderryClient.fromEnv();
  const pageSize = options?.pageSize ?? 50;
  const maxPages = options?.maxPages ?? 200;
  const updatedSince = await resolveUpdatedSince(options?.updatedSince);

  let page = 1;
  let totalPages = 1;
  let fetched = 0;
  let updated = 0;
  let inserted = 0;

  const supabase = getSupabaseAdmin();
  let maxModifiedAt = updatedSince;

  while (page <= totalPages && page <= maxPages) {
    const batch = await client.listOrders({
      page,
      pageSize,
      updatedSince,
      sort: 'modified_at',
    });

    const orders = batch.data;
    fetched += orders.length;
    totalPages = Number(batch.paging?.total_pages || 1);

    const statusIds = orders
      .map((o) => o.status?.id)
      .filter((id): id is number => typeof id === 'number' && id > 0);
    const catalog = await resolveEstadoCatalogoBatch(statusIds);

    for (const order of orders) {
      const orderId = String(order.id);
      const cat = order.status?.id ? catalog.get(order.status.id) : undefined;
      const live = extractLiveFields(order, cat?.estado);

      if (order.modified_at && order.modified_at > maxModifiedAt) {
        maxModifiedAt = order.modified_at;
      }

      const { data: existing, error: selectError } = await supabase
        .from('despacho_conduce_rows')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      if (selectError) {
        throw new Error(`Error leyendo despacho_conduce_rows: ${selectError.message}`);
      }

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from('despacho_conduce_rows')
          .update(live)
          .eq('order_id', orderId);

        if (updateError) {
          throw new Error(`Error actualizando orden ${orderId}: ${updateError.message}`);
        }
        updated += 1;
      } else {
        const fecha = (order.modified_at || order.created_at || new Date().toISOString()).slice(0, 10);
        const { error: insertError } = await supabase.from('despacho_conduce_rows').insert({
          conduce_id: `SYNC-${orderId}`,
          fecha,
          doa: false,
          courrier: '',
          numero_guia: '',
          precinto: '',
          origen: 'ORDERRY_SYNC',
          operador: '',
          retail: '',
          dealer: '',
          sucursal: '',
          order_id: orderId,
          ...live,
          payload: {
            sync_source: 'orderry',
            order_id: orderId,
            order_number: order.number || order.name,
            created_at: order.created_at,
            cliente: order.client?.name,
            falla: order.malfunction,
          },
        });

        if (insertError) {
          throw new Error(`Error insertando orden ${orderId}: ${insertError.message}`);
        }
        inserted += 1;
      }
    }

    page += 1;
  }

  const finishedAt = new Date().toISOString();
  await setSyncState(SYNC_KEY, { updatedSince: maxModifiedAt, finishedAt });

  return {
    fetched,
    updated,
    inserted,
    pages: page - 1,
    updatedSince,
    finishedAt,
  };
}
