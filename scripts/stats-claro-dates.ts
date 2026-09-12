import { requireEnv } from './lib/load-env';
import { getDespachoReportRows, getHistorialEstadoFechasPorOrdenes, getSupabaseAdmin } from '../src/lib/supabase-store';
import { GenerateClaroReportUseCase } from '../src/modules/report-engine/application/GenerateClaroReportUseCase';

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = await getDespachoReportRows({});
  const claro = rows.filter((r) => {
    const op = String(r.tipoIngreso || r.operador || '').trim().toUpperCase();
    return op === 'OPERADOR' || op === 'DISTRIBUIDOR-CLARO';
  });
  const ids = claro.map((r) => String(r.orderId)).filter(Boolean);
  const hist = await getHistorialEstadoFechasPorOrdenes(ids);

  const colCounts = new Map<string, number>();
  for (const h of hist.values()) {
    for (const [k, v] of Object.entries(h)) {
      if (v) colCounts.set(k, (colCounts.get(k) ?? 0) + 1);
    }
  }
  console.log('Historial cols filled (top):', [...colCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
  const { report } = new GenerateClaroReportUseCase().execute(claro, hist, new Map());

  const empty = (f: keyof (typeof report)[0]) => report.filter((r) => !r[f]).length;
  console.log('Claro rows', report.length);
  console.log('Empty reparacion', empty('Fecha reparación CSA'));
  console.log('Empty envio CAC', empty('Fecha Envío CAC'));
  console.log('Empty grupo ganado', empty('Fecha Grupo Ganado'));
  console.log('Empty devolver', empty('Fecha Devolver'));
  console.log('With done_at', claro.filter((r) => r.done_at).length);
  console.log('With modified_at', claro.filter((r) => r.modified_at).length);

  const para = report.filter((r) => {
    const s = String(r.Estatus).toUpperCase();
    return s.includes('DEVOLU') || s.includes('PARA');
  });
  console.log('Devolucion status count', para.length);
  console.log('Devolucion with envio', para.filter((r) => r['Fecha Envío CAC']).length);
  for (const r of para.slice(0, 8)) {
    console.log(
      ' ',
      r.Taller,
      r.Estatus,
      'envio=',
      r['Fecha Envío CAC'] || '-',
      'grupo=',
      r['Fecha Grupo Ganado'] || '-',
      'rep=',
      r['Fecha reparación CSA'] || '-',
    );
  }

  const sample = claro.find((r) => r.orderName?.includes('543952'));
  if (sample?.orderId) {
    const h = hist.get(String(sample.orderId));
    console.log('\nDEBUG 543952 orderId', sample.orderId, 'estado', sample.estado, 'done_at', sample.done_at, 'modified_at', sample.modified_at);
    console.log('Fecha Para Devolución', h?.['Fecha Para Devolución']);
    console.log('Fecha Devolución Cambio en Agencia', h?.['Fecha Devolución Cambio en Agencia']);
    console.log('filled cols', Object.entries(h ?? {}).filter(([, v]) => v).map(([k]) => k));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
