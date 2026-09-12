import { requireEnv } from './lib/load-env';
import { deduplicateReportRowsByOrder, getDespachoReportRows } from '../src/lib/supabase-store';

async function main() {
  const env = requireEnv([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ORDERRY_API_KEY',
  ]);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const sb = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: key, Authorization: `Bearer ${key}` };

  // Buscar en payload JSON cualquier mención PRONET / PRO NET
  for (const term of ['PRONET', 'PRO NET', 'PRO-NET', 'pronet']) {
    const r = await fetch(
      `${sb}/rest/v1/despacho_conduce_rows?select=order_name,payload&payload=cs.%7B%22${term}%22%7D&limit=5`,
      { headers: h },
    );
    const data = await r.json();
    console.log(`Supabase payload cs ${term}:`, Array.isArray(data) ? data.length : data);
  }

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({}));
  const proHits = rows.filter((r) => {
    const b = JSON.stringify(r).toUpperCase();
    return b.includes('PRONET') || b.includes('PRO NET');
  });
  console.log('Rows with PRONET anywhere in mapped row:', proHits.length);

  // Orderry: buscar en clientes y órdenes recientes
  const base = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  const auth = { Authorization: `Bearer ${env.ORDERRY_API_KEY}`, Accept: 'application/json' };

  let orderHits = 0;
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${base}/v2/orders?page=${page}&pageSize=50&sort=-modified_at`, {
      headers: auth,
    });
    if (!res.ok) {
      console.log('Orderry list error page', page, res.status);
      break;
    }
    const batch = (await res.json()) as { data?: Array<Record<string, unknown>>; paging?: { total_pages?: number } };
    const orders = batch.data || [];
    if (orders.length === 0) break;

    for (const o of orders) {
      const cf = (o.custom_fields || {}) as Record<string, unknown>;
      const client = o.client as { name?: string; id?: number } | undefined;
      const branch = o.branch as { name?: string } | undefined;
      const blob = [
        client?.name,
        branch?.name,
        cf.f3129964,
        cf.f3129962,
        o.malfunction,
        o.number,
      ]
        .join(' ')
        .toUpperCase();
      if (blob.includes('PRONET') || blob.includes('PRO NET')) {
        orderHits++;
        if (orderHits <= 8) {
          console.log(
            'Orderry hit:',
            o.number,
            '| client:',
            client?.name,
            '| canal:',
            cf.f3129964,
            '| tipo:',
            cf.f3129962,
            '| branch:',
            branch?.name,
            '| status:',
            (o.status as { name?: string })?.name,
          );
        }
      }
    }
  }
  console.log('Orderry PRONET hits (20 pages):', orderHits);

  // Clientes Orderry
  const clientsRes = await fetch(`${base}/v2/clients?page=1&pageSize=100`, { headers: auth });
  if (clientsRes.ok) {
    const clients = ((await clientsRes.json()) as { data?: Array<{ name?: string }> }).data || [];
    const pronetClients = clients.filter((c) => String(c.name || '').toUpperCase().includes('PRONET'));
    console.log('Orderry clients PRONET:', pronetClients.length);
    pronetClients.slice(0, 5).forEach((c) => console.log('  client:', (c as { name?: string }).name));
  }
}

main().catch(console.error);
