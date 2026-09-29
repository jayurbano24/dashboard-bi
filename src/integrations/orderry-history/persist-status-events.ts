import { buildOrderStatusSourceEventId } from '@/lib/order-status-history';
import { insertOrderStatusHistory } from '@/lib/supabase-store';
import type { OrderryTimelineEvent } from './types';

export type PersistTimelineResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

/**
 * Persiste eventos en order_status_history únicamente.
 * No toca reporte, done_at, closed_at ni historial derivado del reporte.
 */
export async function persistOrderryTimelineEvents(
  events: OrderryTimelineEvent[],
): Promise<PersistTimelineResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const ev of events) {
    if (!ev.order_id || !ev.status_id || !ev.event_at || !ev.status_name?.trim()) {
      skipped += 1;
      continue;
    }

    const source_event_id =
      ev.source_event_id ||
      buildOrderStatusSourceEventId({
        source: ev.source,
        orderId: ev.order_id,
        statusId: ev.status_id,
        eventAt: ev.event_at,
      });

    try {
      await insertOrderStatusHistory({
        order_id: ev.order_id,
        status_id: ev.status_id,
        status_name: ev.status_name.trim(),
        changed_at: ev.event_at,
        source: ev.source,
        source_event_id,
      });
      inserted += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate|unique|conflict/i.test(msg)) {
        skipped += 1;
      } else {
        errors.push(`${ev.order_id}@${ev.event_at}: ${msg}`);
      }
    }
  }

  return { inserted, skipped, errors };
}
