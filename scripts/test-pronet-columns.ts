import { requireEnv } from './lib/load-env';
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

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({})).filter((r) =>
    isPronetOrder(r),
  );
  await enrichReportRowsFromOrderry(rows as Record<string, unknown>[], {
    maxFetches: 80,
    concurrency: 12,
    allWithOrderId: true,
  });

  const report = new GeneratePronetReportUseCase().execute(rows);
  for (const r of report) {
    const raw = rows.find((x) => x.orderName === r['Orden de servicio'])?.rawRecord as
      | Record<string, unknown>
      | undefined;
    console.log(
      [
        r['Orden de servicio'],
        `guia=${r['Numero de Guia'] || '-'}`,
        `nuevo=${r['Nuevo IMEI'] || '-'}`,
        `eng=${String(raw?.engineer_notes || '').slice(0, 30)}`,
        `addr=${String(raw?.address || '').slice(0, 30)}`,
      ].join(' | '),
    );
  }
}

main().catch(console.error);
