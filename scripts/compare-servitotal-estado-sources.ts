import { requireEnv } from './lib/load-env';
import {
  deduplicateReportRowsByOrder,
  getDespachoReportRows,
} from '../src/lib/supabase-store';
import { fetchOrderryOrderSnapshot } from '../src/lib/orderry-order-snapshot';
import { isServitotalClient } from '../src/modules/report-engine/shared/servitotal-config';

async function main() {
  const env = requireEnv([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ORDERRY_API_KEY',
  ]);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({})).filter((r) =>
    isServitotalClient(String(r.cliente || '')),
  );

  const supabaseByStatus = new Map<string, number>();
  const orderryByStatus = new Map<string, number>();
  const mismatches: string[] = [];

  for (const row of rows) {
    const sbStatus = String(row.status_live || row.estado || '(vacío)').trim();
    supabaseByStatus.set(sbStatus, (supabaseByStatus.get(sbStatus) ?? 0) + 1);

    const snap = row.orderId ? await fetchOrderryOrderSnapshot(row.orderId) : null;
    const orStatus = snap?.estado || '(sin API)';
    orderryByStatus.set(orStatus, (orderryByStatus.get(orStatus) ?? 0) + 1);

    if (sbStatus !== orStatus && orStatus !== '(sin API)') {
      mismatches.push(`${row.orderName}: Supabase="${sbStatus}" → Orderry="${orStatus}"`);
    }

    await new Promise((r) => setTimeout(r, 80));
  }

  console.log('=== Servitotal: Supabase (despacho_conduce_rows) ===');
  for (const [k, n] of [...supabaseByStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`);
  }

  console.log('\n=== Servitotal: Orderry API (GET /v2/orders/{id}) ===');
  for (const [k, n] of [...orderryByStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`);
  }

  console.log(`\nTotal órdenes: ${rows.length}`);
  console.log(`Desfases Supabase vs Orderry: ${mismatches.length}`);
  if (mismatches.length > 0) {
    console.log('\nEjemplos de desfase (reporte usa Orderry tras enrich):');
    mismatches.slice(0, 8).forEach((m) => console.log(`  ${m}`));
  }
}

main().catch(console.error);
