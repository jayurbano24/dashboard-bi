import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Extrae el código de parte real desde SKU/título de Orderry.
 * Ejemplos:
 *   "1300101000331A-Redmi A5 3GB+64GB Black (EU) RINGER" → "1300101000331A"
 *   "56000100C3Z00-Redmi A5 3GB+64GB Black (EU) DISPLAY" → "56000100C3Z00"
 *   "SKU: 56000100C3Z00-..." → "56000100C3Z00"
 */
function extractPartCode(...candidates: unknown[]): string {
  for (const raw of candidates) {
    const text = String(raw ?? '').trim();
    if (!text) continue;

    const cleaned = text.replace(/^(SKU:|NEW|REPUESTO)\s*/i, '').trim();

    // Prefijo antes del primer guión si parece código de parte (letras+números, no IMEI)
    const prefix = cleaned.split('-')[0]?.trim() || '';
    if (
      prefix.length >= 8 &&
      prefix.length <= 20 &&
      /^[A-Z0-9]+$/i.test(prefix) &&
      /\d/.test(prefix) &&
      /[A-Z]/i.test(prefix) &&
      !/^\d{14,16}$/.test(prefix)
    ) {
      return prefix.toUpperCase();
    }

    // Buscar tokens alfanuméricos tipo código Xiaomi (ej. 581K7TLCCG00, 56000100C3Z00)
    const matches = Array.from(cleaned.matchAll(/\b([A-Z0-9]{8,20})\b/gi));
    for (const m of matches) {
      const candidate = m[1].toUpperCase();
      if (/^\d{14,16}$/.test(candidate)) continue; // IMEI
      if (!/\d/.test(candidate)) continue;
      if (!/[A-Z]/i.test(candidate)) continue;
      return candidate;
    }
  }
  return '';
}

function isProductItem(item: Record<string, any>): boolean {
  const entity = item?.entity || item?.product || item;
  const type = String(entity?.type || item?.type || '').toLowerCase();
  // Orderry: products have type "product"; services are "service" / "work"
  if (type === 'product' || type === 'goods' || type === 'part') return true;
  if (type === 'service' || type === 'work' || type === 'labor') return false;

  // Fallback: if it has sku/code and is not clearly a service, treat as product
  const sku = entity?.sku || entity?.code || item?.sku || item?.code;
  return Boolean(sku);
}

function mapItemToPart(item: Record<string, any>) {
  const entity = item?.entity || item?.product || item;
  const sku = String(entity?.sku || entity?.title || item?.sku || item?.title || '').trim();
  const title = String(entity?.title || item?.title || sku).trim();
  const rawCode = String(entity?.code || item?.code || '').trim();
  const code = extractPartCode(rawCode, sku, title);

  return {
    sku: sku || title,
    code: code || extractPartCode(sku) || sku.split('-')[0] || sku,
    title,
    quantity: Math.max(1, Number(item?.quantity) || 1),
    cost: Number(item?.cost ?? item?.price ?? 0) || 0,
  };
}

async function fetchOrderParts(
  baseUrl: string,
  headers: Record<string, string>,
  orderId: string,
): Promise<Array<{ sku: string; code: string; title: string; quantity: number; cost: number }>> {
  const endpoints = [
    `${baseUrl}/v2/orders/${orderId}/products`,
    `${baseUrl}/v2/orders/${orderId}/items`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers });
      if (!res.ok) continue;
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      if (!list.length) continue;

      const parts = list.filter(isProductItem).map(mapItemToPart).filter((p) => p.code || p.sku);
      if (parts.length) return parts;
    } catch {
      // try next endpoint
    }
  }
  return [];
}

// GET /api/bodega/parts-demand?order_ids=123,456,789
export async function GET(request: Request) {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const orderIdsParam = searchParams.get('order_ids') || '';
  const orderIds = orderIdsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!orderIds.length) {
    return NextResponse.json({ orderProducts: {}, skuDemand: [] });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const BATCH_SIZE = 8;
  const orderProducts: Record<string, Array<{
    sku: string;
    code: string;
    title: string;
    quantity: number;
    cost: number;
  }>> = {};

  for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
    const batch = orderIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (orderId) => {
        const parts = await fetchOrderParts(baseUrl, headers, orderId);
        if (parts.length) orderProducts[orderId] = parts;
      }),
    );
  }

  const demandMap = new Map<string, {
    sku: string;
    code: string;
    title: string;
    totalUnits: number;
    orderCount: number;
    orderNumbers: string[];
  }>();

  Object.entries(orderProducts).forEach(([orderId, parts]) => {
    parts.forEach((part) => {
      const key = part.code || part.sku;
      if (!demandMap.has(key)) {
        demandMap.set(key, {
          sku: part.sku,
          code: part.code,
          title: part.title,
          totalUnits: 0,
          orderCount: 0,
          orderNumbers: [],
        });
      }
      const entry = demandMap.get(key)!;
      entry.totalUnits += part.quantity;
      entry.orderCount += 1;
      entry.orderNumbers.push(orderId);
    });
  });

  const skuDemand = Array.from(demandMap.values()).sort(
    (a, b) => b.totalUnits - a.totalUnits,
  );

  return NextResponse.json({ orderProducts, skuDemand });
}
