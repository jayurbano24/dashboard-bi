import { requireEnv } from './lib/load-env';
import { OrderryClient } from '../src/lib/orderry/client';

async function main() {
  const env = requireEnv(['ORDERRY_API_KEY']);
  process.env.ORDERRY_API_KEY = env.ORDERRY_API_KEY;

  const client = OrderryClient.fromEnv();
  const d = new Date();
  d.setDate(d.getDate() - 180);

  const canals = new Map<string, number>();

  for (let page = 1; page <= 15; page++) {
    const batch = await client.listOrders({
      page,
      pageSize: 50,
      updatedSince: d,
      sort: 'modified_at',
    });

    for (const order of batch.data || []) {
      const cf = (order.custom_fields || {}) as Record<string, unknown>;
      const canal = String(cf.f3129964 || '').trim() || '(vacío)';
      canals.set(canal, (canals.get(canal) ?? 0) + 1);
    }

    if (page >= Number(batch.paging?.total_pages || 1)) break;
  }

  console.log('Top CANAL DE INGRESO (Orderry f3129964):');
  [...canals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .forEach(([name, count]) => console.log(`${count}\t${name}`));
}

main().catch(console.error);
