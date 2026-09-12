import { requireEnv } from './lib/load-env';
import { CLARO_GRUPO_ENTREGA_LABEL } from '../src/modules/report-engine/shared/claro-date-sources';
import { isServitotalClient } from '../src/modules/report-engine/shared/servitotal-config';
import {
  deduplicateReportRowsByOrder,
  getDespachoReportRows,
  getHistorialEstadoFechasPorOrdenes,
} from '../src/lib/supabase-store';

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = deduplicateReportRowsByOrder(await getDespachoReportRows({})).filter((r) =>
    isServitotalClient(String(r.cliente || '')),
  );
  const ids = rows.map((r) => String(r.orderId)).filter(Boolean);
  const hist = await getHistorialEstadoFechasPorOrdenes(ids);

  let withDevolver = 0;
  let withEntregado = 0;
  for (const id of ids) {
    const h = hist.get(id) || {};
    if (h[CLARO_GRUPO_ENTREGA_LABEL]) withDevolver += 1;
    if (h['Fecha Entregado']) withEntregado += 1;
  }

  console.log('orders', ids.length);
  console.log('Fecha Devolver (grupo Entrega)', withDevolver);
  console.log('Fecha Entregado (historial)', withEntregado);

  const labels = [
    CLARO_GRUPO_ENTREGA_LABEL,
    'Fecha Para Devolución',
    'Fecha Para Devolución al CAC',
    'Fecha Devolver',
  ];
  for (const label of labels) {
    const n = ids.filter((id) => Boolean(hist.get(id)?.[label])).length;
    console.log(`${label}: ${n}`);
  }

  const sample = hist.get(ids[0]) || {};
  console.log('sample order', ids[0], labels.map((l) => `${l}=${sample[l] || '-'}`).join(' | '));

  const keys = new Set<string>();
  for (const [, h] of hist) Object.keys(h).forEach((k) => keys.add(k));
  console.log('historial keys', [...keys].sort().join(', '));
}

main().catch(console.error);
