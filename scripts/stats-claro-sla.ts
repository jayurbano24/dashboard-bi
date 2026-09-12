import { requireEnv } from './lib/load-env';
import { getDespachoReportRows, getHistorialEstadoFechasPorOrdenes } from '../src/lib/supabase-store';
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
  const { report } = new GenerateClaroReportUseCase().execute(claro, hist, new Map());

  const dentro = report.filter((r) => r['Estado SLA'] === 'Dentro SLA');
  const fuera = report.filter((r) => r['Estado SLA'] === 'Fuera SLA');
  const enCurso = report.filter((r) => r['Estado SLA'] === 'En curso');
  const sinEntrega = report.filter((r) => !r['Fecha entrega CAC']);

  console.log('=== SLA Claro Mensual ===');
  console.log('Total:', report.length);
  console.log('Dentro SLA (cerradas a tiempo):', dentro.length);
  console.log('Fuera SLA (cerradas tarde):', fuera.length);
  console.log('En curso (sin fecha entrega):', enCurso.length);
  console.log('Sin fecha entrega CAC:', sinEntrega.length);

  console.log('\nPor zona:');
  for (const zone of ['GAM', 'NO GAM'] as const) {
    const z = report.filter((r) => r['GAM / NO GAM'] === zone);
    const obj = z[0]?.['SLA Objetivo'] ?? '?';
    console.log(
      `  ${zone} (objetivo ${obj} días hábiles): total ${z.length} | Dentro ${z.filter((r) => r['Estado SLA'] === 'Dentro SLA').length} | Fuera ${z.filter((r) => r['Estado SLA'] === 'Fuera SLA').length} | En curso ${z.filter((r) => r['Estado SLA'] === 'En curso').length}`,
    );
  }

  const mismasFechas = report.filter(
    (r) =>
      r['Fecha creación Folio'] &&
      r['Fecha Recepción Taller CSA'] &&
      r['Fecha creación Folio'] === r['Fecha Recepción Taller CSA'],
  );
  console.log('\nCreación Folio = Recepción Taller (misma fecha):', mismasFechas.length, '/', report.length);

  console.log('\n--- Fuera SLA (primeros 8) ---');
  for (const r of fuera.slice(0, 8)) {
    console.log(
      `${r.Taller} | ${r['GAM / NO GAM']} | obj ${r['SLA Objetivo']} | real ${r['SLA Real']} | dif ${r['Diferencia SLA']}`,
    );
    console.log(`  Inicio SLA: ${r['Fecha creación Folio']} (= Recepción: ${r['Fecha Recepción Taller CSA']})`);
    console.log(`  Fin SLA:    ${r['Fecha entrega CAC'] || '(sin cierre)'}`);
  }

  console.log('\n--- Dentro SLA (primeros 5) ---');
  for (const r of dentro.filter((x) => x['Fecha entrega CAC']).slice(0, 5)) {
    console.log(
      `${r.Taller} | ${r['GAM / NO GAM']} | obj ${r['SLA Objetivo']} | real ${r['SLA Real']} | cumplimiento ${r['Cumplimiento']}`,
    );
    console.log(`  ${r['Fecha creación Folio']} → ${r['Fecha entrega CAC']}`);
  }
}

main().catch(console.error);
