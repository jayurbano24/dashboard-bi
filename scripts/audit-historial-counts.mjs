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

async function fetchAll(table, select) {
  const out = [];
  let offset = 0;
  while (true) {
    const r = await fetch(`${sbUrl}/rest/v1/${table}?select=${select}&limit=1000&offset=${offset}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function count(table, filter = '') {
  const r = await fetch(`${sbUrl}/rest/v1/${table}?select=count${filter}`, { headers: h });
  return r.headers.get('content-range');
}

console.log('Total historial_movimientos:', await count('historial_movimientos'));
console.log('backfill_incompleto:', await count('historial_movimientos', '&origen=eq.backfill_incompleto'));
console.log('webhook:', await count('historial_movimientos', '&origen=eq.webhook'));
console.log('synthetic_*:', await count('historial_movimientos', '&origen=like.synthetic*'));

// Paginate all unique orden_ids
const ids = new Set();
let offset = 0;
const pageSize = 1000;
while (true) {
  const r = await fetch(
    `${sbUrl}/rest/v1/historial_movimientos?select=orden_id,origen&limit=${pageSize}&offset=${offset}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) break;
  for (const row of rows) ids.add(String(row.orden_id));
  if (rows.length < pageSize) break;
  offset += pageSize;
}
console.log('Unique orden_id (paginated):', ids.size);

const byOrigen = {};
offset = 0;
while (true) {
  const r = await fetch(
    `${sbUrl}/rest/v1/historial_movimientos?select=origen&limit=${pageSize}&offset=${offset}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) break;
  for (const row of rows) {
    const o = row.origen || 'null';
    byOrigen[o] = (byOrigen[o] || 0) + 1;
  }
  if (rows.length < pageSize) break;
  offset += pageSize;
}
console.log('Rows by origen:', byOrigen);

const despRows = await fetchAll('despacho_conduce_rows', 'order_id');
const despUnique = new Set(despRows.map((r) => String(r.order_id).trim()).filter(Boolean));
console.log('Despacho total filas:', despRows.length, '| order_id únicos:', despUnique.size);
console.log('Despacho sin historial (paginado):', [...despUnique].filter((id) => !ids.has(id)).length);

const osh = await count('order_status_history');
console.log('order_status_history rows:', osh);
