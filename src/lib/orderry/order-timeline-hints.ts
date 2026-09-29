import { OrderryClient } from './client';

export type OrderryTimelineHints = {
  /** Primera deducción de stock / repuesto en la orden (API items). */
  repairPartsAt: string | null;
  /** Primera obra/servicio con fecha en el detalle de orden. */
  firstWorkAt: string | null;
};

function earliestIso(dates: Array<string | null | undefined>): string | null {
  let min: string | null = null;
  for (const raw of dates) {
    const s = String(raw ?? '').trim();
    if (!s) continue;
    const t = new Date(s).getTime();
    if (Number.isNaN(t)) continue;
    if (!min || t < new Date(min).getTime()) min = s;
  }
  return min;
}

function worksFromOrder(order: Record<string, unknown>): Array<{ created_at?: string | null }> {
  const works = order.works;
  if (Array.isArray(works)) return works as Array<{ created_at?: string | null }>;
  return [];
}

/** Orderry no expone /history en esta cuenta; inferimos hitos desde items + works del GET orden. */
export async function fetchOrderryTimelineHints(
  orderId: string | number,
  client?: OrderryClient,
): Promise<OrderryTimelineHints | null> {
  const c = client ?? OrderryClient.fromEnv();
  const id = String(orderId).trim();
  if (!id) return null;

  try {
    const [order, items] = await Promise.all([c.getOrderById(id), c.getOrderItems(id)]);
    const repairPartsAt = earliestIso(items.map((i) => i.created_at));
    const firstWorkAt = earliestIso(worksFromOrder(order as unknown as Record<string, unknown>).map((w) => w.created_at));
    if (!repairPartsAt && !firstWorkAt) return null;
    return { repairPartsAt, firstWorkAt };
  } catch {
    return null;
  }
}
