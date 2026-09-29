/**
 * Importa timeline Orderry → order_status_history (solo sept 2026 Claro).
 *
 *   npx tsx scripts/import-orderry-timeline-sept-2026.ts              # dry-run
 *   npx tsx scripts/import-orderry-timeline-sept-2026.ts --apply
 *   npx tsx scripts/import-orderry-timeline-sept-2026.ts --apply --limit=10
 */
import fs from 'node:fs';
import { requireEnv } from './lib/load-env';
import { resolveOrderryPlaywrightStorage } from './lib/orderry-playwright-storage';
import { OrderryHistoryClient } from '../src/integrations/orderry-history/OrderryHistoryClient';
import { listClaroOrdersForSeptember2026 } from '../src/integrations/orderry-history/september-2026-scope';
import { persistOrderryTimelineEvents } from '../src/integrations/orderry-history/persist-status-events';

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '', 10) : undefined;
  const orderArg = argv.find((a) => a.startsWith('--order='));
  const singleOrder = orderArg?.split('=')[1]?.trim();
  const namesFile = argv.find((a) => a.startsWith('--names-file='))?.split('=')[1]?.trim();
  return { apply, limit: Number.isFinite(limit) ? limit : undefined, singleOrder, namesFile };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { apply, limit, singleOrder, namesFile } = parseArgs(process.argv.slice(2));

  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  let orders = await listClaroOrdersForSeptember2026();
  if (singleOrder) {
    orders = orders.filter(
      (o) => o.order_id === singleOrder || o.order_name.toUpperCase().includes(singleOrder.toUpperCase()),
    );
  }
  if (namesFile) {
    const wanted = new Set(
      fs.readFileSync(namesFile, 'utf8').split(/\r?\n/).map((line) => line.trim().toUpperCase()).filter(Boolean),
    );
    orders = orders.filter((o) => wanted.has(o.order_name.toUpperCase()));
  }
  if (limit !== undefined) orders = orders.slice(0, limit);

  console.log(`Órdenes en alcance: ${orders.length} | modo: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const storage = resolveOrderryPlaywrightStorage(process.env.ORDERRY_PLAYWRIGHT_STORAGE);
  if (!storage) throw new Error('Sin sesión Playwright. Ejecuta npm run orderry:playwright-login');
  const playwright = await import('playwright');
  const requestContext = await playwright.request.newContext({ storageState: storage });

  const client = new OrderryHistoryClient();
  let totalEvents = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  try {
    for (const o of orders) {
      const result = await client.fetchTimelineForOrder(o.order_id, o.order_name, requestContext);
      totalEvents += result.events.length;

      if (result.warnings.length) {
        console.log(`  ${o.order_name}: ${result.warnings.join('; ')}`);
      } else {
        console.log(`  ${o.order_name}: ${result.events.length} eventos (${result.fetch_method})`);
      }

      if (apply && result.events.length > 0) {
        const pr = await persistOrderryTimelineEvents(result.events);
        totalInserted += pr.inserted;
        totalSkipped += pr.skipped;
        if (pr.errors.length) console.warn(`    errores: ${pr.errors.slice(0, 3).join(' | ')}`);
      }

      await sleep(200);
    }
  } finally {
    await requestContext.dispose();
  }

  console.log(`\nEventos obtenidos: ${totalEvents}`);
  if (apply) {
    console.log(`Insertados: ${totalInserted}, omitidos (dup/vacío): ${totalSkipped}`);
  } else if (totalEvents === 0) {
    console.log(
      '\nSin eventos hasta completar FASE 3 (discover + parser). Ejecuta orderry:discover-history con una WO de septiembre.',
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
