import { requireEnv } from './lib/load-env';
import { deduplicateReportRowsByOrder, getDespachoReportRows } from '../src/lib/supabase-store';
import { isPronetOrder } from '../src/modules/report-engine/shared/pronet-config';

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({})).filter((r) =>
    isPronetOrder(r),
  );

  for (const name of ['TCGT-543311', 'TCGT-543448', 'TCGT-543819']) {
    const row = rows.find((r) => r.orderName === name);
    if (!row) continue;
    console.log('\n===', name, '===');
    console.log('conduceId', row.conduceId);
    console.log('numeroGuia', row.numeroGuia);
    console.log('inCourier', row.inCourier);
    console.log('sucursal', row.sucursal);
    console.log('origen', row.origen);
    const raw = (row.rawRecord || {}) as Record<string, unknown>;
    const cf = (raw.custom_fields || {}) as Record<string, unknown>;
    console.log('cf f3147565', cf.f3147565, 'f3151083', cf.f3151083);
    for (const [k, v] of Object.entries(raw)) {
      const s = String(v ?? '');
      if (/guia|conduce|courier|salida|direccion|address|km|carretera|calle/i.test(`${k} ${s}`) && s.trim()) {
        console.log('raw', k, '=', s.slice(0, 120));
      }
    }
  }
}

main().catch(console.error);
