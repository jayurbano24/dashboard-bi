import { NextResponse } from 'next/server';
import { getBackofficePrealertRows } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

const buildFallbackRowsFromOrders = (orders: GenericOrder[]) => {
  return orders.slice(0, 250).map((order) => {
    const requestAt = extractRequestAtFromOrder(order);
    const orderryAt = order?.created_at || null;
    const systemHours = diffHours(requestAt, orderryAt);
    const systemDays = diffDays(requestAt, orderryAt);

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
      matchedOrderNumber: order?.number || '',
      matchMethod: 'Aceptado en Orderry',
      collectionHours: null,
      systemHours,
      systemDays,
      status: 'Aceptado',
    };
  });
};

const diffHours = (start: string | null, end: string | null) => {
  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  return Number(((endDate.getTime() - startDate.getTime()) / 36e5).toFixed(1));
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

  if (!apiKey) return [];

  const allOrders: GenericOrder[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({ page: String(page), limit: '200' });
    const response = await fetch(`${baseUrl}/v2/orders?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) break;

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    allOrders.push(...rows);
    totalPages = Number(payload?.paging?.total_pages || 1);
    page += 1;
  } while (page <= totalPages);

  return allOrders;
};

const buildOrderIndex = (orders: GenericOrder[]) => {
  const index = new Map<string, GenericOrder>();

  orders.forEach((order) => {
    const keys = uniqueKeys([
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

    keys.forEach((key) => {
      if (!index.has(key)) index.set(key, order);
    });
  });

  return index;
};

const findBestOrderMatch = (row: Record<string, any>, orderIndex: Map<string, GenericOrder>, orders: GenericOrder[]): MatchResult => {
  const exactKeys = uniqueKeys([
    row.reference,
    row.orderNumber,
    row.guide,
    row.imei,
    row.serial,
  ]);

  for (const key of exactKeys) {
    const exactMatch = orderIndex.get(key);
    if (exactMatch) {
      const method = key === normalizeKey(row.serial) || key === normalizeKey(row.imei)
        ? 'Serie/IMEI exacto'
        : 'Referencia exacta';
      return { order: exactMatch, method };
    }
  }

  const identifierText = normalizeText([
    row.reference,
    row.orderNumber,
    row.guide,
    row.imei,
    row.serial,
  ].join(' '));

  const rowTokens = tokenizeText(identifierText);
  if (!exactKeys.length && rowTokens.length < 2) return { order: null, method: '' };

  let bestOrder: GenericOrder | null = null;
  let bestScore = 0;
  let bestMethod = '';

  orders.forEach((order) => {
    const orderText = getOrderSearchText(order);
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

    if (row.requestAt && order?.created_at) {
      const requestTime = new Date(row.requestAt).getTime();
      const orderTime = new Date(order.created_at).getTime();
      if (!Number.isNaN(requestTime) && !Number.isNaN(orderTime)) {
        const diffDays = Math.abs(orderTime - requestTime) / (1000 * 60 * 60 * 24);
        if (diffDays <= 3) score += 1.5;
        else if (diffDays <= 7) score += 0.5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestOrder = order;
      bestMethod = method || 'Coincidencia flexible';
    }
  });

  if (bestOrder && bestScore >= 7) {
    return { order: bestOrder, method: bestMethod };
  }

  return { order: null, method: '' };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '7D').toUpperCase();

    const orders = await fetchAllOrderryOrders();
    let prealerts: Awaited<ReturnType<typeof getBackofficePrealertRows>> = [];
    let warning = '';

    try {
      prealerts = await getBackofficePrealertRows();
    } catch (error: any) {
      warning = error?.message || 'Google Sheets no disponible en este momento.';
    }

    const orderIndex = buildOrderIndex(orders);

    const enrichedRows = prealerts.length
      ? prealerts.map((row) => {
          const match = findBestOrderMatch(row, orderIndex, orders);
          const matchedOrder = match.order;
          const matchedOrderNumber = matchedOrder?.number || '';
          const orderryAt = matchedOrder?.created_at || row.orderryAt || null;
          const hasOrderryEntry = Boolean(matchedOrderNumber || orderryAt);
          const collectionHours = diffHours(row.requestAt, row.collectedAt);
          const systemHours = diffHours(row.requestAt, orderryAt);
          const systemDays = diffDays(row.requestAt, orderryAt);

          return {
            client: row.client,
            sheetTitle: row.sheetTitle,
            reference: row.reference || row.orderNumber || matchedOrderNumber || 'Sin ticket',
            trackingCode: row.guide || row.imei || row.serial || extractTrackingOrImeiFromOrder(matchedOrder || {}),
            customer: row.customer,
            equipmentName: row.equipmentName,
            requestAt: row.requestAt,
            collectedAt: row.collectedAt,
            orderryAt,
            matchedOrderNumber,
            matchMethod: hasOrderryEntry ? (match.method || 'Aceptado en Orderry') : 'Sin orden en Orderry',
            collectionHours,
            systemHours,
            systemDays,
            status: hasOrderryEntry
              ? 'Aceptado'
              : row.requestAt
                ? 'Pendiente ingreso'
                : 'Pendiente',
          };
        })
      : buildFallbackRowsFromOrders(orders);

    const scopedRows = enrichedRows.filter((row) => isWithinBackofficeRange(row.requestAt, range));

    const summary = {
      totalRequests: scopedRows.length,
      matchedToOrderry: scopedRows.filter((row) => Boolean(row.orderryAt)).length,
      avgCollectionHours: avg(scopedRows.map((row) => row.collectionHours)),
      avgSystemEntryHours: avg(scopedRows.map((row) => row.systemHours)),
      within24hRate: scopedRows.filter((row) => row.systemHours !== null).length
        ? Math.round(
            (scopedRows.filter((row) => row.systemHours !== null && row.systemHours <= 24).length /
              scopedRows.filter((row) => row.systemHours !== null).length) *
              100
          )
        : 0,
      pendingCollection: scopedRows.filter((row) => !row.orderryAt).length,
    };

    const breakdown = ['CLARO', 'XIAOMI', 'RETAILER'].map((client) => {
      const clientRows = scopedRows.filter((row) => row.client === client);
      return {
        client,
        total: clientRows.length,
        matchedToOrderry: clientRows.filter((row) => Boolean(row.orderryAt)).length,
        avgCollectionHours: avg(clientRows.map((row) => row.collectionHours)),
        avgSystemEntryHours: avg(clientRows.map((row) => row.systemHours)),
      };
    });

    return NextResponse.json({
      connected: orders.length > 0 || enrichedRows.length > 0,
      source: prealerts.length ? 'sheets+orderry' : orders.length > 0 ? 'orderry-only' : 'none',
      warning,
      sheetId: process.env.GOOGLE_SHEET_ID || '1parq_eAadR7i6em9gwj5rCQTRJApdj3N0ELFV5LnSSM',
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
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      source: 'none',
      error: error?.message || 'No fue posible conectar Backoffice con Orderry.',
      summary: {
        totalRequests: 0,
        matchedToOrderry: 0,
        avgCollectionHours: null,
        avgSystemEntryHours: null,
        within24hRate: 0,
        pendingCollection: 0,
      },
      breakdown: [],
      recentRows: [],
    });
  }
}
