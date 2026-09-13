import { NextResponse } from 'next/server';
import {
  getBackofficePrealertRows,
  getHistorialEstadoFechasPorOrdenes,
  loadBackofficePrealertSheets,
} from '@/lib/supabase-store';
import {
  formatOrderryCutoverLabel,
  getOrderryCutoverDateIso,
  isOnOrAfterOrderryCutover,
} from '@/lib/backoffice-orderry-cutover';
import { CLARO_HISTORIAL_DATE_KEYS } from '@/modules/report-engine/shared/claro-date-sources';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

const BACKOFFICE_RESPONSE_CACHE_TTL_MS = Number(process.env.BACKOFFICE_RESPONSE_CACHE_TTL_MS || '180000');
const BACKOFFICE_FLEXIBLE_MATCH_MAX_AGE_DAYS = Number(process.env.BACKOFFICE_FLEXIBLE_MATCH_MAX_AGE_DAYS || '120');
const BACKOFFICE_HISTORIAL_MAX_ORDERS = Number(process.env.BACKOFFICE_HISTORIAL_MAX_ORDERS || '200');

type BackofficeApiPayload = {
  connected: boolean;
  sheetsConnected: boolean;
  sheetsLoaded: number;
  sheetsTotalRows: number;
  sheetErrors?: string[];
  orderryConfigured: boolean;
  orderryMatched: boolean;
  source: string;
  warning?: string;
  error?: string;
  orderryCutoverDate: string;
  orderryCutoverLabel: string;
  summary: {
    totalRequests: number;
    matchedToOrderry: number;
    avgCollectionHours: number | null;
    avgSystemEntryHours: number | null;
    within24hRate: number;
    pendingIngreso: number;
    pendingCollection: number;
  };
  breakdown: Array<{
    client: string;
    total: number;
    pendingIngreso: number;
    matchedToOrderry: number;
    avgCollectionHours: number | null;
    avgSystemEntryHours: number | null;
  }>;
  recentRows: BackofficePublicRow[];
};

let backofficeResponseCache: { key: string; expiresAt: number; payload: BackofficeApiPayload } | null = null;

type GenericOrder = Record<string, any>;
type MatchResult = { order: GenericOrder | null; method: string };

const COMMON_WORDS = new Set([
  'SIN', 'CON', 'PARA', 'DEL', 'LAS', 'LOS', 'POR', 'THE', 'AND', 'UNA', 'UNO', 'EQUIPO', 'MODELO', 'COLOR', 'NEGRO',
]);

const normalizeKey = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isClosedWonStatus = (order: GenericOrder) => {
  const statusName = normalizeText(order?.status?.name);
  const groupName = normalizeText(order?.status?.group?.name || order?.status_group?.name || order?.status_group_name);
  const combined = `${statusName} ${groupName}`;

  return (
    combined.includes('GANAD') ||
    combined.includes('ENTREGAD') ||
    combined.includes('ARCHIVAD') ||
    combined.includes('CERRAD') ||
    combined.includes('ENTREGA') ||
    combined.includes('DEVOL') ||
    combined.includes('NOTA DE CREDITO')
  );
};

const getClosedWonAtFromOrder = (order: GenericOrder | null) => {
  if (!order) return null;
  if (order?.done_at) return order.done_at;
  if (order?.closed_at) return order.closed_at;
  if (isClosedWonStatus(order)) {
    return order?.modified_at || order?.updated_at || order?.created_at || null;
  }
  return null;
};

const RECOLECCION_HISTORIAL_LABEL = CLARO_HISTORIAL_DATE_KEYS.envioTiendaCac;

type BackofficeEnrichedRow = {
  client: string;
  sheetTitle: string;
  reference: string;
  trackingCode: string;
  customer: string;
  equipmentName: string;
  requestAt: string | null;
  collectedAt: string | null;
  orderryAt: string | null;
  closedWonAt: string | null;
  matchedOrderNumber: string;
  matchedOrderId: string;
  matchMethod: string;
  collectionHours: number | null;
  systemHours: number | null;
  systemDays: number | null;
  closedWonDays: number | null;
  historicalDetected: boolean;
  status: string;
};

type BackofficePublicRow = Omit<BackofficeEnrichedRow, 'matchedOrderId'>;

const attachRecoleccionFromHistorial = async (
  rows: BackofficeEnrichedRow[],
): Promise<{ rows: BackofficeEnrichedRow[]; warning: string }> => {
  const orderIds = [
    ...new Set(
      rows
        .filter((row) => row.matchedOrderId && !row.historicalDetected)
        .map((row) => row.matchedOrderId),
    ),
  ].slice(0, BACKOFFICE_HISTORIAL_MAX_ORDERS);

  if (!orderIds.length) {
    return {
      rows: rows.map((row) => ({
        ...row,
        collectedAt: null,
        collectionHours: null,
      })),
      warning: '',
    };
  }

  let historialByOrder: Awaited<ReturnType<typeof getHistorialEstadoFechasPorOrdenes>>;
  try {
    historialByOrder = await getHistorialEstadoFechasPorOrdenes(orderIds);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No fue posible leer historial de recolección.';
    return {
      rows: rows.map((row) => ({
        ...row,
        collectedAt: null,
        collectionHours: null,
      })),
      warning: message,
    };
  }

  return {
    rows: rows.map((row) => {
    if (!row.matchedOrderId || row.historicalDetected) {
      return { ...row, collectedAt: null, collectionHours: null };
    }

    const recoleccionAt = historialByOrder.get(row.matchedOrderId)?.[RECOLECCION_HISTORIAL_LABEL]?.trim() || null;
    const collectedAt = recoleccionAt || null;

      return {
        ...row,
        collectedAt,
        collectionHours: diffHours(row.requestAt, collectedAt),
      };
    }),
    warning: '',
  };
};

const stripInternalBackofficeFields = (row: BackofficeEnrichedRow): BackofficePublicRow => {
  const { matchedOrderId: _matchedOrderId, ...publicRow } = row;
  return publicRow;
};

/** Pre-alerta = ticket de Google Sheets sin orden vinculada en Orderry (mismo criterio que el reporte). */
const isPendingIngresoStatus = (status: string) => status === 'Pendiente ingreso';

const uniqueKeys = (values: unknown[]) => {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeKey(value))
        .filter((value) => value.length >= 5)
    )
  );
};

const tokenizeText = (value: unknown) => {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(' ')
        .filter((token) => token.length >= 4 && !COMMON_WORDS.has(token))
    )
  );
};

const getOrderSearchText = (order: GenericOrder) => {
  return normalizeText([
    order?.number,
    order?.id,
    order?.name,
    order?.asset?.title,
    order?.asset?.uid,
    order?.asset?.serial,
    order?.asset?.imei,
    order?.serial_number,
    order?.imei,
    order?.status?.name,
    order?.client?.name,
    ...Object.values(order?.custom_fields || {}),
  ].join(' '));
};

const getOrderAgencyText = (order: GenericOrder) =>
  normalizeText([
    order?.client?.name,
    order?.branch?.name,
    order?.location?.name,
    order?.custom_fields?.agency,
    order?.custom_fields?.tienda,
  ].join(' '));

const getOrderBrandModelText = (order: GenericOrder) =>
  normalizeText([
    order?.asset?.brand,
    order?.asset?.model,
    order?.asset?.title,
    order?.name,
    order?.device_name,
  ].join(' '));

const avg = (values: Array<number | null>) => {
  const usable = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!usable.length) return null;
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(1));
};

const parseLooseDate = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) return null;

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date;

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d), 8, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isLikelyReferenceValue = (value: unknown) => {
  const text = String(value || '').trim();
  const normalized = normalizeText(text);
  if (!normalized || normalized.length < 5) return false;
  if (parseLooseDate(text)) return false;
  if (['NEGRO', 'BLANCO', 'AZUL', 'VERDE', 'GRIS', 'MORADO', 'DORADO', 'PLATA', 'CLIENTE FINAL', 'OPERADOR', 'RETEILER', 'RETAILER', 'DISTRIBUIDOR'].includes(normalized)) return false;
  return /[A-Z]/.test(normalized) || /[0-9]/.test(normalized);
};

const isUsefulCode = (value: unknown) => {
  const text = String(value || '').trim();
  const normalized = normalizeText(text);
  if (!normalized || normalized.length < 4) return false;
  if (parseLooseDate(text)) return false;
  if (['MENSAJERO', 'MENSAJERIA', 'OPERADOR', 'CLIENTE FINAL', 'DISTRIBUIDOR', 'RETEILER', 'RETAILER', 'SI', 'NO'].includes(normalized)) return false;
  return /\d/.test(text) || /[A-Z]{2,}/.test(normalized);
};

const extractTicketFromOrder = (order: GenericOrder) => {
  const candidates = [
    order?.custom_fields?.f3129959,
    order?.custom_fields?.f3147565,
    order?.number,
  ];

  return candidates.map((value) => String(value || '').trim()).find((value) => isUsefulCode(value)) || order?.number || 'Sin ticket';
};

const extractTrackingOrImeiFromOrder = (order: GenericOrder) => {
  const candidates = [
    order?.custom_fields?.f3129960,
    order?.custom_fields?.f3130204,
    order?.custom_fields?.f3147565,
    order?.asset?.uid,
    order?.serial_number,
    order?.imei,
  ];

  return candidates.map((value) => String(value || '').trim()).find((value) => isUsefulCode(value)) || '';
};

const extractReferenceFromOrder = (order: GenericOrder) => {
  return extractTicketFromOrder(order);
};

const extractRequestAtFromOrder = (order: GenericOrder) => {
  const createdAt = parseLooseDate(order?.created_at);
  const customDates = Object.values(order?.custom_fields || {})
    .map((value) => parseLooseDate(value))
    .filter((value): value is Date => Boolean(value));

  if (createdAt) {
    const candidates = customDates
      .filter((date) => date.getTime() <= createdAt.getTime())
      .map((date) => ({
        date,
        diffDays: Math.abs(createdAt.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      }))
      .filter((item) => item.diffDays <= 30)
      .sort((a, b) => a.diffDays - b.diffDays);

    if (candidates.length) return candidates[0].date.toISOString();
    return createdAt.toISOString();
  }

  return customDates[0]?.toISOString() || null;
};

const classifyClientFromOrder = (order: GenericOrder) => {
  const searchText = normalizeText([
    order?.client?.name,
    order?.asset?.brand,
    order?.asset?.title,
    order?.order_type?.name,
    ...Object.values(order?.custom_fields || {}),
  ].join(' '));

  if (searchText.includes('XIAOMI')) return 'XIAOMI';
  if (searchText.includes('CLARO') || searchText.includes('OPERADOR') || searchText.includes('DISTRIBUIDOR')) return 'CLARO';
  if (searchText.includes('RETEILER') || searchText.includes('RETAIL')) return 'RETAILER';

  return 'RETAILER';
};

const buildFallbackRowsFromOrders = (orders: GenericOrder[]): BackofficeEnrichedRow[] => {
  return orders.slice(0, 250).map((order) => {
    const requestAt = extractRequestAtFromOrder(order);
    const orderryAt = order?.created_at || null;
    const closedWonAt = getClosedWonAtFromOrder(order);
    const systemHours = diffHours(requestAt, orderryAt);
    const systemDays = diffDays(requestAt, orderryAt);
    const closedWonDays = diffDays(requestAt, closedWonAt);

    return {
      client: classifyClientFromOrder(order),
      sheetTitle: 'Orderry',
      reference: extractReferenceFromOrder(order),
      trackingCode: extractTrackingOrImeiFromOrder(order),
      customer: order?.client?.name || 'Sin cliente',
      equipmentName: order?.asset?.title || order?.name || 'Equipo sin nombre',
      requestAt,
      collectedAt: null,
      orderryAt,
      closedWonAt,
      matchedOrderNumber: order?.number || '',
      matchedOrderId: order?.id ? String(order.id) : '',
      matchMethod: 'Aceptado en Orderry',
      collectionHours: null,
      systemHours,
      systemDays,
      closedWonDays,
      historicalDetected: false,
      status: 'Aceptado',
    };
  });
};

const PREALERT_DATE_GRACE_MS = 15 * 60 * 1000;

const diffHours = (start: string | null, end: string | null) => {
  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const hours = (endDate.getTime() - startDate.getTime()) / 36e5;
  if (hours < 0) return null;

  return Number(hours.toFixed(1));
};

const isOrderBeforePrealertRequest = (requestAt: string | null, orderCreatedAt: unknown) => {
  if (!requestAt || !orderCreatedAt) return false;

  const requestDate = new Date(requestAt);
  const orderDate = new Date(String(orderCreatedAt));

  if (Number.isNaN(requestDate.getTime()) || Number.isNaN(orderDate.getTime())) return false;

  return orderDate.getTime() < requestDate.getTime() - PREALERT_DATE_GRACE_MS;
};

const getOrderMatchKeys = (order: GenericOrder) =>
  uniqueKeys([
    order?.number,
    order?.id,
    order?.name,
    order?.asset?.title,
    order?.asset?.uid,
    order?.asset?.serial,
    order?.asset?.imei,
    order?.serial_number,
    order?.imei,
    ...Object.values(order?.custom_fields || {}),
  ]);

const pickOrderForPrealert = (
  candidates: GenericOrder[],
  requestAt: string | null,
  method: string
): MatchResult => {
  const uniqueCandidates = Array.from(new Map(candidates.map((order) => [String(order?.id || order?.number), order])).values());
  if (!uniqueCandidates.length) return { order: null, method: '' };
  if (!requestAt) return { order: uniqueCandidates[0], method };

  const requestTime = new Date(requestAt).getTime();
  if (Number.isNaN(requestTime)) return { order: uniqueCandidates[0], method };

  const plausible = uniqueCandidates.filter((order) => !isOrderBeforePrealertRequest(requestAt, order?.created_at));
  const pool = plausible.length ? plausible : uniqueCandidates;

  const sorted = pool.slice().sort((left, right) => {
    const leftTime = new Date(String(left?.created_at || 0)).getTime();
    const rightTime = new Date(String(right?.created_at || 0)).getTime();

    if (plausible.length) {
      return Math.abs(leftTime - requestTime) - Math.abs(rightTime - requestTime);
    }

    return rightTime - leftTime;
  });

  return { order: sorted[0], method };
};

const diffDays = (start: string | null, end: string | null) => {
  const hours = diffHours(start, end);
  return hours === null ? null : Number((hours / 24).toFixed(1));
};

const isWithinBackofficeRange = (dateValue: string | null, range: string) => {
  if (!dateValue) return false;

  const rowDate = new Date(dateValue);
  if (Number.isNaN(rowDate.getTime())) return false;

  const now = new Date();
  const diffInDays = (now.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffInDays < 0) return false;

  if (range === 'TODAY') return diffInDays <= 1;
  if (range === '7D') return diffInDays <= 7;
  if (range === '30D') return diffInDays <= 30;
  if (range === 'MONTH') return rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();

  return true;
};

const fetchAllOrderryOrders = async (): Promise<GenericOrder[]> => {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  const maxPages = Number(process.env.BACKOFFICE_ORDERRY_MAX_PAGES || process.env.ORDERRY_ORDERS_MAX_PAGES || '4');
  const maxTotalMs = Number(process.env.BACKOFFICE_ORDERRY_MAX_TOTAL_MS || '60000');
  const perPageTimeoutMs = Number(
    process.env.BACKOFFICE_ORDERRY_PAGE_TIMEOUT_MS || process.env.ORDERRY_ORDERS_PAGE_TIMEOUT_MS || '25000',
  );

  if (!apiKey) return [];

  const allOrders: GenericOrder[] = [];
  let page = 1;
  let totalPages = 1;
  const startedAt = Date.now();

  do {
    if (Date.now() - startedAt >= maxTotalMs) break;

    const params = new URLSearchParams({ page: String(page), limit: '200' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perPageTimeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v2/orders?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      break;
    }
    clearTimeout(timer);

    if (!response.ok) break;

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    allOrders.push(...rows);
    totalPages = Number(payload?.paging?.total_pages || 1);
    page += 1;
  } while (page <= totalPages && page <= maxPages && Date.now() - startedAt < maxTotalMs);

  return allOrders;
};

type PreparedOrder = {
  order: GenericOrder;
  orderId: string;
  searchText: string;
  agencyText: string;
  brandModelText: string;
  matchKeys: string[];
};

type OrderMatchContext = {
  index: Map<string, GenericOrder>;
  prepared: PreparedOrder[];
  byOrderId: Map<string, PreparedOrder>;
  tokenIndex: Map<string, Set<string>>;
};

const indexTokensForOrder = (tokenIndex: Map<string, Set<string>>, text: string, orderId: string) => {
  for (const token of tokenizeText(text)) {
    let bucket = tokenIndex.get(token);
    if (!bucket) {
      bucket = new Set<string>();
      tokenIndex.set(token, bucket);
    }
    bucket.add(orderId);
  }
};

const buildOrderMatchContext = (orders: GenericOrder[]): OrderMatchContext => {
  const index = new Map<string, GenericOrder>();
  const tokenIndex = new Map<string, Set<string>>();
  const prepared: PreparedOrder[] = [];

  for (const order of orders) {
    const matchKeys = getOrderMatchKeys(order);
    for (const key of matchKeys) {
      if (!index.has(key)) index.set(key, order);
    }

    const orderId = String(order?.id || order?.number || '');
    if (!orderId) continue;

    const entry: PreparedOrder = {
      order,
      orderId,
      searchText: getOrderSearchText(order),
      agencyText: getOrderAgencyText(order),
      brandModelText: getOrderBrandModelText(order),
      matchKeys,
    };
    prepared.push(entry);
    indexTokensForOrder(tokenIndex, entry.searchText, orderId);
    indexTokensForOrder(tokenIndex, entry.agencyText, orderId);
    indexTokensForOrder(tokenIndex, entry.brandModelText, orderId);
  }

  const byOrderId = new Map(prepared.map((entry) => [entry.orderId, entry]));
  return { index, prepared, byOrderId, tokenIndex };
};

const shouldTryFlexibleMatch = (requestAt: string | null) => {
  if (!requestAt) return true;
  const requestDate = new Date(requestAt);
  if (Number.isNaN(requestDate.getTime())) return true;
  const ageDays = (Date.now() - requestDate.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= BACKOFFICE_FLEXIBLE_MATCH_MAX_AGE_DAYS;
};

const collectFlexibleCandidateIds = (
  ctx: OrderMatchContext,
  rowTokens: string[],
  agencyTokens: string[],
  productTokens: string[],
  brandTokens: string[],
  modelTokens: string[],
  row: Record<string, unknown>,
): Set<string> => {
  const candidateIds = new Set<string>();
  for (const token of [...rowTokens, ...agencyTokens, ...productTokens, ...brandTokens, ...modelTokens]) {
    const bucket = ctx.tokenIndex.get(token);
    if (bucket) bucket.forEach((id) => candidateIds.add(id));
  }

  return candidateIds;
};

const scoreFlexibleOrderMatch = (
  row: Record<string, unknown>,
  entry: PreparedOrder,
  rowTokens: string[],
  agencyTokens: string[],
  productTokens: string[],
  brandTokens: string[],
  modelTokens: string[],
): { score: number; method: string } => {
  const order = entry.order;
  const orderText = entry.searchText;
  const agencyText = entry.agencyText;
  const brandModelText = entry.brandModelText;
  let score = 0;
  let method = '';

  if (row.serial && orderText.includes(normalizeText(row.serial))) {
    score += 8;
    method = 'Serie parcial';
  }

  if (row.imei && orderText.includes(normalizeText(row.imei))) {
    score += 8;
    method = method || 'IMEI parcial';
  }

  if (row.guide && orderText.includes(normalizeText(row.guide))) {
    score += 7;
    method = method || 'Guía parcial';
  }

  if (row.reference && orderText.includes(normalizeText(row.reference))) {
    score += 7;
    method = method || 'Referencia parcial';
  }

  const overlap = rowTokens.filter((token) => orderText.includes(token)).length;
  if (overlap >= 2) {
    score += overlap * 2;
    method = method || 'Coincidencia por identificador';
  }

  const agencyOverlap = agencyTokens.filter((token) => agencyText.includes(token) || orderText.includes(token)).length;
  const productOverlap = productTokens.filter((token) => brandModelText.includes(token) || orderText.includes(token)).length;
  const brandOverlap = brandTokens.filter((token) => brandModelText.includes(token)).length;
  const modelOverlap = modelTokens.filter((token) => brandModelText.includes(token)).length;

  if (agencyOverlap >= 1 && brandOverlap >= 1 && modelOverlap >= 1) {
    score += 12;
    method = method || 'Agencia + Marca + Modelo';
  } else if (agencyOverlap >= 1 && productOverlap >= 2) {
    score += 9;
    method = method || 'Agencia + Marca/Modelo';
  } else if (agencyOverlap >= 1 && productOverlap >= 1) {
    score += 5;
    method = method || 'Agencia + Producto';
  }

  if (row.requestAt && order?.created_at) {
    const requestTime = new Date(String(row.requestAt)).getTime();
    const orderTime = new Date(String(order.created_at)).getTime();
    if (!Number.isNaN(requestTime) && !Number.isNaN(orderTime)) {
      if (isOrderBeforePrealertRequest(String(row.requestAt), order.created_at)) {
        score -= 20;
      } else {
        const diffDays = Math.abs(orderTime - requestTime) / (1000 * 60 * 60 * 24);
        if (orderTime >= requestTime && diffDays <= 3) score += 2;
        else if (diffDays <= 7) score += 0.5;
      }
    }
  }

  return { score, method: method || 'Coincidencia flexible' };
};

const findBestOrderMatch = (
  row: Record<string, unknown>,
  ctx: OrderMatchContext,
  options?: { allowFlexible?: boolean },
): MatchResult => {
  const allowFlexible = options?.allowFlexible !== false;
  const exactKeys = uniqueKeys([
    row.reference,
    row.orderNumber,
    row.guide,
    row.imei,
    row.serial,
  ]);

  for (const key of exactKeys) {
    const exactMatch = ctx.index.get(key);
    if (exactMatch) {
      const method = key === normalizeKey(row.serial) || key === normalizeKey(row.imei)
        ? 'Serie/IMEI exacto'
        : 'Referencia exacta';
      const candidates = ctx.prepared
        .filter((entry) => entry.matchKeys.includes(key))
        .map((entry) => entry.order);
      return pickOrderForPrealert(candidates.length ? candidates : [exactMatch], String(row.requestAt || ''), method);
    }
  }

  if (!allowFlexible || !shouldTryFlexibleMatch(row.requestAt ? String(row.requestAt) : null)) {
    return { order: null, method: '' };
  }

  const identifierText = normalizeText([
    row.reference,
    row.orderNumber,
    row.guide,
    row.imei,
    row.serial,
  ].join(' '));

  const rowTokens = tokenizeText(identifierText);
  const rawRow = row.raw as Record<string, unknown> | undefined;
  const agencyTokens = tokenizeText(
    String(row.customer || rawRow?.agencia || rawRow?.agency || ''),
  ).slice(0, 4);
  const productTokens = tokenizeText(
    String(row.equipmentName || row.details || rawRow?.modelos || ''),
  ).slice(0, 6);
  const brandTokens = tokenizeText(String(rawRow?.marcas || row.equipmentName || '')).slice(0, 3);
  const modelTokens = tokenizeText(String(rawRow?.modelos || row.equipmentName || '')).slice(0, 4);
  if (!exactKeys.length && rowTokens.length < 2 && (agencyTokens.length < 1 || productTokens.length < 2)) {
    return { order: null, method: '' };
  }

  const candidateIds = collectFlexibleCandidateIds(
    ctx,
    rowTokens,
    agencyTokens,
    productTokens,
    brandTokens,
    modelTokens,
    row,
  );
  if (!candidateIds.size) {
    return { order: null, method: '' };
  }

  let bestOrder: GenericOrder | null = null;
  let bestScore = 0;
  let bestMethod = '';

  for (const orderId of candidateIds) {
    const entry = ctx.byOrderId.get(orderId);
    if (!entry) continue;

    const { score, method } = scoreFlexibleOrderMatch(
      row,
      entry,
      rowTokens,
      agencyTokens,
      productTokens,
      brandTokens,
      modelTokens,
    );

    if (score > bestScore) {
      bestScore = score;
      bestOrder = entry.order;
      bestMethod = method;
    }
  }

  if (bestOrder && bestScore >= 7) {
    return { order: bestOrder, method: bestMethod };
  }

  return { order: null, method: '' };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '7D').toUpperCase();
    const forceRefresh = searchParams.get('refresh') === '1';
    const cacheKey = range;
    const now = Date.now();

    if (!forceRefresh && backofficeResponseCache && backofficeResponseCache.key === cacheKey && backofficeResponseCache.expiresAt > now) {
      return NextResponse.json(backofficeResponseCache.payload);
    }

    let prealerts: Awaited<ReturnType<typeof getBackofficePrealertRows>> = [];
    let orders: GenericOrder[] = [];
    let warning = '';
    let source = 'none';
    let sheetsConnected = false;
    let sheetsLoaded = 0;
    let sheetsTotalRows = 0;
    let sheetErrors: string[] = [];

    const [sheetLoad, orderryOrders] = await Promise.all([
      loadBackofficePrealertSheets(forceRefresh ? { force: true } : undefined),
      fetchAllOrderryOrders().catch(() => [] as GenericOrder[]),
    ]);

    prealerts = sheetLoad.rows;
    sheetsLoaded = sheetLoad.sheetsLoaded;
    sheetsTotalRows = sheetLoad.rows.length;
    sheetErrors = sheetLoad.sheetErrors;
    sheetsConnected = sheetsTotalRows > 0;

    if (sheetErrors.length) {
      warning = sheetErrors.join(' · ');
    }

    if (sheetsConnected) {
      source = 'googlesheets+orderry';
      if (sheetsLoaded < 3) {
        warning = warning
          ? `${warning} · Solo ${sheetsLoaded}/3 pestañas cargadas.`
          : `Solo ${sheetsLoaded}/3 pestañas de Google Sheets cargadas.`;
      }
    } else if (!warning) {
      warning = 'No fue posible leer Google Sheets. Verifique que el documento sea público para export CSV.';
    }

    if (!prealerts.length) {
      try {
        prealerts = await getBackofficePrealertRows();
        if (prealerts.length) {
          source = 'supabase+orderry';
          sheetsConnected = true;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Supabase no disponible en este momento.';
        warning = warning || message;
      }
    }

    const orderryConfigured = Boolean(process.env.ORDERRY_API_KEY);
    orders = orderryOrders;

    if (!orders.length && orderryConfigured) {
      warning = warning || 'Orderry respondió vacío; reintente en unos segundos o revise la API key.';
    }

    const orderMatchContext = buildOrderMatchContext(orders);

    const enrichedRowsRaw: BackofficeEnrichedRow[] = prealerts.length
      ? prealerts.map((row) => {
          const match = findBestOrderMatch(row, orderMatchContext, {
            allowFlexible: isWithinBackofficeRange(row.requestAt, range),
          });
          const matchedOrder = match.order;
          const matchedOrderNumber = matchedOrder?.number || '';
          const orderryAt = matchedOrder?.created_at || row.orderryAt || null;
          const closedWonAt = getClosedWonAtFromOrder(matchedOrder);
          const isHistoricalBeforeRequest = Boolean(
            matchedOrder && isOrderBeforePrealertRequest(row.requestAt, orderryAt)
          );
          const hasAcceptedMatch = Boolean(matchedOrder && matchedOrderNumber && !isHistoricalBeforeRequest);
          const systemHours = hasAcceptedMatch ? diffHours(row.requestAt, orderryAt) : null;
          const systemDays = hasAcceptedMatch ? diffDays(row.requestAt, orderryAt) : null;
          const closedWonDays = hasAcceptedMatch ? diffDays(row.requestAt, closedWonAt) : null;

          return {
            client: row.client,
            sheetTitle: row.sheetTitle,
            reference: row.reference || row.orderNumber || matchedOrderNumber || 'Sin ticket',
            trackingCode: row.guide || row.imei || row.serial || extractTrackingOrImeiFromOrder(matchedOrder || {}),
            customer: row.customer,
            equipmentName: row.equipmentName,
            requestAt: row.requestAt,
            collectedAt: null,
            orderryAt: matchedOrder ? orderryAt : null,
            closedWonAt: hasAcceptedMatch ? closedWonAt : null,
            matchedOrderNumber: matchedOrder ? matchedOrderNumber : '',
            matchedOrderId: matchedOrder?.id ? String(matchedOrder.id) : '',
            matchMethod: !matchedOrder
              ? 'Sin orden en Orderry'
              : isHistoricalBeforeRequest
                ? 'Coincidencia histórica (posible reingreso)'
                : (match.method || 'Aceptado en Orderry'),
            collectionHours: null,
            systemHours,
            systemDays,
            closedWonDays,
            historicalDetected: isHistoricalBeforeRequest,
            status: hasAcceptedMatch
              ? 'Aceptado'
              : isHistoricalBeforeRequest
                ? 'Coincidencia histórica'
                : row.requestAt
                  ? 'Pendiente ingreso'
                  : 'Pendiente',
          };
        })
      : buildFallbackRowsFromOrders(orders);

    const recoleccionResult = await attachRecoleccionFromHistorial(enrichedRowsRaw);
    if (recoleccionResult.warning) {
      warning = warning ? `${warning} · ${recoleccionResult.warning}` : recoleccionResult.warning;
    }
    const enrichedRows = recoleccionResult.rows.map(stripInternalBackofficeFields);

    const isPostOrderryRow = (row: BackofficePublicRow) =>
      isOnOrAfterOrderryCutover(row.requestAt || row.orderryAt);

    const scopedRows = enrichedRows.filter(
      (row) => isPostOrderryRow(row) && isWithinBackofficeRange(row.requestAt || row.orderryAt, range),
    );
    const pendingRows = enrichedRows.filter(
      (row) => isPendingIngresoStatus(row.status) && isPostOrderryRow(row),
    );

    if (sheetsTotalRows > 0 && scopedRows.length === 0) {
      warning = warning
        ? `${warning} · Hay ${sheetsTotalRows} pre-alertas en Sheets, pero ninguna cae en el rango ${range}.`
        : `Hay ${sheetsTotalRows} pre-alertas en Google Sheets, pero ninguna cae en el rango ${range}. Cambie el filtro de fechas del dashboard.`;
    }

    const summary = {
      totalRequests: scopedRows.length,
      matchedToOrderry: scopedRows.filter((row) => Boolean(row.orderryAt) && !row.historicalDetected).length,
      avgCollectionHours: avg(scopedRows.map((row) => row.collectionHours)),
      avgSystemEntryHours: avg(scopedRows.map((row) => row.systemHours)),
      within24hRate: scopedRows.filter((row) => row.systemHours !== null).length
        ? Math.round(
            (scopedRows.filter((row) => row.systemHours !== null && row.systemHours <= 24).length /
              scopedRows.filter((row) => row.systemHours !== null).length) *
              100
          )
        : 0,
      /** Pendientes sin ingreso a Orderry desde go-live (excluye pre-alertas del sistema anterior). */
      pendingIngreso: pendingRows.length,
      pendingCollection: pendingRows.length,
    };

    const breakdown = ['CLARO', 'XIAOMI', 'RETAILER'].map((client) => {
      const clientRows = scopedRows.filter((row) => row.client === client);
      const clientPending = pendingRows.filter((row) => row.client === client);
      return {
        client,
        total: clientRows.length,
        pendingIngreso: clientPending.length,
        matchedToOrderry: clientRows.filter((row) => Boolean(row.orderryAt) && !row.historicalDetected).length,
        avgCollectionHours: avg(clientRows.map((row) => row.collectionHours)),
        avgSystemEntryHours: avg(clientRows.map((row) => row.systemHours)),
      };
    });

    const payload: BackofficeApiPayload = {
      connected: sheetsConnected,
      sheetsConnected,
      sheetsLoaded,
      sheetsTotalRows,
      sheetErrors,
      orderryConfigured,
      orderryMatched: orders.length > 0,
      source: prealerts.length ? source : orders.length > 0 ? 'orderry-only' : 'none',
      orderryCutoverDate: getOrderryCutoverDateIso(),
      orderryCutoverLabel: formatOrderryCutoverLabel(),
      warning,
      summary,
      breakdown,
      recentRows: scopedRows
        .slice()
        .sort((a, b) => {
          const pendingWeight = Number(Boolean(a.orderryAt)) - Number(Boolean(b.orderryAt));
          if (pendingWeight !== 0) return pendingWeight;
          return new Date(b.requestAt || 0).getTime() - new Date(a.requestAt || 0).getTime();
        })
        .slice(0, 50),
    };

    backofficeResponseCache = {
      key: cacheKey,
      expiresAt: Date.now() + BACKOFFICE_RESPONSE_CACHE_TTL_MS,
      payload,
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      sheetsConnected: false,
      sheetsLoaded: 0,
      sheetsTotalRows: 0,
      orderryConfigured: Boolean(process.env.ORDERRY_API_KEY),
      orderryMatched: false,
      source: 'none',
      orderryCutoverDate: getOrderryCutoverDateIso(),
      orderryCutoverLabel: formatOrderryCutoverLabel(),
      error: error?.message || 'No fue posible leer las pre-alertas desde Google Sheets.',
      summary: {
        totalRequests: 0,
        matchedToOrderry: 0,
        avgCollectionHours: null,
        avgSystemEntryHours: null,
        within24hRate: 0,
        pendingIngreso: 0,
        pendingCollection: 0,
      },
      breakdown: [],
      recentRows: [],
    });
  }
}
