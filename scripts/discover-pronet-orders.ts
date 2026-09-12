import { requireEnv } from './lib/load-env';
import { deduplicateReportRowsByOrder, getDespachoReportRows } from '../src/lib/supabase-store';

async function main() {
  const env = requireEnv([
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ORDERRY_API_KEY',
  ]);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({}));

  const canalCounts = new Map<string, number>();
  const tipoCounts = new Map<string, number>();
  const retailCounts = new Map<string, number>();

  for (const r of rows) {
    const canal = String(r.canalIngreso || '').trim().toUpperCase() || '(vacío)';
    const tipo = String(r.tipoIngreso || r.retail || '').trim().toUpperCase() || '(vacío)';
    const retail = String(r.retail || '').trim().toUpperCase() || '(vacío)';
    canalCounts.set(canal, (canalCounts.get(canal) ?? 0) + 1);
    tipoCounts.set(tipo, (tipoCounts.get(tipo) ?? 0) + 1);
    retailCounts.set(retail, (retailCounts.get(retail) ?? 0) + 1);
  }

  const printTop = (label: string, m: Map<string, number>) => {
    console.log(`\n${label}:`);
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .forEach(([k, n]) => console.log(`  ${k}: ${n}`));
  };

  printTop('CANAL INGRESO', canalCounts);
  printTop('TIPO/RETAIL', tipoCounts);

  const proLike = rows.filter((r) => {
    const b = [r.cliente, r.canalIngreso, r.tipoIngreso, r.retail, r.dealer, r.sucursal]
      .join(' ')
      .toUpperCase();
    return b.includes('PRO') && (b.includes('NET') || b.includes('NARANJA') || b.includes('PUNTO'));
  });
  console.log('\nPro/Net-like rows:', proLike.length);
  proLike.slice(0, 5).forEach((r) =>
    console.log(r.orderName, r.cliente, r.canalIngreso, r.tipoIngreso, r.sucursal),
  );

  // Orderry API: search recent orders with PRONET in client or custom fields
  const base = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  const res = await fetch(`${base}/v2/orders?page=1&pageSize=50&sort=-modified_at`, {
    headers: { Authorization: `Bearer ${env.ORDERRY_API_KEY}`, Accept: 'application/json' },
  });
  if (res.ok) {
    const batch = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const orders = batch.data || [];
    const pronetOrders = orders.filter((o) => {
      const cf = (o.custom_fields || {}) as Record<string, unknown>;
      const client = o.client as { name?: string } | undefined;
      const blob = JSON.stringify({ ...o, cf, client }).toUpperCase();
      return blob.includes('PRONET');
    });
    console.log('\nOrderry recent PRONET hits:', pronetOrders.length);
    for (const o of pronetOrders.slice(0, 3)) {
      const cf = (o.custom_fields || {}) as Record<string, unknown>;
      const client = o.client as { name?: string } | undefined;
      console.log(
        o.number,
        client?.name,
        'canal f3129964',
        cf.f3129964,
        'tipo f3129962',
        cf.f3129962,
        'status',
        (o.status as { name?: string })?.name,
      );
    }
  }
}

main().catch(console.error);
