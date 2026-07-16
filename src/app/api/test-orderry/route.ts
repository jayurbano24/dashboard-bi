import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId') || '21743432'; // TCGT-542603 por defecto

  // Intentar obtener historial de cambios de estado
  const [orderRes, historyRes] = await Promise.all([
    fetch(`${baseUrl}/v2/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    }),
    fetch(`${baseUrl}/v2/orders/${orderId}/history`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    }),
  ]);

  const order = orderRes.ok ? await orderRes.json() : { error: `HTTP ${orderRes.status}` };
  const history = historyRes.ok ? await historyRes.json() : { error: `HTTP ${historyRes.status}` };

  return NextResponse.json({ order_fields: Object.keys(order), history });
}
