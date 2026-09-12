/**
 * Audita formato de orden_id entre historial_movimientos y despacho_conduce_rows
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
const h = { apikey: key, Authorization: `Bearer ${key}` };

async function fetchJson(url) {
  const r = await fetch(url, { headers: h });
  return r.json();
}

function classifyId(val) {
  const s = String(val ?? '').trim();
  if (!s) return 'empty';
  if (/^\d+$/.test(s)) return 'numeric';
  if (/^TCGT-/i.test(s) || /^TCCR-/i.test(s)) return 'order_number';
  return 'other';
}

const hist = await fetchJson(
  `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,origen&limit=20&order=created_at.desc`,
);
const desp = await fetchJson(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,order_name&order_id=not.is.null&limit=20`,
);

console.log('=== historial_movimientos (muestra 20) ===');
const histClasses = {};
for (const r of hist || []) {
  const c = classifyId(r.orden_id);
  histClasses[c] = (histClasses[c] || 0) + 1;
  console.log(`  orden_id=${JSON.stringify(r.orden_id)} origen=${r.origen} → ${c}`);
}
console.log('Distribución historial:', histClasses);

console.log('\n=== despacho_conduce_rows (muestra 20) ===');
const despClasses = {};
for (const r of desp || []) {
  const c = classifyId(r.order_id);
  despClasses[c] = (despClasses[c] || 0) + 1;
  console.log(`  order_id=${JSON.stringify(r.order_id)} order_name=${JSON.stringify(r.order_name)} → ${c}`);
}
console.log('Distribución despacho order_id:', despClasses);

// Cruce: order_ids en despacho vs historial
const allDespIds = await fetchJson(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id&order_id=not.is.null&limit=5000`,
);
const uniqueDesp = [...new Set((allDespIds || []).map((r) => String(r.order_id).trim()).filter(Boolean))];

const histAll = await fetchJson(
  `${sbUrl}/rest/v1/historial_movimientos?select=orden_id&limit=10000`,
);
const histSet = new Set((histAll || []).map((r) => String(r.orden_id).trim()));

const matched = uniqueDesp.filter((id) => histSet.has(id));
const despNotInHist = uniqueDesp.filter((id) => !histSet.has(id));
const histNotInDesp = [...histSet].filter((id) => !uniqueDesp.includes(id));

console.log('\n=== CRUCE ===');
console.log(`Órdenes únicas despacho (order_id): ${uniqueDesp.length}`);
console.log(`Filas historial_movimientos: ${histSet.size} orden_ids únicos`);
console.log(`Match order_id despacho ↔ historial: ${matched.length}`);
console.log(`Despacho sin historial: ${despNotInHist.length}`);
console.log(`Historial sin fila despacho (mismo order_id): ${histNotInDesp.length}`);

if (despNotInHist[0]) console.log('Ejemplo despacho sin hist:', despNotInHist.slice(0, 5));
if (histNotInDesp[0]) console.log('Ejemplo hist sin despacho:', histNotInDesp.slice(0, 5));

// ¿Historial guardó order_name en vez de id?
const histTcgt = (histAll || []).filter((r) => /^TC/i.test(String(r.orden_id)));
console.log(`\nHistorial con orden_id tipo TCGT/texto: ${histTcgt.length}`);
if (histTcgt[0]) console.log('Ejemplo:', histTcgt.slice(0, 3));

// Simular lookup del reporte para 5 órdenes despacho
console.log('\n=== Simulación lookup reporte (5 órdenes) ===');
for (const id of uniqueDesp.slice(0, 5)) {
  const inHist = histSet.has(id);
  console.log(`  report orderKey="${id}" → historial ${inHist ? 'OK' : 'MISS'}`);
}
