/** Tipos derivados de respuestas reales de Orderry Public API v2 (no inventados). */

export type OrderryStatusGroup = {
  type?: number;
  name?: string;
};

export type OrderryStatus = {
  id: number;
  name: string;
  color?: string;
  group?: OrderryStatusGroup;
};

export type OrderryOrderType = {
  id?: number;
  name?: string;
};

export type OrderryOrderStatusRef = {
  id?: number;
  name?: string;
  color?: string;
  group?: OrderryStatusGroup;
};

export type OrderryAsset = {
  uid?: string;
  serial?: string;
  imei?: string;
  serial_number?: string;
  brand?: string;
  model?: string;
  title?: string;
  color?: string;
  group?: string;
};

export type OrderryClientRef = {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phones?: Array<{ number?: string; label?: string; type?: string; name?: string }>;
};

/** Respuesta de GET /v2/orders/{id} — campos observados en producción. */
export type OrderryOrder = {
  id: number;
  number?: string;
  name?: string;
  status?: OrderryOrderStatusRef;
  status_overdue?: boolean;
  created_at?: string;
  modified_at?: string;
  done_at?: string | null;
  closed_at?: string | null;
  created_by_id?: number;
  closed_by_id?: number | null;
  branch_id?: number;
  order_type?: OrderryOrderType;
  manager_id?: number | null;
  asset?: OrderryAsset;
  client?: OrderryClientRef;
  contact?: OrderryClientRef;
  custom_fields?: Record<string, unknown>;
  malfunction?: string;
  description?: string;
  engineer?: { name?: string; full_name?: string };
  executor?: { name?: string; full_name?: string };
  assigned_to?: { name?: string };
  manager?: { name?: string };
  employee?: { full_name?: string };
  brand?: string;
  model?: string;
  device_name?: string;
  serial_number?: string;
  imei?: string;
};

export type OrderryPaging = {
  page?: number;
  total_pages?: number;
  count?: number;
  limit?: number;
};

export type OrderryPagedResponse<T> = {
  data: T[];
  paging?: OrderryPaging;
};

export type ListOrdersParams = {
  page?: number;
  /** Máx. 50 según doc; el proyecto usa hasta 200 en rutas existentes. */
  pageSize?: number;
  updatedSince?: string | Date;
  updatedUntil?: string | Date;
  orderIds?: Array<number | string>;
  numbers?: string[];
  sort?: string;
};

export type OrderryClientOptions = {
  apiKey: string;
  baseUrl?: string;
  /** Doc: 3 req/s → ~334ms mínimo entre requests. */
  minIntervalMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
};

export type OrderryRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  skipRateLimit?: boolean;
};
