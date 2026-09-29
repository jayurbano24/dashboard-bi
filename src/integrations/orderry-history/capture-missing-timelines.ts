import { createOrderryClientFromEnv } from '@/lib/orderry/client';
import { getSupabaseAdmin } from '@/lib/supabase-store';
import { resolveOrderryEventLogStorage } from './fetch-event-log-web';
import { OrderryHistoryClient } from './OrderryHistoryClient';
import { persistOrderryTimelineEvents } from './persist-status-events';

const SYNTHETIC_SOURCES = new Set(['synthetic_created', 'synthetic_current', 'backfill_incompleto']);
const CAPTURE_CONCURRENCY = 4;

export type CaptureMissingTimelinesResult = {
  missing: number;
  capturedOrders: number;
  insertedEvents: number;
  skippedNoSession: boolean;
  /** Órdenes que siguen sin historial real después de esta pasada. */
  pending: number;
};

const isAuthFailure = (warnings: string[]): boolean =>
  warnings.some((warning) => /HTTP 401|HTTP 403|unauthorized|sesi[oó]n/i.test(warning));

/**
 * Guarda en order_status_history el event log de Orderry para órdenes Claro
 * que aún no tienen cambios de estado reales. Sin límite: recorre todas las
 * que llegan. Las que ya tienen historial real no se vuelven a pedir.
 */
export async function captureMissingOrderryTimelines(
  orders: Array<{ orderId: string; orderName: string }>,
  options?: { limit?: number },
): Promise<CaptureMissingTimelinesResult> {
  const unique = new Map<string, string>();
  for (const order of orders) {
    const orderId = order.orderId.trim();
    if (!orderId || unique.has(orderId)) continue;
    unique.set(orderId, order.orderName.trim() || orderId);
  }

  const empty: CaptureMissingTimelinesResult = {
    missing: 0,
    capturedOrders: 0,
    insertedEvents: 0,
    skippedNoSession: false,
    pending: 0,
  };
  if (unique.size === 0) return empty;

  const supabase = getSupabaseAdmin();
  const covered = new Set<string>();
  const ids = [...unique.keys()];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from('order_status_history')
      .select('order_id, source')
      .in('order_id', chunk);
    if (error) throw new Error(`order_status_history: ${error.message}`);
    for (const row of data || []) {
      const source = String(row.source ?? '').trim().toLowerCase();
      if (source && SYNTHETIC_SOURCES.has(source)) continue;
      covered.add(String(row.order_id));
    }
  }

  const missing = ids.filter((id) => !covered.has(id));
  if (missing.length === 0) return empty;

  if (!resolveOrderryEventLogStorage(process.env.ORDERRY_PLAYWRIGHT_STORAGE)) {
    return { ...empty, missing: missing.length, skippedNoSession: true, pending: missing.length };
  }

  const explicitLimit = options?.limit;
  const batch =
    explicitLimit != null && explicitLimit > 0 ? missing.slice(0, explicitLimit) : missing;

  let statusNameById: Map<number, string> | undefined;
  try {
    const api = createOrderryClientFromEnv(process.env);
    const statuses = await api.getOrderStatuses();
    statusNameById = new Map(statuses.map((status) => [status.id, status.name]));
  } catch {
    statusNameById = undefined;
  }

  const playwright = await import('playwright');
  const storage = resolveOrderryEventLogStorage(process.env.ORDERRY_PLAYWRIGHT_STORAGE);
  const requestContext = await playwright.request.newContext({ storageState: storage! });
  const client = new OrderryHistoryClient();
  let capturedOrders = 0;
  let insertedEvents = 0;
  let cursor = 0;
  let authFailed = false;
  let processed = 0;
  let unresolved = 0;

  const worker = async (): Promise<void> => {
    while (!authFailed) {
      const index = cursor;
      cursor += 1;
      if (index >= batch.length) return;
      const orderId = batch[index]!;
      const result = await client.fetchTimelineForOrder(
        orderId,
        unique.get(orderId) || orderId,
        requestContext,
        statusNameById,
      );
      processed += 1;
      if (isAuthFailure(result.warnings)) {
        authFailed = true;
        unresolved += 1;
        return;
      }
      if (result.events.length === 0) {
        unresolved += 1;
        continue;
      }
      const persisted = await persistOrderryTimelineEvents(result.events);
      if (persisted.inserted > 0) capturedOrders += 1;
      insertedEvents += persisted.inserted;
    }
  };

  try {
    const workers = Array.from(
      { length: Math.min(CAPTURE_CONCURRENCY, batch.length) },
      () => worker(),
    );
    await Promise.all(workers);
  } finally {
    await requestContext.dispose();
  }

  const pending = Math.max(0, missing.length - batch.length + unresolved + (batch.length - processed));

  return {
    missing: missing.length,
    capturedOrders,
    insertedEvents,
    skippedNoSession: authFailed && capturedOrders === 0 && insertedEvents === 0,
    pending: Math.max(0, pending),
  };
}
