/**
 * Sincroniza catálogo de estados Orderry → estados_catalogo vía OrderryClient.
 * Uso: npm run orderry:sync-statuses
 */
import { loadEnv, requireEnv } from './lib/load-env';
import { syncEstadosCatalogoFromOrderry } from '../src/lib/orderry-status-catalog';

async function main() {
  const env = requireEnv(['ORDERRY_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  const result = await syncEstadosCatalogoFromOrderry();
  console.log(`OK: ${result.upserted} estados → estados_catalogo (${result.fetched} recibidos, ${result.skipped} omitidos).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
