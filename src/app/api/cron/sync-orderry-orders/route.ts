import { NextRequest, NextResponse } from 'next/server';
import { syncOrderryOrdersIncremental } from '@/lib/orderry/sync-orders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * POST /api/cron/sync-orderry-orders
 * Refresco incremental Orderry → despacho_conduce_rows (columnas live).
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await syncOrderryOrdersIncremental();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar órdenes Orderry.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
