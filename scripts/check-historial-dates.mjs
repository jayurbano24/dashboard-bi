/**
 * Diagnóstico: por qué las fechas del reporte historial están vacías.
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
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

async function fetchJson(url) {
  const r = await fetch(url, { headers: h });
  const body = await r.json();
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return body;
}

const histCount = await fetch(`${sbUrl}/rest/v1/historial_movimientos?select=count`, {
  headers: { ...h, Prefer: 'count=exact' },
});
console.log('historial_movimientos count:', histCount.headers.get('content-range'));

const sampleHist = await fetchJson(
  `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,estado_nuevo,status_id_nuevo,fecha_hora_cambio,origen&limit=5&order=created_at.desc`,
);
console.log('\nMuestra historial:', JSON.stringify(sampleHist, null, 2));

const despacho = await fetchJson(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name&limit=5000`,
);
const withId = despacho.filter((r) => r.order_id != null);
const withoutId = despacho.filter((r) => r.order_id == null);
console.log(`\ndespacho rows: ${despacho.length}, con order_id: ${withId.length}, sin order_id: ${withoutId.length}`);

const histIds = new Set(
  (await fetchJson(`${sbUrl}/rest/v1/historial_movimientos?select=orden_id&limit=10000`)).map((r) =>
    String(r.orden_id),
  ),
);
const uniqueOrderIds = [...new Set(withId.map((r) => String(r.order_id)))];
const matched = uniqueOrderIds.filter((id) => histIds.has(id));
console.log(`Órdenes únicas con order_id: ${uniqueOrderIds.length}, con historial: ${matched.length}`);

if (sampleHist[0]) {
  const ordenId = sampleHist[0].orden_id;
  const despachoMatch = despacho.find((r) => String(r.order_id) === String(ordenId));
  console.log(`\nMuestra orden_id=${ordenId}, estado=${sampleHist[0].estado_nuevo}, status_id=${sampleHist[0].status_id_nuevo}`);
  console.log('Match despacho:', despachoMatch ? `order_name=${despachoMatch.order_name}` : 'NO ENCONTRADO');
}

const reportRouteIds = [...new Set(withId.map((r) => String(r.order_id)))];
const histOnly = [...histIds].filter((id) => !reportRouteIds.includes(id));
console.log(`\nHistorial sin fila despacho con ese order_id: ${histOnly.length}`);
if (histOnly[0]) console.log('Ejemplo:', histOnly[0]);
