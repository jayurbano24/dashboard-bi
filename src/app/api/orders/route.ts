import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const limit = 200;
    let page = 1;
    let totalPages = 1;
    const allOrders: unknown[] = [];
    let lastPaging: Record<string, unknown> | undefined;

    do {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      const ordersRes = await fetch(`${baseUrl}/v2/orders?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ordersRes.ok) {
        return NextResponse.json(
          {
            error: 'Error obteniendo ordenes de Orderry v2',
            details: await ordersRes.text(),
          },
          { status: ordersRes.status }
        );
      }

      const ordersData = await ordersRes.json();
      const pageData = Array.isArray(ordersData?.data) ? ordersData.data : [];

      allOrders.push(...pageData);
      lastPaging = ordersData?.paging;
      totalPages = Number(ordersData?.paging?.total_pages || 1);
      page += 1;
    } while (page <= totalPages);

    return NextResponse.json({
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
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
