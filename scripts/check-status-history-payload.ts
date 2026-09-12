import { requireEnv } from './lib/load-env';
import { getDespachoReportRows } from '../src/lib/supabase-store';
import { normalizeEstadoLabel } from '../src/lib/historial-estado-normalize';

async function main() {
  const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  const rows = await getDespachoReportRows({});
  const claro = rows.filter((r) => String(r.operador || '').toUpperCase() === 'OPERADOR');
  let withHistory = 0;
  let withReparacion = 0;
  let withParaDevol = 0;

  for (const r of claro) {
    const raw = r.rawRecord as Record<string, unknown> | undefined;
    const hist = (raw?.status_history ?? raw?.historial_estados) as Array<{ status?: string; name?: string; timestamp?: string; changed_at?: string }> | undefined;
    if (!Array.isArray(hist) || hist.length === 0) continue;
    withHistory += 1;
    for (const h of hist) {
      const name = String(h.status ?? h.name ?? '');
      const norm = normalizeEstadoLabel(name);
      if (norm === 'EN REPARACION') withReparacion += 1;
      if (norm.startsWith('PARA DEVOLUCION')) withParaDevol += 1;
    }
  }

  console.log('Claro', claro.length, 'with status_history in payload', withHistory);
  console.log('rows with EN REPARACION in payload history', withReparacion);
  console.log('rows with PARA DEVOLUCION in payload history', withParaDevol);

  const sample = claro.find((r) => !(r as { done_at?: string }).done_at);
  if (sample?.rawRecord) {
    const hist = (sample.rawRecord as Record<string, unknown>).status_history;
    console.log('\nSample without done_at', sample.orderName, Array.isArray(hist) ? hist.length : 'no hist');
    if (Array.isArray(hist)) console.log(hist.slice(-8));
  }
}

main().catch(console.error);
