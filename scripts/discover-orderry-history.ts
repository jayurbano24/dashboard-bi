/**
 * FASE 2 — Descubrir cómo Orderry carga la Timeline / Event Feed (red, no DOM).
 *
 * Perfil Chromium limpio (sin extensiones). No loguea cookies/tokens.
 *
 *   npm run orderry:discover-history -- TCGT-548123
 *   npm run orderry:discover-history -- TCGT-548123 --headed
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from './lib/load-env';
import { resolveOrderryPlaywrightStorage } from './lib/orderry-playwright-storage';
import { createOrderryClientFromEnv } from '../src/lib/orderry/client';
import {
  type DiscoveryEntry,
  buildTimelineSummary,
  classifyTimelineCandidate,
  isAccessDeniedXml,
  isChromeExtensionUrl,
  printConsoleSummary,
  sanitizeHeaders,
  sanitizeUrl,
  inferAccessDeniedRole,
} from './lib/orderry-discovery-analyze';

function truncate(s: string, max = 1200): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…[truncated]`;
}

function shouldCaptureRequest(url: string, resourceType: string): boolean {
  if (isChromeExtensionUrl(url)) return false;
  if (resourceType === 'xhr' || resourceType === 'fetch') return true;
  if (/websocket/i.test(resourceType)) return true;
  if (/\/app\/orders\//i.test(url)) return true;
  return false;
}

type OrderListRow = {
  id: number;
  uuid?: string;
  id_label?: string;
  order_id_label?: string;
  order_id?: number;
};

function matchOrderRef(row: OrderListRow, orderRef: string): boolean {
  const ref = orderRef.trim().toUpperCase();
  const labels = [row.id_label, row.order_id_label].filter(Boolean).map((s) => String(s).toUpperCase());
  if (labels.includes(ref)) return true;
  const num = ref.replace(/^TCGT-|^TGT-/i, '');
  if (num && String(row.order_id) === num) return true;
  return ref.includes(String(row.id));
}

function pickOrderFromList(rows: OrderListRow[], orderRef: string): OrderListRow | null {
  const upper = orderRef.trim().toUpperCase();
  const num = upper.replace(/^TCGT-|^TGT-/i, '');
  return (
    rows.find(
      (o) =>
        String(o.id_label || '').toUpperCase() === upper
        || String(o.order_id_label || '').toUpperCase() === upper
        || (num && String(o.order_id) === num),
    ) ?? null
  );
}

async function parseGetOrdersResponse(
  response: import('playwright').Response,
  orderRef: string,
): Promise<OrderListRow | null> {
  try {
    const json = (await response.json()) as { data?: OrderListRow[] };
    return pickOrderFromList(json.data ?? [], orderRef);
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const headed = args.includes('--headed');
  const orderRef = args.find((a) => !a.startsWith('--'))?.trim();
  if (!orderRef) {
    console.error('Uso: npx tsx scripts/discover-orderry-history.ts <orden> [--headed]');
    process.exit(1);
  }

  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Instala Playwright: npm install -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  const env = loadEnv();
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  const baseUrl = (env.ORDERRY_WEB_BASE_URL || 'https://app.orderry.com').replace(/\/$/, '');
  const storagePath = resolveOrderryPlaywrightStorage(env.ORDERRY_PLAYWRIGHT_STORAGE);
  const email = env.ORDERRY_WEB_EMAIL?.trim();
  const password = env.ORDERRY_WEB_PASSWORD?.trim();
  if (storagePath) {
    console.log(`Usando sesión Playwright: ${storagePath}`);
  }

  const t0 = Date.now();
  let phase = 'bootstrap';
  let seq = 0;
  const captured: DiscoveryEntry[] = [];
  const initiatorByRequestId = new Map<string, { type?: string; url?: string }>();
  const urlInitiatorHint = new Map<string, { type?: string; url?: string }>();

  const browser = await playwright.chromium.launch({
    headless: !headed,
    args: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
  });
  const context = await browser.newContext(storagePath ? { storageState: storagePath } : {});
  const page = await context.newPage();

  phase = 'bootstrap';
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const bootstrapAuth = await page
    .evaluate(async () => {
      const r = await fetch('/app/check-auth', { credentials: 'include' });
      const j = (await r.json()) as { isAuthenticated?: boolean };
      return j.isAuthenticated === true;
    })
    .catch(() => false);
  if (!bootstrapAuth) {
    console.error(
      'Sesión Playwright no válida (check-auth=false). Ejecuta solo: npm run orderry:playwright-login → Enter → npm run orderry:verify-session',
    );
    await browser.close();
    process.exit(1);
  }
  console.log('Sesión web OK (check-auth)');

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', (ev) => {
    const init = ev.initiator;
    const meta = {
      type: init?.type,
      url: init?.url ? sanitizeUrl(init.url) : undefined,
    };
    initiatorByRequestId.set(ev.requestId, meta);
    urlInitiatorHint.set(sanitizeUrl(ev.request.url), meta);
  });
  cdp.on('Network.responseReceived', (ev) => {
    const meta = initiatorByRequestId.get(ev.requestId);
    if (meta) urlInitiatorHint.set(sanitizeUrl(ev.response.url), meta);
  });

  const pushEntry = (partial: Omit<DiscoveryEntry, 'seq' | 'phase' | 'elapsed_ms'>) => {
    seq += 1;
    const entry: DiscoveryEntry = {
      seq,
      phase,
      elapsed_ms: Date.now() - t0,
      ...partial,
    };
    captured.push(entry);
    const ct = entry.contentType || '';
    const logBody =
      ct.includes('json') && entry.bodyPreview
        ? ` body=${truncate(entry.bodyPreview, 200)}`
        : isAccessDeniedXml(entry)
          ? ` body=${truncate(entry.bodyPreview || '', 120)}`
          : '';
    console.log(
      `[${entry.seq}] ${entry.phase} ${entry.method} ${entry.status ?? '?'} ${ct} ${entry.url}${logBody}`,
    );
  };

  page.on('response', async (response) => {
    const request = response.request();
    const rawUrl = request.url();
    if (isChromeExtensionUrl(rawUrl)) return;

    const url = sanitizeUrl(rawUrl);
    const method = request.method();
    const resourceType = request.resourceType();
    if (!shouldCaptureRequest(url, resourceType) && !/storage\.orderry|amazonaws|\.s3/i.test(url)) {
      return;
    }

    const status = response.status();
    const responseHeaders = sanitizeHeaders(response.headers());
    const contentType = responseHeaders['content-type'] || responseHeaders['Content-Type'] || '';

    const reqHeaders = sanitizeHeaders(request.headers());
    const init = urlInitiatorHint.get(url);

    const entry: Omit<DiscoveryEntry, 'seq' | 'phase' | 'elapsed_ms'> = {
      method,
      url,
      resourceType,
      status,
      contentType,
      requestHeaders: reqHeaders,
      responseHeaders,
      initiatorType: init?.type,
      initiatorUrl: init?.url,
      flags: [],
    };

    const isBinary =
      /^(image|video|audio|font|octet-stream)/i.test(contentType) ||
      /\.(png|jpg|jpeg|gif|webp|woff2?|pdf)(\?|$)/i.test(url);

    if (!isBinary) {
      try {
        const text = await response.text();
        if (contentType.includes('json') && status >= 200 && status < 400) {
          entry.bodyPreview = truncate(text);
        } else if (
          contentType.includes('xml') ||
          text.includes('AccessDenied') ||
          status === 401 ||
          status === 403
        ) {
          entry.bodyPreview = truncate(text, 800);
          entry.flags!.push('access_denied_or_xml');
        } else if (contentType.includes('json')) {
          entry.bodyPreview = truncate(text, 400);
        }
      } catch {
        /* consumed */
      }
    }

    try {
      const post = request.postData();
      if (post) entry.postDataPreview = truncate(post, 400);
    } catch {
      /* ignore */
    }

    if (isAccessDeniedXml(entry as DiscoveryEntry)) entry.flags!.push('s3_storage_candidate');
    pushEntry(entry);
  });

  phase = 'login';
  if (!storagePath && email && password) {
    const loginUrl = env.ORDERRY_WEB_LOGIN_URL || `${baseUrl}/login`;
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.fill('input[type="email"], input[name="email"], input[name="username"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForTimeout(5000);
  } else if (!storagePath) {
    console.warn('Sin ORDERRY_PLAYWRIGHT_STORAGE ni email/password — probable redirect a login.');
  }

  let apiOrderId: number | null = null;
  try {
    const client = createOrderryClientFromEnv(process.env);
    const listed = await client.listOrders({ numbers: [orderRef], pageSize: 10 });
    const match =
      listed.data.find(
        (o) =>
          String(o.number || '').toUpperCase() === orderRef.toUpperCase()
          || String(o.name || '').toUpperCase() === orderRef.toUpperCase(),
      ) ?? listed.data[0];
    if (match?.id) {
      apiOrderId = match.id;
      console.log(`API v2: orden ${orderRef} → id interno ${apiOrderId}`);
    } else if (listed.data.length === 0) {
      console.error(
        `\nLa orden ${orderRef} no existe en Orderry (API v2 numbers=0). ` +
          'Verifica el label en UI o usa: npx tsx scripts/lookup-orderry-order.ts <label>\n',
      );
      await browser.close();
      process.exit(2);
    }
  } catch (err) {
    console.warn(`API v2 listOrders(numbers): ${err instanceof Error ? err.message : err}`);
  }

  phase = 'navigate_order';
  const tableSearchUrl = apiOrderId
    ? `${baseUrl}/orders/table/${apiOrderId}?search=${encodeURIComponent(orderRef)}`
    : `${baseUrl}/orders/table?search=${encodeURIComponent(orderRef)}`;
  const listResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/app/orders/json/get-orders') && resp.status() === 200,
    { timeout: 90_000 },
  );
  try {
    await page.goto(tableSearchUrl, { waitUntil: 'networkidle', timeout: 90_000 });
  } catch {
    await page.goto(`${baseUrl}/orders?search=${encodeURIComponent(orderRef)}`, {
      waitUntil: 'networkidle',
      timeout: 90_000,
    });
  }

  let resolvedOrder: OrderListRow | null = null;
  const listResponse = await listResponsePromise.catch(() => null);
  if (listResponse) {
    resolvedOrder = await parseGetOrdersResponse(listResponse, orderRef);
    if (resolvedOrder) {
      console.log(
        `Orden en lista: ${resolvedOrder.id_label || resolvedOrder.order_id_label} (id=${resolvedOrder.id}, uuid=${resolvedOrder.uuid ?? 'n/a'})`,
      );
    } else {
      console.warn(`get-orders respondió pero no se encontró ${orderRef} en data[] (revisa búsqueda).`);
    }
  }

  if (apiOrderId && !resolvedOrder) {
    resolvedOrder = { id: apiOrderId, id_label: orderRef, order_id_label: orderRef };
  }

  const readWebAuth = async () => {
    try {
      const authJson = await page.evaluate(async () => {
        const r = await fetch('/app/check-auth', { credentials: 'include' });
        return r.json() as Promise<{ isAuthenticated?: boolean }>;
      });
      return authJson.isAuthenticated === true;
    } catch {
      return !page.url().includes('/login');
    }
  };

  let authenticated = await readWebAuth();
  if (!authenticated) {
    await page.waitForTimeout(4000);
    authenticated = await readWebAuth();
  }
  if (!authenticated) {
    console.error('Sesión web expirada. Ejecuta: npm run orderry:playwright-login');
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(1500);

  phase = 'open_order_detail';
  const feedResponsePromise = page.waitForResponse(
    (resp) =>
      (resp.url().includes('event-log/get-object-events') || resp.url().includes('/app/orders/json/get-order'))
      && resp.status() === 200,
    { timeout: 60_000 },
  );

  const detailUrls: string[] = [];
  if (resolvedOrder?.uuid) {
    detailUrls.push(
      `${baseUrl}/orders/view/${resolvedOrder.uuid}`,
      `${baseUrl}/#/orders/view/${resolvedOrder.uuid}`,
    );
  }
  if (resolvedOrder?.id) {
    detailUrls.push(`${baseUrl}/orders/view/${resolvedOrder.id}`, `${baseUrl}/orders/${resolvedOrder.id}`);
  }
  detailUrls.push(tableSearchUrl);

  let openedDetail = false;
  for (const url of detailUrls) {
    if (openedDetail) break;
    if (url === tableSearchUrl) continue;
    try {
      console.log(`Abriendo detalle: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
      openedDetail = true;
    } catch {
      /* try next */
    }
  }

  if (!openedDetail) {
    const clickTargets = [
      page.getByRole('link', { name: new RegExp(orderRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }),
      page.locator(`a:has-text("${orderRef}")`).first(),
      page.locator(`tr:has-text("${orderRef}")`).first(),
      page.getByText(orderRef, { exact: false }).first(),
    ];
    for (const loc of clickTargets) {
      try {
        if (await loc.isVisible({ timeout: 2000 })) {
          await loc.click({ timeout: 5000 });
          await page.waitForTimeout(5000);
          openedDetail = true;
          break;
        }
      } catch {
        /* next */
      }
    }
  }

  if (!openedDetail) {
    try {
      await page.getByText(orderRef, { exact: true }).first().click({ timeout: 8000 });
      await page.waitForTimeout(3000);
    } catch {
      /* panel puede estar ya abierto por URL /orders/table/{id} */
    }
  }

  const feedResponse = await feedResponsePromise.catch(() => null);
  if (feedResponse) {
    openedDetail = true;
    console.log(`Event feed / detalle: ${feedResponse.url()}`);
  }

  if (!openedDetail) {
    console.warn(`No se capturó get-object-events ni get-order. Prueba: npm run orderry:discover-history -- ${orderRef} --headed`);
  }

  await page.waitForTimeout(2000);

  phase = 'open_timeline_ui';
  const timelineSelectors = [
    'text=/event feed/i',
    'text=/feed de eventos/i',
    'text=/timeline/i',
    'text=/activity/i',
    'text=/actividad/i',
    'text=/historial/i',
    'text=/history/i',
    'text=/todos los eventos/i',
    '[data-testid*="timeline"]',
    '[data-testid*="event-feed"]',
    '[class*="Timeline"]',
    'button:has-text("Event")',
    'button:has-text("Timeline")',
  ];
  for (const sel of timelineSelectors) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 800 })) {
        await loc.click({ timeout: 3000 });
        await page.waitForTimeout(4000);
        break;
      }
    } catch {
      /* try next */
    }
  }

  phase = 'idle_capture';
  await page.waitForTimeout(5000);

  const chromeExtensionRequests = captured.filter((e) => isChromeExtensionUrl(e.url));
  const accessDeniedRequests = captured.filter(isAccessDeniedXml);

  for (const e of accessDeniedRequests) {
    console.log(
      `\n[AccessDenied] seq=${e.seq} role=${inferAccessDeniedRole(e, e.phase)}\n  ${e.method} ${e.url}\n  status=${e.status} ct=${e.contentType}`,
    );
  }

  const jsonEventCandidates = captured.filter(classifyTimelineCandidate);

  const neighborsOfDenied = accessDeniedRequests.map((denied) => {
    const i = captured.findIndex((c) => c.seq === denied.seq);
    return {
      denied_seq: denied.seq,
      before: captured.slice(Math.max(0, i - 3), i).map((x) => ({ seq: x.seq, method: x.method, url: x.url, status: x.status })),
      after: captured.slice(i + 1, i + 4).map((x) => ({ seq: x.seq, method: x.method, url: x.url, status: x.status })),
    };
  });

  const partialReport = {
    authenticated,
    auth: storagePath ? 'storage_state' : email && password ? 'env_login' : 'none',
    access_denied_requests: accessDeniedRequests,
    json_event_candidates: jsonEventCandidates,
    all_captured: captured,
    chrome_extension_requests: chromeExtensionRequests,
  };
  const summary = buildTimelineSummary(partialReport);

  const outDir = path.resolve(process.cwd(), 'scripts/output');
  fs.mkdirSync(outDir, { recursive: true });
  const safeName = orderRef.replace(/[^\w-]+/g, '_');
  const outFile = path.join(outDir, `orderry-history-discovery-${safeName}.json`);

  const appOrderRequests = captured
    .filter((e) => /\/app\/orders\//i.test(e.url))
    .map((e) => ({ seq: e.seq, phase: e.phase, method: e.method, url: e.url, status: e.status }));

  const report = {
    generated_at: new Date().toISOString(),
    order_ref: orderRef,
    base_url: baseUrl,
    resolved_order: resolvedOrder,
    opened_order_detail: openedDetail,
    final_url: page.url(),
    app_order_requests: appOrderRequests,
    ...partialReport,
    access_denied_neighbors: neighborsOfDenied,
    timeline: { summary },
    note: 'Lista get-orders ≠ timeline. Debe abrirse detalle WO + pestaña Event Feed.',
  };

  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nGuardado: ${outFile}`);
  printConsoleSummary(summary);

  if (!authenticated) {
    console.log(
      'IMPORTANTE: sesión no autenticada. Exporta ORDERRY_PLAYWRIGHT_STORAGE tras login manual en Chromium (sin extensiones) y re-ejecuta.',
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
