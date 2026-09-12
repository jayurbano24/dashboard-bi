/**
 * Sincroniza estados_catalogo desde Orderry GET /v2/orders/statuses
 * Uso: node scripts/sync-orderry-statuses.mjs
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

const baseUrl = env.ORDERRY_API_URL || 'https://api.orderry.com';
const apiKey = env.ORDERRY_API_KEY;
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !sbUrl || !sbKey) {
  console.error('Faltan ORDERRY_API_KEY, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const sbHeaders = {
  apikey: sbKey,
  Authorization: `Bearer ${sbKey}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates',
};

const statusRes = await fetch(`${baseUrl}/v2/orders/statuses`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
if (!statusRes.ok) {
  console.error('Orderry /v2/orders/statuses →', statusRes.status, await statusRes.text());
  process.exit(1);
}

const statuses = await statusRes.json();
if (!Array.isArray(statuses)) {
  console.error('Respuesta inesperada de Orderry');
  process.exit(1);
}

const now = new Date().toISOString();
const rows = statuses
  .map((s) => {
    const status_id = Number(s.id);
    const estado = String(s.name || '').trim();
    const grupo = String(s.group?.name || '').trim();
    if (!Number.isFinite(status_id) || !estado || !grupo) return null;
    return {
      status_id,
      estado,
      grupo,
      grupo_type: typeof s.group?.type === 'number' ? s.group.type : null,
      color: s.color ? String(s.color) : null,
      synced_at: now,
      updated_at: now,
    };
  })
  .filter(Boolean);

const upsertRes = await fetch(`${sbUrl}/rest/v1/estados_catalogo?on_conflict=status_id`, {
  method: 'POST',
  headers: sbHeaders,
  body: JSON.stringify(rows),
});

if (!upsertRes.ok) {
  console.error('Supabase upsert error:', upsertRes.status, await upsertRes.text());
  process.exit(1);
}

console.log(`OK: ${rows.length} estados sincronizados desde GET /v2/orders/statuses (${statuses.length} recibidos).`);
