import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AnyRecord = Record<string, any>;

function normalizeStatusName(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isEntregadoStatus(name: string): boolean {
  return normalizeStatusName(name).includes('ENTREGADO');
}

function normalizeStatusLoose(value: string): string {
  return normalizeStatusName(value).replace(/[^A-Z0-9]/g, '');
}

function isNotaCreditoSourceStatus(name: string): boolean {
  const n = normalizeStatusName(name);
  return n.includes('PARA DEVOLVER') && n.includes('NOTA') && n.includes('CREDITO');
}

async function fetchOrderById(baseUrl: string, headers: Record<string, string>, id: number): Promise<AnyRecord | null> {
  const res = await fetch(`${baseUrl}/v2/orders/${id}`, {
    method: 'GET',
    cache: 'no-store',
    headers,
  });
  if (!res.ok) return null;
  const raw = await res.json();
  if (raw?.data && typeof raw.data === 'object') return raw.data as AnyRecord;
  return raw as AnyRecord;
}

function extractOrderStatus(order: AnyRecord | null): { id: number | null; name: string } {
  if (!order) return { id: null, name: '' };
  const statusObj =
    (order?.status && typeof order.status === 'object' ? order.status : null) ||
    (order?.order_status && typeof order.order_status === 'object' ? order.order_status : null) ||
    (order?.current_status && typeof order.current_status === 'object' ? order.current_status : null);

  const id = Number(statusObj?.id ?? order?.status_id ?? order?.order_status_id ?? NaN);
  const name = String(statusObj?.name ?? order?.status ?? order?.status_name ?? '');

  return { id: Number.isFinite(id) ? id : null, name };
}

async function resolveEntregadoStatus(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<Array<{ id: number; name: string; source: string }>> {
  const envStatusId = Number(process.env.ORDERRY_DELIVERED_STATUS_ID || NaN);
  const envStatusName = process.env.ORDERRY_DELIVERED_STATUS_NAME || 'ENTREGADO';
  const envNcStatusId = Number(process.env.ORDERRY_DELIVERED_NC_STATUS_ID || NaN);
  const envNcStatusName = process.env.ORDERRY_DELIVERED_NC_STATUS_NAME || 'ENTREGADO-NOTA DE CREDITO';
  const envStatuses: Array<{ id: number; name: string; source: string }> = [];
  if (Number.isFinite(envStatusId) && envStatusId > 0) {
    envStatuses.push({ id: envStatusId, name: envStatusName, source: 'env' });
  }
  if (Number.isFinite(envNcStatusId) && envNcStatusId > 0) {
    envStatuses.push({ id: envNcStatusId, name: envNcStatusName, source: 'env' });
  }
  if (envStatuses.length > 0) {
    return envStatuses;
  }

  const candidates: Array<{ id: number; name: string; source: string }> = [];
  const pushCandidate = (idRaw: unknown, nameRaw: unknown, source: string) => {
    const id = Number(idRaw);
    const name = String(nameRaw || '').trim();
    if (Number.isFinite(id) && id > 0 && name) {
      candidates.push({ id, name, source });
    }
  };

  const statusEndpoints = ['/v2/order-statuses', '/v2/statuses', '/v2/settings/order-statuses'];
  for (const ep of statusEndpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep}`, { method: 'GET', cache: 'no-store', headers });
      if (!res.ok) continue;
      const body = await res.json();
      const arr =
        (Array.isArray(body) ? body : null) ||
        (Array.isArray(body?.data) ? body.data : null) ||
        (Array.isArray(body?.statuses) ? body.statuses : null) ||
        [];

      for (const item of arr as AnyRecord[]) {
        pushCandidate(item?.id, item?.name ?? item?.title ?? item?.status_name, ep);
      }
    } catch {
      // continue
    }
  }

  // Scan recent orders as fallback catalog source.
  for (let page = 1; page <= 3; page += 1) {
    try {
      const ordersRes = await fetch(`${baseUrl}/v2/orders?limit=200&page=${page}`, {
        method: 'GET',
        cache: 'no-store',
        headers,
      });
      if (!ordersRes.ok) break;
      const ordersData = await ordersRes.json();
      const orders: AnyRecord[] = Array.isArray(ordersData?.data) ? ordersData.data : [];
      for (const o of orders) {
        const s = o?.status;
        pushCandidate(s?.id, s?.name, `/v2/orders?page=${page}`);
      }
      if (orders.length === 0) break;
    } catch {
      break;
    }
  }

  // Deduplicate by ID.
  const uniqueById = new Map<number, { id: number; name: string; source: string }>();
  for (const c of candidates) {
    if (!uniqueById.has(c.id)) uniqueById.set(c.id, c);
  }
  const unique = [...uniqueById.values()];

  // Keep full catalog; caller will choose per-order target status.
  if (unique.length > 0) return unique;

  // Last fallback kept for backward compatibility with previous configuration.
  return [{ id: 1297299, name: 'ENTREGADO', source: 'fallback' }];
}

function pickTargetStatus(
  catalog: Array<{ id: number; name: string; source: string }>,
  currentStatusName: string,
): { id: number; name: string; source: string } {
  const loose = (s: string) => normalizeStatusLoose(s);
  const wantsNc = isNotaCreditoSourceStatus(currentStatusName);

  const findExactLoose = (value: string) => catalog.find((s) => loose(s.name) === loose(value));

  if (wantsNc) {
    const ncCandidates = [
      'ENTREGADO-NOTA DE CREDITO',
      'ENTREGADO NOTA DE CREDITO',
      'ENTREGADO/NOTA DE CREDITO',
      'ENTREGADO-NOTACREDITO',
    ];

    for (const nc of ncCandidates) {
      const match = findExactLoose(nc);
      if (match) return match;
    }

    const containsNc = catalog.find((s) => {
      const n = normalizeStatusName(s.name);
      return n.includes('ENTREGADO') && n.includes('NOTA') && n.includes('CREDITO');
    });
    if (containsNc) return containsNc;
  }

  const exact = catalog.find((s) => normalizeStatusName(s.name) === 'ENTREGADO');
  if (exact) return exact;

  const startsPlain = catalog.find((s) => {
    const n = normalizeStatusName(s.name);
    return n.startsWith('ENTREGADO') && !n.includes('NOTA') && !n.includes('LIFE');
  });
  if (startsPlain) return startsPlain;

  const anyEntregado = catalog.find((s) => isEntregadoStatus(s.name));
  if (anyEntregado) return anyEntregado;

  return { id: 1297299, name: 'ENTREGADO', source: 'fallback' };
}

async function updateOrderToEntregado(
  baseUrl: string,
  headers: Record<string, string>,
  orderId: number,
  entregadoStatusId: number,
): Promise<{ ok: boolean; detail: string }> {
  const attempts: Array<{ method: 'POST' | 'PATCH' | 'PUT'; path: string; body: AnyRecord }> = [
    { method: 'POST', path: `/v2/orders/${orderId}/status`, body: { status_id: entregadoStatusId } },
    { method: 'POST', path: `/v2/orders/${orderId}/status`, body: { order_status_id: entregadoStatusId } },
    { method: 'POST', path: `/v2/orders/${orderId}/status`, body: { id: entregadoStatusId } },
    { method: 'PATCH', path: `/v2/orders/${orderId}`, body: { status_id: entregadoStatusId } },
    { method: 'PATCH', path: `/v2/orders/${orderId}`, body: { status: { id: entregadoStatusId } } },
    { method: 'PUT', path: `/v2/orders/${orderId}/status`, body: { status_id: entregadoStatusId } },
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const res = await fetch(`${baseUrl}${attempt.path}`, {
        method: attempt.method,
        cache: 'no-store',
        headers,
        body: JSON.stringify(attempt.body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => String(res.status));
        errors.push(`${attempt.method} ${attempt.path} -> ${res.status} ${text}`);
        continue;
      }

      // Verify final status to avoid false positives.
      const latest = await fetchOrderById(baseUrl, headers, orderId);
      const latestStatus = extractOrderStatus(latest);
      if (latestStatus.id === entregadoStatusId || isEntregadoStatus(latestStatus.name)) {
        return { ok: true, detail: `${attempt.method} ${attempt.path}` };
      }

      errors.push(
        `${attempt.method} ${attempt.path} OK pero estado final=${latestStatus.name || 'N/A'} (id=${String(latestStatus.id ?? 'N/A')})`,
      );
    } catch (err: any) {
      errors.push(`${attempt.method} ${attempt.path} -> ${err?.message || 'network error'}`);
    }
  }

  return { ok: false, detail: errors.join(' | ') || 'No se pudo actualizar estado' };
}

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

  const statusCatalog = await resolveEntregadoStatus(baseUrl, headers);

  // Actualizar cada orden con estrategias de compatibilidad y validación final.
  const updated: number[] = [];
  const failed: Array<{ id: number; error: string }> = [];
  const usedStatuses = new Set<string>();

  await Promise.allSettled(
    orderIds.map(async (id) => {
      const currentOrder = await fetchOrderById(baseUrl, headers, id);
      const currentStatus = extractOrderStatus(currentOrder);
      const targetStatus = pickTargetStatus(statusCatalog, currentStatus.name);
      usedStatuses.add(targetStatus.name);

      const result = await updateOrderToEntregado(baseUrl, headers, id, targetStatus.id);
      if (result.ok) updated.push(id);
      else failed.push({ id, error: `[from:${currentStatus.name || 'N/A'} -> to:${targetStatus.name}] ${result.detail}` });
    }),
  );

  const usedStatusList = [...usedStatuses];
  const statusUsed = usedStatusList.length <= 1
    ? (usedStatusList[0] || 'ENTREGADO')
    : `MIXTO (${usedStatusList.join(' / ')})`;

  return NextResponse.json({
    updated,
    failed,
    statusUsed,
    statusCatalogSize: statusCatalog.length,
    usedStatuses: usedStatusList,
  });
}
