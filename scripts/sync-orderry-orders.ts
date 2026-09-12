/**
 * Refresco incremental de órdenes Orderry → despacho_conduce_rows
 * Uso: npx tsx scripts/sync-orderry-orders.ts [--full]
 */
import { loadEnv, requireEnv } from './lib/load-env';
import { syncOrderryOrdersIncremental } from '../src/lib/orderry/sync-orders';

const FULL = process.argv.includes('--full');

async function main() {
  const env = requireEnv(['ORDERRY_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  let updatedSince: string | undefined;
  if (FULL) {
    const d = new Date('2020-01-01T00:00:00Z');
    updatedSince = d.toISOString();
    console.log('Modo FULL: sincronizando desde 2020-01-01');
  }

  console.log('Iniciando sync incremental de órdenes Orderry…');
  const result = await syncOrderryOrdersIncremental({ updatedSince });

  console.log(JSON.stringify(result, null, 2));
  console.log(
    `OK: ${result.fetched} órdenes leídas, ${result.updated} actualizadas, ${result.inserted} nuevas (${result.pages} páginas).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
