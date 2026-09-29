/**
 * Re-analiza un JSON de discover sin volver a abrir el navegador.
 *
 *   npx tsx scripts/analyze-orderry-discovery.ts
 *   npx tsx scripts/analyze-orderry-discovery.ts scripts/output/orderry-history-discovery-TCGT-548123.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  type DiscoveryReport,
  type DiscoveryEntry,
  buildTimelineSummary,
  classifyTimelineCandidate,
  inferAccessDeniedRole,
  isAccessDeniedXml,
  isChromeExtensionUrl,
  printConsoleSummary,
  sanitizeHeaders,
} from './lib/orderry-discovery-analyze';

function main() {
  const arg = process.argv[2]?.trim();
  const defaultPath = path.resolve(
    process.cwd(),
    'scripts/output/orderry-history-discovery-TCGT-548123.json',
  );
  const file = arg ? path.resolve(process.cwd(), arg) : defaultPath;

  if (!fs.existsSync(file)) {
    console.error(`No existe: ${file}`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(file, 'utf8')) as DiscoveryReport;
  const entries: DiscoveryEntry[] =
    report.all_captured || (report as { interesting?: DiscoveryEntry[] }).interesting || [];

  const denied = entries.filter(isAccessDeniedXml);
  const ext = entries.filter((e) => isChromeExtensionUrl(e.url));

  console.log(`Archivo: ${file}`);
  console.log(`Generado: ${report.generated_at} | auth=${report.auth} | ref=${report.order_ref}`);

  if (denied.length === 0) {
    console.log('\n--- AccessDenied / XML ---');
    console.log('Ninguna request en este JSON coincide con 401/403 + XML AccessDenied.');
    console.log(
      'Si viste XML en consola del Chrome manual, puede ser extensión (chrome-extension://) o una corrida distinta no guardada aquí.',
    );
  } else {
    console.log('\n--- AccessDenied / XML (sanitizado) ---');
    for (const e of denied) {
      console.log(`
seq=${e.seq} phase=${e.phase} +${e.elapsed_ms}ms
URL: ${e.url}
method: ${e.method}
status: ${e.status}
content-type: ${e.contentType}
initiator: ${e.initiatorType ?? '?'} ${e.initiatorUrl ?? ''}
rol inferido: ${inferAccessDeniedRole(e, e.phase)}
request headers: ${JSON.stringify(sanitizeHeaders(e.requestHeaders), null, 2)}
response headers: ${JSON.stringify(sanitizeHeaders(e.responseHeaders), null, 2)}
body preview: ${(e.bodyPreview || '').slice(0, 400)}
`);
    }
  }

  if (ext.length) {
    console.log(`\n--- chrome-extension (${ext.length}) — ignorar para Orderry ---`);
    for (const e of ext.slice(0, 5)) console.log(`  ${e.method} ${e.url}`);
  }

  const jsonEventCandidates = entries.filter(classifyTimelineCandidate);
  const summary = buildTimelineSummary({
    ...report,
    all_captured: entries,
    json_event_candidates: jsonEventCandidates,
  });
  if (jsonEventCandidates.length) {
    console.log('\n--- Candidatas timeline (re-clasificadas) ---');
    for (const e of jsonEventCandidates.slice(0, 5)) {
      console.log(`  [${e.seq}] ${e.method} ${e.url}`);
    }
  }
  printConsoleSummary(summary);
}

main();
