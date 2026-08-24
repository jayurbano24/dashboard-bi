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
const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

// List tables via OpenAPI schema
const r = await fetch(`${sbUrl}/rest/v1/`, { headers: { ...headers, Accept: 'application/openapi+json' } });
const schema = await r.json();
const paths = Object.keys(schema.paths || {})
  .filter((p) => p.startsWith('/') && !p.slice(1).includes('/'))
  .map((p) => p.slice(1))
  .sort();
console.log('tables:', paths.join(', '));

for (const t of paths) {
  if (!/despacho|model|order|equipo|asset|prealert|conduce/i.test(t)) continue;
  const cols = schema.paths[`/${t}`]?.get?.parameters
    || Object.keys(schema.definitions?.[t]?.properties || schema.components?.schemas?.[t]?.properties || {});
  const props = schema.definitions?.[t]?.properties || schema.components?.schemas?.[t]?.properties || {};
  const colNames = Object.keys(props);
  const hasModelo = colNames.some((c) => /modelo|model/i.test(c));
  if (hasModelo || /despacho|model/i.test(t)) {
    console.log(`\n${t}:`, colNames.join(', ') || '(no props)');
  }
}
