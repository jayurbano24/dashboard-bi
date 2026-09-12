import { requireEnv } from './lib/load-env';
import { enrichReportRowsFromOrderry } from '../src/lib/orderry-order-snapshot';
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
  await enrichReportRowsFromOrderry(rows as Record<string, unknown>[], {
    maxFetches: 80,
    concurrency: 12,
  });

  for (const name of ['TCGT-543311', 'TCGT-543448', 'TCGT-543819']) {
    const row = rows.find((r) => r.orderName === name);
    if (!row) continue;
    console.log('\n===', name, 'after enrich ===');
    console.log('conduceId', row.conduceId, 'numeroGuia', row.numeroGuia, 'inCourier', row.inCourier);
    const raw = (row.rawRecord || {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(raw)) {
      const s = String(v ?? '');
      if (
        /guia|conduce|courier|salida|direccion|address|km|carretera|calle|genesis|raul/i.test(
          `${k} ${s}`,
        ) &&
        s.trim()
      ) {
        console.log('raw', k, '=', s.slice(0, 150));
      }
    }
  }
}

main().catch(console.error);
