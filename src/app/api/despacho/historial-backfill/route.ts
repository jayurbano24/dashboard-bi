import { NextResponse } from 'next/server';
import { getSupabaseAdmin, insertHistorialMovimiento } from '@/lib/supabase-store';
import { resolveEstadoCatalogoById } from '@/lib/orderry-status-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const BATCH_SIZE = 25;

async function fetchOrderryOrder(orderId: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  if (!apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const despachoRows: Array<{ order_id: string | number }> = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error: despachoError } = await supabase
        .from('despacho_conduce_rows')
        .select('order_id')
        .not('order_id', 'is', null)
        .range(offset, offset + pageSize - 1);
      if (despachoError) {
        return NextResponse.json({ error: despachoError.message }, { status: 500 });
      }
      if (!data?.length) break;
      despachoRows.push(...data);
      if (data.length < pageSize) break;
    }

    const orderIds = [...new Set(despachoRows.map((r) => String(r.order_id)).filter(Boolean))];

    const histRows: Array<{ orden_id: string }> = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error: histError } = await supabase
        .from('historial_movimientos')
        .select('orden_id')
        .range(offset, offset + pageSize - 1);
      if (histError && !histError.message.includes('does not exist')) {
        return NextResponse.json({ error: histError.message }, { status: 500 });
      }
      if (!data?.length) break;
      histRows.push(...(data as Array<{ orden_id: string }>));
      if (data.length < pageSize) break;
    }

    const covered = new Set(histRows.map((r) => String(r.orden_id)));

    let inserted = 0;
    let failed = 0;
    const pendingBefore = orderIds.filter((id) => !covered.has(id)).length;
    const batchIds = orderIds.filter((id) => !covered.has(id)).slice(0, BATCH_SIZE);

    for (const ordenId of batchIds) {
      const order = await fetchOrderryOrder(ordenId);
      if (!order) {
        failed += 1;
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const status = order.status as { id?: number; name?: string; group?: { name?: string } } | undefined;
      const statusId = Number(status?.id);
      const cat = Number.isFinite(statusId) ? await resolveEstadoCatalogoById(statusId) : null;

      try {
        await insertHistorialMovimiento({
          orden_id: ordenId,
          fecha_hora_cambio:
            String(order.modified_at || order.updated_at || order.created_at || new Date().toISOString()),
          estado_anterior: null,
          estado_nuevo: cat?.estado || status?.name || null,
          grupo_nuevo: cat?.grupo || status?.group?.name || null,
          status_id_anterior: null,
          status_id_nuevo: Number.isFinite(statusId) ? statusId : null,
          origen: 'backfill_incompleto',
          payload_crudo: { order_id: ordenId, status_id: statusId },
        });
        inserted += 1;
      } catch {
        failed += 1;
      }

      await new Promise((r) => setTimeout(r, 280));
    }

    const pending = Math.max(0, pendingBefore - inserted);

    return NextResponse.json({
      ok: true,
      inserted,
      failed,
      pending,
      total: orderIds.length,
      message:
        pending > 0
          ? `${inserted} órdenes registradas en historial. ${pending} pendientes — pulse de nuevo.`
          : inserted > 0
            ? `Historial incompleto completo: ${inserted} órdenes en este lote.`
            : 'Todas las órdenes ya tienen punto de partida en historial_movimientos.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en backfill de historial';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
