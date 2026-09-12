import { requireEnv } from './lib/load-env';
import { deduplicateReportRowsByOrder, getDespachoReportRows } from '../src/lib/supabase-store';
import { fetchOrderryOrderSnapshot } from '../src/lib/orderry-order-snapshot';
import { isPronetOrder } from '../src/modules/report-engine/shared/pronet-config';

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ORDERRY_API_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({})).filter((r) =>
    isPronetOrder(r),
  );

  for (const row of rows.slice(0, 3)) {
    console.log('\n===', row.orderName, '===');
    const raw = (row.rawRecord || {}) as Record<string, unknown>;
    console.log('payload veredicto keys', Object.keys(raw).filter((k) => /veredicto|imei|serie|recomend/i.test(k)));
    console.log('Veredicto raw', raw['Veredicto / recomendaciones del cliente']);

    if (!row.orderId) continue;
    const snap = await fetchOrderryOrderSnapshot(row.orderId);
    const res = await fetch(
      `${process.env.ORDERRY_API_URL || 'https://api.orderry.com'}/v2/orders/${row.orderId}`,
      { headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}` } },
    );
    const o = (await res.json()) as Record<string, unknown>;
    const cf = (o.custom_fields || {}) as Record<string, unknown>;
    console.log('cf keys with values', Object.entries(cf).filter(([, v]) => v).slice(0, 20));
    console.log('engineer_notes', o.engineer_notes);
    console.log('parts', JSON.stringify(o.parts)?.slice(0, 400));
    console.log('works', JSON.stringify(o.works)?.slice(0, 400));
    console.log('asset uid', (o.asset as { uid?: string })?.uid);
    console.log('snap serie', snap?.serie);
  }
}

main().catch(console.error);
