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

const base = env.ORDERRY_API_URL || 'https://api.orderry.com';
const key = env.ORDERRY_API_KEY;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;

const rows = await fetch(`${sbUrl}/rest/v1/despacho_conduce_rows?select=order_id&order_id=not.is.null&limit=1`, {
  headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
}).then((r) => r.json());
const orderId = rows[0]?.order_id;

const paths = [
  `/v2/orders/statuses`,
  `/statuses/orders?api_token=${key}`,
  `/v2/orders/${orderId}`,
  `/v2/orders/${orderId}/history`,
  `/v2/orders/${orderId}/events`,
  `/v2/orders/${orderId}/timeline`,
  `/orders/${orderId}/events?api_token=${key}`,
  `/orders/${orderId}/history?api_token=${key}`,
  `/v2/orders/${orderId}/comments`,
  `/v2/orders/${orderId}/journal`,
  `/v2/orders/${orderId}/status-history`,
  `/v2/activity-log`,
  `/v2/reports/activity-log`,
];

for (const path of paths) {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const useBearer = !path.includes('api_token=');
  const r = await fetch(url, {
    headers: useBearer ? { Authorization: `Bearer ${key}`, Accept: 'application/json' } : { Accept: 'application/json' },
  });
  let preview = '';
  try {
    const t = await r.text();
    preview = t.slice(0, 400);
  } catch {}
  console.log('\n---', path.split('?')[0], '→', r.status);
  console.log(preview);
}
