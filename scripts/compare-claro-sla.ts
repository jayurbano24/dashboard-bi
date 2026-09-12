/**
 * Compara Estado SLA legacy (payload) vs fechas corregidas (sync + historial).
 *
 *   npx tsx scripts/compare-claro-sla.ts
 *   npx tsx scripts/compare-claro-sla.ts --start=2026-01-01 --end=2026-09-12
 */
import { requireEnv } from './lib/load-env';
import { getDespachoReportRows, getHistorialEstadoFechasPorOrdenes, getHistorialOrigenByOrders } from '../src/lib/supabase-store';
import { GenerateClaroReportUseCase } from '../src/modules/report-engine/application/GenerateClaroReportUseCase';
import { BusinessCalendarEngine } from '../src/modules/report-engine/domain/BusinessCalendarEngine';
import { CatalogEngine } from '../src/modules/report-engine/domain/CatalogEngine';
import { HomologationEngine } from '../src/modules/report-engine/domain/HomologationEngine';
import { SLAEngine } from '../src/modules/report-engine/domain/SLAEngine';
import { CLARO_HISTORIAL_DATE_KEYS } from '../src/modules/report-engine/shared/claro-date-sources';

const startArg = process.argv.find((a) => a.startsWith('--start='))?.split('=')[1];
const endArg = process.argv.find((a) => a.startsWith('--end='))?.split('=')[1];

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  const rows = await getDespachoReportRows({
    startDate: startArg,
    endDate: endArg,
  });

  const claroRows = rows.filter((r) => {
    const op = String(r.tipoIngreso || r.operador || '').trim().toUpperCase();
    return op === 'OPERADOR' || op === 'DISTRIBUIDOR-CLARO';
  });

  const orderIds = claroRows
    .map((r) => (r.orderId ? String(r.orderId) : ''))
    .filter(Boolean);

  const [historialByOrder, historialOrigenByOrder] = await Promise.all([
    getHistorialEstadoFechasPorOrdenes(orderIds),
    getHistorialOrigenByOrders(orderIds),
  ]);

  const useCase = new GenerateClaroReportUseCase();
  const { report: newReport } = useCase.execute(claroRows, historialByOrder, historialOrigenByOrder);

  const homLegacy = new HomologationEngine(new CatalogEngine(), new SLAEngine(new BusinessCalendarEngine()));
  const legacyReport = claroRows.map((r) => homLegacy.homologateRowLegacy(r));

  const key = (r: { Taller?: string; IMEI?: string }) => `${r.Taller}|${r.IMEI}`;

  const legacyMap = new Map(legacyReport.map((r) => [key(r), r]));
  let slaChanged = 0;
  let dentroToFuera = 0;
  let fueraToDentro = 0;
  let dateColsChanged = 0;
  let cronologiaImposibleLegacy = 0;
  const samples: string[] = [];

  for (const neu of newReport) {
    const old = legacyMap.get(key(neu));
    if (!old) continue;

    const dateFields = [
      'Fecha creación Folio',
      'Fecha envío por parte tienda CAC',
      'Fecha reparación CSA',
      'Fecha Envío CAC',
      'Fecha entrega CAC',
    ] as const;
    if (dateFields.some((f) => old[f] !== neu[f])) dateColsChanged += 1;

    const rep = old['Fecha reparación CSA'];
    const ent = old['Fecha entrega CAC'];
    if (rep && ent && new Date(ent) < new Date(rep)) cronologiaImposibleLegacy += 1;

    if (old['Estado SLA'] !== neu['Estado SLA']) {
      slaChanged += 1;
      if (old['Estado SLA'] === 'Dentro SLA' && neu['Estado SLA'] === 'Fuera SLA') dentroToFuera += 1;
      if (old['Estado SLA'] === 'Fuera SLA' && neu['Estado SLA'] === 'Dentro SLA') fueraToDentro += 1;
      if (old['Estado SLA'] === 'Dentro SLA' && neu['Estado SLA'] === 'En curso') dentroToFuera += 1;
      if (samples.length < 8) {
        samples.push(
          `${neu.Taller}: SLA ${old['Estado SLA']} → ${neu['Estado SLA']} (real ${old['SLA Real']}→${neu['SLA Real']})`,
        );
      }
    }
  }

  let stages2 = 0;
  let stages1plus = 0;
  let envioCacEmpty = 0;
  for (const id of orderIds) {
    const h = historialByOrder.get(id) ?? {};
    const filled = [
      h[CLARO_HISTORIAL_DATE_KEYS.envioTiendaCac],
      h[CLARO_HISTORIAL_DATE_KEYS.reparacionCsa],
    ].filter(Boolean).length;
    if (filled === 2) stages2 += 1;
    if (filled > 0) stages1plus += 1;
  }
  envioCacEmpty = newReport.filter((r) => !r['Fecha Envío CAC']).length;

  const neuDentro = newReport.filter((r) => r['Estado SLA'] === 'Dentro SLA').length;
  const neuFuera = newReport.filter((r) => r['Estado SLA'] === 'Fuera SLA').length;
  const neuCurso = newReport.filter((r) => r['Estado SLA'] === 'En curso').length;
  const legDentro = legacyReport.filter((r) => r['Estado SLA'] === 'Dentro SLA').length;
  const legFuera = legacyReport.filter((r) => r['Estado SLA'] === 'Fuera SLA').length;

  console.log('=== Claro Mensual — comparación legacy (payload) vs sync+historial ===');
  console.log(`Filas Claro (OPERADOR/DISTRIBUIDOR-CLARO): ${newReport.length}`);
  console.log(`Órdenes únicas: ${orderIds.length}`);
  console.log(`Historial etapas 2/2 (tránsito+reparación): ${stages2} | ≥1/2: ${stages1plus}`);
  console.log(`Fecha Envío CAC vacía (por diseño): ${envioCacEmpty}/${newReport.length}`);
  console.log(`Filas con ≥1 columna de fecha distinta vs legacy: ${dateColsChanged}`);
  console.log(`Legacy con entrega CAC < reparación CSA (cronología imposible): ${cronologiaImposibleLegacy}`);
  console.log(`\nEstado SLA legacy: Dentro ${legDentro} | Fuera ${legFuera}`);
  console.log(`Estado SLA nuevo:   Dentro ${neuDentro} | Fuera ${neuFuera} | En curso ${neuCurso}`);
  console.log(`Estado SLA cambió: ${slaChanged} (${((slaChanged / newReport.length) * 100).toFixed(1)}%)`);
  console.log(`  Dentro → Fuera / En curso: ${dentroToFuera}`);
  console.log(`  Fuera → Dentro: ${fueraToDentro}`);
  if (samples.length) {
    console.log('\nMuestras cambio SLA:');
    for (const s of samples) console.log(`  ${s}`);
  }

  // SLA con fechas de payload (error histórico) vs sync Orderry (correcto)
  const slaEngine = new SLAEngine(new BusinessCalendarEngine());
  const catalog = new CatalogEngine();
  let payloadVsSyncSlaChange = 0;
  let payloadDentro = 0;
  let syncDentro = 0;
  let payloadFuera = 0;
  let syncFuera = 0;

  for (const row of claroRows) {
    const canal = String(row.canalIngreso || row.origen || row.dealer || row.sucursal || '');
    const prefix = (canal.match(/^([A-Za-z0-9]+)/)?.[1] || '').toUpperCase();
    const region = catalog.getRegion(prefix);

    const raw = (row.rawRecord || {}) as Record<string, unknown>;
    const payloadStart = raw.created_at || row.fecha || null;
    const payloadEnd = raw.closed_at || row.fecha_entrega || row.fecha || null;
    const syncStart = row.created_at || null;
    const syncEnd = row.closed_at || null;

    const parse = (v: unknown) => {
      if (!v) return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const slaPayload = slaEngine.calculateSLA(parse(payloadStart), parse(payloadEnd), region);
    const slaSync = slaEngine.calculateSLA(parse(syncStart), parse(syncEnd), region);

    if (slaPayload.estadoSla === 'Dentro SLA') payloadDentro += 1;
    if (slaPayload.estadoSla === 'Fuera SLA') payloadFuera += 1;
    if (slaSync.estadoSla === 'Dentro SLA') syncDentro += 1;
    if (slaSync.estadoSla === 'Fuera SLA') syncFuera += 1;

    if (slaPayload.estadoSla !== slaSync.estadoSla && slaSync.estadoSla !== 'En curso') {
      payloadVsSyncSlaChange += 1;
    }
  }

  console.log('\n=== SLA: payload viejo vs sync Orderry (solo órdenes cerradas) ===');
  console.log(`Payload: Dentro ${payloadDentro} | Fuera ${payloadFuera}`);
  console.log(`Sync:    Dentro ${syncDentro} | Fuera ${syncFuera}`);
  console.log(`Cambio Dentro↔Fuera (cerradas): ${payloadVsSyncSlaChange}`);
  console.log('\nNota: Estado SLA usa created_at + closed_at (sync), no las columnas de etapa.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
