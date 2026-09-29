/**
 * Busca una orden por label en API v2 y en despacho_conduce_rows (Supabase).
 *
 *   npx tsx scripts/lookup-orderry-order.ts TCGT-548123
 */
import { loadEnv, requireEnv } from './lib/load-env';
import { OrderryClient } from '../src/lib/orderry/client';
import { getSupabaseAdmin } from '../src/lib/supabase-store';

async function main() {
  const ref = process.argv[2]?.trim();
  if (!ref) {
    console.error('Uso: npx tsx scripts/lookup-orderry-order.ts TCGT-548123');
    process.exit(1);
  }

  const env = requireEnv(['ORDERRY_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  console.log(`\n=== Orderry API v2 (numbers=${ref}) ===`);
  const client = OrderryClient.fromEnv(process.env);
  try {
    const listed = await client.listOrders({ numbers: [ref], pageSize: 20 });
    console.log(`Resultados: ${listed.data.length}`);
    for (const o of listed.data) {
      console.log(`  id=${o.id} number=${o.number ?? o.name} status=${o.status?.name}`);
    }
  } catch (e) {
    console.log(`Error list: ${e instanceof Error ? e.message : e}`);
  }

  const listedId = (await client.listOrders({ numbers: [ref], pageSize: 1 }).catch(() => ({ data: [] }))).data[0]?.id;
  if (listedId) {
    console.log(`\n=== Orderry API v2 GET /v2/orders/${listedId} (id interno) ===`);
    try {
      const o = await client.getOrderById(listedId);
      console.log(`  id=${o.id} number=${o.number ?? o.name} status=${o.status?.name}`);
    } catch (e) {
      console.log(`  Error: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log('\n(Nota: GET /v2/orders/544018 falla; el id de API es el interno, no el número del label.)');

  console.log(`\n=== Supabase despacho_conduce_rows (order_name ilike %${ref}%) ===`);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_conduce_rows')
    .select('order_id, order_name, fecha, operador')
    .ilike('order_name', `%${ref.replace(/^TCGT-/i, '')}%`)
    .limit(10);
  if (error) console.log(`Error: ${error.message}`);
  else if (!data?.length) console.log('  Sin filas en conduce.');
  else for (const row of data) console.log(`  ${JSON.stringify(row)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
