/**
 * Análisis offline del JSON generado por discover-orderry-history.ts
 */

export type DiscoveryEntry = {
  seq: number;
  phase: string;
  elapsed_ms: number;
  method: string;
  url: string;
  resourceType: string;
  status?: number;
  contentType?: string;
  bodyPreview?: string;
  postDataPreview?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  initiatorType?: string;
  initiatorUrl?: string;
  flags?: string[];
};

export type DiscoveryReport = {
  generated_at: string;
  order_ref: string;
  base_url: string;
  auth: string;
  authenticated?: boolean;
  timeline?: { summary: TimelineSummary };
  access_denied_requests?: DiscoveryEntry[];
  json_event_candidates?: DiscoveryEntry[];
  all_captured?: DiscoveryEntry[];
  chrome_extension_requests?: DiscoveryEntry[];
};

export type TimelineSummary = {
  timeline_request_found: boolean;
  url: string | null;
  method: string | null;
  status: number | null;
  content_type: string | null;
  contains_events: boolean;
  contains_status_labels: boolean;
  requires_session: boolean;
  is_s3_or_storage: boolean;
  access_denied_is_timeline: boolean;
  notes: string[];
};

const CHROME_EXT = /^chrome-extension:\/\//i;
const STORAGE =
  /(amazonaws\.com|\.s3[.-]|cloudfront\.net|storage\.orderry\.com\/(?!static\/i18n))/i;
const TIMELINE_URL =
  /timeline|event.?feed|activity|journal|history|status.?chang|work.?order|\/orders\/\d+/i;
const EVENT_BODY =
  /event|timeline|activity|status|changed|feed|history|work.?order|actions/i;
const STATUS_LABELS =
  /EN DIAGNÓSTICO|EN REPARACIÓN|PARA DEVOLUCIÓN|ENTREGADO|DIAGNÓSTICO|REPARACIÓN|DEVOLUCIÓN/i;

const SENSITIVE_HEADER = /^(authorization|cookie|x-api-key|x-auth|set-cookie|x-csrf|csrf)/i;

export function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const key of [...u.searchParams.keys()]) {
      if (/(token|api_key|apikey|password|session|auth|signature|X-Amz)/i.test(key)) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    return u.toString();
  } catch {
    return raw.split('?')[0];
  }
}

export function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADER.test(k) ? '[REDACTED]' : v.length > 120 ? `${v.slice(0, 80)}…` : v;
  }
  return out;
}

export function isAccessDeniedXml(entry: DiscoveryEntry): boolean {
  const ct = entry.contentType || '';
  const body = entry.bodyPreview || '';
  const st = entry.status ?? 0;
  return (
    (st === 401 || st === 403 || body.includes('AccessDenied'))
    && (ct.includes('xml') || body.includes('<Error>') || body.includes('AccessDenied'))
  );
}

export function isChromeExtensionUrl(url: string): boolean {
  return CHROME_EXT.test(url);
}

export function isStorageAssetUrl(url: string): boolean {
  return STORAGE.test(url);
}

const NON_TIMELINE_URL =
  /\/app\/settings\/|\/app\/billing\/|\/app\/engagement\/|get-orders-badges|json\/get-orders|json\/get-order|get-filters|check-auth|token\/refresh|feature-flags|static\/i18n|intercom|ecommerce-connects|product-tours|system-notifications|checklist-templates|chat-service/i;

const TIMELINE_PRIMARY_URL = /\/app\/event-log\/get-object-events/i;

export function classifyTimelineCandidate(entry: DiscoveryEntry): boolean {
  if (isChromeExtensionUrl(entry.url)) return false;
  if (NON_TIMELINE_URL.test(entry.url)) return false;
  if (isStorageAssetUrl(entry.url) && /static\/i18n/i.test(entry.url)) return false;

  const urlHit = TIMELINE_URL.test(entry.url);
  const body = entry.bodyPreview || '';
  if (!body && !urlHit) return false;
  if (isAccessDeniedXml(entry)) return false;
  const jsonOk =
    (entry.contentType || '').includes('json') && (entry.status ?? 0) >= 200 && (entry.status ?? 0) < 400;
  if (!jsonOk) return false;

  if (TIMELINE_PRIMARY_URL.test(entry.url)) return true;
  if (urlHit && /\/app\/orders\//i.test(entry.url)) return true;
  if (bodyHasStatusLabels(body)) return true;
  if (bodyLooksLikeEventList(body) && /\/app\//i.test(entry.url)) return true;
  return urlHit && EVENT_BODY.test(body);
}

export function bodyHasStatusLabels(body: string | undefined): boolean {
  return STATUS_LABELS.test(body || '');
}

export function bodyLooksLikeEventList(body: string | undefined): boolean {
  if (!body) return false;
  if (!/^\s*[\[{]/.test(body)) return false;
  return EVENT_BODY.test(body) && (/\[\s*\{/.test(body) || /"events"/i.test(body) || /"items"/i.test(body));
}

export function inferAccessDeniedRole(entry: DiscoveryEntry, phase: string): string {
  if (isChromeExtensionUrl(entry.url)) return 'chrome_extension (ignorar)';
  if (phase === 'login' || /login/i.test(entry.initiatorUrl || '')) return 'D — login / redirect';
  if (isStorageAssetUrl(entry.url)) return 'B — archivo/CDN/storage (adjunto o asset firmado)';
  if (TIMELINE_URL.test(entry.url)) return 'A — candidata timeline (pero respuesta denegada; revisar sesión/firma)';
  return 'C — otro recurso de UI';
}

export function buildTimelineSummary(report: DiscoveryReport): TimelineSummary {
  const notes: string[] = [];
  const auth = report.authenticated === true || report.auth === 'storage_state' || report.auth === 'env_login';
  if (report.authenticated === false) {
    notes.push('Sesión no autenticada: no se cargó la WO ni la Event Feed real.');
  }

  const denied = (report.access_denied_requests || []).filter((e) => !isChromeExtensionUrl(e.url));
  if (denied.length) {
    notes.push(
      `${denied.length} respuesta(s) AccessDenied/XML (típico S3/CDN); clasificar como storage/adjuntos salvo URL explícita de timeline.`,
    );
  }

  const candidates = report.json_event_candidates || [];
  const primary = candidates.find((e) => TIMELINE_PRIMARY_URL.test(e.url));
  const withLabels = candidates.find((e) => bodyHasStatusLabels(e.bodyPreview));
  const withEvents = candidates.find((e) => bodyLooksLikeEventList(e.bodyPreview));

  const best = primary || withLabels || withEvents || candidates[0];
  const accessDeniedTimeline = denied.some(
    (e) => TIMELINE_URL.test(e.url) && !isStorageAssetUrl(e.url),
  );

  if (primary) {
    notes.push('Endpoint canónico Event Feed: GET /app/event-log/get-object-events (context_type=2 = orden).');
  } else if (best && /checklist-templates/i.test(best.url)) {
    notes.push('checklist-templates NO es timeline; re-ejecutar discover o revisar json_event_candidates.');
  }

  return {
    timeline_request_found: Boolean(primary || (best && !/checklist-templates/i.test(best.url))),
    url: best ? best.url : denied[0]?.url ?? null,
    method: best ? best.method : denied[0]?.method ?? null,
    status: best ? (best.status ?? null) : denied[0]?.status ?? null,
    content_type: best ? best.contentType ?? null : denied[0]?.contentType ?? null,
    contains_events: Boolean(withEvents || candidates.some((e) => bodyLooksLikeEventList(e.bodyPreview))),
    contains_status_labels: Boolean(withLabels || candidates.some((e) => bodyHasStatusLabels(e.bodyPreview))),
    requires_session: auth || denied.some((e) => (e.status ?? 0) === 403),
    is_s3_or_storage: Boolean(
      best ? isStorageAssetUrl(best.url) : denied.some((e) => isStorageAssetUrl(e.url)),
    ),
    access_denied_is_timeline: accessDeniedTimeline,
    notes,
  };
}

export function printConsoleSummary(summary: TimelineSummary): void {
  console.log('\n========== RESUMEN DISCOVER ORDERY ==========');
  console.log(`Timeline request encontrada: ${summary.timeline_request_found ? 'SI' : 'NO'}`);
  console.log(`URL: ${summary.url ?? '(ninguna)'}`);
  console.log(`Method: ${summary.method ?? '(n/a)'}`);
  console.log(`Status: ${summary.status ?? '(n/a)'}`);
  console.log(`Content-Type: ${summary.content_type ?? '(n/a)'}`);
  console.log(`Contiene eventos: ${summary.contains_events ? 'SI' : 'NO'}`);
  console.log(`Contiene estados: ${summary.contains_status_labels ? 'SI' : 'NO'}`);
  console.log(`Requiere sesión: ${summary.requires_session ? 'SI' : 'NO'}`);
  console.log(`Es S3/storage: ${summary.is_s3_or_storage ? 'SI' : 'NO'}`);
  console.log(`AccessDenied corresponde a Timeline: ${summary.access_denied_is_timeline ? 'SI' : 'NO'}`);
  if (summary.notes.length) {
    console.log('Notas:');
    for (const n of summary.notes) console.log(`  - ${n}`);
  }
  console.log('============================================\n');
}
