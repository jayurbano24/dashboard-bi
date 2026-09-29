/**
 * Lista órdenes Claro en alcance septiembre 2026 (mismo criterio que reporte: fecha conduce).
 *
 *   npx tsx scripts/list-sept-2026-claro-orders.ts
 */
import { requireEnv } from './lib/load-env';
import { listClaroOrdersForSeptember2026 } from '../src/integrations/orderry-history/september-2026-scope';

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const orders = await listClaroOrdersForSeptember2026();
  console.log(`Órdenes Claro sept 2026 (fecha conduce): ${orders.length}`);
  for (const o of orders.slice(0, 30)) {
    console.log(`  ${o.order_name}  id=${o.order_id}  fecha=${o.fecha}`);
  }
  if (orders.length > 30) console.log(`  … +${orders.length - 30} más`);
}

main().catch(console.error);
