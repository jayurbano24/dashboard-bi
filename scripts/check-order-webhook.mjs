import fs from 'node:fs';

const orderName = process.argv[2] || 'TCGT-543944';
const orderIdArg = process.argv[3];

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

let orderId = orderIdArg;

const desp = await fetchJson(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name,status_live&order_name=eq.${encodeURIComponent(orderName)}`,
);
console.log('=== despacho_conduce_rows ===');
console.log(desp?.length ? desp : '(no en despacho)');

if (!orderId && desp?.[0]?.order_id) orderId = String(desp[0].order_id);

if (!orderId && env.ORDERRY_API_KEY) {
  const base = env.ORDERRY_API_URL || 'https://api.orderry.com';
  const res = await fetch(`${base}/v2/orders?numbers=${encodeURIComponent(orderName)}&limit=1`, {
    headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}`, Accept: 'application/json' },
  });
  const body = await res.json();
  const o = body?.data?.[0];
  if (o) {
    orderId = String(o.id);
    console.log('\n=== Orderry API ===');
    console.log(`  id=${o.id}  number=${o.number}  status=${o.status?.name}  modified=${o.modified_at}`);
  }
}

if (!orderId) {
  console.error('No se encontró order_id para', orderName);
  process.exit(1);
}

console.log(`\n>>> order_id = ${orderId} (${orderName})\n`);

const hist = await fetchJson(
  `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,fecha_hora_cambio,estado_anterior,estado_nuevo,grupo_nuevo,origen,created_at&orden_id=eq.${orderId}&order=fecha_hora_cambio.desc&limit=5`,
);
console.log('=== historial_movimientos (últimas 5) ===');
if (!hist?.length) console.log('  (vacío)');
else for (const r of hist) {
  console.log(`  [${r.origen}] ${r.estado_anterior ?? '—'} → ${r.estado_nuevo} (${r.grupo_nuevo}) @ ${r.fecha_hora_cambio}`);
}

const wh = await fetchJson(
  `${sbUrl}/rest/v1/orderry_webhooks?select=event_name,order_id,order_name,old_status_id,new_status_id,webhook_at,created_at,raw_payload&order_id=eq.${orderId}&order=created_at.desc&limit=5`,
);
console.log('\n=== orderry_webhooks (esta orden) ===');
if (!wh?.length) console.log('  (vacío — POST no llegó o falló antes de insertar)');
else for (const r of wh) {
  console.log(`  ${r.event_name} ${r.old_status_id}→${r.new_status_id} @ ${r.webhook_at || r.created_at}`);
  if (r.raw_payload?.metadata) {
    const m = r.raw_payload.metadata;
    console.log(`    payload new.id=${m.new?.id} old.id=${m.old?.id} order.id=${m.order?.id}`);
  }
}

const webhookHist = (hist || []).filter((r) => r.origen === 'webhook');
if (wh?.length && !webhookHist.length) {
  console.log('\n⚠ Webhook en orderry_webhooks pero SIN fila origen=webhook en historial_movimientos');
  const ids = [...new Set(wh.flatMap((r) => [r.old_status_id, r.new_status_id].filter(Boolean)))];
  if (ids.length) {
    const cat = await fetchJson(
      `${sbUrl}/rest/v1/estados_catalogo?select=status_id,estado,grupo&status_id=in.(${ids.join(',')})`,
    );
    console.log('  estados_catalogo para status_ids del evento:', cat);
  }
}

const whGlobal = await fetchJson(
  `${sbUrl}/rest/v1/orderry_webhooks?select=event_name,order_id,order_name,webhook_at,created_at&order=created_at.desc&limit=5`,
);
console.log('\n=== orderry_webhooks (últimos 5 globales) ===');
if (!whGlobal?.length) console.log('  (ningún evento webhook en la DB)');
else for (const r of whGlobal) {
  console.log(`  ${r.order_name} (${r.order_id}) ${r.event_name} @ ${r.webhook_at || r.created_at}`);
}
