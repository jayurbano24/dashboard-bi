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
  const row = rows[0];
  if (!row?.orderId) {
    console.log('No PRONET row');
    return;
  }

  const res = await fetch(`${base}/v2/orders/${row.orderId}`, {
    headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}` },
  });
  const o = (await res.json()) as Record<string, unknown>;
  const client = o.client as Record<string, unknown> | undefined;

  console.log('order', row.orderName);
  console.log('client keys', client ? Object.keys(client) : []);
  console.log('client', JSON.stringify(client, null, 2));
  console.log('custom_fields', JSON.stringify(o.custom_fields, null, 2));
  console.log('engineer_notes', o.engineer_notes);
  console.log('works', JSON.stringify(o.works, null, 2));

  const raw = (row.rawRecord || {}) as Record<string, unknown>;
  console.log('supabase raw keys sample', Object.keys(raw).slice(0, 30));
  console.log('supabase DNI-like', raw['DNI'], raw['DPI'], raw['dni']);
  console.log('conduceId', row.conduceId, 'numeroGuia', row.numeroGuia, 'inCourier', row.inCourier);
  console.log('raw guia', raw['GUIAS CAEX'], raw.guia, raw['CONDUCE DE SALIDA O NUMERO DE GUIAS DE SALIDA']);
  console.log('raw engineer_notes', raw.engineer_notes);

  const bad = rows.find((r) => r.orderName === 'TCGT-543311');
  if (bad) {
    const br = (bad.rawRecord || {}) as Record<string, unknown>;
    console.log('\n--- TCGT-543311 ---');
    console.log('conduceId', bad.conduceId, 'numeroGuia', bad.numeroGuia);
    console.log('raw keys with guia/addr', Object.entries(br).filter(([k, v]) =>
      /guia|conduce|addr|courier|salida/i.test(k) && v,
    ));
  }
}

main().catch(console.error);
