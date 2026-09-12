/**
 * Elimina filas duplicadas de backfill_incompleto (conserva 1 por orden_id).
 *
 *   npx tsx scripts/cleanup-historial-duplicates.ts           # dry-run
 *   npx tsx scripts/cleanup-historial-duplicates.ts --apply   # borra
 */
import { requireEnv } from './lib/load-env';
import { deleteByIds, fetchAllRows, supabaseHeaders } from './lib/supabase-rest';

const APPLY = process.argv.includes('--apply');

type HistRow = { id: string; orden_id: string; created_at: string; origen: string };

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const rows = await fetchAllRows<HistRow>(
    sbUrl,
    sbKey,
    'historial_movimientos',
    'id,orden_id,created_at,origen',
    '&origen=eq.backfill_incompleto',
  );

  const byOrden = new Map<string, HistRow[]>();
  for (const row of rows) {
    const key = String(row.orden_id).trim();
    const list = byOrden.get(key) ?? [];
    list.push(row);
    byOrden.set(key, list);
  }

  const toDelete: string[] = [];
  let duplicateGroups = 0;

  for (const [, group] of byOrden) {
    if (group.length <= 1) continue;
    duplicateGroups += 1;
    group.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const [, ...dupes] = group;
    toDelete.push(...dupes.map((r) => r.id));
  }

  console.log(`Filas backfill_incompleto: ${rows.length}`);
  console.log(`Órdenes únicas: ${byOrden.size}`);
  console.log(`Grupos con duplicados: ${duplicateGroups}`);
  console.log(`Filas a eliminar: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('Nada que limpiar.');
    return;
  }

  if (!APPLY) {
    console.log('Dry-run. Ejecuta con --apply para eliminar duplicados.');
    return;
  }

  await deleteByIds(sbUrl, sbKey, 'historial_movimientos', toDelete);
  console.log(`Eliminadas ${toDelete.length} filas duplicadas.`);

  const countRes = await fetch(`${sbUrl}/rest/v1/historial_movimientos?select=count&origen=eq.backfill_incompleto`, {
    headers: supabaseHeaders(sbKey, { Prefer: 'count=exact' }),
  });
  console.log('backfill_incompleto restantes:', countRes.headers.get('content-range'));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
