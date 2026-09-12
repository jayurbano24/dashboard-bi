import { requireEnv } from './lib/load-env';
import { deduplicateReportRowsByOrder, getDespachoReportRows } from '../src/lib/supabase-store';
import { isPronetOrder } from '../src/modules/report-engine/shared/pronet-config';

async function main() {
  const env = requireEnv([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ORDERRY_API_KEY',
  ]);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({})).filter((r) =>
    isPronetOrder(r),
  );
  const base = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  const allCfKeys = new Set<string>();

  for (const row of rows.slice(0, 8)) {
    if (!row.orderId) continue;
    const res = await fetch(`${base}/v2/orders/${row.orderId}`, {
      headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}` },
    });
    const o = (await res.json()) as Record<string, unknown>;
    const cf = (o.custom_fields || {}) as Record<string, unknown>;
    Object.keys(cf).forEach((k) => allCfKeys.add(k));
    const client = o.client as Record<string, unknown> | undefined;
    console.log(row.orderName, 'branch', (o.branch as { name?: string })?.name, 'cf', cf);
    console.log('  client cf', client?.custom_fields);
  }
  console.log('all cf keys', [...allCfKeys].sort());
}

main().catch(console.error);
