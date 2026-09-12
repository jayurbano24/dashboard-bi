/**
 * Backfill CLI de historial de estados (sin timeout HTTP de Next.js).
 *
 * Fuentes por orden (en orden):
 * 1. Webhooks almacenados (orderry_webhooks)
 * 2. Endpoints Orderry /events o /history (si existen en la cuenta)
 * 3. Snapshot sintético: ORDEN CREADA (created_at) + estado actual (modified_at)
 *
 * Escribe en order_status_history y espeja en historial_movimientos.
 *
 * Uso:
 *   npx tsx scripts/run-backfill.ts              # dry-run
 *   npx tsx scripts/run-backfill.ts --apply
 *   npx tsx scripts/run-backfill.ts --apply --order-id=21747238
 */
import { loadEnv, requireEnv } from './lib/load-env';

type StatusRow = { id: number; name: string; group_name: string };
type StatusEvent = {
  order_id: string;
  status_id: number;
  status_name: string;
  changed_at: string;
  source: string;
};

const APPLY = process.argv.includes('--apply');
const DELAY_MS = 250;
const orderIdArg = process.argv.find((a) => a.startsWith('--order-id='))?.split('=')[1];
let eventsApiAvailable: boolean | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!res.ok) {
    throw new Error(`${url} → ${res.status}: ${String(text).slice(0, 200)}`);
  }
  return body;
}

function resolveStatusName(statusId: number, catalogById: Map<number, StatusRow>): string {
  const hit = catalogById.get(statusId);
  return hit?.name || `STATUS_${statusId}`;
}

function dedupeEvents(events: StatusEvent[]): StatusEvent[] {
  const seen = new Set<string>();
  const out: StatusEvent[] = [];
  for (const ev of events.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())) {
    const key = `${ev.order_id}|${ev.status_id}|${ev.changed_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

function parseRemoteEvents(orderId: string, body: unknown, catalogById: Map<number, StatusRow>): StatusEvent[] {
  const arr = Array.isArray(body)
    ? body
    : (body as { data?: unknown[]; events?: unknown[]; history?: unknown[] })?.data
      || (body as { events?: unknown[] })?.events
      || (body as { history?: unknown[] })?.history
      || [];

  if (!Array.isArray(arr)) return [];

  const out: StatusEvent[] = [];
  for (const raw of arr) {
    const row = raw as Record<string, unknown>;
    const eventType = String(row.event_type || row.type || row.event || row.action || '').toLowerCase();
    const isStatusChange =
      eventType.includes('status')
      || row.status_id != null
      || row.new_status_id != null
      || (row.status as { id?: number } | undefined)?.id != null
      || (row.new as { id?: number } | undefined)?.id != null;

    if (!isStatusChange) continue;

    const statusId = Number(
      row.status_id
      ?? row.new_status_id
      ?? (row.new as { id?: number } | undefined)?.id
      ?? (row.status as { id?: number } | undefined)?.id,
    );
    if (!Number.isFinite(statusId) || statusId <= 0) continue;

    const changedAt = String(
      row.changed_at
      ?? row.created_at
      ?? row.timestamp
      ?? row.date
      ?? row.webhook_at
      ?? '',
    );
    if (!changedAt) continue;

    out.push({
      order_id: orderId,
      status_id: statusId,
      status_name: resolveStatusName(statusId, catalogById),
      changed_at: changedAt,
      source: 'orderry_events',
    });
  }
  return out;
}

async function fetchOrderEventsFromApi(
  baseUrl: string,
  apiKey: string,
  orderId: string,
  catalogById: Map<number, StatusRow>,
): Promise<StatusEvent[]> {
  if (eventsApiAvailable === false) return [];

  const paths = [
    `/v2/orders/${orderId}/events`,
    `/v2/orders/${orderId}/history`,
    `/orders/${orderId}/events?api_token=${encodeURIComponent(apiKey)}`,
    `/orders/${orderId}/history?api_token=${encodeURIComponent(apiKey)}`,
  ];

  for (const path of paths) {
    try {
      const useBearer = !path.includes('api_token=');
      const body = await fetchJson(`${baseUrl}${path}`, {
        Accept: 'application/json',
        ...(useBearer ? { Authorization: `Bearer ${apiKey}` } : {}),
      });
      const parsed = parseRemoteEvents(orderId, body, catalogById);
      if (parsed.length > 0) {
        eventsApiAvailable = true;
        return parsed;
      }
    } catch {
      /* endpoint no disponible en esta cuenta */
    }
  }

  if (eventsApiAvailable === null) {
    eventsApiAvailable = false;
    console.warn('Orderry no expone /events ni /history en esta cuenta; usando webhooks + snapshot sintético.');
  }
  return [];
}

async function fetchWebhooksForOrder(
  sbUrl: string,
  sbHeaders: Record<string, string>,
  orderId: string,
  catalogById: Map<number, StatusRow>,
): Promise<StatusEvent[]> {
  try {
    const rows = (await fetchJson(
      `${sbUrl}/rest/v1/orderry_webhooks?select=order_id,new_status_id,webhook_at,event_name&order_id=eq.${orderId}&new_status_id=not.is.null&order=webhook_at.asc`,
      sbHeaders,
    )) as Array<{ order_id: string; new_status_id: number; webhook_at: string; event_name: string }>;

    return (rows || [])
      .filter((r) => Number.isFinite(Number(r.new_status_id)))
      .map((r) => ({
        order_id: String(r.order_id),
        status_id: Number(r.new_status_id),
        status_name: resolveStatusName(Number(r.new_status_id), catalogById),
        changed_at: r.webhook_at,
        source: 'webhook',
      }));
  } catch {
    return [];
  }
}

function buildSyntheticEvents(
  orderId: string,
  order: Record<string, unknown>,
  catalogById: Map<number, StatusRow>,
  catalogByName: Map<string, StatusRow>,
): StatusEvent[] {
  const events: StatusEvent[] = [];
  const createdAt = String(order.created_at || '');
  const createdRow =
    catalogByName.get(normalizeName('ORDEN CREADA'))
    || [...catalogById.values()].find((s) => normalizeName(s.name) === 'ORDEN CREADA');

  if (createdAt && createdRow) {
    events.push({
      order_id: orderId,
      status_id: createdRow.id,
      status_name: createdRow.name,
      changed_at: createdAt,
      source: 'synthetic_created',
    });
  }

  const status = order.status as { id?: number; name?: string } | undefined;
  const statusId = Number(status?.id);
  if (Number.isFinite(statusId) && statusId > 0) {
    const changedAt = String(
      order.modified_at || order.done_at || order.closed_at || order.created_at || new Date().toISOString(),
    );
    events.push({
      order_id: orderId,
      status_id: statusId,
      status_name: status?.name || resolveStatusName(statusId, catalogById),
      changed_at: changedAt,
      source: 'synthetic_current',
    });
  }

  return events;
}

async function main() {
  const env = requireEnv(['ORDERRY_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const baseUrl = env.ORDERRY_API_URL || 'https://api.orderry.com';
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const sbHeaders = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  let catalogRows: StatusRow[] = [];
  try {
    catalogRows = (await fetchJson(
      `${sbUrl}/rest/v1/orderry_statuses?select=id,name,group_name`,
      sbHeaders,
    )) as StatusRow[];
  } catch {
    catalogRows = [];
  }

  if (!Array.isArray(catalogRows) || catalogRows.length === 0) {
    catalogRows = (await fetchJson(
      `${sbUrl}/rest/v1/estados_catalogo?select=status_id,estado,grupo`,
      sbHeaders,
    )) as Array<{ status_id: number; estado: string; grupo: string }>;
    catalogRows = (catalogRows || []).map((r) => ({
      id: Number(r.status_id),
      name: String(r.estado),
      group_name: String(r.grupo),
    }));
  }

  if (!Array.isArray(catalogRows) || catalogRows.length === 0) {
    throw new Error('Catálogo vacío. Ejecuta: npm run orderry:sync-statuses');
  }

  const catalogById = new Map(catalogRows.map((r) => [Number(r.id), r]));
  const catalogByName = new Map(catalogRows.map((r) => [normalizeName(r.name), r]));

  let orderIds: string[] = [];
  if (orderIdArg) {
    orderIds = [orderIdArg];
  } else {
    const despachoRows = (await fetchJson(
      `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id&order_id=not.is.null&limit=5000`,
      sbHeaders,
    )) as Array<{ order_id: string | number }>;
    orderIds = [...new Set(despachoRows.map((r) => String(r.order_id)).filter(Boolean))];
  }

  let existingRows: Array<{ order_id: string; status_id: number; changed_at: string }> = [];
  try {
    existingRows = (await fetchJson(
      `${sbUrl}/rest/v1/order_status_history?select=order_id,status_id,changed_at&limit=10000`,
      sbHeaders,
    )) as Array<{ order_id: string; status_id: number; changed_at: string }>;
  } catch {
    existingRows = [];
  }

  try {
    const legacyRows = (await fetchJson(
      `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,status_id_nuevo,fecha_hora_cambio&limit=10000`,
      sbHeaders,
    )) as Array<{ orden_id: string; status_id_nuevo: number; fecha_hora_cambio: string }>;
    existingRows.push(
      ...(legacyRows || []).map((r) => ({
        order_id: String(r.orden_id),
        status_id: Number(r.status_id_nuevo),
        changed_at: r.fecha_hora_cambio,
      })),
    );
  } catch {
    /* sin historial previo */
  }

  const existingKeys = new Set(
    existingRows.map((r) => `${r.order_id}|${r.status_id}|${r.changed_at}`),
  );

  let planned = 0;
  let skipped = 0;
  let failed = 0;
  const toInsert: StatusEvent[] = [];

  console.log(`Órdenes a procesar: ${orderIds.length} (${APPLY ? 'APPLY' : 'dry-run'})`);

  for (let i = 0; i < orderIds.length; i += 1) {
    const orderId = orderIds[i];

    let events: StatusEvent[] = [];
    events.push(...(await fetchWebhooksForOrder(sbUrl, sbHeaders, orderId, catalogById)));
    events.push(...(await fetchOrderEventsFromApi(baseUrl, env.ORDERRY_API_KEY, orderId, catalogById)));

    if (events.length === 0) {
      try {
        const order = (await fetchJson(`${baseUrl}/v2/orders/${orderId}`, {
          Authorization: `Bearer ${env.ORDERRY_API_KEY}`,
          Accept: 'application/json',
        })) as Record<string, unknown>;
        events.push(...buildSyntheticEvents(orderId, order, catalogById, catalogByName));
      } catch (e) {
        failed += 1;
        if (failed <= 5) {
          console.warn(`Orden ${orderId}: ${e instanceof Error ? e.message : e}`);
        }
        await sleep(DELAY_MS);
        continue;
      }
    }

    events = dedupeEvents(
      events.map((ev) => ({
        ...ev,
        status_name: resolveStatusName(ev.status_id, catalogById),
      })),
    );

    for (const ev of events) {
      const key = `${ev.order_id}|${ev.status_id}|${ev.changed_at}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }
      toInsert.push(ev);
      planned += 1;
    }

    if ((i + 1) % 25 === 0 || i + 1 === orderIds.length) {
      process.stdout.write(`\rProgreso: ${i + 1}/${orderIds.length} · planificados ${planned}   `);
    }

    if (APPLY) await sleep(DELAY_MS);
  }

  console.log(`\nEventos nuevos: ${planned}, omitidos (ya existían): ${skipped}, órdenes fallidas: ${failed}`);

  if (!APPLY) {
    console.log('Dry-run. Ejecuta con --apply para insertar.');
    if (toInsert[0]) {
      console.log('Muestra:', JSON.stringify(toInsert.slice(0, 3), null, 2));
    }
    return;
  }

  const chunkSize = 100;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);

    const historyRes = await fetch(`${sbUrl}/rest/v1/order_status_history`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(chunk),
    });
    if (!historyRes.ok) {
      const errText = await historyRes.text();
      if (!errText.includes('order_status_history')) {
        throw new Error(`Insert order_status_history: ${historyRes.status} ${errText}`);
      }
      console.warn('order_status_history no existe; insertando solo en historial_movimientos.');
    }

    const mirror = chunk.map((ev) => {
      const cat = catalogById.get(ev.status_id);
      return {
        orden_id: ev.order_id,
        fecha_hora_cambio: ev.changed_at,
        estado_anterior: null,
        estado_nuevo: ev.status_name,
        grupo_nuevo: cat?.group_name || null,
        status_id_anterior: null,
        status_id_nuevo: ev.status_id,
        origen: ev.source,
        payload_crudo: { status_id: ev.status_id, status_name: ev.status_name, source: ev.source },
      };
    });

    const mirrorRes = await fetch(`${sbUrl}/rest/v1/historial_movimientos`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(mirror),
    });
    if (!mirrorRes.ok) {
      throw new Error(`Insert historial_movimientos: ${mirrorRes.status} ${await mirrorRes.text()}`);
    }
  }

  console.log(`Insertados ${toInsert.length} eventos (order_status_history + historial_movimientos).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
