/**
 * Poll historial_movimientos + orderry_webhooks para una orden de prueba.
 *
 *   node scripts/watch-webhook-test.mjs 21860624
 *   node scripts/watch-webhook-test.mjs 21860624 --interval=15 --max=12
 */
import fs from 'node:fs';

const orderId = process.argv[2];
if (!orderId) {
  console.error('Uso: node scripts/watch-webhook-test.mjs <order_id>');
  process.exit(1);
}

const intervalArg = process.argv.find((a) => a.startsWith('--interval='))?.split('=')[1];
const maxArg = process.argv.find((a) => a.startsWith('--max='))?.split('=')[1];
const INTERVAL_MS = Number(intervalArg || 15) * 1000;
const MAX_POLLS = Number(maxArg || 12);

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
const h = { apikey: key, Authorization: `Bearer ${key}` };

async function fetchJson(url) {
  const r = await fetch(url, { headers: h });
  return r.json();
}

async function snapshot(label) {
  console.log(`\n--- ${label} ${new Date().toISOString()} ---`);

  const hist = await fetchJson(
    `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,fecha_hora_cambio,estado_anterior,estado_nuevo,grupo_nuevo,origen,created_at&orden_id=eq.${orderId}&order=fecha_hora_cambio.desc&limit=5`,
  );
  console.log('historial_movimientos (últimas 5):');
  if (!hist?.length) console.log('  (vacío)');
  else for (const r of hist) console.log(`  [${r.origen}] ${r.estado_anterior || '—'} → ${r.estado_nuevo} (${r.grupo_nuevo}) @ ${r.fecha_hora_cambio}`);

  const nullEst = await fetchJson(
    `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,estado_nuevo,status_id_nuevo,origen,created_at&orden_id=eq.${orderId}&estado_nuevo=is.null&order=created_at.desc&limit=5`,
  );
  if (nullEst?.length) {
    console.log('⚠ filas con estado_nuevo NULL:');
    for (const r of nullEst) console.log(`  status_id_nuevo=${r.status_id_nuevo} origen=${r.origen}`);
  }

  const wh = await fetchJson(
    `${sbUrl}/rest/v1/orderry_webhooks?select=event_name,old_status_id,new_status_id,webhook_at,created_at&order_id=eq.${orderId}&order=created_at.desc&limit=5`,
  );
  console.log('orderry_webhooks (últimos 5):');
  if (!wh?.length) console.log('  (vacío — evento no llegó al endpoint)');
  else for (const r of wh) console.log(`  ${r.event_name} ${r.old_status_id}→${r.new_status_id} @ ${r.webhook_at || r.created_at}`);
}

console.log(`Monitoreando orden_id=${orderId} cada ${INTERVAL_MS / 1000}s (max ${MAX_POLLS} polls)`);
console.log('Cambia el estado en Orderry ahora…');

await snapshot('Inicial');

let lastHistCount = 0;
for (let i = 0; i < MAX_POLLS; i++) {
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
  const hist = await fetchJson(
    `${sbUrl}/rest/v1/historial_movimientos?select=id,origen&orden_id=eq.${orderId}&origen=eq.webhook`,
  );
  const webhookCount = Array.isArray(hist) ? hist.length : 0;
  if (webhookCount > lastHistCount) {
    console.log(`\n✅ Nueva fila webhook detectada (total webhook: ${webhookCount})`);
    await snapshot('Después del cambio');
    process.exit(0);
  }
  lastHistCount = webhookCount;
  process.stdout.write(`\rPoll ${i + 1}/${MAX_POLLS} — webhook rows: ${webhookCount}   `);
}

console.log('\n\n⏱ Sin filas webhook nuevas tras el tiempo de espera.');
await snapshot('Final');
console.log('\nRevisa: webhook activo en Orderry → Settings > API → URL POST /api/webhooks en Vercel');
