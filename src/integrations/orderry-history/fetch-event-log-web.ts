import fs from 'node:fs';
import path from 'node:path';
import type { OrderryEventLogItem } from './orderry-event-log-types';

export const ORDERRY_EVENT_LOG_CONTEXT_ORDER = 2;

const DEFAULT_STORAGE = path.resolve(process.cwd(), 'scripts/.orderry_playwright_storage.json');

export function resolveOrderryEventLogStorage(envPath?: string): string | null {
  const candidates: string[] = [];
  if (envPath?.trim()) candidates.push(path.resolve(process.cwd(), envPath.trim()));
  candidates.push(DEFAULT_STORAGE);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export type FetchEventLogOptions = {
  webBaseUrl?: string;
  storageStatePath?: string;
  objectId: number;
  contextType?: number;
  /** Reutiliza una sesión ya abierta (import masivo). Si no viene, se crea y se cierra aquí. */
  requestContext?: import('playwright').APIRequestContext;
};

export async function fetchOrderryObjectEventsWeb(
  options: FetchEventLogOptions,
): Promise<OrderryEventLogItem[]> {
  const baseUrl = (options.webBaseUrl || process.env.ORDERRY_WEB_BASE_URL || 'https://app.orderry.com').replace(
    /\/$/,
    '',
  );
  const storagePath = resolveOrderryEventLogStorage(options.storageStatePath || process.env.ORDERRY_PLAYWRIGHT_STORAGE);

  if (!storagePath) {
    throw new Error(`Falta sesión web. Ejecuta npm run orderry:playwright-login (esperado: ${DEFAULT_STORAGE})`);
  }

  const playwright = await import('playwright');
  const owned = !options.requestContext;
  const context =
    options.requestContext
    ?? (await playwright.request.newContext({ storageState: storagePath }));
  try {
    const ctx = options.contextType ?? ORDERRY_EVENT_LOG_CONTEXT_ORDER;
    const url = `${baseUrl}/app/event-log/get-object-events?object_id=${options.objectId}&context_type=${ctx}`;
    const res = await context.get(url, {
      headers: { accept: 'application/json, text/plain, */*' },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`event-log HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = JSON.parse(text) as unknown;
    return Array.isArray(json) ? (json as OrderryEventLogItem[]) : [];
  } finally {
    if (owned) await context.dispose();
  }
}
