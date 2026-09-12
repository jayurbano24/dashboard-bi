import { NextRequest, NextResponse } from 'next/server';
import { syncEstadosCatalogoFromOrderry } from '@/lib/orderry-status-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/cron/sync-orderry-statuses
 * Sincroniza estados_catalogo desde GET /v2/orders/statuses (Orderry).
 * Programado diariamente en vercel.json; también invocable manualmente.
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
    const result = await syncEstadosCatalogoFromOrderry();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar estados Orderry.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
