/**
 * Unifica variantes ZXV10 -> "ZXV10 B866V" en Supabase.
 * Uso: node scripts/unify_zxv10_b866v.mjs [--apply]
 * Sin --apply solo muestra preview (dry-run).
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

const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET = 'ZXV10 B866V';

const VARIANT_FILTERS = [
  'modelo=eq.ZXV10 866V2 SO ANDROID10',
  'modelo=eq.ZXV10 866V2 SO ANDROID12',
  'modelo=eq.ZXV10 B866V-Android',
  'modelo=ilike.*ZXV10*866V2*ANDROID*10*',
  'modelo=ilike.*ZXV10*866V2*ANDROID*12*',
  'modelo=ilike.*ZXV10*B866V*Android*',
];

const headers = {
  apikey: sbKey,
  Authorization: `Bearer ${sbKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function looksLikeVariant(modelo) {
  const n = String(modelo || '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (n === 'ZXV10 B866V') return false;
  return (
    (n.includes('ZXV10') && n.includes('866V2') && n.includes('ANDROID') && (n.includes('10') || n.includes('12'))) ||
    (n.includes('ZXV10') && n.includes('B866V') && n.includes('ANDROID'))
  );
}

const found = new Map();

for (const filter of VARIANT_FILTERS) {
  const r = await fetch(`${sbUrl}/rest/v1/despacho_conduce_rows?select=id,imei,marca,modelo,order_name&${filter}`, {
    headers,
  });
  const rows = await r.json();
  if (!Array.isArray(rows)) {
    console.log('filter error', filter, rows);
    continue;
  }
  for (const row of rows) {
    if (!looksLikeVariant(row.modelo) && String(row.modelo).trim() === TARGET) continue;
    if (!looksLikeVariant(row.modelo) && !VARIANT_FILTERS.some(() => true)) continue;
    if (String(row.modelo).trim() === TARGET) continue;
    if (!looksLikeVariant(row.modelo) && !/ZXV10 866V2 SO ANDROID(10|12)|ZXV10 B866V-Android/i.test(row.modelo)) {
      // keep exact eq matches even if looksLikeVariant is strict
      if (!/^ZXV10 866V2 SO ANDROID(10|12)$/i.test(row.modelo) && !/^ZXV10 B866V-Android$/i.test(row.modelo)) {
        continue;
      }
    }
    found.set(row.id, row);
  }
}

const rows = [...found.values()];
console.log(`Encontradas ${rows.length} filas a unificar -> "${TARGET}"`);
const byFrom = {};
for (const r of rows) byFrom[r.modelo] = (byFrom[r.modelo] || 0) + 1;
console.log(byFrom);

if (!APPLY) {
  console.log('Dry-run. Ejecuta con --apply para actualizar.');
  process.exit(0);
}

let updated = 0;
for (const row of rows) {
  const r = await fetch(`${sbUrl}/rest/v1/despacho_conduce_rows?id=eq.${row.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      modelo: TARGET,
      payload: {
        ...(typeof row.payload === 'object' && row.payload ? row.payload : {}),
        modelo: TARGET,
      },
    }),
  });
  if (!r.ok) {
    console.log('fail', row.id, await r.text());
    continue;
  }
  updated += 1;
}

console.log(`Actualizadas ${updated}/${rows.length} filas.`);
