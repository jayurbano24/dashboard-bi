/**
 * Reprocesa orderry_webhooks → historial_movimientos (filas faltantes)
 *   node scripts/repair-webhook-historial.mjs TCGT-543944
 *   node scripts/repair-webhook-historial.mjs --apply
 */
import fs from 'node:fs';

const cliArgs = process.argv.slice(2);
const APPLY = cliArgs.includes('--apply');
const orderFilter = cliArgs.find((a) => !a.startsWith('-'));

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

const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

async function fetchJson(url) {
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return r.json();
}

let url = `${sbUrl}/rest/v1/orderry_webhooks?select=id,event_name,order_id,order_name,old_status_id,new_status_id,webhook_at,raw_payload&order=webhook_at.asc&limit=500`;
if (orderFilter) {
  const isNumeric = /^\d+$/.test(orderFilter);
  url += isNumeric ? `&order_id=eq.${orderFilter}` : `&order_name=eq.${encodeURIComponent(orderFilter)}`;
}

const events = await fetchJson(url);
if (!Array.isArray(events)) {
  console.error('Respuesta inesperada:', events);
  process.exit(1);
}

console.log(`Eventos webhook a procesar: ${events.length} (${APPLY ? 'APPLY' : 'dry-run'})`);

const catalogRows = await fetchJson(`${sbUrl}/rest/v1/estados_catalogo?select=status_id,estado,grupo`);
const catalog = new Map((catalogRows || []).map((r) => [Number(r.status_id), r]));

const toInsert = [];

for (const ev of events) {
  if (!/order\.status\.changed/i.test(ev.event_name || '')) continue;

  const existing = await fetchJson(
    `${sbUrl}/rest/v1/historial_movimientos?select=id&orden_id=eq.${ev.order_id}&origen=eq.webhook&status_id_nuevo=eq.${ev.new_status_id}&fecha_hora_cambio=eq.${encodeURIComponent(ev.webhook_at)}&limit=1`,
  );
  if (Array.isArray(existing) && existing.length > 0) continue;

  const oldCat = ev.old_status_id ? catalog.get(Number(ev.old_status_id)) : null;
  const newCat = ev.new_status_id ? catalog.get(Number(ev.new_status_id)) : null;
  const createdAt = ev.raw_payload?.created_at || ev.webhook_at;

  toInsert.push({
    orden_id: String(ev.order_id),
    fecha_hora_cambio: createdAt,
    estado_anterior: oldCat?.estado ?? null,
    estado_nuevo: newCat?.estado ?? null,
    grupo_nuevo: newCat?.grupo ?? null,
    status_id_anterior: ev.old_status_id ?? null,
    status_id_nuevo: ev.new_status_id ?? null,
    origen: 'webhook',
    usuario: ev.raw_payload?.employee?.full_name ?? null,
    payload_crudo: ev.raw_payload ?? { repaired_from: ev.id },
  });
}

console.log(`Filas a insertar en historial_movimientos: ${toInsert.length}`);
for (const row of toInsert.slice(0, 5)) {
  console.log(`  ${row.orden_id} ${row.estado_anterior} → ${row.estado_nuevo} @ ${row.fecha_hora_cambio}`);
}

if (!APPLY || toInsert.length === 0) {
  if (!APPLY && toInsert.length) console.log('\nEjecuta con --apply para insertar.');
  process.exit(0);
}

for (let i = 0; i < toInsert.length; i += 50) {
  const chunk = toInsert.slice(i, i + 50);
  const res = await fetch(`${sbUrl}/rest/v1/historial_movimientos`, { method: 'POST', headers: h, body: JSON.stringify(chunk) });
  if (!res.ok) {
    console.error('Insert failed:', res.status, await res.text());
    process.exit(1);
  }
}
console.log(`Insertadas ${toInsert.length} filas webhook.`);
