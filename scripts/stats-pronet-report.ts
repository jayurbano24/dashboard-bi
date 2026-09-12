import { requireEnv } from './lib/load-env';
import { fetchPronetOrdersFromOrderry, mergePronetReportRows } from '../src/lib/orderry/fetch-pronet-orders';
import { enrichReportRowsFromOrderry } from '../src/lib/orderry-order-snapshot';
import { deduplicateReportRowsByOrder, getDespachoReportRows } from '../src/lib/supabase-store';
import { GeneratePronetReportUseCase } from '../src/modules/report-engine/application/GeneratePronetReportUseCase';
import { isPronetOrder } from '../src/modules/report-engine/shared/pronet-config';

async function main() {
  const env = requireEnv([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ORDERRY_API_KEY',
  ]);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({}));
  const fromSupabase = rows.filter((r) => isPronetOrder(r));
  const fromOrderry =
    fromSupabase.length > 0
      ? { rows: [], matchedOrders: 0, scannedOrders: 0, scannedPages: 0 }
      : await fetchPronetOrdersFromOrderry({ lookbackDays: 365, maxPages: 20 });
  const pronetRows = mergePronetReportRows(fromSupabase, fromOrderry.rows);

  console.log('Supabase PRONET:', fromSupabase.length);
  console.log('Orderry PRONET:', fromOrderry.matchedOrders, '/', fromOrderry.scannedOrders, 'scanned');
  console.log('Merged:', pronetRows.length);

  if (pronetRows.length > 0) {
    await enrichReportRowsFromOrderry(pronetRows as Record<string, unknown>[], {
      maxFetches: 300,
      concurrency: 8,
      allWithOrderId: true,
    });

    const report = new GeneratePronetReportUseCase().execute(pronetRows);

    console.log('PRONET report rows:', report.length);
    for (const r of report.slice(0, 5)) {
      console.log(
        `${r['Orden de servicio']} | ${r['ESTATUS']} | ${r['Sucursal']} | guia ${r['Numero de Guia'] || '-'} | imei ${r['IMEI'] || '-'}`,
      );
    }
  } else {
    console.log('Sin órdenes PRONET en Supabase ni Orderry (CANAL DE INGRESO / cliente / sucursal).');
  }
}

main().catch(console.error);
