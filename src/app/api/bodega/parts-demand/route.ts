import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/bodega/parts-demand?order_ids=123,456,789
// Returns the actual parts/products registered on each order and aggregated SKU demand
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

  // Fetch products for each order in parallel batches of 10
  const BATCH_SIZE = 10;
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
        try {
          const res = await fetch(`${baseUrl}/v2/orders/${orderId}/products`, {
            cache: 'no-store',
            headers,
          });
          if (!res.ok) return;
          const data = await res.json();
          if (!Array.isArray(data)) return;

          orderProducts[orderId] = data
            .filter((item: any) => item?.entity?.type === 'product')
            .map((item: any) => {
              const sku: string = item?.entity?.sku || item?.entity?.title || 'SIN SKU';
              const code: string = item?.entity?.code || '';
              // Extract just the code prefix from SKU if code field is empty
              // SKU format: "CODE-Description" e.g. "5600020P15A00-Redmi 15C ..."
              const resolvedCode = code || sku.split('-')[0] || sku;
              return {
                sku,
                code: resolvedCode,
                title: item?.entity?.title || sku,
                quantity: Math.max(1, Number(item?.quantity) || 1),
                cost: Number(item?.cost) || 0,
              };
            });
        } catch {
          // Individual order failure — skip silently
        }
      })
    );
  }

  // Aggregate demand by SKU across all orders
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
    (a, b) => b.totalUnits - a.totalUnits
  );

  return NextResponse.json({ orderProducts, skuDemand });
}
