/**
 * Auditoría webhook + candidatos para prueba en vivo
 */
import fs from 'node:fs';

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
const h = { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' };

async function count(table, filter = '') {
  const r = await fetch(`${sbUrl}/rest/v1/${table}?select=count${filter}`, { headers: h });
  return r.headers.get('content-range');
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return r.json();
}

console.log('=== WEBHOOK EN historial_movimientos ===');
console.log('origen=webhook:', await count('historial_movimientos', '&origen=eq.webhook'));

const webhookRows = await fetchJson(
  `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,fecha_hora_cambio,estado_anterior,estado_nuevo,grupo_nuevo,origen,created_at&origen=eq.webhook&order=created_at.desc&limit=10`,
);
console.log('\nÚltimas 10 filas webhook:');
if (!webhookRows?.length) console.log('  (ninguna — webhook NO ha insertado historial aún)');
else for (const r of webhookRows) console.log(`  ${r.orden_id} | ${r.estado_anterior} → ${r.estado_nuevo} (${r.grupo_nuevo}) | ${r.fecha_hora_cambio}`);

console.log('\n=== orderry_webhooks (eventos recibidos) ===');
console.log('Total:', await count('orderry_webhooks'));
const owRows = await fetchJson(
  `${sbUrl}/rest/v1/orderry_webhooks?select=event_name,order_id,order_name,old_status_id,new_status_id,webhook_at,created_at&order=created_at.desc&limit=10`,
);
if (!Array.isArray(owRows) || owRows.error) {
  console.log('  Tabla no accesible o vacía:', owRows?.message || owRows);
} else {
  for (const r of owRows) {
    console.log(`  ${r.webhook_at || r.created_at} | ${r.event_name} | order ${r.order_id} (${r.order_name}) ${r.old_status_id}→${r.new_status_id}`);
  }
}

// Candidatos despacho
const candidates = await fetchJson(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name,status_live,estado,last_synced_at&order_id=not.is.null&order=last_synced_at.desc.nullslast&limit=20`,
);
console.log('\n=== CANDIDATOS ORDEN DE PRUEBA (despacho, sync reciente) ===');
const seen = new Set();
for (const r of candidates || []) {
  const oid = String(r.order_id);
  if (seen.has(oid)) continue;
  seen.add(oid);
  const estado = r.status_live || r.estado || '(sin estado)';
  console.log(`  order_id=${oid}  order_name=${r.order_name}  estado=${estado}`);
  if (seen.size >= 5) break;
}

// Si no hay status_live, buscar cualquier orden con nombre TCGT
if (seen.size === 0) {
  const any = await fetchJson(
    `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name,estado&order_id=not.is.null&order_name=like.TCGT-*&limit=5`,
  );
  for (const r of any || []) {
    console.log(`  order_id=${r.order_id}  order_name=${r.order_name}  estado=${r.estado || '—'}`);
  }
}

// Recomendación: orden activa desde Orderry API
if (env.ORDERRY_API_KEY) {
  console.log('\n=== ÓRDENES ACTIVAS EN ORDERRY (modified_at reciente) ===');
  try {
    const res = await fetch(`${env.ORDERRY_API_URL || 'https://api.orderry.com'}/v2/orders?page=1&limit=5&sort=-modified_at`, {
      headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}`, Accept: 'application/json' },
    });
    const body = await res.json();
    for (const o of body.data || []) {
      console.log(`  order_id=${o.id}  number=${o.number}  status=${o.status?.name}  modified=${o.modified_at}`);
    }
  } catch (e) {
    console.log('  No se pudo consultar Orderry:', e.message);
  }
}

console.log('\n=== estados_catalogo ===');
console.log('Total:', await count('estados_catalogo'));

console.log('\n=== URL WEBHOOK ESPERADA ===');
const vercelUrl = env.VERCEL_URL || env.NEXT_PUBLIC_APP_URL || '(tu-dominio-vercel)';
console.log(`  POST https://${vercelUrl.replace(/^https?:\/\//, '')}/api/webhooks`);
