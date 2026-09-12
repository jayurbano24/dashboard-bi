/**
 * @deprecated Usar npm run orderry:backfill-historial:apply (scripts/backfill-historial.ts)
 *
 * Backfill incompleto: una fila por orden con estado actual (no historial real previo).
 * Uso: node scripts/backfill-historial-movimientos.mjs [--apply]
 */
import fs from 'node:fs';

const APPLY = process.argv.includes('--apply');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const baseUrl = env.ORDERRY_API_URL || 'https://api.orderry.com';
const apiKey = env.ORDERRY_API_KEY;
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;

const sbHeaders = {
  apikey: sbKey,
  Authorization: `Bearer ${sbKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

const orderryHeaders = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };

async function fetchJson(url, headers) {
  const r = await fetch(url, { headers });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!r.ok) throw new Error(`${url} → ${r.status}: ${String(text).slice(0, 200)}`);
  return body;
}

// 1) Catálogo status_id → { estado, grupo }
const catalogArr = await fetchJson(`${sbUrl}/rest/v1/estados_catalogo?select=status_id,estado,grupo`, sbHeaders);
const catalog = new Map(catalogArr.map((r) => [Number(r.status_id), r]));

// 2) Órdenes únicas desde despacho_conduce_rows
const rowsRes = await fetchJson(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name&order_id=not.is.null&limit=5000`,
  sbHeaders,
);
const orderIds = [...new Set(rowsRes.map((r) => String(r.order_id)).filter(Boolean))];
console.log(`Órdenes únicas en despacho_conduce_rows: ${orderIds.length}`);

// 3) Órdenes que ya tienen backfill
const existingRes = await fetchJson(
  `${sbUrl}/rest/v1/historial_movimientos?select=orden_id&origen=eq.backfill_incompleto&limit=10000`,
  sbHeaders,
);
const already = new Set((existingRes || []).map((r) => String(r.orden_id)));

let planned = 0;
let skipped = 0;
let failed = 0;
const toInsert = [];
const pending = orderIds.filter((id) => !already.has(id));
skipped = orderIds.length - pending.length;

const startedAt = Date.now();
const logProgress = (done, total) => {
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  const rate = done > 0 ? elapsedSec / done : 0;
  const etaSec = rate > 0 ? Math.round(rate * (total - done)) : 0;
  process.stdout.write(
    `\rConsultando Orderry: ${done}/${total} (~${etaSec}s restantes)   `,
  );
};

console.log(
  `A consultar: ${pending.length} órdenes (${skipped} ya tenían backfill). ` +
    `Estimado ~${Math.ceil(pending.length * 0.4 / 60)} min (3 req/s Orderry).`,
);

for (let i = 0; i < pending.length; i += 1) {
  const ordenId = pending[i];

  let order;
  try {
    order = await fetchJson(`${baseUrl}/v2/orders/${ordenId}`, orderryHeaders);
  } catch (e) {
    failed += 1;
    if (failed <= 5) console.warn(`\nNo se pudo leer orden ${ordenId}:`, e.message);
    logProgress(i + 1, pending.length);
    await new Promise((r) => setTimeout(r, 350));
    continue;
  }

  const statusId = Number(order?.status?.id);
  const cat = catalog.get(statusId);
  const estadoNuevo = cat?.estado || order?.status?.name || null;
  const grupoNuevo = cat?.grupo || order?.status?.group?.name || null;
  const fecha =
    order?.modified_at || order?.updated_at || order?.created_at || new Date().toISOString();

  toInsert.push({
    orden_id: ordenId,
    fecha_hora_cambio: fecha,
    estado_anterior: null,
    estado_nuevo: estadoNuevo,
    grupo_nuevo: grupoNuevo,
    status_id_anterior: null,
    status_id_nuevo: Number.isFinite(statusId) ? statusId : null,
    origen: 'backfill_incompleto',
    usuario: null,
    payload_crudo: { order_id: ordenId, status_id: statusId, note: 'Punto de partida — no es historial real previo' },
  });
  planned += 1;

  if ((i + 1) % 25 === 0 || i + 1 === pending.length) {
    logProgress(i + 1, pending.length);
  }

  // Rate limit Orderry (~3 req/s)
  await new Promise((r) => setTimeout(r, 350));
}

console.log(`\nBackfill planificado: ${planned}, omitidas (ya existían): ${skipped}, fallidas: ${failed}`);

if (!APPLY) {
  console.log('Dry-run. Ejecuta con --apply para insertar.');
  process.exit(0);
}

const chunkSize = 100;
for (let i = 0; i < toInsert.length; i += chunkSize) {
  const chunk = toInsert.slice(i, i + chunkSize);
  const r = await fetch(`${sbUrl}/rest/v1/historial_movimientos`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify(chunk),
  });
  if (!r.ok) {
    console.error('Insert error:', r.status, await r.text());
    process.exit(1);
  }
}

console.log(`Insertadas ${toInsert.length} filas backfill_incompleto.`);
