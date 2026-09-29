import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatElapsedHuman } from '@/lib/order-status-history';
import { getOrderStatusTimelapsePorOrdenes } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('orderIds') || searchParams.get('order_id') || '';
    const orderIds = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (orderIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'orderIds requerido.' }, { status: 400 });
    }
    if (orderIds.length > 500) {
      return NextResponse.json({ ok: false, error: 'Máximo 500 órdenes por consulta.' }, { status: 400 });
    }

    const byOrder = await getOrderStatusTimelapsePorOrdenes(orderIds);
    const rows = orderIds.flatMap((id) => byOrder.get(id) ?? []);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      rows: rows.map((r) => ({
        ...r,
        elapsed_human: formatElapsedHuman(Number(r.elapsed_seconds)),
      })),
      byOrder: Object.fromEntries(
        orderIds.map((id) => [
          id,
          (byOrder.get(id) ?? []).map((r) => ({
            ...r,
            elapsed_human: formatElapsedHuman(Number(r.elapsed_seconds)),
          })),
        ]),
      ),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer timelapse.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
