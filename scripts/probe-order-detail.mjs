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
console.log('orderId', orderId);

const order = await fetch(`${base}/v2/orders/${orderId}`, {
  headers: { Authorization: `Bearer ${key}` },
}).then((r) => r.json());

console.log('top keys:', Object.keys(order).sort().join(', '));
console.log('has status_history:', !!order.status_history, Array.isArray(order.status_history) ? order.status_history.length : order.status_history);
console.log('has history:', !!order.history);
console.log('has timeline:', !!order.timeline);
console.log('done_at', order.done_at, 'closed_at', order.closed_at, 'created_at', order.created_at);
console.log('custom_fields sample keys:', order.custom_fields ? Object.keys(order.custom_fields).slice(0, 8) : null);
if (order.status_history?.[0]) console.log('status_history[0]', JSON.stringify(order.status_history[0], null, 2));
