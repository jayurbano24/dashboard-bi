import type { OrderryTimelineEvent } from './types';
import type { OrderryEventLogItem } from './orderry-event-log-types';

const CONTEXT_ORDER = 2;

function epochMsToIso(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toISOString();
}

function isEventLogArray(body: unknown): body is OrderryEventLogItem[] {
  return Array.isArray(body);
}

/**
 * Normaliza cambios de estado del event log.
 * event_type 28 trae metadata.status; event_type 0 trae metadata.new (estado destino).
 * Ignora adjuntos, comentarios y asignaciones sin status.
 */
export function parseOrderryInternalTimelineResponse(
  orderId: string,
  body: unknown,
  statusNameById?: ReadonlyMap<number, string>,
): OrderryTimelineEvent[] {
  if (!isEventLogArray(body)) return [];

  const out: OrderryTimelineEvent[] = [];

  for (const item of body) {
    const statusId = statusIdFromEvent(item);
    if (statusId == null) continue;
    if (item.context_type != null && item.context_type !== CONTEXT_ORDER) continue;

    const eventAt = epochMsToIso(item.created_at);
    if (!eventAt) continue;

    const fromMeta = String(item.metadata?.status?.name ?? item.metadata?.new?.name ?? '').trim();
    const statusName = fromMeta || statusNameById?.get(statusId) || `status_${statusId}`;

    const remoteId =
      item.id != null
        ? `orderry:event-log:${item.id}`
        : `orderry:event-log:${orderId}:${item.created_at}:${item.event_type}:${statusId}`;

    out.push({
      order_id: orderId,
      status_id: statusId,
      status_name: statusName,
      event_at: eventAt,
      source: 'orderry_internal_api',
      source_event_id: remoteId,
      raw_meta: {
        event_type: item.event_type,
        context_object_id: item.context_object_id,
      },
    });
  }

  out.sort((a, b) => a.event_at.localeCompare(b.event_at));
  return out;
}

function statusIdFromEvent(item: OrderryEventLogItem): number | null {
  const direct = item.metadata?.status?.id;
  if (direct != null && Number.isFinite(direct)) return direct;
  if (item.event_type !== 0) return null;
  const entered = Number(item.metadata?.new?.id);
  if (!Number.isFinite(entered) || entered <= 0) return null;
  return entered;
}
