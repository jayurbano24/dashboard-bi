/**
 * Backfill incompleto unificado: 1 fila por orden faltante en historial_movimientos.
 * Fuente canónica: order_id numérico en despacho_conduce_rows (paginado completo).
 *
 * Uso:
 *   npx tsx scripts/backfill-historial.ts              # dry-run
 *   npx tsx scripts/backfill-historial.ts --apply      # escribe
 *   npx tsx scripts/backfill-historial.ts --apply --limit=50   # prueba parcial
 */
import { requireEnv } from './lib/load-env';
import { fetchAllRows, supabaseHeaders } from './lib/supabase-rest';
import { OrderryClient } from '../src/lib/orderry/client';
import { resolveEstadoCatalogoById } from '../src/lib/orderry-status-catalog';

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
const LIMIT = limitArg ? Number(limitArg) : undefined;

async function main() {
  const env = requireEnv(['ORDERRY_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const postHeaders = supabaseHeaders(sbKey, {
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  });

  const despRows = await fetchAllRows<{ order_id: string }>(
    sbUrl,
    sbKey,
    'despacho_conduce_rows',
    'order_id',
    '&order_id=not.is.null',
  );
  const despachoIds = [...new Set(despRows.map((r) => String(r.order_id).trim()).filter(Boolean))];

  const histRows = await fetchAllRows<{ orden_id: string }>(
    sbUrl,
    sbKey,
    'historial_movimientos',
    'orden_id',
  );
  const covered = new Set(histRows.map((r) => String(r.orden_id).trim()).filter(Boolean));

  let pending = despachoIds.filter((id) => !covered.has(id));
  if (LIMIT && LIMIT > 0) pending = pending.slice(0, LIMIT);

  const despachoConHistorial = despachoIds.length - pending.length;

  console.log(`Modo: ${APPLY ? 'APPLY' : 'dry-run'}`);
  console.log(`Despacho order_id únicos: ${despachoIds.length}`);
  console.log(`Despacho con historial: ${despachoConHistorial}/${despachoIds.length}`);
  console.log(`Historial orden_id únicos (total en tabla): ${covered.size}`);
  console.log(`Pendientes de backfill: ${pending.length}`);

  if (pending.length === 0) {
    console.log('Todas las órdenes despacho ya tienen historial_movimientos.');
    return;
  }

  const client = OrderryClient.fromEnv();
  const toInsert: Record<string, unknown>[] = [];
  let failed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < pending.length; i += 1) {
    const ordenId = pending[i];

    try {
      const order = await client.getOrderById(ordenId);
      const statusId = order.status?.id ?? null;
      const cat = statusId ? await resolveEstadoCatalogoById(statusId) : null;
      const fecha =
        order.modified_at || order.done_at || order.closed_at || order.created_at || new Date().toISOString();

      toInsert.push({
        orden_id: ordenId,
        fecha_hora_cambio: fecha,
        estado_anterior: null,
        estado_nuevo: cat?.estado || order.status?.name || null,
        grupo_nuevo: cat?.grupo || order.status?.group?.name || null,
        status_id_anterior: null,
        status_id_nuevo: statusId,
        origen: 'backfill_incompleto',
        payload_crudo: {
          note: 'Punto de partida — no es historial real previo',
          order_number: order.number,
          source: 'backfill-historial.ts',
        },
      });
    } catch (err) {
      failed += 1;
      if (failed <= 5) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`\nNo se pudo leer orden ${ordenId}: ${msg}`);
      }
    }

    if ((i + 1) % 10 === 0 || i + 1 === pending.length) {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      const rate = i + 1 > 0 ? elapsed / (i + 1) : 0;
      const eta = Math.round(rate * (pending.length - i - 1));
      process.stdout.write(`\rOrderry: ${i + 1}/${pending.length} · ok ${toInsert.length} · fail ${failed} · ~${eta}s rest   `);
    }
  }

  console.log(`\nPlanificadas: ${toInsert.length}, fallidas: ${failed}`);

  if (!APPLY) {
    console.log('Dry-run. Ejecuta con --apply para insertar.');
    if (toInsert[0]) console.log('Muestra:', JSON.stringify(toInsert[0], null, 2));
    return;
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const res = await fetch(`${sbUrl}/rest/v1/historial_movimientos`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      throw new Error(`Insert error ${res.status}: ${await res.text()}`);
    }
    process.stdout.write(`\rInsertadas ${Math.min(i + 100, toInsert.length)}/${toInsert.length}   `);
  }

  console.log(`\nInsertadas ${toInsert.length} filas backfill_incompleto.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
