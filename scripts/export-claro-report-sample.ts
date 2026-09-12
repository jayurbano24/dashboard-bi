/**
 * Exporta muestra JSON del reporte Claro con fechas corregidas.
 *   npx tsx scripts/export-claro-report-sample.ts
 */
import fs from 'node:fs';
import { requireEnv } from './lib/load-env';
import {
  getDespachoReportRows,
  getHistorialEstadoFechasPorOrdenes,
  getHistorialOrigenByOrders,
} from '../src/lib/supabase-store';
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
  const [historialByOrder, historialOrigenByOrder] = await Promise.all([
    getHistorialEstadoFechasPorOrdenes(ids),
    getHistorialOrigenByOrders(ids),
  ]);

  const { report } = new GenerateClaroReportUseCase().execute(claro, historialByOrder, historialOrigenByOrder);

  const cols = [
    'Taller',
    'Fecha creación Folio',
    'Fecha Recepción Taller CSA',
    'Fecha envío por parte tienda CAC',
    'Fecha reparación CSA',
    'Fecha Envío CAC',
    'Fecha entrega CAC',
    'Origen de fechas',
    'Estado SLA',
    'SLA Real',
    'SLA Objetivo',
    'Diferencia SLA',
  ] as const;

  const sample = report.slice(0, 20).map((r) => {
    const out: Record<string, string | number> = {};
    for (const c of cols) out[c] = r[c as keyof typeof r] as string | number;
    return out;
  });

  const outPath = 'tmp-claro-report-sample.json';
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: report.length, sample }, null, 2));
  console.log(`Escrito ${outPath} (${report.length} filas totales, muestra 20)`);
}

main().catch(console.error);
