/** Identificador estable para deduplicar eventos en order_status_history. */
export function buildOrderStatusSourceEventId(parts: {
  source: string;
  orderId: string;
  statusId: number;
  eventAt: string;
  remoteId?: string | null;
}): string {
  const remote = String(parts.remoteId ?? '').trim();
  if (remote) return remote;
  const at = String(parts.eventAt).trim();
  return `${parts.source}:${parts.orderId}:${parts.statusId}:${at}`;
}

export type OrderStatusTimelapseRow = {
  order_id: string;
  previous_status: string | null;
  previous_status_id: number | null;
  previous_status_at: string | null;
  current_status: string;
  current_status_id: number | null;
  current_status_at: string;
  current_source: string | null;
  current_source_event_id: string | null;
  elapsed_seconds: number;
  elapsed_hours: number;
  elapsed_days: number;
};

export function formatElapsedHuman(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}
