import { requireEnv } from './lib/load-env';
import { enrichReportRowsFromOrderry } from '../src/lib/orderry-order-snapshot';
import {
  deduplicateReportRowsByOrder,
  getDespachoReportRows,
  getHistorialEstadoFechasPorOrdenes,
} from '../src/lib/supabase-store';
import { GenerateServitotalReportUseCase } from '../src/modules/report-engine/application/GenerateServitotalReportUseCase';
import { isServitotalClient } from '../src/modules/report-engine/shared/servitotal-config';

async function main() {
  const env = requireEnv([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ORDERRY_API_KEY',
  ]);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = await getDespachoReportRows({});
  const deduped = deduplicateReportRowsByOrder(rows);
  const servitotalRows = deduped.filter((r) => isServitotalClient(String(r.cliente || '')));

  const { enriched } = await enrichReportRowsFromOrderry(
    servitotalRows as Record<string, unknown>[],
    { maxFetches: 200, concurrency: 10 },
  );
  console.log('Enriched from Orderry:', enriched);

  const orderIds = servitotalRows
    .map((r) => (r.orderId ? String(r.orderId) : ''))
    .filter(Boolean);
  const historialByOrder = await getHistorialEstadoFechasPorOrdenes(orderIds);

  const report = new GenerateServitotalReportUseCase().execute(servitotalRows, historialByOrder);

  console.log('Servitotal rows:', report.length);
  for (const r of report.slice(0, 8)) {
    console.log(
      `${r.ORDEN} | ${r.ESTADO} | folio ${r.FOLIO || '-'} | devolver ${r['Fecha para Devolver'] || '-'} | ent ${r.ENTREGADO || '-'}`,
    );
  }

  const withCliente = deduped.filter((r) =>
    String(r.cliente || '').toUpperCase().includes('SERVITOTAL'),
  );
  console.log('Rows with cliente SERVITOTAL in sync:', withCliente.length);

  const sample = withCliente[0];
  if (sample) {
    const raw = (sample.rawRecord || {}) as Record<string, unknown>;
    console.log('\nSample payload keys:', Object.keys(raw).slice(0, 20));
    console.log('folioPdv field', sample.folioPdv);
    console.log('FOLIO PDV raw', raw['FOLIO PDV']);
    console.log('closed_at', sample.closed_at, 'done_at', sample.done_at);
    const cf = raw.custom_fields;
    console.log('custom_fields type', cf ? typeof cf : 'none', Array.isArray(cf) ? cf.length : '');
    if (cf && typeof cf === 'object') {
      const entries = Array.isArray(cf)
        ? cf.map((x: { name?: string; value?: unknown }) => `${x.name}=${x.value}`)
        : Object.entries(cf as Record<string, unknown>).slice(0, 8).map(([k, v]) => `${k}=${v}`);
      console.log('custom sample', entries.join(' | '));
    }
  }
}

main().catch(console.error);
