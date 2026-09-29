/** Evento normalizado listo para persistir en order_status_history (sin inferencias). */
export type OrderryTimelineEvent = {
  order_id: string;
  status_id: number;
  status_name: string;
  event_at: string;
  source: 'orderry_internal_api' | 'orderry_timeline_scraper';
  source_event_id: string;
  /** Payload mínimo para auditoría (sin cookies/tokens). */
  raw_meta?: Record<string, unknown>;
};

export type OrderryTimelineFetchResult = {
  order_id: string;
  order_number: string;
  events: OrderryTimelineEvent[];
  fetch_method: 'internal_api' | 'dom_scraper' | 'none';
  warnings: string[];
};
