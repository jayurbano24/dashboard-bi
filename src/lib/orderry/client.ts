import { getOrderryConfigFromEnv } from './config';
import type {
  ListOrdersParams,
  OrderryClientOptions,
  OrderryOrder,
  OrderryPagedResponse,
  OrderryRequestOptions,
  OrderryStatus,
} from './types';

export class OrderryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'OrderryApiError';
  }
}

/** Orderry exige ISO8601 sin milisegundos: 2026-01-01T00:00:00Z */
function formatOrderryIso(value: Date | string): string {
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.replace(/\.\d{3}Z$/, 'Z');
}

export class OrderryClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private lastRequestAt = 0;

  constructor(options: OrderryClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'https://api.orderry.com').replace(/\/$/, '');
    this.minIntervalMs = options.minIntervalMs ?? 350;
    this.maxRetries = options.maxRetries ?? 4;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): OrderryClient {
    return new OrderryClient(getOrderryConfigFromEnv(env));
  }

  private async waitForRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private buildUrl(path: string, query?: OrderryRequestOptions['query']): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const item of value) url.searchParams.append(key, item);
        } else {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  async request<T>(path: string, options: OrderryRequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      if (!options.skipRateLimit) {
        await this.waitForRateLimit();
      }

      const res = await this.fetchImpl(this.buildUrl(path, options.query), {
        method,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await res.text();

      if (res.status === 429 && attempt < this.maxRetries) {
        const backoffMs = Math.min(8000, 500 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
        attempt += 1;
        continue;
      }

      if (!res.ok) {
        throw new OrderryApiError(
          `Orderry ${method} ${path} → HTTP ${res.status}`,
          res.status,
          path,
          text.slice(0, 500),
        );
      }

      if (!text) return {} as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new OrderryApiError(`Respuesta no JSON en ${path}`, res.status, path, text.slice(0, 200));
      }
    }

    throw new OrderryApiError(`Orderry ${path}: rate limit persistente`, 429, path);
  }

  /** GET /v2/orders/statuses */
  async getOrderStatuses(): Promise<OrderryStatus[]> {
    const body = await this.request<OrderryStatus[] | { data?: OrderryStatus[] }>('/v2/orders/statuses');
    const arr = Array.isArray(body) ? body : body?.data;
    if (!Array.isArray(arr)) {
      throw new OrderryApiError('Respuesta inesperada en /v2/orders/statuses', 200, '/v2/orders/statuses');
    }
    return arr;
  }

  /** GET /v2/orders/{id} */
  async getOrderById(orderId: number | string): Promise<OrderryOrder> {
    const id = String(orderId).trim();
    if (!id) throw new Error('orderId requerido');
    return this.request<OrderryOrder>(`/v2/orders/${encodeURIComponent(id)}`);
  }

  /** GET /v2/orders con paginación y filtros documentados. */
  async listOrders(params: ListOrdersParams = {}): Promise<OrderryPagedResponse<OrderryOrder>> {
    const query: Record<string, string | string[] | undefined> = {
      page: String(params.page ?? 1),
      limit: String(params.pageSize ?? 50),
    };

    if (params.sort) query.sort = params.sort;

    if (params.updatedSince) {
      const since = formatOrderryIso(params.updatedSince);
      query['modified_at'] = params.updatedUntil
        ? [since, formatOrderryIso(params.updatedUntil)]
        : [since];
    }

    if (params.orderIds?.length) {
      query.ids = params.orderIds.map(String);
    }

    if (params.numbers?.length) {
      query.numbers = params.numbers.map(String);
    }

    const body = await this.request<OrderryPagedResponse<OrderryOrder>>('/v2/orders', { query });
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      paging: body?.paging,
    };
  }
}

export function createOrderryClientFromEnv(env: NodeJS.ProcessEnv = process.env): OrderryClient {
  return OrderryClient.fromEnv(env);
}
