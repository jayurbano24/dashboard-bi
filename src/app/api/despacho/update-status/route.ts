import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/despacho/update-status
 * Body: { orderIds: number[] }
 *
 * 1. Fetches the list of statuses from Orderry
 * 2. Finds the "ENTREGADO" (delivered) status
 * 3. Updates each order to that status
 * Returns: { updated: number[], failed: number[], statusUsed: string }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
  }

  let body: { orderIds?: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const orderIds = body?.orderIds;
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'Se requiere orderIds (array)' }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // ── 1. Obtener el ID del estado ENTREGADO ────────────────────────────────
  // El endpoint /v2/order-statuses no existe en esta versión de Orderry.
  // Estrategia: extraer estados únicos de las órdenes recientes, luego usar
  // el ID conocido del workspace como fallback definitivo.
  let entregadoStatusId: number | null = null;
  let statusName = '';

  // ID confirmado para este workspace vía inspección directa de la API
  const FALLBACK_ENTREGADO_ID = 1297299;
  const FALLBACK_ENTREGADO_NAME = 'ENTREGADO';

  try {
    const ordersRes = await fetch(`${baseUrl}/v2/orders?limit=200&page=1`, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });

    if (ordersRes.ok) {
      const ordersData = await ordersRes.json();
      const orders: Record<string, any>[] = Array.isArray(ordersData?.data) ? ordersData.data : [];

      // Recolectar estados únicos de las órdenes
      const seen = new Map<number, string>();
      for (const o of orders) {
        const s = o?.status;
        if (s?.id && s?.name) seen.set(Number(s.id), String(s.name));
      }

      // 1er paso: exacto "ENTREGADO"
      for (const [id, name] of seen.entries()) {
        if (name.trim().toUpperCase() === 'ENTREGADO') {
          entregadoStatusId = id;
          statusName = name;
          break;
        }
      }
      // 2do paso: empieza con ENTREGADO sin sufijos
      if (!entregadoStatusId) {
        for (const [id, name] of seen.entries()) {
          const n = name.trim().toUpperCase();
          if (n.startsWith('ENTREGADO') && !n.includes('-') && !n.includes('/')) {
            entregadoStatusId = id;
            statusName = name;
            break;
          }
        }
      }
    }
  } catch {
    // continuar con fallback
  }

  // Fallback: usar el ID confirmado del workspace
  if (!entregadoStatusId) {
    entregadoStatusId = FALLBACK_ENTREGADO_ID;
    statusName = FALLBACK_ENTREGADO_NAME;
  }

  // ── 2. Actualizar cada orden usando PATCH /v2/orders/{id} ─────────────────
  // Orderry v2: POST /v2/orders/{id}/status con body { status_id: number }
  // PATCH /v2/orders/{id} retorna 200 pero NO cambia el estado (workflow bloqueado).
  // POST /v2/orders/{id}/status sí hace la transición forzada.
  const updated: number[] = [];
  const failed: Array<{ id: number; error: string }> = [];

  await Promise.allSettled(
    orderIds.map(async (id) => {
      try {
        const res = await fetch(`${baseUrl}/v2/orders/${id}/status`, {
          method: 'POST',
          cache: 'no-store',
          headers,
          body: JSON.stringify({ status_id: entregadoStatusId }),
        });

        if (res.ok) {
          updated.push(id);
        } else {
          const detail = await res.text().catch(() => String(res.status));
          failed.push({ id, error: detail });
        }
      } catch (err: any) {
        failed.push({ id, error: err.message });
      }
    }),
  );

  return NextResponse.json({
    updated,
    failed,
    statusUsed: statusName,
    statusId: entregadoStatusId,
  });
}
