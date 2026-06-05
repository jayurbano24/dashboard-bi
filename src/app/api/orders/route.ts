import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OrdersApiPayload = {
  connected: boolean;
  version: 'v2';
  paging: Record<string, unknown>;
  data: unknown[];
  warning?: string;
};

const ORDERS_CACHE_TTL_MS = Number(process.env.ORDERRY_ORDERS_CACHE_TTL_MS || '90000');
const ORDERS_MAX_PAGES = Number(process.env.ORDERRY_ORDERS_MAX_PAGES || '8');
const ORDERS_PAGE_TIMEOUT_MS = Number(process.env.ORDERRY_ORDERS_PAGE_TIMEOUT_MS || '9000');

let ordersCache: { expiresAt: number; payload: OrdersApiPayload } | null = null;
let inFlight: Promise<OrdersApiPayload> | null = null;

export async function GET(request: Request) {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const now = Date.now();
  if (ordersCache && ordersCache.expiresAt > now) {
    return NextResponse.json(ordersCache.payload);
  }

  if (inFlight) {
    try {
      const payload = await inFlight;
      return NextResponse.json(payload);
    } catch {
      // Continue to attempt a fresh request below.
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const maxPagesParam = Number(searchParams.get('maxPages') || '0');
    const requestedMaxPages = Number.isFinite(maxPagesParam) && maxPagesParam > 0
      ? Math.min(Math.floor(maxPagesParam), ORDERS_MAX_PAGES)
      : ORDERS_MAX_PAGES;

    inFlight = (async () => {
    const limit = 200;
    let page = 1;
    let totalPages = 1;
    const allOrders: unknown[] = [];
    let lastPaging: Record<string, unknown> | undefined;
    let warning = '';

    do {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ORDERS_PAGE_TIMEOUT_MS);

      const ordersRes = await fetch(`${baseUrl}/v2/orders?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!ordersRes.ok) {
        if (ordersRes.status === 429 && ordersCache?.payload) {
          return {
            ...ordersCache.payload,
            warning: 'Orderry respondió 429; usando cache temporal para evitar bloqueo.',
          };
        }

        throw new Error(`Error obteniendo ordenes de Orderry v2 (${ordersRes.status})`);
      }

      const ordersData = await ordersRes.json();
      const pageData = Array.isArray(ordersData?.data) ? ordersData.data : [];

      allOrders.push(...pageData);
      lastPaging = ordersData?.paging;
      totalPages = Number(ordersData?.paging?.total_pages || 1);
      page += 1;
      if (page > requestedMaxPages && totalPages > requestedMaxPages) {
        warning = `Se limitaron paginas de Orderry a ${requestedMaxPages}; resultados parciales.`;
        break;
      }
    } while (page <= totalPages);

    const payload: OrdersApiPayload = {
      connected: true,
      version: 'v2',
      paging: {
        ...lastPaging,
        page: 1,
        limit,
        total_pages: totalPages,
        count: allOrders.length,
      },
      data: allOrders,
      ...(warning ? { warning } : {}),
    };

    ordersCache = {
      expiresAt: Date.now() + ORDERS_CACHE_TTL_MS,
      payload,
    };

    return payload;
    })();

    const payload = await inFlight;
    return NextResponse.json(payload);

  } catch (err: any) {
    if (ordersCache?.payload) {
      return NextResponse.json({
        ...ordersCache.payload,
        warning: 'Orderry no respondió a tiempo; mostrando cache temporal.',
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    inFlight = null;
  }
}
