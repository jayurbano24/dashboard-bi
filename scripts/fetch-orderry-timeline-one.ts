/**
 * Prueba fetch + parser event-log para una orden.
 *
 *   npx tsx scripts/fetch-orderry-timeline-one.ts TCGT-544018
 *   npx tsx scripts/fetch-orderry-timeline-one.ts TCGT-544018 --apply
 */
import { loadEnv } from './lib/load-env';
import { OrderryHistoryClient } from '../src/integrations/orderry-history/OrderryHistoryClient';
import { persistOrderryTimelineEvents } from '../src/integrations/orderry-history/persist-status-events';

async function main() {
  const ref = process.argv.slice(2).find((a) => !a.startsWith('--'))?.trim();
  const apply = process.argv.includes('--apply');
  if (!ref) {
    console.error('Uso: npx tsx scripts/fetch-orderry-timeline-one.ts <TCGT-…|id> [--apply]');
    process.exit(1);
  }

  const env = loadEnv();
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const client = new OrderryHistoryClient();
  const result = await client.fetchTimelineForOrder(ref, ref);

  console.log(`order_id=${result.order_id} method=${result.fetch_method} eventos=${result.events.length}`);
  if (result.warnings.length) console.warn('Avisos:', result.warnings.join(' | '));

  for (const ev of result.events) {
    console.log(`  ${ev.event_at}  ${ev.status_name}  (id=${ev.status_id})`);
  }

  if (apply && result.events.length) {
    const pr = await persistOrderryTimelineEvents(result.events);
    console.log(`Persistido: insert=${pr.inserted} skip=${pr.skipped} err=${pr.errors.length}`);
  } else if (!apply && result.events.length) {
    console.log('\nDry-run. Añade --apply para escribir order_status_history.');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
