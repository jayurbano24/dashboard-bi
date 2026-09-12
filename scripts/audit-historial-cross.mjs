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

async function fetchAll(table, select, filter = '') {
  const out = [];
  let offset = 0;
  while (true) {
    const r = await fetch(
      `${sbUrl}/rest/v1/${table}?select=${select}&limit=1000&offset=${offset}${filter}`,
      { headers: h },
    );
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return out;
}

const desp = await fetchAll('despacho_conduce_rows', 'order_id,order_name', '&order_id=not.is.null');
const uniqueDesp = [...new Set(desp.map((r) => String(r.order_id).trim()))];

const hist = await fetchAll('historial_movimientos', 'orden_id,origen');
const histSet = new Set(hist.map((r) => String(r.orden_id).trim()));

const matched = uniqueDesp.filter((id) => histSet.has(id));
const despNoHist = uniqueDesp.filter((id) => !histSet.has(id));

console.log('Despacho únicos:', uniqueDesp.length);
console.log('Historial únicos orden_id:', histSet.size);
console.log('Match:', matched.length);
console.log('Despacho SIN historial:', despNoHist.length);
console.log('Ejemplos sin hist:', despNoHist.slice(0, 8));

// Simulate report: orderId Number conversion
const despNoOrderId = desp.filter((r) => !r.order_id).length;
const rowsWithNullOrderId = await fetch(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=id,order_id,order_name&order_id=is.null&limit=10`,
  { headers: h },
).then((r) => r.json());
console.log('Filas despacho sin order_id:', rowsWithNullOrderId?.length ?? 'check count');

// SYNC rows
const syncRows = await fetch(
  `${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id,conduce_id&conduce_id=like.SYNC-*&limit=5`,
  { headers: h },
).then((r) => r.json());
console.log('Filas SYNC-* sample:', syncRows);

// Check Number() mismatch: order_id stored as float?
const weird = uniqueDesp.filter((id) => !/^\d+$/.test(id));
console.log('order_id non-numeric in despacho:', weird.length, weird.slice(0, 5));

// Report uses orderId Number - could 21858093.0 break?
const testId = desp[0]?.order_id;
console.log('Sample order_id raw:', testId, typeof testId, 'String:', String(testId), 'Number:', Number(testId));
