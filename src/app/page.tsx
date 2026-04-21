'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  DonutChart,
  BarChart,
  Title,
  Metric,
  Text,
  Flex,
  BadgeDelta,
  Grid,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Select,
  SelectItem,
  LineChart,
  ProgressBar,
  Icon,
  Badge,
} from '@tremor/react';
import {
  Activity,
  Archive,
  CheckCircle,
  Clock,
  Package,
  Settings,
  Truck,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

// --- MOCK DATA PARA ORDERRY ---

const TECHNICIANS = [
  { name: 'Alejandra P.', os: 45, repairs: 32, qc: 28, hours: 160, ftf: 96 },
  { name: 'Maria Fernanda', os: 52, repairs: 41, qc: 35, hours: 160, ftf: 94 },
  { name: 'Nataly Mishell', os: 48, repairs: 38, qc: 30, hours: 160, ftf: 97 },
  { name: 'Laura Esther', os: 50, repairs: 42, qc: 38, hours: 160, ftf: 95 },
  { name: 'Steven Obed', os: 55, repairs: 48, qc: 42, hours: 160, ftf: 98 },
  { name: 'Rudy Pineda', os: 58, repairs: 50, qc: 45, hours: 160, ftf: 93 },
  { name: 'Juan Carlos', os: 42, repairs: 30, qc: 25, hours: 160, ftf: 96 },
  { name: 'Carlos Mario', os: 47, repairs: 35, qc: 32, hours: 160, ftf: 95 },
  { name: 'Ricardo S.', os: 51, repairs: 44, qc: 39, hours: 160, ftf: 97 },
];

const TAT_TREND_DATA = [
  { date: '08 Abr', hours: 42 },
  { date: '09 Abr', hours: 38 },
  { date: '10 Abr', hours: 45 },
  { date: '11 Abr', hours: 40 },
  { date: '12 Abr', hours: 35 },
  { date: '13 Abr', hours: 32 },
  { date: '14 Abr', hours: 30 },
];

const AREA_VOLUME_DATA = [
  { name: 'Logística', cases: 120 },
  { name: 'Taller', cases: 85 },
  { name: 'QA', cases: 45 },
  { name: 'Bodega', cases: 30 },
];

const REPAIR_MIX_DATA = [
  { name: 'Reparación L0', count: 10 },
  { name: 'Reparación L1', count: 15 },
  { name: 'Reparación L2', count: 25 },
  { name: 'Falla No Detectada', count: 6 },
  { name: 'No Reparado', count: 10 },
  { name: 'DOA-DAP', count: 8 },
];

const FLOW_DATA = [
  { name: '08 Abr', Ingresos: 45, Despachos: 38 },
  { name: '09 Abr', Ingresos: 52, Despachos: 48 },
  { name: '10 Abr', Ingresos: 48, Despachos: 55 },
  { name: '11 Abr', Ingresos: 60, Despachos: 52 },
  { name: '12 Abr', Ingresos: 45, Despachos: 42 },
  { name: '13 Abr', Ingresos: 30, Despachos: 35 },
  { name: '14 Abr', Ingresos: 40, Despachos: 45 },
];

const WOS_SKU_DATA = [
  { sku: 'Screen iP 15', wos: 1.2 },
  { sku: 'Batt S24 Ultra', wos: 2.5 },
  { sku: 'Board Tab S9', wos: 0.8 },
  { sku: 'Glass X14 Pro', wos: 5.2 },
  { sku: 'Flex iP 13', wos: 3.4 },
];

const QA_RESULT_DATA = [
  { week: 'W1', Aprobados: 85, Rechazados: 12 },
  { week: 'W2', Aprobados: 92, Rechazados: 8 },
  { week: 'W3', Aprobados: 88, Rechazados: 15 },
  { week: 'W4', Aprobados: 95, Rechazados: 5 },
];

const CLAIM_ACCEPTANCE_DATA = [
  { brand: 'Samsung', rate: 95 },
  { brand: 'Apple', rate: 82 },
  { brand: 'Xiaomi', rate: 98 },
  { brand: 'Motorola', rate: 88 },
];

const CLAIM_TREND_DATA = [
  { month: 'Ene', Aceptados: 120, Rechazados: 15 },
  { month: 'Feb', Aceptados: 140, Rechazados: 12 },
  { month: 'Mar', Aceptados: 160, Rechazados: 20 },
  { month: 'Abr', Aceptados: 130, Rechazados: 8 },
];

const AGING_DATA = [
  { range: '0-2 días', count: 85 },
  { range: '3-5 días', count: 42 },
  { range: '5-7 días', count: 25 },
  { range: '+7 días', count: 18 },
];

const FUNNEL_DATA = [
  { stage: 'Creada', count: 200, color: 'slate' },
  { stage: 'WIP', count: 170, color: 'amber' },
  { stage: 'Diagnóstico', count: 180, color: 'blue' },
  { stage: 'Reparación', count: 150, color: 'indigo' },
  { stage: 'QA', count: 140, color: 'emerald' },
  { stage: 'Entrega', count: 130, color: 'cyan' },
];

const PRODUCT_GROUPS = [
  'ABRIDOR DE LATAS',
  'ACCESORIOS PARA SCOOTER',
  'WEARABLES',
  'AFEITADORA ELÉCTRICA',
  'ALIMENTADOR DE MASCOTAS',
  'ARROCERA',
  'ASPIRADORA',
  'ASPIRADORA DE MANO',
  'ASPIRADORA INALÁMBRICA',
  'AUDÍFONOS CON CABLE',
  'AUDÍFONOS INALÁMBRICOS',
  'BÁSCULA INTELIGENTE',
  'BÁSCULA PERSONAL',
  'BATIDORA',
  'BATIDORA DE MANO',
  'BOCINA',
  'CABLE DE CARGA',
  'CAFETERA',
  'CALEFACTOR',
  'CÁMARA DE SEGURIDAD',
  'CARGADOR DE PARED',
  'CARGADOR INALÁMBRICO',
  'CARGADOR PARA AUTO',
  'CEPILLO DE DIENTES ELÉCTRICO',
  'COMPRESOR DE AIRE',
  'CONSOLA DE VIDEOJUEGOS',
  'CORTABARBA',
  'CORTADORA DE CABELLO',
  'DEPILADORA',
  'DESHUMIDIFICADOR',
  'ESTUFA ELÉCTRICA',
  'EXPRIMIDOR',
  'EXTRACTOR DE JUGOS',
  'TELÉFONO BÁSICO',
  'FOCO INTELIGENTE',
  'FREIDORA DE AIRE',
  'FUENTE PARA MASCOTAS',
  'PARRILLA ELÉCTRICA',
  'HERRAMIENTA ELÉCTRICA',
  'HERVIDOR ELÉCTRICO',
  'HIDROLAVADORA',
  'HORNO ELÉCTRICO',
  'HORNO TOSTADOR',
  'HUB INTELIGENTE',
  'HUMIDIFICADOR',
  'ILUMINACIÓN INTELIGENTE',
  'IMPRESORA DE FOTOS PORTÁTIL',
  'KIT DE ASEO',
  'LÁMPARA',
  'LÁMPARA DE ESCRITORIO',
  'LÁMPARA DE MONITOR',
  'LÁMPARA INTELIGENTE',
  'LAPTOP',
  'LICUADORA',
  'LINTERNA',
  'MALETA',
  'MASAJEADOR',
  'MOCHILA',
  'MONITOR',
  'MOUSE INALÁMBRICO',
  'MULTICOOKER',
  'MULTIGROOM',
  'OLLA DE PRESIÓN',
  'OLLA DE PRESIÓN ELÉCTRICA',
  'OLLA ELÉCTRICA',
  'PAPELERÍA',
  'PARLANTE BLUETOOTH',
  'PARLANTE INTELIGENTE',
  'PICATODO',
  'PISTOLA DE MASAJE',
  'PLANCHA',
  'PLANCHA DE VAPOR',
  'PLANCHA PARA CABELLO',
  'POWER BANK',
  'PROCESADOR DE ALIMENTOS',
  'PROYECTOR',
  'PURIFICADOR DE AIRE',
  'RELOJ INTELIGENTE',
  'REPETIDOR WIFI',
  'RIZADORA',
  'ROBOT ASPIRADORA',
  'ROUTER',
  'SANDWICHERA',
  'SARTÉN ELÉCTRICO',
  'SCOOTER ELÉCTRICO',
  'SECADOR DE CABELLO',
  'SENSOR INTELIGENTE',
  'SISTEMA MESH WIFI',
  'SMART BAND',
  'SMART PEN',
  'SMARTPHONE',
  'SOUNDBAR',
  'TABLET',
  'TALADRO ELÉCTRICO',
  'TECLADO',
  'TELEVISOR',
  'TIMBRE INTELIGENTE',
  'TIRA LED',
  'TOSTADORA',
  'TV STICK / TV BOX',
  'VAPORIZADOR DE PRENDAS',
  'VENTILADOR',
] as const;

const DATE_FILTERS = [
  { value: 'TODAY', label: 'Hoy' },
  { value: '7D', label: 'Últimos 7 días' },
  { value: '30D', label: 'Últimos 30 días' },
  { value: 'MONTH', label: 'Este mes' },
] as const;

type DateFilterValue = (typeof DATE_FILTERS)[number]['value'];

const FALLBACK_BRANDS = ['Samsung', 'Apple', 'Xiaomi', 'Motorola'];

type BackofficeSummary = {
  totalRequests: number;
  matchedToOrderry: number;
  avgCollectionHours: number | null;
  avgSystemEntryHours: number | null;
  within24hRate: number;
  pendingCollection: number;
};

type BackofficeBreakdownRow = {
  client: string;
  total: number;
  matchedToOrderry: number;
  avgCollectionHours: number | null;
  avgSystemEntryHours: number | null;
};

type BackofficeRecentRow = {
  client: string;
  sheetTitle: string;
  reference: string;
  trackingCode?: string;
  customer: string;
  equipmentName?: string;
  requestAt: string | null;
  collectedAt: string | null;
  orderryAt: string | null;
  matchedOrderNumber: string;
  matchMethod?: string;
  collectionHours: number | null;
  systemHours: number | null;
  systemDays?: number | null;
  status: string;
};

type BackofficeApiResponse = {
  connected: boolean;
  source?: string;
  warning?: string;
  error?: string;
  summary: BackofficeSummary;
  breakdown: BackofficeBreakdownRow[];
  recentRows: BackofficeRecentRow[];
};

const EMPTY_BACKOFFICE_DATA: BackofficeApiResponse = {
  connected: false,
  summary: {
    totalRequests: 0,
    matchedToOrderry: 0,
    avgCollectionHours: null,
    avgSystemEntryHours: null,
    within24hRate: 0,
    pendingCollection: 0,
  },
  breakdown: [
    { client: 'CLARO', total: 0, matchedToOrderry: 0, avgCollectionHours: null, avgSystemEntryHours: null },
    { client: 'XIAOMI', total: 0, matchedToOrderry: 0, avgCollectionHours: null, avgSystemEntryHours: null },
    { client: 'RETAILER', total: 0, matchedToOrderry: 0, avgCollectionHours: null, avgSystemEntryHours: null },
  ],
  recentRows: [],
};

const formatHoursMetric = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return 'n/d';
  return `${value.toFixed(1)}h`;
};

const calculateDiffHours = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return Number(((endDate.getTime() - startDate.getTime()) / 36e5).toFixed(1));
};

const calculateDiffDays = (start: string | null | undefined, end: string | null | undefined) => {
  const hours = calculateDiffHours(start, end);
  return hours === null ? null : Number((hours / 24).toFixed(1));
};

const formatDaysHoursMetric = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return 'n/d';
  const days = value / 24;
  return `${days.toFixed(1)}d / ${value.toFixed(1)}h`;
};
const EXECUTOR_ALIASES: Record<string, string> = {
  '149219': 'ALEJANDRA PATZAN PALACIOS',
  '149215': 'RUDY PINEDA OBREGON',
  '149220': 'STEVEN OBED REYES LOPEZ',
};
const CREATOR_ALIASES: Record<string, string> = {
  '149218': 'MARIA FERNANDA JEREZ MARTIN',
  '149199': 'LAURA ESTHER MUÑOZ MEJIA',
  '149216': 'GEIRY ANTONIO URBANO RINCON',
  '149138': 'CRISTAL ABIGAIL BARRENO DIVAS',
};
const FALLBACK_TECHNICIANS = Object.values(EXECUTOR_ALIASES);

const extractBrandFromOrder = (order: Record<string, any>) => {
  const candidates = [
    order?.brand?.name,
    order?.brand,
    order?.device?.brand?.name,
    order?.device?.brand,
    order?.product?.brand?.name,
    order?.product?.brand,
    order?.item?.brand?.name,
    order?.item?.brand,
    order?.asset?.brand?.name,
    order?.asset?.brand,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Sin Marca';
};

const extractProductGroupFromOrder = (order: Record<string, any>) => {
  const candidates = [
    order?.asset?.group,
    order?.product?.group?.name,
    order?.product?.group,
    order?.item?.group?.name,
    order?.item?.group,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Sin Grupo';
};

const extractModelFromOrder = (order: Record<string, any>) => {
  const candidates = [
    order?.asset?.model,
    order?.device?.model?.name,
    order?.device?.model,
    order?.product?.model?.name,
    order?.product?.model,
    order?.item?.model?.name,
    order?.item?.model,
    order?.asset?.title,
    order?.name,
  ];

  const raw = candidates.find((value) => typeof value === 'string' && value.trim())?.trim();
  return raw ? cleanDispatchLabel(raw) : 'Sin Modelo';
};

const extractSkuFromModelText = (value: string | null | undefined) => {
  if (!value) return 'Sin SKU';

  const parts = value.split('-').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts[parts.length - 1];

  const slashParts = value.split('/').map((part) => part.trim()).filter(Boolean);
  const candidate = slashParts.find((part) => /[A-Z0-9]{5,}/i.test(part));
  return candidate || 'Sin SKU';
};

const extractPartCodesFromOrder = (order: Record<string, any>) => {
  const primaryTextSources = [
    ...extractProductEntriesFromOrder(order).map((item) => item.name),
    order?.engineer_notes,
    order?.manager_notes,
    order?.resume,
    order?.description,
    order?.malfunction,
    order?.problem,
    order?.fault,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const directPartCodes = Array.from(new Set(
    primaryTextSources.flatMap((text) => text.toUpperCase().match(/\b(?:56|58|14|16)[A-Z0-9]{7,16}\b/g) || [])
  ));

  if (directPartCodes.length) return directPartCodes.slice(0, 6);

  const genericCodes = Array.from(new Set(
    primaryTextSources.flatMap((text) => (text.toUpperCase().match(/\b[A-Z0-9-]{8,20}\b/g) || []))
  )).filter((token) => {
    if (/^TCGT-\d+$/i.test(token)) return false;
    if (/^\d{8,}$/.test(token)) return false;

    const letterCount = (token.match(/[A-Z]/g) || []).length;
    const digitCount = (token.match(/\d/g) || []).length;

    return digitCount >= 4 && letterCount >= 2;
  });

  if (genericCodes.length) return genericCodes.slice(0, 6);

  const fallbackSku = extractSkuFromModelText(extractModelFromOrder(order));
  return fallbackSku !== 'Sin SKU' ? [fallbackSku] : [];
};

const normalizeText = (value: string | null | undefined) => {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const extractSedeFromOrder = (order: Record<string, any>) => {
  const source = normalizeText(`${order?.number || ''} ${order?.name || ''}`);
  if (source.includes('CR')) return 'CR';
  if (source.includes('GT')) return 'GT';
  return 'ALL';
};

const extractTechnicianFromOrder = (order: Record<string, any>) => {
  const directName = [
    order?.assignee?.name,
    order?.assignee?.full_name,
    order?.assignee_name,
    order?.assigneeName,
    order?.executor?.name,
    order?.engineer?.name,
    order?.assigned_to?.name,
    order?.assigned_to,
  ].find((value) => typeof value === 'string' && value.trim())?.trim();

  if (directName) return directName;

  const assigneeId = String(order?.assignee_id || '').trim();
  if (assigneeId && EXECUTOR_ALIASES[assigneeId]) return EXECUTOR_ALIASES[assigneeId];

  return 'Sin asignar';
};

const extractCreatorFromOrder = (order: Record<string, any>) => {
  const directName = [
    order?.created_by?.name,
    order?.creator?.name,
    order?.createdBy?.name,
    order?.created_by_name,
  ].find((value) => typeof value === 'string' && value.trim())?.trim();

  if (directName) return directName;

  const creatorId = String(order?.created_by_id || order?.creator_id || '').trim();
  if (creatorId && CREATOR_ALIASES[creatorId]) return CREATOR_ALIASES[creatorId];
  if (creatorId) return `Usuario ${creatorId}`;

  return 'Sin creador';
};

const extractClosingUserFromOrder = (order: Record<string, any>) => {
  const directName = [
    order?.closed_by?.name,
    order?.closed_by_name,
    order?.done_by?.name,
    order?.dispatcher?.name,
  ].find((value) => typeof value === 'string' && value.trim())?.trim();

  if (directName) return directName;

  const closerId = String(order?.closed_by_id || '').trim();
  if (closerId && CREATOR_ALIASES[closerId]) return CREATOR_ALIASES[closerId];
  if (closerId) return `Usuario ${closerId}`;
  if (order?.done_at || order?.closed_at) return extractCreatorFromOrder(order);

  return 'Pendiente';
};

const getClaimIdentifierCandidates = (order: Record<string, any>) => {
  return Array.from(new Set([
    order?.asset?.uid,
    order?.asset?.serial_number,
    order?.asset?.serial,
    order?.serial_number,
    order?.imei,
    order?.custom_fields?.f3130204,
    order?.custom_fields?.f3147565,
    order?.custom_fields?.f3151083,
    order?.custom_fields?.f3129959,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));
};

const extractSeriesFromOrder = (order: Record<string, any>) => {
  const candidates = getClaimIdentifierCandidates(order);

  const imeiLike = candidates.find((value) => /\d{14,17}/.test(value.replace(/\D/g, '')));
  if (imeiLike) return imeiLike.trim();

  const caseLike = candidates.find((value) => normalizeText(value).includes('CASO'));
  if (caseLike) return caseLike.trim();

  return candidates[0]?.trim() || null;
};

const normalizeClaimToken = (value: string | null | undefined) => {
  const normalized = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  return normalized || null;
};

const getClaimTokenVariants = (value: string | null | undefined) => {
  const normalized = normalizeClaimToken(value);
  if (!normalized) return [] as string[];

  const variants = new Set<string>([normalized]);
  const numericRuns = normalized.match(/\d{14,17}/g) || [];

  numericRuns.forEach((run) => {
    variants.add(run);
    if (run.length > 15) variants.add(run.slice(0, 15));
  });

  if (normalized.startsWith('CASO')) {
    variants.add(normalized.replace(/^CASO/, ''));
  }

  return Array.from(variants);
};

const parseXiaomiRegistryTokens = (value: string) => {
  const rawTokens = (value.toUpperCase().match(/\b[A-Z0-9-]{4,24}\b/g) || [])
    .map((token) => token.replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);

  return Array.from(new Set(
    rawTokens.flatMap((token) => {
      if (token.length < 4) return [] as string[];
      if (/^TCGT\d+$/i.test(token)) return [] as string[];
      if (/^(19|20)\d{6,}$/.test(token) && token.length <= 12) return [] as string[];

      const digitCount = (token.match(/\d/g) || []).length;
      const letterCount = (token.match(/[A-Z]/g) || []).length;
      if (!(digitCount >= 10 || (digitCount >= 4 && letterCount >= 2))) return [] as string[];

      return getClaimTokenVariants(token);
    })
  ));
};

const classifyXiaomiPortalStatus = (value: string) => {
  const normalized = normalizeText(value);

  if (
    normalized.includes('CERRADO') ||
    normalized.includes('CLOSED') ||
    normalized.includes('FINALIZ') ||
    normalized.includes('RESUELTO') ||
    normalized.includes('COMPLETE')
  ) {
    return 'Cerrado en portal';
  }

  return 'Reportado en Xiaomi';
};

const isPhoneClaimOrder = (order: Record<string, any>) => {
  const group = normalizeText(extractProductGroupFromOrder(order));
  const descriptor = normalizeText(`${order?.asset?.title || ''} ${order?.asset?.model || ''}`);
  const brand = normalizeText(extractBrandFromOrder(order));

  return brand.includes('XIAOMI') && (
    group.includes('SMARTPHONE') ||
    group.includes('TELEFONO') ||
    group.includes('PHONE') ||
    descriptor.includes('SMARTPHONE') ||
    descriptor.includes('TELEFONO MOVIL')
  );
};

const extractEntryChannel = (order: Record<string, any>) => {
  const candidates = [
    order?.custom_fields?.f3129964,
    order?.branch?.name,
    order?.client?.name,
    extractCreatorFromOrder(order),
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Sin canal';
};

const extractEntryType = (order: Record<string, any>) => {
  const value = order?.custom_fields?.f3129962;
  return typeof value === 'string' && value.trim() ? value.trim() : 'SIN CLASIFICAR';
};

const normalizeServiceType = (value: string | null | undefined) => {
  const normalized = normalizeText(value);

  if (normalized.includes('REPARACION IW')) return 'Reparación IW';
  if (normalized.includes('REPARACION OOW')) return 'Reparación OOW';
  if (normalized.includes('MANTEN')) return 'Mantenimiento';
  if (normalized.includes('LIFE ONE')) return 'Life-One';
  if (normalized.includes('VALIDACION')) return 'Validación';
  if (normalized.includes('SERVICIO TECNICO')) return 'Servicio Técnico';

  return value?.trim() || 'Otro';
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Sin registro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';

  return date.toLocaleString('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const extractManagerFromOrder = (order: Record<string, any>) => {
  const candidates = [
    order?.manager?.name,
    order?.manager_name,
    order?.supervisor?.name,
    order?.supervisor_name,
    order?.team?.manager?.name,
    order?.branch?.manager?.name,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Sin gerente';
};

const extractWorkflowFromOrder = (order: Record<string, any>) => {
  const candidates = [order?.workflow?.name, order?.order_type?.name, order?.type?.name, order?.type];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || 'Servicio Técnico';
};

const extractWarrantyFromOrder = (order: Record<string, any>) => {
  const candidates = [
    order?.warranty,
    order?.is_warranty,
    order?.guarantee,
    order?.custom_fields?.garantia,
    order?.custom_fields?.warranty,
  ];

  for (const value of candidates) {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';

    if (typeof value === 'string') {
      const normalized = normalizeText(value);
      if (normalized.includes('SI') || normalized.includes('YES') || normalized.includes('TRUE') || normalized.includes('IW')) return 'Sí';
      if (normalized.includes('NO') || normalized.includes('FALSE') || normalized.includes('OW')) return 'No';
    }
  }

  return normalizeText(extractEntryType(order)).includes('IW') ? 'Sí' : 'No';
};

const extractNamesFromCollection = (collection: unknown): string[] => {
  if (!Array.isArray(collection)) return [];

  return collection
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return null;

      const record = item as Record<string, any>;
      return [
        record?.name,
        record?.title,
        record?.description,
        record?.label,
        record?.action,
        record?.sku,
        record?.article,
        record?.product?.name,
        record?.product?.sku,
        record?.service?.name,
        record?.work?.name,
        record?.service_work?.name,
      ].find((value) => typeof value === 'string' && value.trim())?.trim() || null;
    })
    .filter((value): value is string => Boolean(value));
};

const extractProductEntriesFromOrder = (order: Record<string, any>) => {
  const collections = [order?.products, order?.parts, order?.items, order?.materials];

  return collections.flatMap((collection) => {
    if (!Array.isArray(collection)) return [] as Array<{ name: string; quantity: number }>;

    return collection
      .map((item) => {
        if (typeof item === 'string' && item.trim()) {
          return { name: item.trim(), quantity: 1 };
        }

        if (!item || typeof item !== 'object') return null;

        const record = item as Record<string, any>;
        const name = [
          record?.name,
          record?.title,
          record?.sku,
          record?.article,
          record?.product?.name,
          record?.product?.sku,
        ].find((value) => typeof value === 'string' && value.trim())?.trim();

        const rawQuantity = [record?.quantity, record?.qty, record?.count, record?.amount, record?.units]
          .find((value) => typeof value === 'number' || typeof value === 'string');
        const quantity = Math.max(Number(rawQuantity) || 1, 1);

        return name ? { name, quantity } : null;
      })
      .filter((value): value is { name: string; quantity: number } => Boolean(value));
  });
};

const summarizeList = (items: string[], fallback: string) => {
  const unique = Array.from(new Set(items.filter(Boolean)));
  if (!unique.length) return fallback;
  if (unique.length <= 3) return unique.join(', ');
  return `${unique.slice(0, 3).join(', ')} +${unique.length - 3}`;
};

const extractServicesFromOrder = (order: Record<string, any>) => {
  const candidates = [
    ...extractNamesFromCollection(order?.services),
    ...extractNamesFromCollection(order?.works),
    ...extractNamesFromCollection(order?.jobs),
  ];

  if (candidates.length) return summarizeList(candidates, 'Sin servicio');
  return normalizeServiceType(extractWorkflowFromOrder(order));
};

const extractProductsFromOrder = (order: Record<string, any>) => {
  const candidates = extractProductEntriesFromOrder(order).map((item) => item.name);
  return summarizeList(candidates, 'Sin SKU');
};

const hasExplicitProductEntries = (order: Record<string, any>) => {
  return extractProductEntriesFromOrder(order).length > 0;
};

const hasProductDispatch = (order: Record<string, any>) => {
  if (hasExplicitProductEntries(order)) return true;
  return isDispatchStatus(order) && !isNoteCreditCase(order);
};

const cleanDispatchLabel = (value: string | null | undefined) => {
  if (!value) return 'Sin detalle de producto';

  const compact = value.replace(/\s+/g, ' ').trim();
  const primary = compact.split(/[;,]/)[0]?.trim() || compact;
  const rawPieces = primary.split('/').map((piece) => piece.trim()).filter(Boolean);

  const cleanedPieces = rawPieces
    .map((piece) => piece
      .replace(/^(SMARTPHONE|FEATURE PHONE|TABLET|ROBOT ASPIRADORA|TELEFONO MOVIL)\s*/i, '')
      .replace(/^PCD\s+/i, 'PCD ')
      .trim())
    .filter(Boolean);

  const uniquePieces = Array.from(new Set(cleanedPieces));

  const descriptivePieces = uniquePieces.filter((piece) => {
    const normalized = normalizeText(piece);
    if (!normalized) return false;
    if (piece.length <= 1) return false;
    const isMostlyCode = /^[A-Z0-9-]+$/i.test(piece) && !piece.includes(' ');
    return !isMostlyCode;
  });

  const bestName = descriptivePieces.sort((a, b) => b.length - a.length)[0]
    || uniquePieces.sort((a, b) => b.length - a.length)[0]
    || primary;

  const codePiece = uniquePieces.find((piece) => /^[A-Z0-9-]+$/i.test(piece) && piece.length >= 6 && !bestName.includes(piece));
  const finalLabel = codePiece ? `${bestName} · ${codePiece}` : bestName;

  return finalLabel.trim() || 'Sin detalle de producto';
};

const extractDispatchTrackingLabel = (order: Record<string, any>) => {
  const products = extractProductsFromOrder(order);
  if (products !== 'Sin SKU') return cleanDispatchLabel(products);

  const fallback = [
    order?.asset?.title,
    order?.name,
    order?.item?.name,
    order?.item?.title,
    order?.asset?.model,
    order?.number ? `OS ${order.number}` : null,
  ].find((value) => typeof value === 'string' && value.trim())?.trim();

  return cleanDispatchLabel(fallback || 'Sin detalle de producto');
};

const getBodegaEventDate = (order: Record<string, any>) => {
  return order?.done_at || order?.closed_at || order?.modified_at || order?.created_at || '';
};

const getSlaTargetDays = (order: Record<string, any>) => {
  if (!order?.created_at || !order?.due_date) return null;

  const createdAt = new Date(order.created_at);
  const dueAt = new Date(order.due_date);

  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(dueAt.getTime())) return null;
  return Number(Math.max((dueAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24), 0).toFixed(1));
};

const getPriorityLabel = (order: Record<string, any>) => {
  const explicitPriority = normalizeText(order?.priority?.name || order?.priority);

  if (explicitPriority.includes('ALTA') || explicitPriority.includes('HIGH') || explicitPriority.includes('URGENT')) return 'Alta';
  if (explicitPriority.includes('MEDIA') || explicitPriority.includes('MEDIUM')) return 'Media';
  if (explicitPriority.includes('BAJA') || explicitPriority.includes('LOW')) return 'Baja';

  if (!order?.due_date) return 'Media';

  const dueAt = new Date(order.due_date);
  if (Number.isNaN(dueAt.getTime())) return 'Media';

  const hoursToDue = (dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursToDue < 24) return 'Alta';
  if (hoursToDue < 72) return 'Media';
  return 'Baja';
};

const getLateReason = (order: Record<string, any>) => {
  const dueAt = new Date(order?.due_date || '');
  if (!order?.due_date || Number.isNaN(dueAt.getTime())) return 'Sin SLA';

  const checkDate = new Date(order?.done_at || order?.closed_at || order?.modified_at || Date.now());
  if (checkDate.getTime() <= dueAt.getTime()) return 'En SLA';

  const status = normalizeText(order?.status?.name);
  if (status.includes('APROBACION')) return 'Esperando aprobación';
  if (status.includes('PARTES') || status.includes('REPUEST')) return 'Esperando repuestos';
  if (status.includes('QA') || status.includes('CALIDAD') || status.includes('VALIDACION')) return 'En QA';
  if (status.includes('REPARACION')) return 'En reparación';
  if (status.includes('DIAGNOSTICO')) return 'En diagnóstico';
  return 'Atraso operativo';
};

const getOverdueDays = (order: Record<string, any>) => {
  if (!order?.due_date) return 0;

  const dueAt = new Date(order.due_date);
  const checkDate = new Date(order?.done_at || order?.closed_at || order?.modified_at || Date.now());

  if (Number.isNaN(dueAt.getTime()) || Number.isNaN(checkDate.getTime())) return 0;

  return Number(Math.max((checkDate.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24), 0).toFixed(1));
};

const getOrderHistoryEntries = (order: Record<string, any>) => {
  const sources = [order?.status_history, order?.history, order?.timeline];
  const raw = sources.find((value) => Array.isArray(value));

  if (!Array.isArray(raw)) return [] as Array<{ status: string; timestamp: string }>;

  return raw
    .map((entry) => {
      const record = entry as Record<string, any>;
      return {
        status: normalizeText(record?.status?.name || record?.status_name || record?.status || record?.title || ''),
        timestamp: record?.timestamp || record?.created_at || record?.date || record?.changed_at,
      };
    })
    .filter((item) => item.status && typeof item.timestamp === 'string')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

const getStageDurations = (order: Record<string, any>) => {
  const history = getOrderHistoryEntries(order);
  const totals = { diagnostico: 0, aprobacion: 0, repuestos: 0, reparacion: 0, qa: 0 };

  for (let i = 0; i < history.length - 1; i += 1) {
    const start = new Date(history[i].timestamp);
    const end = new Date(history[i + 1].timestamp);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const hours = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0);
    const status = history[i].status;

    if (status.includes('DIAGNOSTICO')) totals.diagnostico += hours;
    else if (status.includes('APROBACION')) totals.aprobacion += hours;
    else if (status.includes('PARTES') || status.includes('REPUEST')) totals.repuestos += hours;
    else if (status.includes('REPARACION')) totals.reparacion += hours;
    else if (status.includes('QA') || status.includes('CALIDAD') || status.includes('VALIDACION')) totals.qa += hours;
  }

  return {
    diagnostico: Number((totals.diagnostico / 24).toFixed(1)),
    aprobacion: Number((totals.aprobacion / 24).toFixed(1)),
    repuestos: Number((totals.repuestos / 24).toFixed(1)),
    reparacion: Number((totals.reparacion / 24).toFixed(1)),
    qa: Number((totals.qa / 24).toFixed(1)),
  };
};

const getPartsCost = (order: Record<string, any>) => {
  const candidates = [
    order?.cost_parts,
    order?.parts_cost,
    order?.totals?.parts,
    order?.totals?.parts_cost,
    order?.summary?.parts_cost,
  ];

  const numeric = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));
  return typeof numeric === 'number' ? numeric : 0;
};

const getOrderRevenue = (order: Record<string, any>) => {
  const candidates = [
    order?.revenue,
    order?.income,
    order?.total,
    order?.totals?.grand_total,
    order?.summary?.revenue,
  ];

  const numeric = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));
  return typeof numeric === 'number' ? numeric : 0;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonthLabel = (value: string) => {
  if (!value) return '';

  const normalizedValue = value.length === 7 ? `${value}-01` : value;
  const date = new Date(`${normalizedValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  if (value.length === 7) {
    return date.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  }

  return date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateKeyLabel = (dateKey: string, withYear: boolean = false) => {
  if (!dateKey || dateKey === 'SIN_FECHA') return 'Sin fecha';

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));

  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
};

const isWithinMonthRange = (dateValue: string | null | undefined, startMonth: string, endMonth: string) => {
  if (!dateValue) return false;
  if (!startMonth && !endMonth) return true;

  const orderDate = new Date(dateValue);
  if (Number.isNaN(orderDate.getTime())) return false;

  const minDate = new Date(-8640000000000000);
  const maxDate = new Date(8640000000000000);

  const parseBoundaryDate = (value: string, endOfPeriod: boolean) => {
    if (!value) return endOfPeriod ? maxDate : minDate;

    if (/^\d{4}-\d{2}$/.test(value)) {
      const base = new Date(`${value}-01T00:00:00`);
      if (Number.isNaN(base.getTime())) return endOfPeriod ? maxDate : minDate;
      return endOfPeriod
        ? new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999)
        : base;
    }

    const base = new Date(`${value}T00:00:00`);
    if (Number.isNaN(base.getTime())) return endOfPeriod ? maxDate : minDate;
    if (endOfPeriod) base.setHours(23, 59, 59, 999);
    return base;
  };

  let startDate = parseBoundaryDate(startMonth, false);
  let endDate = parseBoundaryDate(endMonth, true);

  if (startDate.getTime() > endDate.getTime()) {
    const temp = startDate;
    startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(temp);
    endDate.setHours(23, 59, 59, 999);
  }

  return orderDate >= startDate && orderDate <= endDate;
};

const isWithinSelectedRange = (dateValue: string | null | undefined, range: DateFilterValue) => {
  if (!dateValue) return false;

  const orderDate = new Date(dateValue);
  if (Number.isNaN(orderDate.getTime())) return false;

  const now = new Date();
  const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

  if (range === 'TODAY') return diffDays <= 1;
  if (range === '7D') return diffDays <= 7;
  if (range === '30D') return diffDays <= 30;

  return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
};

const isQaStatus = (statusName: string) => {
  return statusName.includes('CALIDAD') || statusName.includes('VALIDACION') || statusName.includes('QA');
};

const isTechnicianNotRepairedStatus = (statusName: string) => {
  return (
    statusName.includes('ESPERANDO APROBACION') ||
    statusName.includes('ESCALADA PARA NC') ||
    statusName.includes('PRESUPUESTO RECHAZADO') ||
    statusName.includes('ESCALADO LIFE ONE')
  );
};

const isTechnicianRepairCompletedStatus = (statusName: string) => {
  if (isTechnicianNotRepairedStatus(statusName)) return false;

  return (
    statusName.includes('REPARACION') ||
    statusName.includes('REPARADO') ||
    statusName.includes('ESPERANDO PARTES') ||
    statusName.includes('SWAPS PCBA') ||
    isQaStatus(statusName)
  );
};

const isNoteCreditCase = (order: Record<string, any>) => {
  const servicesText = normalizeText(extractServicesFromOrder(order));
  const statusName = normalizeText(order?.status?.name);
  const notesText = normalizeText(`${order?.resume || ''} ${order?.engineer_notes || ''} ${order?.manager_notes || ''}`);
  const paddedServicesText = ` ${servicesText} `;
  const paddedStatusText = ` ${statusName} `;

  return (
    servicesText.includes('NOTA DE CREDITO') ||
    servicesText.includes('ESCALADA PARA NC') ||
    servicesText.includes('PARA NC') ||
    paddedServicesText.includes(' NC ') ||
    statusName.includes('NOTA DE CREDITO') ||
    statusName.includes('ESCALADA PARA NC') ||
    statusName.includes('CREDITO') ||
    paddedStatusText.includes(' NC ') ||
    notesText.includes('NOTA DE CREDITO')
  );
};

const getRepairComplexityLabel = (order: Record<string, any>) => {
  const statusName = normalizeText(order?.status?.name);
  const verdictText = normalizeText(`${order?.resume || ''} ${order?.engineer_notes || ''} ${order?.manager_notes || ''}`);
  const diagnosisText = normalizeText(`${order?.malfunction || ''} ${order?.fault || ''} ${order?.problem || ''} ${order?.description || ''}`);
  const servicesText = normalizeText(extractServicesFromOrder(order));
  const productsText = normalizeText(extractProductsFromOrder(order));

  const hasParts = Boolean(
    getPartsCost(order) > 0 ||
    (Array.isArray(order?.parts) && order.parts.length > 0) ||
    (Array.isArray(order?.materials) && order.materials.length > 0) ||
    (Array.isArray(order?.products) && order.products.length > 0) ||
    (productsText && productsText !== 'SIN SKU')
  );

  const mentionsPhysicalComponent = [
    'BATERIA', 'PANTALLA', 'DISPLAY', 'MOTOR', 'SENSOR', 'PCBA', 'PLACA', 'SUB PCBA', 'PUERTO', 'CAMARA', 'FLEX', 'RINGER', 'MICROFONO'
  ].some((keyword) => servicesText.includes(keyword) || verdictText.includes(keyword));

  const mentionsL2Action = ['REMPLAZO', 'REEMPLAZO', 'CAMBIO', 'INSTALACION', 'INSTALACION'].some(
    (keyword) => servicesText.includes(keyword) || verdictText.includes(keyword)
  );

  const mentionsL1Action = ['SOFTWARE', 'ACTUALIZACION', 'AJUSTE', 'CONFIGURACION', 'LIMPIEZA', 'MANTENIMIENTO'].some(
    (keyword) => servicesText.includes(keyword) || verdictText.includes(keyword)
  );

  const notRepairedSignals = [
    'SIN REPUESTO', 'SIN REPUESTOS', 'NO REPARADO', 'DANO TOTAL', 'DAÑO TOTAL', 'NO CONTAMOS CON LOS REPUESTOS', 'NOTA DE CREDITO'
  ].some((keyword) => verdictText.includes(keyword) || diagnosisText.includes(keyword));

  const noFailureSignals = [
    'FALLA NO DETECTADA', 'NO PRESENTA FALLA', 'NO SE REPRODUCE', 'SIN FALLA'
  ].some((keyword) => verdictText.includes(keyword) || diagnosisText.includes(keyword));

  if (
    statusName.includes('DOA') ||
    statusName.includes('DAP') ||
    diagnosisText.includes('DOA') ||
    diagnosisText.includes('DAP') ||
    verdictText.includes('DOA') ||
    verdictText.includes('DAP')
  ) {
    return 'DOA-DAP';
  }

  if (
    statusName.includes('PRESUPUESTO RECHAZADO') ||
    statusName.includes('NOTA DE CREDITO') ||
    statusName.includes('DEVOLUC') ||
    statusName.includes('PARA DEVOLVER') ||
    notRepairedSignals
  ) {
    return 'No Reparado';
  }

  if (noFailureSignals) {
    return 'Falla No Detectada';
  }

  if (hasParts || mentionsL2Action || mentionsPhysicalComponent) {
    return 'Reparación L2';
  }

  if (mentionsL1Action) {
    return 'Reparación L1';
  }

  return 'Reparación L0';
};

const isDispatchStatus = (order: Record<string, any>) => {
  const statusName = normalizeText(order?.status?.name);

  if (isQaStatus(statusName) || isNoteCreditCase(order)) return false;

  return Boolean(
    order?.done_at ||
    order?.closed_at ||
    statusName.includes('CERRAD') ||
    statusName.includes('FINALIZ') ||
    statusName.includes('ENTREGA') ||
    statusName.includes('ENTREGAD') ||
    statusName.includes('DESPACH') ||
    statusName.includes('DEVOLVER') ||
    statusName.includes('DEVOLUC') ||
    statusName.includes('RETIR')
  );
};

const getDispatchEventDate = (order: Record<string, any>) => {
  if (!isDispatchStatus(order)) return null;
  return order?.closed_at || order?.done_at || order?.modified_at || order?.updated_at || null;
};

const matchesSelectedFlowMoment = (dateValue: string | null | undefined, selectedFlowMonth: string, selectedFlowDay: string) => {
  if (!dateValue) return false;

  const monthKey = String(dateValue).slice(0, 7);
  const dayKey = String(dateValue).slice(0, 10);

  if (selectedFlowMonth !== 'ALL' && monthKey !== selectedFlowMonth) return false;
  if (selectedFlowDay !== 'ALL' && dayKey !== selectedFlowDay) return false;

  return true;
};

const getOrderProcessingHours = (order: Record<string, any>) => {
  const createdAt = new Date(order?.created_at || Date.now());
  const endAt = new Date(order?.done_at || order?.closed_at || order?.modified_at || Date.now());
  const diffMs = Math.max(endAt.getTime() - createdAt.getTime(), 0);
  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
};

const getOrderProcessingDays = (order: Record<string, any>) => {
  return Number((getOrderProcessingHours(order) / 24).toFixed(1));
};

const getRepairMixDate = (order: Record<string, any>) => {
  return order?.done_at || order?.closed_at || order?.created_at || '';
};

const getWeekBucket = (dateValue: string | null | undefined) => {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const mondayOffset = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const value = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const label = `${start.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}`;

  return { value, label };
};

const matchesFunnelStage = (order: Record<string, any>, stage: string) => {
  const status = normalizeText(order?.status?.name);

  if (stage === 'Creada') return true;
  if (stage === 'WIP') return !isDispatchStatus(order);
  if (stage === 'Diagnóstico') return status.includes('DIAGNOSTICO');
  if (stage === 'Reparación') {
    return status.includes('REPARACION') || status.includes('PARTES') || status.includes('APROBACION');
  }
  if (stage === 'QA') {
    return isQaStatus(status);
  }
  if (stage === 'Entrega') return isDispatchStatus(order);

  return false;
};

export default function DashboardMultimodular() {
  const [selectedSede, setSelectedSede] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedTechnician, setSelectedTechnician] = useState('ALL');
  const [selectedTechnicianMonth, setSelectedTechnicianMonth] = useState('ALL');
  const [selectedTechnicianDay, setSelectedTechnicianDay] = useState('ALL');
  const [selectedRepairMixWeek, setSelectedRepairMixWeek] = useState('ACCUMULATED');
  const [selectedRepairMixMonth, setSelectedRepairMixMonth] = useState('ALL');
  const [selectedRepairMixDay, setSelectedRepairMixDay] = useState('ALL');
  const [selectedStartMonth, setSelectedStartMonth] = useState('');
  const [selectedEndMonth, setSelectedEndMonth] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<DateFilterValue>('MONTH');
  const [selectedFlowMonth, setSelectedFlowMonth] = useState('ALL');
  const [selectedFlowDay, setSelectedFlowDay] = useState('ALL');
  const [selectedChannelMonth, setSelectedChannelMonth] = useState('ALL');
  const [selectedChannelDay, setSelectedChannelDay] = useState('ALL');
  const [selectedServiceMonth, setSelectedServiceMonth] = useState('ALL');
  const [selectedServiceDay, setSelectedServiceDay] = useState('ALL');
  const [selectedCreatorMonth, setSelectedCreatorMonth] = useState('ALL');
  const [selectedCreatorDay, setSelectedCreatorDay] = useState('ALL');
  const [selectedBodegaMonth, setSelectedBodegaMonth] = useState('ALL');
  const [selectedBodegaDay, setSelectedBodegaDay] = useState('ALL');
  const [selectedBodegaBrand, setSelectedBodegaBrand] = useState('ALL');
  const [selectedBodegaModel, setSelectedBodegaModel] = useState('ALL');
  const [selectedBodegaGroup, setSelectedBodegaGroup] = useState('ALL');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState('Creada');
  const [selectedFunnelDay, setSelectedFunnelDay] = useState('ALL');
  const [selectedSlaSegment, setSelectedSlaSegment] = useState<'En SLA' | 'Fuera SLA'>('Fuera SLA');
  const [availableBrands, setAvailableBrands] = useState<string[]>(FALLBACK_BRANDS);
  const [availableTechnicians, setAvailableTechnicians] = useState<string[]>(FALLBACK_TECHNICIANS);
  const [ordersData, setOrdersData] = useState<Record<string, any>[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking connection...');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [backofficeData, setBackofficeData] = useState<BackofficeApiResponse>(EMPTY_BACKOFFICE_DATA);
  const [backofficeStatus, setBackofficeStatus] = useState<string>('Google Sheets: cargando pre-alertas...');
  const [selectedBackofficeClient, setSelectedBackofficeClient] = useState('ALL');
  const [selectedBackofficeStatus, setSelectedBackofficeStatus] = useState('ALL');
  const [backofficeSearch, setBackofficeSearch] = useState('');
  const [xiaomiRegistryInput, setXiaomiRegistryInput] = useState('');
  const [selectedClaimsStatus, setSelectedClaimsStatus] = useState('ALL');
  const [claimsSearch, setClaimsSearch] = useState('');
  const [claimsRegistryLoaded, setClaimsRegistryLoaded] = useState(false);

  // Verificar conexión con Orderry API y obtener marcas disponibles
  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' });
        const data = await res.json();
        if (data.connected) {
          const apiOrders = Array.isArray(data.data) ? data.data : [];
          const dynamicBrands = Array.from(
            new Set<string>(
              apiOrders
                .map((order: Record<string, any>) => extractBrandFromOrder(order))
                .filter((brand: string) => brand !== 'Sin Marca')
            )
          ).sort((a, b) => a.localeCompare(b));

          const dynamicTechnicians = Array.from(
            new Set<string>(
              apiOrders
                .map((order: Record<string, any>) => extractTechnicianFromOrder(order))
                .filter((name: string) => name !== 'Sin asignar' && !name.toUpperCase().includes('ORDERRY'))
            )
          ).sort((a, b) => a.localeCompare(b));

          setAvailableBrands(dynamicBrands.length ? dynamicBrands : FALLBACK_BRANDS);
          setAvailableTechnicians(dynamicTechnicians.length ? dynamicTechnicians : FALLBACK_TECHNICIANS);
          setOrdersData(apiOrders);
          setIsConnected(true);
          setConnectionStatus(`API Orderry v2: Conectado · ${apiOrders.length} órdenes`);
        } else {
          setIsConnected(false);
          setOrdersData([]);
          setAvailableBrands(FALLBACK_BRANDS);
          setAvailableTechnicians(FALLBACK_TECHNICIANS);
          setConnectionStatus('Error de API: ' + (data.error || 'Desconectado'));
        }
      } catch (err) {
        setIsConnected(false);
        setOrdersData([]);
        setAvailableBrands(FALLBACK_BRANDS);
        setAvailableTechnicians(FALLBACK_TECHNICIANS);
        setConnectionStatus('Error al conectar con el backend');
      }
    }
    checkConnection();
  }, []);

  useEffect(() => {
    async function loadBackofficeData() {
      try {
        const response = await fetch(`/api/backoffice?range=${encodeURIComponent(selectedDateRange)}`, { cache: 'no-store' });
        const data: BackofficeApiResponse = await response.json();
        setBackofficeData(data);

        if (data.connected) {
          if (data.source === 'orderry-only') {
            setBackofficeStatus(`Orderry conectado · ${data.summary.totalRequests} registros disponibles${data.warning ? ' · Google Sheets pendiente' : ''}`);
          } else {
            setBackofficeStatus(`Pre-alertas: ${data.summary.totalRequests} · Vinculadas a Orderry: ${data.summary.matchedToOrderry}`);
          }
        } else {
          setBackofficeStatus(data.error || 'Sin acceso a Google Sheets');
        }
      } catch (error) {
        setBackofficeStatus('Error leyendo pre-alertas logísticas');
      }
    }

    loadBackofficeData();
  }, [selectedDateRange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedRegistry = window.localStorage.getItem('xiaomi-claims-registry');
    if (savedRegistry) {
      setXiaomiRegistryInput(savedRegistry);
    }
    setClaimsRegistryLoaded(true);
  }, []);

  useEffect(() => {
    if (!selectedStartMonth && !selectedEndMonth && selectedDateRange === '7D') {
      setSelectedDateRange('MONTH');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !claimsRegistryLoaded) return;
    window.localStorage.setItem('xiaomi-claims-registry', xiaomiRegistryInput);
  }, [xiaomiRegistryInput, claimsRegistryLoaded]);

  const isCustomMonthRangeActive = Boolean(selectedStartMonth || selectedEndMonth);

  const selectedPeriodLabel = useMemo(() => {
    if (isCustomMonthRangeActive) {
      const startLabel = selectedStartMonth ? formatMonthLabel(selectedStartMonth) : 'inicio libre';
      const endLabel = selectedEndMonth ? formatMonthLabel(selectedEndMonth) : 'final libre';
      return `${startLabel} → ${endLabel}`;
    }

    return DATE_FILTERS.find((item) => item.value === selectedDateRange)?.label || 'Últimos 7 días';
  }, [isCustomMonthRangeActive, selectedDateRange, selectedStartMonth, selectedEndMonth]);

  const hasLiveData = ordersData.length > 0;
  const backofficeSummary = backofficeData.summary;
  const backofficeBreakdown = backofficeData.breakdown.length ? backofficeData.breakdown : EMPTY_BACKOFFICE_DATA.breakdown;
  const recentBackofficeRows = backofficeData.recentRows;
  const filteredBackofficeRows = useMemo(() => {
    return recentBackofficeRows.filter((row) => {
      const matchesClient = selectedBackofficeClient === 'ALL' || row.client === selectedBackofficeClient;
      const matchesStatus = selectedBackofficeStatus === 'ALL' || row.status === selectedBackofficeStatus;
      const searchText = `${row.reference} ${row.trackingCode || ''} ${row.equipmentName || ''} ${row.matchedOrderNumber || ''}`.toUpperCase();
      const matchesSearch = !backofficeSearch.trim() || searchText.includes(backofficeSearch.trim().toUpperCase());
      return matchesClient && matchesStatus && matchesSearch;
    });
  }, [recentBackofficeRows, selectedBackofficeClient, selectedBackofficeStatus, backofficeSearch]);

  const brandFactor = useMemo(() => {
    if (selectedBrand === 'ALL') return 1;
    const brandIndex = availableBrands.indexOf(selectedBrand);
    return brandIndex >= 0 ? Math.max(0.55, 1 - (brandIndex % 6) * 0.08) : 0.9;
  }, [availableBrands, selectedBrand]);

  const scopedOrders = useMemo(() => {
    if (!ordersData.length) return [];

    return ordersData.filter((order) => {
      const orderSede = extractSedeFromOrder(order);
      const orderGroup = normalizeText(extractProductGroupFromOrder(order));
      const selectedGroup = normalizeText(selectedProduct);
      const orderBrand = normalizeText(extractBrandFromOrder(order));
      const selectedBrandName = normalizeText(selectedBrand);
      const orderTechnician = normalizeText(extractTechnicianFromOrder(order));
      const selectedTechnicianName = normalizeText(selectedTechnician);

      const matchesSede = selectedSede === 'ALL' || orderSede === selectedSede;
      const matchesGroup =
        selectedProduct === 'ALL' ||
        orderGroup.includes(selectedGroup) ||
        selectedGroup.includes(orderGroup) ||
        orderGroup.split(' ').some((token) => token.length > 3 && selectedGroup.includes(token));
      const matchesBrand = selectedBrand === 'ALL' || orderBrand === selectedBrandName;
      const matchesTechnician = selectedTechnician === 'ALL' || orderTechnician === selectedTechnicianName;

      return matchesSede && matchesGroup && matchesBrand && matchesTechnician;
    });
  }, [ordersData, selectedSede, selectedProduct, selectedBrand, selectedTechnician]);

  const filteredOrders = useMemo(() => {
    return scopedOrders.filter((order) => {
      if (isCustomMonthRangeActive) {
        return isWithinMonthRange(order?.created_at, selectedStartMonth, selectedEndMonth);
      }

      return isWithinSelectedRange(order?.created_at, selectedDateRange);
    });
  }, [scopedOrders, isCustomMonthRangeActive, selectedDateRange, selectedStartMonth, selectedEndMonth]);

  const bounceCohortOrders = useMemo(() => {
    if (isCustomMonthRangeActive) {
      return scopedOrders.filter((order) => isWithinMonthRange(order?.created_at, selectedStartMonth, selectedEndMonth));
    }

    return scopedOrders;
  }, [scopedOrders, isCustomMonthRangeActive, selectedStartMonth, selectedEndMonth]);

  const serialBounceSummary = useMemo(() => {
    const historyUniverse = ordersData
      .filter((order) => selectedSede === 'ALL' || extractSedeFromOrder(order) === selectedSede)
      .map((order) => {
        const series = extractSeriesFromOrder(order);
        const createdAt = new Date(order?.created_at || '');
        const key = String(order?.id || order?.number || `${series}-${order?.created_at || 'na'}`);

        return {
          key,
          series,
          createdAt,
        };
      })
      .filter((item) => item.series && !Number.isNaN(item.createdAt.getTime()))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const lastSeenBySeries = new Map<string, Date>();
    const bounceByOrderKey = new Map<string, { reentryDays: number | null; within30: boolean; within60: boolean; within90: boolean }>();

    historyUniverse.forEach((item) => {
      const previousDate = lastSeenBySeries.get(item.series as string);
      const reentryDays = previousDate
        ? (item.createdAt.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        : null;

      bounceByOrderKey.set(item.key, {
        reentryDays,
        within30: reentryDays !== null && reentryDays <= 30,
        within60: reentryDays !== null && reentryDays <= 60,
        within90: reentryDays !== null && reentryDays <= 90,
      });

      lastSeenBySeries.set(item.series as string, item.createdAt);
    });

    const visibleOrders = bounceCohortOrders
      .map((order) => {
        const series = extractSeriesFromOrder(order);
        const key = String(order?.id || order?.number || `${series}-${order?.created_at || 'na'}`);
        const createdAt = new Date(order?.created_at || '');

        return {
          key,
          series,
          createdAt,
          bounceInfo: bounceByOrderKey.get(key),
        };
      })
      .filter((item) => item.series && item.bounceInfo && !Number.isNaN(item.createdAt.getTime()));

    const recentMonths = Array.from(
      new Set(
        visibleOrders
          .map((item) => item.createdAt.toISOString().slice(0, 7))
          .filter(Boolean)
      )
    )
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 3);

    const summarize = (days: 30 | 60 | 90, monthKey?: string) => {
      const itemsInMonth = monthKey
        ? visibleOrders.filter((item) => item.createdAt.toISOString().slice(0, 7) === monthKey)
        : [];

      const bounced = itemsInMonth.filter((item) => {
        if (days === 30) return item.bounceInfo?.within30;
        if (days === 60) return item.bounceInfo?.within60;
        return item.bounceInfo?.within90;
      }).length;

      const total = itemsInMonth.length;
      const rate = total ? Number(((bounced / total) * 100).toFixed(2)) : 0;

      return {
        period: `${days}D`,
        monthLabel: monthKey ? formatMonthLabel(monthKey) : 'Sin mes',
        rate,
        total,
        bounced,
        under3: rate < 3,
        under5: rate < 5,
      };
    };

    const summaries = [
      summarize(30, recentMonths[0]),
      summarize(60, recentMonths[1]),
      summarize(90, recentMonths[2]),
    ];

    return {
      summaries,
      kpiRate: summaries[0]?.rate ?? 0,
    };
  }, [bounceCohortOrders, ordersData, selectedSede]);

  const complianceMetrics = useMemo(() => {
    if (hasLiveData) {
      const total = filteredOrders.length;
      const totalDays = filteredOrders.reduce((sum, order) => sum + getOrderProcessingDays(order), 0);
      const backlog = filteredOrders.filter((order) => !isDispatchStatus(order)).length;
      const slaMet = filteredOrders.filter((order) => {
        if (!order?.due_date) return false;
        const dueDate = new Date(order.due_date);
        const checkDate = new Date(order?.done_at || order?.closed_at || order?.modified_at || Date.now());
        return checkDate.getTime() <= dueDate.getTime();
      }).length;
      const accepted = filteredOrders.filter((order) => {
        const status = normalizeText(order?.status?.name);
        return !status.includes('RECHAZ') && !status.includes('NOTA DE CREDITO');
      }).length;

      return {
        tat: `${total ? (totalDays / total).toFixed(1) : '0.0'} días`,
        sla: `${total ? Math.round((slaMet / total) * 100) : 0}%`,
        backlog,
        bounce: `${serialBounceSummary.kpiRate.toFixed(2)}%`,
        claim: `${total ? Math.round((accepted / total) * 100) : 0}%`,
      };
    }

    const byDate: Record<DateFilterValue, { tat: string; sla: string; backlog: number; bounce: string; claim: string }> = {
      TODAY: { tat: '1.0 días', sla: '97.1%', backlog: 52, bounce: '2.1%', claim: '96%' },
      '7D': { tat: '1.6 días', sla: '94.2%', backlog: 145, bounce: '4.8%', claim: '92%' },
      '30D': { tat: '1.7 días', sla: '91.6%', backlog: 220, bounce: '5.6%', claim: '89%' },
      MONTH: { tat: '1.5 días', sla: '95.4%', backlog: 178, bounce: '3.9%', claim: '93%' },
    };

    return byDate[selectedDateRange];
  }, [hasLiveData, filteredOrders, selectedDateRange, serialBounceSummary]);

  // Filtros dinámicos simulados (el factor cambia los números visualmente)
  const filterFactor = useMemo(() => {
    if (hasLiveData) {
      return ordersData.length ? filteredOrders.length / ordersData.length : 0;
    }

    let factor = 1.0;
    if (selectedSede === 'CR') factor *= 0.6;
    if (selectedSede === 'GT') factor *= 0.9;

    const dateFactors: Record<DateFilterValue, number> = {
      TODAY: 0.4,
      '7D': 1.0,
      '30D': 1.18,
      MONTH: 0.92,
    };

    factor *= dateFactors[selectedDateRange];
    factor *= brandFactor;

    if (selectedProduct !== 'ALL') {
      const groupIndex = PRODUCT_GROUPS.indexOf(selectedProduct as (typeof PRODUCT_GROUPS)[number]);
      const dynamicFactor = groupIndex >= 0 ? Math.max(0.2, 1 - (groupIndex % 8) * 0.08) : 0.85;
      factor *= dynamicFactor;
    }

    return factor;
  }, [hasLiveData, ordersData.length, filteredOrders.length, selectedSede, selectedProduct, selectedDateRange, brandFactor]);

  const filteredTatData = useMemo(() => {
    if (hasLiveData) {
      const grouped = filteredOrders.reduce((acc, order) => {
        const dateKey = (order?.created_at || '').slice(0, 10) || 'SIN_FECHA';
        const label = formatDateKeyLabel(dateKey);

        if (!acc[dateKey]) {
          acc[dateKey] = { date: label, days: 0, count: 0 };
        }

        acc[dateKey].days += getOrderProcessingDays(order);
        acc[dateKey].count += 1;
        return acc;
      }, {} as Record<string, { date: string; days: number; count: number }>);

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, item]) => ({
          date: item.date,
          days: Number((item.days / Math.max(item.count, 1)).toFixed(1)),
        }))
        .slice(-7);
    }

    const baseData = selectedDateRange === 'TODAY' ? TAT_TREND_DATA.slice(-1) : selectedDateRange === '7D' ? TAT_TREND_DATA.slice(-7) : TAT_TREND_DATA;
    return baseData.map((item) => ({ ...item, days: Number(((item.hours * filterFactor) / 24).toFixed(1)) }));
  }, [hasLiveData, filteredOrders, selectedDateRange, filterFactor]);

  const availableFlowMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      [order?.created_at, getDispatchEventDate(order)].forEach((dateValue) => {
        const monthKey = String(dateValue || '').slice(0, 7);
        if (!monthKey || monthMap.has(monthKey)) return;
        monthMap.set(monthKey, formatMonthLabel(monthKey));
      });
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableFlowDays = useMemo(() => {
    const dayMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      [order?.created_at, getDispatchEventDate(order)].forEach((dateValue) => {
        const monthKey = String(dateValue || '').slice(0, 7);
        const dayKey = String(dateValue || '').slice(0, 10);
        if (!dayKey) return;
        if (selectedFlowMonth !== 'ALL' && monthKey !== selectedFlowMonth) return;
        if (dayMap.has(dayKey)) return;
        dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
      });
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders, selectedFlowMonth]);

  useEffect(() => {
    if (selectedFlowMonth !== 'ALL' && !availableFlowMonths.some((month) => month.value === selectedFlowMonth)) {
      setSelectedFlowMonth('ALL');
    }
  }, [availableFlowMonths, selectedFlowMonth]);

  useEffect(() => {
    if (selectedFlowDay !== 'ALL' && !availableFlowDays.some((day) => day.value === selectedFlowDay)) {
      setSelectedFlowDay('ALL');
    }
  }, [availableFlowDays, selectedFlowDay]);

  const flowChartOrders = useMemo(() => scopedOrders, [scopedOrders]);

  const weeklyFlowData = useMemo(() => {
    const addTrendSeries = (rows: Array<{ name: string; Ingresos: number; Despachos: number }>) => {
      return rows.map((item, index, source) => {
        const window = source.slice(Math.max(0, index - 2), index + 1);
        const trendIngresos = window.reduce((sum, row) => sum + row.Ingresos, 0) / Math.max(window.length, 1);
        const trendDespachos = window.reduce((sum, row) => sum + row.Despachos, 0) / Math.max(window.length, 1);

        return {
          ...item,
          TendenciaIngresos: Number(trendIngresos.toFixed(1)),
          TendenciaDespachos: Number(trendDespachos.toFixed(1)),
        };
      });
    };

    if (hasLiveData) {
      const grouped = new Map<string, { name: string; Ingresos: number; Despachos: number }>();

      const ensureBucket = (dateKey: string) => {
        if (!dateKey) return null;
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, { name: formatDateKeyLabel(dateKey), Ingresos: 0, Despachos: 0 });
        }
        return grouped.get(dateKey)!;
      };

      flowChartOrders.forEach((order) => {
        const createdAt = String(order?.created_at || '');
        const dispatchAt = String(getDispatchEventDate(order) || '');

        if (matchesSelectedFlowMoment(createdAt, selectedFlowMonth, selectedFlowDay)) {
          const createdBucket = ensureBucket(createdAt.slice(0, 10));
          if (createdBucket) createdBucket.Ingresos += 1;
        }

        if (matchesSelectedFlowMoment(dispatchAt, selectedFlowMonth, selectedFlowDay)) {
          const dispatchBucket = ensureBucket(dispatchAt.slice(0, 10));
          if (dispatchBucket) dispatchBucket.Despachos += 1;
        }
      });

      const rows = Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value)
        .slice(-31);

      return addTrendSeries(rows);
    }

    const baseData = selectedDateRange === 'TODAY' ? FLOW_DATA.slice(-1) : FLOW_DATA.slice(-7);
    const rows = baseData.map((item) => ({
      ...item,
      Ingresos: Math.max(1, Math.round(item.Ingresos * filterFactor)),
      Despachos: Math.max(1, Math.round(item.Despachos * filterFactor * 0.96)),
    }));

    return addTrendSeries(rows);
  }, [hasLiveData, flowChartOrders, selectedDateRange, filterFactor, selectedFlowMonth, selectedFlowDay]);

  const totalIngresos = useMemo(() => {
    if (hasLiveData) return filteredOrders.length;
    return weeklyFlowData.reduce((sum, row) => sum + row.Ingresos, 0);
  }, [hasLiveData, filteredOrders, weeklyFlowData]);

  const totalDespachos = useMemo(() => {
    if (hasLiveData) return filteredOrders.filter((order) => isDispatchStatus(order)).length;
    return weeklyFlowData.reduce((sum, row) => sum + row.Despachos, 0);
  }, [hasLiveData, filteredOrders, weeklyFlowData]);

  const totalWip = useMemo(() => {
    return Math.max(totalIngresos - totalDespachos, 0);
  }, [totalIngresos, totalDespachos]);

  const dispatchCompliance = useMemo(() => {
    return totalIngresos ? Math.round((totalDespachos / totalIngresos) * 100) : 0;
  }, [totalIngresos, totalDespachos]);

  const wipStatusBreakdown = useMemo(() => {
    if (hasLiveData) {
      const grouped = filteredOrders
        .filter((order) => !isDispatchStatus(order))
        .reduce((acc, order) => {
          const status = order?.status?.name || 'Sin estatus';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      return Object.entries(grouped)
        .map(([status, count]) => ({
          status,
          count,
          pct: totalWip ? Number(((count / totalWip) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
    }

    return [
      { status: 'En diagnóstico', count: 24, pct: 34.3 },
      { status: 'Esperando aprobación', count: 16, pct: 22.9 },
      { status: 'En reparación', count: 14, pct: 20.0 },
      { status: 'Control de calidad', count: 9, pct: 12.9 },
      { status: 'Esperando repuestos', count: 7, pct: 10.0 },
    ];
  }, [hasLiveData, filteredOrders, totalWip]);

  const slaScopedOrders = useMemo(() => {
    return filteredOrders.filter((order) => !isDispatchStatus(order) && Boolean(order?.due_date));
  }, [filteredOrders]);

  const overdueSlaOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => {
        const reason = getLateReason(order);
        return !isDispatchStatus(order) && reason !== 'En SLA' && reason !== 'Sin SLA';
      })
      .map((order) => ({
        id: String(order?.id || order?.number || 'SIN-ID'),
        number: order?.number || 'Sin número',
        equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
        status: order?.status?.name || 'Sin estatus',
        dueDate: formatDateTime(order?.due_date),
        overdueDays: getOverdueDays(order),
        technician: extractTechnicianFromOrder(order),
        reason: getLateReason(order),
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .slice(0, 15);
  }, [filteredOrders]);

  const slaOrderDetails = useMemo(() => {
    if (selectedSlaSegment === 'Fuera SLA') return overdueSlaOrders;

    return slaScopedOrders
      .filter((order) => getLateReason(order) === 'En SLA')
      .map((order) => ({
        id: String(order?.id || order?.number || 'SIN-ID'),
        number: order?.number || 'Sin número',
        equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
        status: order?.status?.name || 'Sin estatus',
        dueDate: formatDateTime(order?.due_date),
        overdueDays: 0,
        technician: extractTechnicianFromOrder(order),
        reason: 'En SLA',
      }))
      .slice(0, 15);
  }, [overdueSlaOrders, selectedSlaSegment, slaScopedOrders]);

  const availableRepairMixWeeks = useMemo(() => {
    const weekMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const week = getWeekBucket(getRepairMixDate(order));
      if (!week || weekMap.has(week.value)) return;
      weekMap.set(week.value, week.label);
    });

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableRepairMixMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const monthKey = getRepairMixDate(order).slice(0, 7);
      if (!monthKey || monthMap.has(monthKey)) return;
      monthMap.set(monthKey, formatMonthLabel(monthKey));
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableRepairMixDays = useMemo(() => {
    const sourceOrders = selectedRepairMixMonth === 'ALL'
      ? scopedOrders
      : scopedOrders.filter((order) => getRepairMixDate(order).slice(0, 7) === selectedRepairMixMonth);

    const dayMap = new Map<string, string>();

    sourceOrders.forEach((order) => {
      const dayKey = getRepairMixDate(order).slice(0, 10);
      if (!dayKey || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders, selectedRepairMixMonth]);

  useEffect(() => {
    if (selectedRepairMixWeek !== 'ACCUMULATED' && !availableRepairMixWeeks.some((week) => week.value === selectedRepairMixWeek)) {
      setSelectedRepairMixWeek('ACCUMULATED');
    }
  }, [availableRepairMixWeeks, selectedRepairMixWeek]);

  useEffect(() => {
    if (selectedRepairMixMonth !== 'ALL' && !availableRepairMixMonths.some((month) => month.value === selectedRepairMixMonth)) {
      setSelectedRepairMixMonth('ALL');
    }
  }, [availableRepairMixMonths, selectedRepairMixMonth]);

  useEffect(() => {
    if (selectedRepairMixDay !== 'ALL' && !availableRepairMixDays.some((day) => day.value === selectedRepairMixDay)) {
      setSelectedRepairMixDay('ALL');
    }
  }, [availableRepairMixDays, selectedRepairMixDay]);

  const repairMixSourceOrders = useMemo(() => {
    let data = scopedOrders;

    if (selectedRepairMixMonth !== 'ALL') {
      data = data.filter((order) => getRepairMixDate(order).slice(0, 7) === selectedRepairMixMonth);
    }

    if (selectedRepairMixDay !== 'ALL') {
      data = data.filter((order) => getRepairMixDate(order).slice(0, 10) === selectedRepairMixDay);
    }

    return data;
  }, [scopedOrders, selectedRepairMixMonth, selectedRepairMixDay]);

  const repairMixClosedOrders = useMemo(() => {
    return repairMixSourceOrders.filter((order) => isDispatchStatus(order));
  }, [repairMixSourceOrders]);

  const repairMixWipCount = useMemo(() => {
    return repairMixSourceOrders.filter((order) => !isDispatchStatus(order)).length;
  }, [repairMixSourceOrders]);

  const filteredRepairMixData = useMemo(() => {
    if (hasLiveData) {
      const mix = {
        'Reparación L0': 0,
        'Reparación L1': 0,
        'Reparación L2': 0,
        'Falla No Detectada': 0,
        'No Reparado': 0,
        'DOA-DAP': 0,
      };

      repairMixClosedOrders.forEach((order) => {
        const label = getRepairComplexityLabel(order) as keyof typeof mix;
        mix[label] += 1;
      });

      return Object.entries(mix).map(([name, count]) => ({ name, count }));
    }

    return REPAIR_MIX_DATA.map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * filterFactor)) }));
  }, [hasLiveData, repairMixClosedOrders, filterFactor]);

  const repairMixTotal = useMemo(() => {
    return filteredRepairMixData.reduce((sum, item) => sum + item.count, 0);
  }, [filteredRepairMixData]);

  const repairMixPercentData = useMemo(() => {
    return filteredRepairMixData.map((item) => ({
      ...item,
      percent: repairMixTotal ? Number(((item.count / repairMixTotal) * 100).toFixed(1)) : 0,
    }));
  }, [filteredRepairMixData, repairMixTotal]);

  const repairCategoryInsights = useMemo(() => {
    const base = {
      'Reparación L0': { name: 'Reparación L0', count: 0, totalDays: 0 },
      'Reparación L1': { name: 'Reparación L1', count: 0, totalDays: 0 },
      'Reparación L2': { name: 'Reparación L2', count: 0, totalDays: 0 },
      'Falla No Detectada': { name: 'Falla No Detectada', count: 0, totalDays: 0 },
      'No Reparado': { name: 'No Reparado', count: 0, totalDays: 0 },
      'DOA-DAP': { name: 'DOA-DAP', count: 0, totalDays: 0 },
    };

    repairMixClosedOrders.forEach((order) => {
      const label = getRepairComplexityLabel(order) as keyof typeof base;
      if (!base[label]) return;
      base[label].count += 1;
      base[label].totalDays += getOrderProcessingDays(order);
    });

    return Object.values(base).map((item) => ({
      ...item,
      percent: repairMixTotal ? Number(((item.count / repairMixTotal) * 100).toFixed(1)) : 0,
      tatDays: item.count ? Number((item.totalDays / item.count).toFixed(2)) : 0,
    }));
  }, [repairMixClosedOrders, repairMixTotal]);

  const repairMixExecutiveBarData = useMemo(() => {
    const byName = Object.fromEntries(repairCategoryInsights.map((item) => [item.name, item.count]));

    return [
      {
        bloque: 'Gestión de cuenta',
        'Reparación L0': byName['Reparación L0'] || 0,
        'Reparación L1': byName['Reparación L1'] || 0,
        'Reparación L2': 0,
        'No Reparado': 0,
        'DOA-DAP': 0,
      },
      {
        bloque: 'Reparaciones especializadas',
        'Reparación L0': 0,
        'Reparación L1': 0,
        'Reparación L2': byName['Reparación L2'] || 0,
        'No Reparado': byName['No Reparado'] || 0,
        'DOA-DAP': byName['DOA-DAP'] || 0,
      },
    ];
  }, [repairCategoryInsights]);

  const repairCategoryTatChart = useMemo(() => {
    return repairCategoryInsights
      .filter((item) => item.count > 0)
      .map((item) => ({ name: item.name, 'TAT (días)': item.tatDays }));
  }, [repairCategoryInsights]);

  const noRepairInsight = useMemo(() => {
    return repairCategoryInsights.find((item) => item.name === 'No Reparado') || { count: 0, percent: 0, tatDays: 0 };
  }, [repairCategoryInsights]);

  const doaInsight = useMemo(() => {
    return repairCategoryInsights.find((item) => item.name === 'DOA-DAP') || { count: 0, percent: 0, tatDays: 0 };
  }, [repairCategoryInsights]);

  const l1Insight = useMemo(() => {
    return repairCategoryInsights.find((item) => item.name === 'Reparación L1') || { count: 0, percent: 0, tatDays: 0 };
  }, [repairCategoryInsights]);

  const l1TatTarget = 5.17;
  const l1TatProgress = l1Insight.tatDays ? Math.min(100, Number(((l1TatTarget / Math.max(l1Insight.tatDays, 0.1)) * 100).toFixed(1))) : 0;

  const bounceRateTableData = useMemo(() => {
    return serialBounceSummary.summaries;
  }, [serialBounceSummary]);

  const filteredAgingData = useMemo(() => {
    if (hasLiveData) {
      const buckets = { '0-2 días': 0, '3-5 días': 0, '5-7 días': 0, '+7 días': 0 };

      filteredOrders
        .filter((order) => !isDispatchStatus(order))
        .forEach((order) => {
          const createdAt = new Date(order?.created_at || Date.now());
          const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 2) buckets['0-2 días'] += 1;
          else if (diffDays <= 5) buckets['3-5 días'] += 1;
          else if (diffDays <= 7) buckets['5-7 días'] += 1;
          else buckets['+7 días'] += 1;
        });

      return Object.entries(buckets).map(([range, count]) => ({ range, count }));
    }

    return AGING_DATA.map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * filterFactor)) }));
  }, [hasLiveData, filteredOrders, filterFactor]);

  const availableFunnelDays = useMemo(() => {
    const dayMap = new Map<string, string>();

    filteredOrders.forEach((order) => {
      const dateKey = (order?.created_at || '').slice(0, 10);
      if (!dateKey || dayMap.has(dateKey)) return;

      dayMap.set(dateKey, formatDateKeyLabel(dateKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [filteredOrders]);

  useEffect(() => {
    if (selectedFunnelDay !== 'ALL' && !availableFunnelDays.some((day) => day.value === selectedFunnelDay)) {
      setSelectedFunnelDay('ALL');
    }
  }, [availableFunnelDays, selectedFunnelDay]);

  const funnelSourceOrders = useMemo(() => {
    if (!filteredOrders.length) return [];
    if (selectedFunnelDay === 'ALL') return filteredOrders;

    return filteredOrders.filter((order) => (order?.created_at || '').slice(0, 10) === selectedFunnelDay);
  }, [filteredOrders, selectedFunnelDay]);

  const filteredFunnelData = useMemo(() => {
    if (hasLiveData) {
      const wip = funnelSourceOrders.filter((order) => !isDispatchStatus(order)).length;
      const diagnostico = funnelSourceOrders.filter((order) => normalizeText(order?.status?.name).includes('DIAGNOSTICO')).length;
      const reparacion = funnelSourceOrders.filter((order) => {
        const status = normalizeText(order?.status?.name);
        return status.includes('REPARACION') || status.includes('PARTES') || status.includes('APROBACION');
      }).length;
      const qa = funnelSourceOrders.filter((order) => {
        const status = normalizeText(order?.status?.name);
        return status.includes('CALIDAD') || status.includes('VALIDACION') || status.includes('QA');
      }).length;
      const entregas = funnelSourceOrders.filter((order) => isDispatchStatus(order)).length;

      return [
        { stage: 'Creada', count: funnelSourceOrders.length, color: 'slate' },
        { stage: 'WIP', count: wip, color: 'amber' },
        { stage: 'Diagnóstico', count: diagnostico, color: 'blue' },
        { stage: 'Reparación', count: reparacion, color: 'indigo' },
        { stage: 'QA', count: qa, color: 'emerald' },
        { stage: 'Entrega', count: entregas, color: 'cyan' },
      ];
    }

    return FUNNEL_DATA.map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * filterFactor)) }));
  }, [hasLiveData, funnelSourceOrders, filterFactor]);

  const funnelEquipmentList = useMemo(() => {
    if (!funnelSourceOrders.length) return [];

    return funnelSourceOrders
      .filter((order) => matchesFunnelStage(order, selectedFunnelStage))
      .slice(0, 12)
      .map((order) => ({
        id: order?.id,
        number: order?.number || 'Sin número',
        team: order?.asset?.title || 'Equipo sin nombre',
        brand: extractBrandFromOrder(order),
        group: extractProductGroupFromOrder(order),
        status: order?.status?.name || 'Sin estatus',
      }));
  }, [funnelSourceOrders, selectedFunnelStage]);

  const filteredAreaVolumeData = useMemo(() => {
    if (hasLiveData) {
      const areas = { 'Logística': 0, 'Taller': 0, 'QA': 0, 'Bodega': 0 };

      filteredOrders.forEach((order) => {
        const status = normalizeText(order?.status?.name);
        if (status.includes('PARTES')) areas['Bodega'] += 1;
        else if (status.includes('CALIDAD') || status.includes('VALIDACION') || status.includes('QA')) areas['QA'] += 1;
        else if (status.includes('DIAGNOSTICO') || status.includes('REPARACION') || status.includes('MANTENIMIENTO')) areas['Taller'] += 1;
        else areas['Logística'] += 1;
      });

      return Object.entries(areas).map(([name, cases]) => ({ name, cases }));
    }

    return AREA_VOLUME_DATA.map((item) => ({ ...item, cases: Math.max(1, Math.round(item.cases * filterFactor)) }));
  }, [hasLiveData, filteredOrders, filterFactor]);

  const filteredGroupVolumeData = useMemo(() => {
    if (hasLiveData) {
      const grouped = filteredOrders.reduce((acc, order) => {
        const group = extractProductGroupFromOrder(order);
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const data = Object.entries(grouped)
        .map(([group, qty]) => ({ group, qty }))
        .sort((a, b) => b.qty - a.qty);

      if (selectedProduct !== 'ALL') {
        const selectedNormalized = normalizeText(selectedProduct);
        const matching = data.filter((item) => {
          const groupNormalized = normalizeText(item.group);
          return groupNormalized.includes(selectedNormalized) || selectedNormalized.includes(groupNormalized);
        });
        return matching.length ? matching : data.slice(0, 6);
      }

      return data.slice(0, 6);
    }

    return [
      { group: 'Smartphones', qty: Math.round(120 * filterFactor) },
      { group: 'Laptops', qty: Math.round(45 * filterFactor) },
      { group: 'Tablets', qty: Math.round(30 * filterFactor) },
      { group: 'Wearables', qty: Math.round(25 * filterFactor) },
      { group: 'Audio', qty: Math.round(20 * filterFactor) },
      { group: 'Otros', qty: Math.round(15 * filterFactor) },
    ];
  }, [hasLiveData, filteredOrders, filterFactor, selectedProduct]);

  const availableTechnicianMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const monthKey = (order?.created_at || '').slice(0, 7);
      if (!monthKey || monthMap.has(monthKey)) return;
      monthMap.set(monthKey, formatMonthLabel(monthKey));
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableTechnicianDays = useMemo(() => {
    const sourceOrders = selectedTechnicianMonth === 'ALL'
      ? scopedOrders
      : scopedOrders.filter((order) => (order?.created_at || '').slice(0, 7) === selectedTechnicianMonth);

    const dayMap = new Map<string, string>();

    sourceOrders.forEach((order) => {
      const dayKey = (order?.created_at || '').slice(0, 10);
      if (!dayKey || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders, selectedTechnicianMonth]);

  useEffect(() => {
    if (selectedTechnicianMonth !== 'ALL' && !availableTechnicianMonths.some((month) => month.value === selectedTechnicianMonth)) {
      setSelectedTechnicianMonth('ALL');
    }
  }, [availableTechnicianMonths, selectedTechnicianMonth]);

  useEffect(() => {
    if (selectedTechnicianDay !== 'ALL' && !availableTechnicianDays.some((day) => day.value === selectedTechnicianDay)) {
      setSelectedTechnicianDay('ALL');
    }
  }, [availableTechnicianDays, selectedTechnicianDay]);

  const technicianFilteredOrders = useMemo(() => {
    let data = scopedOrders;

    if (selectedTechnicianMonth !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 7) === selectedTechnicianMonth);
    }

    if (selectedTechnicianDay !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 10) === selectedTechnicianDay);
    }

    return data;
  }, [scopedOrders, selectedTechnicianMonth, selectedTechnicianDay]);

  const technicianOrders = useMemo(() => {
    if (selectedTechnician === 'ALL') return technicianFilteredOrders;
    const selectedNormalized = normalizeText(selectedTechnician);
    return technicianFilteredOrders.filter((order) => normalizeText(extractTechnicianFromOrder(order)) === selectedNormalized);
  }, [technicianFilteredOrders, selectedTechnician]);

  const technicianRankingData = useMemo(() => {
    if (hasLiveData) {
      const grouped = technicianOrders.reduce((acc, order) => {
        const name = extractTechnicianFromOrder(order);
        const statusName = normalizeText(order?.status?.name);

        if (!acc[name]) {
          acc[name] = { name, os: 0, repairs: 0, qc: 0, hours: 0, ftf: 0, dispatches: 0 };
        }

        acc[name].os += 1;
        acc[name].hours += getOrderProcessingHours(order);

        if (isTechnicianRepairCompletedStatus(statusName)) acc[name].repairs += 1;
        if (isQaStatus(statusName)) acc[name].qc += 1;

        if (isDispatchStatus(order)) acc[name].dispatches += 1;
        return acc;
      }, {} as Record<string, { name: string; os: number; repairs: number; qc: number; hours: number; ftf: number; dispatches: number }>);

      return Object.values(grouped)
        .map((item) => ({
          ...item,
          hours: Number((item.hours / Math.max(item.os, 1)).toFixed(1)),
          ftf: item.os ? Math.round((item.dispatches / item.os) * 100) : 0,
        }))
        .sort((a, b) => (b.repairs + b.qc) - (a.repairs + a.qc))
        .slice(0, 10);
    }

    return (selectedTechnician === 'ALL' ? TECHNICIANS : TECHNICIANS.filter((tech) => tech.name === selectedTechnician)).map((tech) => ({
      ...tech,
      dispatches: Math.round((tech.os * tech.ftf) / 100),
    }));
  }, [hasLiveData, technicianOrders, selectedTechnician]);

  const technicianSummary = useMemo(() => {
    const totalOs = technicianRankingData.reduce((sum, item) => sum + item.os, 0);
    const totalRepairs = technicianRankingData.reduce((sum, item) => sum + item.repairs, 0);
    const totalDispatches = technicianRankingData.reduce((sum, item) => sum + item.dispatches, 0);
    const weightedHours = technicianRankingData.reduce((sum, item) => sum + item.hours * item.os, 0);
    const weightedFtf = technicianRankingData.reduce((sum, item) => sum + item.ftf * item.os, 0);
    const avgHours = totalOs ? weightedHours / totalOs : 0;
    const avgDays = avgHours / 24;
    const activeDays = Math.max(new Set(technicianOrders.map((order) => (order?.created_at || '').slice(0, 10)).filter(Boolean)).size, 1);

    return {
      tatHours: `${avgHours.toFixed(1)}h`,
      tatDays: `${avgDays.toFixed(2)} días`,
      productivity: technicianRankingData.length ? (totalRepairs / technicianRankingData.length).toFixed(1) : '0.0',
      productivityDaily: `${(totalRepairs / activeDays).toFixed(1)} eq/día`,
      ftf: `${totalOs ? Math.round(weightedFtf / totalOs) : 0}%`,
      delivered: totalDispatches,
    };
  }, [technicianOrders, technicianRankingData]);

  const technicianReportRows = useMemo(() => {
    const names = selectedTechnician === 'ALL'
      ? Array.from(new Set([...Object.values(EXECUTOR_ALIASES), ...technicianRankingData.map((item) => item.name)])).sort((a, b) => a.localeCompare(b))
      : [selectedTechnician];

    return names.map((name) => {
      const relatedOrders = technicianFilteredOrders.filter((order) => extractTechnicianFromOrder(order) === name);
      const closedOrders = scopedOrders.filter((order) => {
        if (extractTechnicianFromOrder(order) !== name) return false;
        if (!isDispatchStatus(order)) return false;

        const completedAt = order?.done_at || order?.closed_at || order?.created_at;
        if (selectedTechnicianMonth !== 'ALL' && (completedAt || '').slice(0, 7) !== selectedTechnicianMonth) return false;
        if (selectedTechnicianDay !== 'ALL' && (completedAt || '').slice(0, 10) !== selectedTechnicianDay) return false;

        return isCustomMonthRangeActive
          ? isWithinMonthRange(completedAt, selectedStartMonth, selectedEndMonth)
          : true;
      });

      const diagnosticos = relatedOrders.filter((order) => normalizeText(order?.status?.name).includes('DIAGNOSTICO')).length;
      const reparaciones = relatedOrders.filter((order) => {
        const status = normalizeText(order?.status?.name);
        return isTechnicianRepairCompletedStatus(status);
      }).length;
      const noReparado = relatedOrders.filter((order) => isTechnicianNotRepairedStatus(normalizeText(order?.status?.name))).length;
      const controlesQc = relatedOrders.filter((order) => isQaStatus(normalizeText(order?.status?.name))).length;
      const cerrada = closedOrders.length;
      const wip = relatedOrders.filter((order) => !isDispatchStatus(order)).length;
      const slaMet = relatedOrders.filter((order) => {
        if (!order?.due_date) return false;
        const dueDate = new Date(order.due_date);
        const checkDate = new Date(order?.done_at || order?.closed_at || order?.modified_at || Date.now());
        return checkDate.getTime() <= dueDate.getTime();
      }).length;
      const creatorOwner = Object.entries(
        relatedOrders.reduce((acc, order) => {
          const creator = extractCreatorFromOrder(order);
          acc[creator] = (acc[creator] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin creador';
      const closingOwner = Object.entries(
        closedOrders.reduce((acc, order) => {
          const closer = extractClosingUserFromOrder(order);
          acc[closer] = (acc[closer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pendiente';
      const sla = relatedOrders.length ? `${Math.round((slaMet / relatedOrders.length) * 100)}%` : '0%';

      return {
        name,
        osAsignada: relatedOrders.length,
        diagnosticos,
        reparaciones,
        noReparado,
        controlesQc,
        wip,
        sla,
        cerrada,
        creatorOwner,
        closingOwner,
      };
    });
  }, [
    technicianRankingData,
    technicianFilteredOrders,
    scopedOrders,
    selectedTechnician,
    selectedTechnicianMonth,
    selectedTechnicianDay,
    isCustomMonthRangeActive,
    selectedStartMonth,
    selectedEndMonth,
  ]);

  const weeklyRepairedRows = useMemo(() => {
    const grouped = new Map<string, { week: string; repaired: number; qc: number; closed: number }>();

    technicianOrders.forEach((order) => {
      const bucket = getWeekBucket(order?.created_at);
      if (!bucket) return;

      const status = normalizeText(order?.status?.name);
      if (!grouped.has(bucket.value)) {
        grouped.set(bucket.value, { week: bucket.label, repaired: 0, qc: 0, closed: 0 });
      }

      const row = grouped.get(bucket.value)!;
      if (isTechnicianRepairCompletedStatus(status)) row.repaired += 1;
      if (isQaStatus(status)) row.qc += 1;
      if (isDispatchStatus(order)) row.closed += 1;
    });

    let accumulated = 0;

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => {
        accumulated += row.repaired + row.closed;
        return {
          ...row,
          accumulated,
        };
      });
  }, [technicianOrders]);

  const backofficeMonthColumns = useMemo(() => {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), 0, 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    let start = selectedStartMonth
      ? new Date(`${selectedStartMonth.length === 7 ? `${selectedStartMonth}-01` : selectedStartMonth}T00:00:00`)
      : defaultStart;
    let end = selectedEndMonth
      ? new Date(`${selectedEndMonth.length === 7 ? `${selectedEndMonth}-01` : selectedEndMonth}T00:00:00`)
      : defaultEnd;

    if (Number.isNaN(start.getTime())) start = defaultStart;
    if (Number.isNaN(end.getTime())) end = defaultEnd;

    if (start.getTime() > end.getTime()) {
      const swap = start;
      start = end;
      end = swap;
    }

    const months: Array<{ value: string; label: string }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor.getTime() <= end.getTime()) {
      const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  }, [selectedStartMonth, selectedEndMonth]);

  const backofficeOrders = useMemo(() => {
    const firstMonth = backofficeMonthColumns[0]?.value || '';
    const lastMonth = backofficeMonthColumns[backofficeMonthColumns.length - 1]?.value || '';

    return scopedOrders.filter((order) => isWithinMonthRange(order?.created_at, firstMonth, lastMonth));
  }, [scopedOrders, backofficeMonthColumns]);

  const availableChannelMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const monthKey = (order?.created_at || '').slice(0, 7);
      if (!monthKey || monthMap.has(monthKey)) return;
      monthMap.set(monthKey, formatMonthLabel(monthKey));
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableChannelDays = useMemo(() => {
    const sourceOrders = selectedChannelMonth === 'ALL'
      ? scopedOrders
      : scopedOrders.filter((order) => (order?.created_at || '').slice(0, 7) === selectedChannelMonth);

    const dayMap = new Map<string, string>();

    sourceOrders.forEach((order) => {
      const dayKey = (order?.created_at || '').slice(0, 10);
      if (!dayKey || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders, selectedChannelMonth]);

  useEffect(() => {
    if (selectedChannelMonth !== 'ALL' && !availableChannelMonths.some((month) => month.value === selectedChannelMonth)) {
      setSelectedChannelMonth('ALL');
    }
  }, [availableChannelMonths, selectedChannelMonth]);

  useEffect(() => {
    if (selectedChannelDay !== 'ALL' && !availableChannelDays.some((day) => day.value === selectedChannelDay)) {
      setSelectedChannelDay('ALL');
    }
  }, [availableChannelDays, selectedChannelDay]);

  const channelFilteredOrders = useMemo(() => {
    let data = scopedOrders;

    if (selectedChannelMonth !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 7) === selectedChannelMonth);
    }

    if (selectedChannelDay !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 10) === selectedChannelDay);
    }

    return data;
  }, [scopedOrders, selectedChannelMonth, selectedChannelDay]);

  const backofficeChannelRows = useMemo(() => {
    const rows = new Map<string, { channel: string; total: number }>();

    channelFilteredOrders.forEach((order) => {
      const channel = extractEntryChannel(order);

      if (!rows.has(channel)) {
        rows.set(channel, { channel, total: 0 });
      }

      const row = rows.get(channel)!;
      row.total += 1;
    });

    const grandTotal = channelFilteredOrders.length;

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        pct: grandTotal ? Number(((row.total / grandTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [channelFilteredOrders]);

  const availableServiceMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const monthKey = (order?.created_at || '').slice(0, 7);
      if (!monthKey || monthMap.has(monthKey)) return;
      monthMap.set(monthKey, formatMonthLabel(monthKey));
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableServiceDays = useMemo(() => {
    const sourceOrders = selectedServiceMonth === 'ALL'
      ? scopedOrders
      : scopedOrders.filter((order) => (order?.created_at || '').slice(0, 7) === selectedServiceMonth);

    const dayMap = new Map<string, string>();

    sourceOrders.forEach((order) => {
      const dayKey = (order?.created_at || '').slice(0, 10);
      if (!dayKey || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders, selectedServiceMonth]);

  useEffect(() => {
    if (selectedServiceMonth !== 'ALL' && !availableServiceMonths.some((month) => month.value === selectedServiceMonth)) {
      setSelectedServiceMonth('ALL');
    }
  }, [availableServiceMonths, selectedServiceMonth]);

  useEffect(() => {
    if (selectedServiceDay !== 'ALL' && !availableServiceDays.some((day) => day.value === selectedServiceDay)) {
      setSelectedServiceDay('ALL');
    }
  }, [availableServiceDays, selectedServiceDay]);

  const serviceFilteredOrders = useMemo(() => {
    let data = scopedOrders;

    if (selectedServiceMonth !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 7) === selectedServiceMonth);
    }

    if (selectedServiceDay !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 10) === selectedServiceDay);
    }

    return data;
  }, [scopedOrders, selectedServiceMonth, selectedServiceDay]);

  const backofficeServiceRows = useMemo(() => {
    const rows = new Map<string, { service: string; total: number }>();

    serviceFilteredOrders.forEach((order) => {
      const service = normalizeServiceType(order?.order_type?.name);

      if (!rows.has(service)) {
        rows.set(service, { service, total: 0 });
      }

      const row = rows.get(service)!;
      row.total += 1;
    });

    const grandTotal = serviceFilteredOrders.length;

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        pct: grandTotal ? Number(((row.total / grandTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [serviceFilteredOrders]);

  const availableCreatorMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const monthKey = (order?.created_at || '').slice(0, 7);
      if (!monthKey || monthMap.has(monthKey)) return;
      monthMap.set(monthKey, formatMonthLabel(monthKey));
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableCreatorDays = useMemo(() => {
    const sourceOrders = selectedCreatorMonth === 'ALL'
      ? scopedOrders
      : scopedOrders.filter((order) => (order?.created_at || '').slice(0, 7) === selectedCreatorMonth);

    const dayMap = new Map<string, string>();

    sourceOrders.forEach((order) => {
      const dayKey = (order?.created_at || '').slice(0, 10);
      if (!dayKey || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders, selectedCreatorMonth]);

  useEffect(() => {
    if (selectedCreatorMonth !== 'ALL' && !availableCreatorMonths.some((month) => month.value === selectedCreatorMonth)) {
      setSelectedCreatorMonth('ALL');
    }
  }, [availableCreatorMonths, selectedCreatorMonth]);

  useEffect(() => {
    if (selectedCreatorDay !== 'ALL' && !availableCreatorDays.some((day) => day.value === selectedCreatorDay)) {
      setSelectedCreatorDay('ALL');
    }
  }, [availableCreatorDays, selectedCreatorDay]);

  const creatorFilteredOrders = useMemo(() => {
    let data = scopedOrders;

    if (selectedCreatorMonth !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 7) === selectedCreatorMonth);
    }

    if (selectedCreatorDay !== 'ALL') {
      data = data.filter((order) => (order?.created_at || '').slice(0, 10) === selectedCreatorDay);
    }

    return data;
  }, [scopedOrders, selectedCreatorMonth, selectedCreatorDay]);

  const availableBodegaMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    scopedOrders.forEach((order) => {
      const monthKey = getBodegaEventDate(order).slice(0, 7);
      if (!monthKey || monthMap.has(monthKey)) return;
      monthMap.set(monthKey, formatMonthLabel(monthKey));
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [scopedOrders]);

  const availableBodegaBrands = useMemo(() => {
    const brandSet = new Set<string>();

    scopedOrders.forEach((order) => {
      const brand = extractBrandFromOrder(order);
      if (brand && brand !== 'Sin Marca') brandSet.add(brand);
    });

    return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
  }, [scopedOrders]);

  const bodegaBrandScopedOrders = useMemo(() => {
    return selectedBodegaBrand === 'ALL'
      ? scopedOrders
      : scopedOrders.filter((order) => normalizeText(extractBrandFromOrder(order)) === normalizeText(selectedBodegaBrand));
  }, [scopedOrders, selectedBodegaBrand]);

  const availableBodegaGroups = useMemo(() => {
    const groupSet = new Set<string>();

    bodegaBrandScopedOrders.forEach((order) => {
      const group = extractProductGroupFromOrder(order);
      if (group && group !== 'Sin Grupo') groupSet.add(group);
    });

    return Array.from(groupSet).sort((a, b) => a.localeCompare(b));
  }, [bodegaBrandScopedOrders]);

  const bodegaGroupScopedOrders = useMemo(() => {
    if (selectedBodegaGroup === 'ALL') return bodegaBrandScopedOrders;

    const selectedGroup = normalizeText(selectedBodegaGroup);
    return bodegaBrandScopedOrders.filter((order) => {
      const group = normalizeText(extractProductGroupFromOrder(order));
      return group === selectedGroup || group.includes(selectedGroup) || selectedGroup.includes(group);
    });
  }, [bodegaBrandScopedOrders, selectedBodegaGroup]);

  const availableBodegaModels = useMemo(() => {
    const modelSet = new Set<string>();

    bodegaGroupScopedOrders.forEach((order) => {
      const model = extractModelFromOrder(order);
      if (model && model !== 'Sin Modelo') modelSet.add(model);
    });

    return Array.from(modelSet).sort((a, b) => a.localeCompare(b));
  }, [bodegaGroupScopedOrders]);

  const availableBodegaDays = useMemo(() => {
    const sourceOrders = selectedBodegaMonth === 'ALL'
      ? bodegaGroupScopedOrders
      : bodegaGroupScopedOrders.filter((order) => getBodegaEventDate(order).slice(0, 7) === selectedBodegaMonth);

    const dayMap = new Map<string, string>();

    sourceOrders.forEach((order) => {
      const dayKey = getBodegaEventDate(order).slice(0, 10);
      if (!dayKey || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, formatDateKeyLabel(dayKey, true));
    });

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [bodegaGroupScopedOrders, selectedBodegaMonth]);
  useEffect(() => {
    if (selectedBodegaMonth !== 'ALL' && !availableBodegaMonths.some((month) => month.value === selectedBodegaMonth)) {
      setSelectedBodegaMonth('ALL');
    }
  }, [availableBodegaMonths, selectedBodegaMonth]);

  useEffect(() => {
    if (selectedBodegaDay !== 'ALL' && !availableBodegaDays.some((day) => day.value === selectedBodegaDay)) {
      setSelectedBodegaDay('ALL');
    }
  }, [availableBodegaDays, selectedBodegaDay]);

  useEffect(() => {
    if (selectedBodegaBrand !== 'ALL' && !availableBodegaBrands.includes(selectedBodegaBrand)) {
      setSelectedBodegaBrand('ALL');
    }
  }, [availableBodegaBrands, selectedBodegaBrand]);

  useEffect(() => {
    if (selectedBodegaGroup !== 'ALL' && !availableBodegaGroups.includes(selectedBodegaGroup)) {
      setSelectedBodegaGroup('ALL');
    }
  }, [availableBodegaGroups, selectedBodegaGroup]);

  useEffect(() => {
    if (selectedBodegaModel !== 'ALL' && !availableBodegaModels.includes(selectedBodegaModel)) {
      setSelectedBodegaModel('ALL');
    }
  }, [availableBodegaModels, selectedBodegaModel]);

  const bodegaFilteredOrders = useMemo(() => {
    let data = bodegaGroupScopedOrders;

    if (selectedBodegaModel !== 'ALL') {
      const selectedModel = normalizeText(selectedBodegaModel);
      data = data.filter((order) => normalizeText(extractModelFromOrder(order)) === selectedModel);
    }

    if (selectedBodegaMonth !== 'ALL') {
      data = data.filter((order) => getBodegaEventDate(order).slice(0, 7) === selectedBodegaMonth);
    }

    if (selectedBodegaDay !== 'ALL') {
      data = data.filter((order) => getBodegaEventDate(order).slice(0, 10) === selectedBodegaDay);
    }

    return data;
  }, [bodegaGroupScopedOrders, selectedBodegaModel, selectedBodegaMonth, selectedBodegaDay]);

  const backofficeCreatorRows = useMemo(() => {
    const rows = new Map<string, { user: string; ingresos: number; despachos: number; wip: number }>();

    creatorFilteredOrders.forEach((order) => {
      const user = extractCreatorFromOrder(order);
      if (user === 'Sin creador') return;

      if (!rows.has(user)) {
        rows.set(user, { user, ingresos: 0, despachos: 0, wip: 0 });
      }

      const row = rows.get(user)!;
      row.ingresos += 1;
      if (isDispatchStatus(order)) row.despachos += 1;
      else row.wip += 1;
    });

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        cumplimiento: row.ingresos ? `${Math.round((row.despachos / row.ingresos) * 100)}%` : '0%',
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 20);
  }, [creatorFilteredOrders]);

  const ordersWithinSla = useMemo(() => {
    return slaScopedOrders.filter((order) => getLateReason(order) === 'En SLA').length;
  }, [slaScopedOrders]);

  const ordersOutsideSla = useMemo(() => {
    return slaScopedOrders.filter((order) => {
      const reason = getLateReason(order);
      return reason !== 'En SLA' && reason !== 'Sin SLA';
    }).length;
  }, [slaScopedOrders]);

  const speedGaugeData = useMemo(() => {
    return [
      { name: 'En SLA', value: ordersWithinSla },
      { name: 'Fuera SLA', value: ordersOutsideSla },
    ];
  }, [ordersWithinSla, ordersOutsideSla]);

  const tatByTechnicianCards = useMemo(() => {
    return technicianRankingData.slice(0, 4).map((item) => ({
      name: item.name,
      tat: `${item.hours}h`,
      repaired: item.repairs + item.qc,
      sla: item.ftf,
    }));
  }, [technicianRankingData]);

  const technicianProductivitySlaData = useMemo(() => {
    return technicianRankingData.slice(0, 8).map((item) => {
      const relatedOrders = filteredOrders.filter((order) => extractTechnicianFromOrder(order) === item.name);
      const inSla3 = relatedOrders.filter((order) => getOrderProcessingDays(order) <= 3).length;
      const inSla5 = relatedOrders.filter((order) => {
        const days = getOrderProcessingDays(order);
        return days > 3 && days <= 5;
      }).length;
      const outSla7 = relatedOrders.filter((order) => getOrderProcessingDays(order) > 7).length;

      return {
        name: item.name,
        Reparadas: item.repairs + item.qc,
        'SLA ≤3d': inSla3,
        'SLA 3-5d': inSla5,
        'Fuera +7d': outSla7,
      };
    });
  }, [technicianRankingData, filteredOrders]);

  const bodegaTrackingSummary = useMemo(() => {
    if (hasLiveData) {
      const relevantOrders = bodegaFilteredOrders.filter((order) => {
        const status = normalizeText(order?.status?.name);
        return hasProductDispatch(order) || isNoteCreditCase(order) || status.includes('PARTES') || status.includes('REPUEST');
      });

      const skuMap = new Map<string, { sku: string; total: number; dispatched: number; waiting: number; orders: number }>();
      let ordersWithProducts = 0;
      let totalUnits = 0;
      let dispatchedUnits = 0;
      let dispatchedOrders = 0;
      let noteCreditOrders = 0;
      const partsLeadSamples: number[] = [];

      relevantOrders.forEach((order) => {
        const status = normalizeText(order?.status?.name);
        const waiting = status.includes('PARTES') || status.includes('REPUEST');
        const dispatched = hasProductDispatch(order);
        const noteCredit = isNoteCreditCase(order);
        let entries = extractProductEntriesFromOrder(order);

        if (!entries.length && dispatched) {
          const fallbackName = extractDispatchTrackingLabel(order);
          entries = fallbackName ? [{ name: fallbackName, quantity: 1 }] : [];
        }

        if (dispatched) {
          ordersWithProducts += 1;
          dispatchedOrders += 1;
        }

        if (noteCredit) noteCreditOrders += 1;

        const stageDays = getStageDurations(order).repuestos;
        if (dispatched && stageDays > 0) partsLeadSamples.push(stageDays);

        if (!entries.length) return;

        entries.forEach((entry) => {
          totalUnits += entry.quantity;
          if (dispatched) dispatchedUnits += entry.quantity;

          if (!skuMap.has(entry.name)) {
            skuMap.set(entry.name, { sku: entry.name, total: 0, dispatched: 0, waiting: 0, orders: 0 });
          }

          const row = skuMap.get(entry.name)!;
          row.total += entry.quantity;
          row.orders += 1;
          if (dispatched) row.dispatched += entry.quantity;
          if (waiting) row.waiting += entry.quantity;
        });
      });

      const avgLeadDays = partsLeadSamples.length
        ? Number((partsLeadSamples.reduce((sum, item) => sum + item, 0) / partsLeadSamples.length).toFixed(1))
        : 0;

      const topSkuRows = Array.from(skuMap.values())
        .map((row) => ({
          ...row,
          pct: totalUnits ? Number(((row.total / totalUnits) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return {
        skuTracked: skuMap.size,
        ordersWithProducts,
        totalUnits,
        dispatchedUnits,
        dispatchedOrders,
        noteCreditOrders,
        avgLeadDays,
        waitingOrders: bodegaFilteredOrders.filter((order) => {
          const status = normalizeText(order?.status?.name);
          return status.includes('PARTES') || status.includes('REPUEST');
        }).length,
        fillRate: totalUnits ? Number(((dispatchedUnits / totalUnits) * 100).toFixed(1)) : 0,
        topSkuRows,
        chartData: topSkuRows.slice(0, 8).map((row) => ({
          label: row.sku.length > 42 ? `${row.sku.slice(0, 42)}…` : row.sku,
          fullName: row.sku,
          Despachado: row.dispatched,
          'En espera': row.waiting,
        })),
      };
    }

    const topSkuRows = WOS_SKU_DATA.map((item) => ({
      sku: item.sku,
      total: Math.max(1, Math.round(item.wos * 4)),
      dispatched: Math.max(1, Math.round(item.wos * 3)),
      waiting: item.wos < 2 ? 2 : 0,
      orders: Math.max(1, Math.round(item.wos * 2)),
      pct: 0,
    }));
    const totalUnits = topSkuRows.reduce((sum, item) => sum + item.total, 0);

    return {
      skuTracked: topSkuRows.length,
      ordersWithProducts: Math.round(18 * filterFactor),
      totalUnits,
      dispatchedUnits: topSkuRows.reduce((sum, item) => sum + item.dispatched, 0),
      dispatchedOrders: Math.round(16 * filterFactor),
      noteCreditOrders: Math.round(6 * filterFactor),
      avgLeadDays: 3.2,
      waitingOrders: Math.round(24 * filterFactor),
      fillRate: 91.5,
      topSkuRows: topSkuRows.map((row) => ({ ...row, pct: totalUnits ? Number(((row.total / totalUnits) * 100).toFixed(1)) : 0 })),
      chartData: topSkuRows.map((row) => ({ label: row.sku, fullName: row.sku, Despachado: row.dispatched, 'En espera': row.waiting })),
    };
  }, [hasLiveData, bodegaFilteredOrders, filterFactor]);

  const bodegaMonthlyDispatchData = useMemo(() => {
    const source = bodegaFilteredOrders.filter((order) => hasProductDispatch(order) || isNoteCreditCase(order));
    const useDayView = selectedBodegaDay !== 'ALL' || selectedBodegaMonth !== 'ALL';
    const rows = new Map<string, { period: string; Despachos: number; 'Nota de crédito': number }>();

    source.forEach((order) => {
      const eventDate = getBodegaEventDate(order);
      const key = useDayView ? eventDate.slice(0, 10) : eventDate.slice(0, 7);
      if (!key) return;

      if (!rows.has(key)) {
        rows.set(key, {
          period: useDayView ? formatDateKeyLabel(key, true) : formatMonthLabel(key),
          Despachos: 0,
          'Nota de crédito': 0,
        });
      }

      const row = rows.get(key)!;
      if (hasProductDispatch(order)) row.Despachos += 1;
      if (isNoteCreditCase(order)) row['Nota de crédito'] += 1;
    });

    let acumulado = 0;
    return Array.from(rows.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => {
        acumulado += row.Despachos;
        return {
          ...row,
          Acumulado: acumulado,
        };
      });
  }, [bodegaFilteredOrders, selectedBodegaMonth, selectedBodegaDay]);

  const bodegaDispatchHistory = useMemo(() => {
    if (hasLiveData) {
      return bodegaFilteredOrders
        .filter((order) => hasProductDispatch(order) || (isNoteCreditCase(order) && !hasProductDispatch(order)))
        .sort((a, b) => new Date(getBodegaEventDate(b)).getTime() - new Date(getBodegaEventDate(a)).getTime())
        .slice(0, 20)
        .map((order) => ({
          number: order?.number || `OS-${order?.id || 'SN'}`,
          date: formatDateTime(getBodegaEventDate(order)),
          product: hasProductDispatch(order) ? extractDispatchTrackingLabel(order) : 'Sin pieza despachada',
          equipment: cleanDispatchLabel(order?.asset?.title || order?.name || 'Equipo sin nombre'),
          status: order?.status?.name || 'Sin estado',
          technician: extractTechnicianFromOrder(order),
          leadTime: getStageDurations(order).repuestos > 0 ? `${getStageDurations(order).repuestos.toFixed(1)} d` : 'n/d',
        }));
    }

    return [
      { number: 'TCGT-53101', date: '15/04/2026 10:15', product: 'Screen iP 15', equipment: 'iPhone 15', status: 'Despachado', technician: 'Alejandra P.', leadTime: '2.1 d' },
      { number: 'TCGT-53100', date: '15/04/2026 09:48', product: 'Batt S24 Ultra', equipment: 'Samsung S24 Ultra', status: 'Nota de crédito', technician: 'Steven Obed', leadTime: 'n/d' },
      { number: 'TCGT-53098', date: '14/04/2026 16:21', product: 'Flex iP 13', equipment: 'iPhone 13', status: 'Despachado', technician: 'Laura Esther', leadTime: '3.0 d' },
    ];
  }, [hasLiveData, bodegaFilteredOrders]);

  const bodegaNoteCreditRows = useMemo(() => {
    if (hasLiveData) {
      return bodegaFilteredOrders
        .filter((order) => isNoteCreditCase(order))
        .sort((a, b) => new Date(getBodegaEventDate(b)).getTime() - new Date(getBodegaEventDate(a)).getTime())
        .slice(0, 15)
        .map((order) => {
          const model = extractModelFromOrder(order);
          const partCodes = extractPartCodesFromOrder(order);
          return {
            os: order?.number || `OS-${order?.id || 'SN'}`,
            brand: extractBrandFromOrder(order),
            model,
            sku: extractSkuFromModelText(model),
            partsCodes: partCodes.length ? partCodes.join(' / ') : 'Sin código',
          };
        });
    }

    return [
      { os: 'TCGT-53100', brand: 'Samsung', model: 'Samsung S24 Ultra', sku: 'Sin SKU', partsCodes: '581019ALEDG00 / 560019016U00' },
      { os: 'TCGT-53091', brand: 'Xiaomi', model: 'Redmi Note 14', sku: 'Sin SKU', partsCodes: '23026RN54G' },
    ];
  }, [hasLiveData, bodegaFilteredOrders]);

  const claimsRegistryEntries = useMemo(() => {
    return xiaomiRegistryInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        rawLine: line,
        status: classifyXiaomiPortalStatus(line),
        tokens: parseXiaomiRegistryTokens(line),
      }))
      .filter((entry) => entry.tokens.length > 0);
  }, [xiaomiRegistryInput]);

  const claimsRegistryTokens = useMemo(
    () => Array.from(new Set(claimsRegistryEntries.flatMap((entry) => entry.tokens))),
    [claimsRegistryEntries]
  );

  const claimsRegistryLookup = useMemo(() => {
    const map = new Map<string, string>();

    claimsRegistryEntries.forEach((entry) => {
      entry.tokens.forEach((token) => {
        const current = map.get(token);
        if (!current || entry.status === 'Cerrado en portal') {
          map.set(token, entry.status);
        }
      });
    });

    return map;
  }, [claimsRegistryEntries]);

  const claimsClosedPhoneOrders = useMemo(() => {
    return ordersData
      .filter((order) => {
        if (!isPhoneClaimOrder(order)) return false;
        if (selectedSede !== 'ALL' && extractSedeFromOrder(order) !== selectedSede) return false;

        const referenceDate = order?.closed_at || order?.done_at || order?.modified_at || order?.created_at;
        if (isCustomMonthRangeActive) {
          return isWithinMonthRange(referenceDate, selectedStartMonth, selectedEndMonth);
        }

        return isWithinSelectedRange(referenceDate, selectedDateRange);
      })
      .filter((order) => Boolean(order?.closed_at || order?.done_at || isDispatchStatus(order) || isNoteCreditCase(order)));
  }, [ordersData, selectedSede, isCustomMonthRangeActive, selectedStartMonth, selectedEndMonth, selectedDateRange]);

  const claimsValidationBaseRows = useMemo(() => {
    return claimsClosedPhoneOrders
      .slice()
      .sort((a, b) => new Date(getBodegaEventDate(b)).getTime() - new Date(getBodegaEventDate(a)).getTime())
      .map((order) => {
        const series = extractSeriesFromOrder(order);
        const identifierCandidates = getClaimIdentifierCandidates(order);
        const lookupTokens = Array.from(new Set(identifierCandidates.flatMap((value) => getClaimTokenVariants(value))));
        const matchedToken = lookupTokens.find((token) => claimsRegistryLookup.has(token));
        const portalStatus = matchedToken ? claimsRegistryLookup.get(matchedToken) || 'Reportado en Xiaomi' : null;
        const noteCredit = isNoteCreditCase(order);

        const closedAtValue = order?.closed_at || order?.done_at || order?.modified_at || order?.created_at;

        return {
          os: order?.number || `OS-${order?.id || 'SN'}`,
          closedAt: formatDateTime(closedAtValue),
          closedAtValue,
          brand: extractBrandFromOrder(order),
          model: extractModelFromOrder(order),
          series: series || 'Sin serie',
          channel: extractEntryChannel(order),
          outcome: noteCredit ? 'Nota de crédito' : 'Cerrado',
          portalMatch: matchedToken || 'Sin match',
          validationStatus: portalStatus || (series ? 'Pendiente de carga' : 'Sin serie'),
        };
      })
      .sort((a, b) => {
        const priority = (value: string) => {
          if (value === 'Cerrado en portal') return 0;
          if (value === 'Reportado en Xiaomi') return 1;
          if (value === 'Pendiente de carga') return 2;
          return 3;
        };

        return priority(a.validationStatus) - priority(b.validationStatus)
          || new Date(b.closedAtValue || '').getTime() - new Date(a.closedAtValue || '').getTime();
      });
  }, [claimsClosedPhoneOrders, claimsRegistryLookup]);

  const claimsSummary = useMemo(() => {
    const total = claimsValidationBaseRows.length;
    const closedInPortal = claimsValidationBaseRows.filter((row) => row.validationStatus === 'Cerrado en portal').length;
    const reported = claimsValidationBaseRows.filter((row) => row.validationStatus === 'Reportado en Xiaomi').length;
    const pending = claimsValidationBaseRows.filter((row) => row.validationStatus === 'Pendiente de carga').length;
    const missingSeries = claimsValidationBaseRows.filter((row) => row.validationStatus === 'Sin serie').length;
    const noteCredit = claimsValidationBaseRows.filter((row) => row.outcome === 'Nota de crédito').length;
    const identifiable = total - missingSeries;
    const coverage = identifiable ? Number((((closedInPortal + reported) / identifiable) * 100).toFixed(1)) : 0;

    return { total, closedInPortal, reported, pending, missingSeries, noteCredit, coverage };
  }, [claimsValidationBaseRows]);

  const claimsTrendData = useMemo(() => {
    const grouped = claimsValidationBaseRows.reduce((acc, row) => {
      const date = row.closedAtValue ? new Date(row.closedAtValue) : null;
      const monthKey = !date || Number.isNaN(date.getTime()) ? 'SIN_FECHA' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey === 'SIN_FECHA' ? 'Sin fecha' : formatMonthLabel(monthKey), Cargados: 0, Pendientes: 0 };
      }

      if (row.validationStatus === 'Cerrado en portal' || row.validationStatus === 'Reportado en Xiaomi') acc[monthKey].Cargados += 1;
      else if (row.validationStatus === 'Pendiente de carga') acc[monthKey].Pendientes += 1;

      return acc;
    }, {} as Record<string, { month: string; Cargados: number; Pendientes: number }>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, value]) => value);
  }, [claimsValidationBaseRows]);

  const claimsStatusChartData = useMemo(() => ([
    { name: 'Cerrado portal', casos: claimsSummary.closedInPortal },
    { name: 'Reportado', casos: claimsSummary.reported },
    { name: 'Pendiente', casos: claimsSummary.pending },
    { name: 'Sin serie', casos: claimsSummary.missingSeries },
  ]), [claimsSummary]);

  const claimsFilteredRows = useMemo(() => {
    return claimsValidationBaseRows
      .filter((row) => {
        const matchesStatus =
          selectedClaimsStatus === 'ALL' ||
          (selectedClaimsStatus === 'CERRADO' && row.validationStatus === 'Cerrado en portal') ||
          (selectedClaimsStatus === 'REPORTADO' && row.validationStatus === 'Reportado en Xiaomi') ||
          (selectedClaimsStatus === 'PENDIENTE' && row.validationStatus === 'Pendiente de carga') ||
          (selectedClaimsStatus === 'SIN_SERIE' && row.validationStatus === 'Sin serie');

        const haystack = `${row.os} ${row.model} ${row.series} ${row.channel}`.toUpperCase();
        const matchesSearch = !claimsSearch.trim() || haystack.includes(claimsSearch.trim().toUpperCase());

        return matchesStatus && matchesSearch;
      })
      .slice(0, 30);
  }, [claimsValidationBaseRows, selectedClaimsStatus, claimsSearch]);

  const recentCriticalOrders = useMemo(() => {
    return filteredOrders
      .slice()
      .sort((a, b) => new Date(b?.created_at || '').getTime() - new Date(a?.created_at || '').getTime())
      .slice(0, 8)
      .map((order) => {
        const stages = getStageDurations(order);
        return {
          id: order?.id || order?.number,
          number: order?.number || `OS-${order?.id || 'SN'}`,
          createdAt: formatDateTime(order?.created_at),
          workflow: extractWorkflowFromOrder(order),
          status: order?.status?.name || 'Sin estado',
          creator: extractCreatorFromOrder(order),
          manager: extractManagerFromOrder(order),
          executor: extractTechnicianFromOrder(order),
          channel: extractEntryChannel(order),
          entryType: extractEntryType(order),
          warranty: extractWarrantyFromOrder(order),
          group: extractProductGroupFromOrder(order),
          brand: extractBrandFromOrder(order),
          service: extractServicesFromOrder(order),
          products: extractProductsFromOrder(order),
          completedAt: formatDateTime(order?.done_at || order?.closed_at),
          dueDate: formatDateTime(order?.due_date),
          resolutionDays: getOrderProcessingDays(order).toFixed(1),
          diagDays: stages.diagnostico.toFixed(1),
          approvalDays: stages.aprobacion.toFixed(1),
          partsDays: stages.repuestos.toFixed(1),
          repairDays: stages.reparacion.toFixed(1),
          qaDays: stages.qa.toFixed(1),
          lateReason: getLateReason(order),
          priority: getPriorityLabel(order),
          slaTarget: getSlaTargetDays(order)?.toFixed(1) || 'n/d',
          diagnosisTech: extractTechnicianFromOrder(order),
          partsCost: formatCurrency(getPartsCost(order)),
          orderRevenue: formatCurrency(getOrderRevenue(order)),
        };
      });
  }, [filteredOrders]);

  const recommendedFieldStatus = useMemo(() => {
    const hasHistory = filteredOrders.some((order) => getOrderHistoryEntries(order).length > 1);
    const hasCosts = filteredOrders.some((order) => getPartsCost(order) > 0 || getOrderRevenue(order) > 0);

    return [
      { field: 'Tiempo en diagnóstico', status: hasHistory ? 'Derivado' : 'Pendiente de historial', color: hasHistory ? 'emerald' : 'amber' },
      { field: 'Tiempo esperando aprobación', status: hasHistory ? 'Derivado' : 'Pendiente de historial', color: hasHistory ? 'emerald' : 'amber' },
      { field: 'Tiempo esperando repuestos', status: hasHistory ? 'Derivado' : 'Pendiente de historial', color: hasHistory ? 'emerald' : 'amber' },
      { field: 'Tiempo en reparación', status: hasHistory ? 'Derivado' : 'Pendiente de historial', color: hasHistory ? 'emerald' : 'amber' },
      { field: 'Tiempo en QA', status: hasHistory ? 'Derivado' : 'Pendiente de historial', color: hasHistory ? 'emerald' : 'amber' },
      { field: 'Razón fuera SLA', status: 'Calculada', color: 'blue' },
      { field: 'Prioridad', status: 'Calculada', color: 'blue' },
      { field: 'SLA objetivo', status: 'Calculado', color: 'blue' },
      { field: 'Técnico diagnóstico', status: 'Disponible', color: 'emerald' },
      { field: 'Costo repuestos', status: hasCosts ? 'Disponible parcial' : 'Pendiente financiero', color: hasCosts ? 'emerald' : 'amber' },
      { field: 'Ingreso por orden', status: hasCosts ? 'Disponible parcial' : 'Pendiente financiero', color: hasCosts ? 'emerald' : 'amber' },
    ];
  }, [filteredOrders]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 lg:p-10 font-sans">
      {/* HEADER SECTION */}
      <Flex justifyContent="between" alignItems="center" className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <Flex alignItems="center" className="space-x-2 mb-2">
            <Badge color="blue">Operación Realtime</Badge>
            <Text className="text-xs font-medium text-slate-400">{connectionStatus}</Text>
          </Flex>
          <Title className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard BI GURBANO</Title>
          <Text className="text-slate-500 font-medium">Centro de Servicio TechCorps Guatemala · Vista ejecutiva</Text>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Flex className="gap-3 flex-wrap lg:flex-nowrap lg:max-w-4xl">
            <Select value={selectedSede} onValueChange={setSelectedSede} className="w-[150px]">
              <SelectItem value="ALL">Todas las Sedes</SelectItem>
              <SelectItem value="GT">Guatemala (GT)</SelectItem>
              <SelectItem value="CR">Costa Rica (CR)</SelectItem>
            </Select>
            <Select value={selectedProduct} onValueChange={setSelectedProduct} className="w-[240px]">
              <SelectItem value="ALL">Todos los Grupos</SelectItem>
              {PRODUCT_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>{group}</SelectItem>
              ))}
            </Select>
            <Select value={selectedDateRange} onValueChange={(value) => setSelectedDateRange(value as DateFilterValue)} className="w-[170px]">
              {DATE_FILTERS.map((period) => (
                <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
              ))}
            </Select>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Text className="text-xs text-slate-500">Fecha inicio</Text>
              <input
                type="date"
                value={selectedStartMonth}
                onChange={(e) => setSelectedStartMonth(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Text className="text-xs text-slate-500">Fecha final</Text>
              <input
                type="date"
                value={selectedEndMonth}
                onChange={(e) => setSelectedEndMonth(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
          </Flex>
          <Flex className="gap-3 flex-wrap">
            <Select value={selectedBrand} onValueChange={setSelectedBrand} className="w-[180px]">
              <SelectItem value="ALL">Todas las Marcas</SelectItem>
              {availableBrands.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </Select>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician} className="w-[220px]">
              <SelectItem value="ALL">Todos los Técnicos / Usuarios</SelectItem>
              {availableTechnicians.map((technician) => (
                <SelectItem key={technician} value={technician}>{technician}</SelectItem>
              ))}
            </Select>
          </Flex>
          <Text className="text-xs font-medium text-slate-500 text-right">
            Filtros activos: {selectedPeriodLabel} · {selectedProduct === 'ALL' ? 'Todos los Grupos' : selectedProduct} · {selectedBrand === 'ALL' ? 'Todas las Marcas' : selectedBrand} · {selectedTechnician === 'ALL' ? 'Todos los Técnicos' : selectedTechnician}
          </Text>
        </div>
      </Flex>

      <TabGroup>
        <TabList className="mb-8" variant="solid">
          <Tab icon={BarChart3}>📊 Gerencial</Tab>
          <Tab icon={Truck}>🚚 Backoffice</Tab>
          <Tab icon={Settings}>🔧 Taller</Tab>
          <Tab icon={Package}>📦 Bodega</Tab>
          <Tab icon={ShieldCheck}>✅ Calidad</Tab>
          <Tab icon={CreditCard}>💰 Claims</Tab>
        </TabList>

        <TabPanels>
          {/* --- PESTAÑA 1: GERENCIAL --- */}
          <TabPanel>
            <Grid numItemsSm={1} numItemsLg={3} className="gap-4 mb-6">
              <Card decoration="left" decorationColor="indigo">
                <Text className="text-slate-500">Ingreso</Text>
                <Metric>{totalIngresos}</Metric>
                <Text className="mt-2 text-xs text-slate-500 font-medium">Período activo: {selectedPeriodLabel}</Text>
              </Card>
              <Card decoration="left" decorationColor="cyan">
                <Text className="text-slate-500">Despacho</Text>
                <Metric>{totalDespachos}</Metric>
                <Text className="mt-2 text-xs text-emerald-600 font-bold">{dispatchCompliance}% de cumplimiento</Text>
              </Card>
              <Card decoration="left" decorationColor="violet">
                <Text className="text-slate-500">WIP</Text>
                <Metric>{totalWip}</Metric>
                <Text className="mt-2 text-xs text-violet-600 font-bold">Órdenes en proceso</Text>
              </Card>
            </Grid>

            <Grid numItemsSm={1} numItemsMd={2} numItemsLg={5} className="gap-4 mb-6">
              {[
                { title: 'TAT Promedio E2E', value: complianceMetrics.tat, progress: 85, color: 'blue', icon: Clock },
                { title: '% SLA Cumplido', value: complianceMetrics.sla, progress: Number.parseFloat(complianceMetrics.sla), color: 'emerald', icon: CheckCircle },
                { title: 'Backlog Total', value: totalWip, progress: 70, color: 'amber', icon: Archive },
                { title: 'Bounce Rate', value: complianceMetrics.bounce, progress: Math.max(0, 100 - Number.parseFloat(complianceMetrics.bounce)), color: 'rose', icon: Activity },
                { title: 'Claim Acceptance', value: complianceMetrics.claim, progress: Number.parseFloat(complianceMetrics.claim), color: 'indigo', icon: ShieldCheck },
              ].map((kpi, idx) => (
                <Card key={idx} decoration="top" decorationColor={kpi.color as "blue" | "emerald" | "amber" | "rose" | "indigo"}>
                  <Flex alignItems="start">
                    <div>
                      <Text className="text-xs font-semibold text-slate-500 uppercase">{kpi.title}</Text>
                      <Metric className="text-2xl mt-1">{kpi.value}</Metric>
                    </div>
                    <Icon icon={kpi.icon} variant="light" size="sm" color={kpi.color as "blue" | "emerald" | "amber" | "rose" | "indigo"} />
                  </Flex>
                  <ProgressBar value={kpi.progress} color={kpi.color as "blue" | "emerald" | "amber" | "rose" | "indigo"} className="mt-4" />
                </Card>
              ))}
            </Grid>

            <Grid numItemsLg={2} className="gap-6 mb-6">
              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Estados WIP y Cantidad</Title>
                    <Text className="mt-1 text-xs text-slate-500">Detalle de órdenes abiertas por estado actual.</Text>
                  </div>
                  <Badge color="amber">{totalWip} WIP</Badge>
                </Flex>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado WIP</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Cantidad</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">% WIP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wipStatusBreakdown.map((item) => (
                        <tr key={item.status} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{item.status}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{item.count}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{item.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>{selectedSlaSegment === 'Fuera SLA' ? 'Órdenes SLA vencidas' : 'Órdenes en SLA'}</Title>
                    <Text className="mt-1 text-xs text-slate-500">Haz clic en el medidor de SLA para poblar este detalle con las OS del estado seleccionado.</Text>
                  </div>
                  <Badge color={selectedSlaSegment === 'Fuera SLA' ? 'rose' : 'emerald'}>
                    {selectedSlaSegment === 'Fuera SLA' ? `${overdueSlaOrders.length} vencidas` : `${ordersWithinSla} en SLA`}
                  </Badge>
                </Flex>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlaSegment('Fuera SLA')}
                    className={`rounded-lg px-3 py-1 text-sm font-medium ${selectedSlaSegment === 'Fuera SLA' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Ver Fuera SLA
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlaSegment('En SLA')}
                    className={`rounded-lg px-3 py-1 text-sm font-medium ${selectedSlaSegment === 'En SLA' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Ver En SLA
                  </button>
                </div>
                <div className="mt-6 overflow-x-auto max-h-[380px]">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Orden</th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Equipo</th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Vence</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">{selectedSlaSegment === 'Fuera SLA' ? 'Días vencida' : 'Margen SLA'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaOrderDetails.length > 0 ? slaOrderDetails.map((item) => (
                        <tr key={item.id} className="bg-white even:bg-slate-50 align-top">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{item.number}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">
                            <div>{item.equipment}</div>
                            <div className="text-xs text-slate-500">{item.technician}</div>
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">
                            <div>{item.status}</div>
                            <div className="text-xs text-rose-600">{item.reason}</div>
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.dueDate}</td>
                          <td className={`border border-slate-200 px-3 py-2 text-right font-semibold ${selectedSlaSegment === 'Fuera SLA' ? 'text-rose-600' : 'text-emerald-600'}`}>{item.overdueDays}</td>
                        </tr>
                      )) : (
                        <tr className="bg-white">
                          <td colSpan={5} className="border border-slate-200 px-3 py-6 text-center text-slate-500">No hay órdenes para el estado SLA seleccionado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Grid>

            <Grid numItemsLg={3} className="gap-6 mb-6">
              <Card>
                <Title>Velocidad · TAT y SLA</Title>
                <Text className="mt-2 text-xs text-slate-500">Medidor general del período y tarjetas rápidas por técnico.</Text>
                <DonutChart
                  className="mt-6 h-52"
                  data={speedGaugeData}
                  index="name"
                  category="value"
                  colors={["emerald", "rose"]}
                  valueFormatter={(value) => `${value} órdenes`}
                  showLabel={true}
                  onValueChange={(value) => {
                    const name = typeof value === 'string' ? value : value?.name;
                    if (name === 'En SLA' || name === 'Fuera SLA') {
                      setSelectedSlaSegment(name);
                    }
                  }}
                />
                <Grid numItemsSm={1} numItemsMd={2} className="gap-3 mt-4">
                  {tatByTechnicianCards.map((item) => (
                    <div key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <Text className="text-xs font-semibold text-slate-500 uppercase">{item.name}</Text>
                      <Metric className="mt-1 text-xl">{item.tat}</Metric>
                      <Text className="text-xs text-slate-500">{item.repaired} cerradas · {item.sla}% FTF</Text>
                    </div>
                  ))}
                </Grid>
              </Card>

              <Card>
                <Title>Calidad · Reingresos 30 / 60 / 90 días</Title>
                <Text className="mt-2 text-xs text-slate-500">Se valida por número de serie: si el equipo volvió a ingresar dentro de 30, 60 o 90 días, cuenta como bounce.</Text>
                <div className="mt-6 space-y-4">
                  {bounceRateTableData.map((item) => (
                    <div key={item.period} className="rounded-xl border border-slate-200 p-3">
                      <Flex justifyContent="between" alignItems="center">
                        <div>
                          <Text className="font-semibold text-slate-800">{item.period}</Text>
                          <Text className="text-xs text-slate-500">{item.monthLabel}</Text>
                          <Text className="text-xs text-slate-500">{item.bounced} rebotes de {item.total}</Text>
                        </div>
                        <Badge color={item.under5 ? 'emerald' : 'rose'}>{item.rate.toFixed(2)}%</Badge>
                      </Flex>
                      <DonutChart
                        className="mt-3 h-28"
                        data={[
                          { name: 'Bounce', value: Number(item.rate.toFixed(2)) || 0.01 },
                          { name: 'OK', value: Math.max(100 - item.rate, 0) },
                        ]}
                        index="name"
                        category="value"
                        colors={["rose", "emerald"]}
                        valueFormatter={(value) => `${value.toFixed(1)}%`}
                        showLabel={false}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <Title>Productividad por Técnico</Title>
                <Text className="mt-2 text-xs text-slate-500">Comparativo entre reparadas y cumplimiento por tier de SLA.</Text>
                <BarChart
                  className="mt-6 h-80"
                  data={technicianProductivitySlaData}
                  index="name"
                  categories={["Reparadas", "SLA ≤3d", "SLA 3-5d", "Fuera +7d"]}
                  colors={["blue", "emerald", "amber", "rose"]}
                  layout="vertical"
                  yAxisWidth={110}
                />
              </Card>
            </Grid>

            {/* FUNNEL VISUAL */}
            <Card className="mb-6">
               <Title>Funnel Operativo: Flujo de Estados</Title>
               <Flex justifyContent="between" alignItems="center" className="mt-4 gap-4 flex-wrap">
                  <Text className="text-sm text-slate-500">Haz clic en un estado para ver los equipos de ese día.</Text>
                  <Select value={selectedFunnelDay} onValueChange={setSelectedFunnelDay} className="w-[190px]">
                    <SelectItem value="ALL">Todos los días</SelectItem>
                    {availableFunnelDays.map((day) => (
                      <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                    ))}
                  </Select>
               </Flex>
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8 relative">
                  {filteredFunnelData.map((step, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedFunnelStage(step.stage)}
                      className={`relative flex flex-col items-center rounded-xl p-1 transition-all ${selectedFunnelStage === step.stage ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                    >
                       <div className={`w-full h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-${step.color}-100 bg-${step.color}-500 transition-all hover:scale-105`}>
                          {step.count}
                       </div>
                       <Text className="mt-3 font-semibold text-slate-700">{step.stage}</Text>
                       {idx < filteredFunnelData.length - 1 && (
                         <div className="absolute top-8 -right-4 z-10 hidden lg:block">
                            <Icon icon={Activity} variant="simple" color="slate" size="xs" />
                         </div>
                       )}
                    </button>
                  ))}
               </div>
               <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <Text className="text-sm text-slate-500">Resumen visual del flujo por estado para el período seleccionado.</Text>
               </div>
            </Card>

          </TabPanel>

          {/* --- PESTAÑA 2: BACKOFFICE --- */}
          <TabPanel>
            <Grid numItemsSm={1} numItemsLg={6} className="gap-6 mb-6">
              <Card decoration="left" decorationColor="indigo">
                <Text className="text-slate-500">Pre-alertas recibidas</Text>
                <Metric>{backofficeSummary.totalRequests}</Metric>
                <Text className="mt-2 text-xs text-slate-500 font-medium">Fuente: Google Sheets</Text>
              </Card>
              <Card decoration="left" decorationColor="cyan">
                <Text className="text-slate-500">Vinculadas a Orderry</Text>
                <Metric>{backofficeSummary.matchedToOrderry}</Metric>
                <Text className="mt-2 text-xs text-emerald-600 font-bold">Cruce entre formularios y sistema</Text>
              </Card>
              <Card decoration="left" decorationColor="violet">
                <Text className="text-slate-500">Total WIP</Text>
                <Metric>{totalWip}</Metric>
                <Text className="mt-2 text-xs text-violet-600 font-bold">Órdenes en proceso</Text>
              </Card>
              <Card decoration="left" decorationColor="blue">
                <Text className="text-slate-500">TAT Recolección</Text>
                <Metric>{formatDaysHoursMetric(backofficeSummary.avgCollectionHours)}</Metric>
                <Text className="mt-2 text-xs text-slate-500 font-medium">Solicitud → recolección</Text>
              </Card>
              <Card decoration="left" decorationColor="emerald">
                <Text className="text-slate-500">TAT Ingreso a Sistema</Text>
                <Metric>{formatDaysHoursMetric(backofficeSummary.avgSystemEntryHours)}</Metric>
                <Text className="mt-2 text-xs text-slate-500 font-medium">Solicitud → Orderry</Text>
              </Card>
              <Card decoration="left" decorationColor="amber">
                <Text className="text-slate-500">Recolección &lt; 24h</Text>
                <Metric>{backofficeSummary.within24hRate}%</Metric>
                <Text className="mt-2 text-xs text-amber-700 font-bold">{backofficeSummary.pendingCollection} sin ingreso en Orderry</Text>
              </Card>
            </Grid>

            <Grid numItemsLg={2} className="gap-6">
              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Flujo Semanal de Ingresos vs Despachos</Title>
                    <Text className="mt-2 text-xs text-slate-500">Filtra este gráfico por mes y día.</Text>
                  </div>
                  <Flex className="gap-2 flex-wrap">
                    <Select value={selectedFlowMonth} onValueChange={(value) => { setSelectedFlowMonth(value); setSelectedFlowDay('ALL'); }} className="w-[190px]">
                      <SelectItem value="ALL">Todos los meses</SelectItem>
                      {availableFlowMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </Select>
                    <Select value={selectedFlowDay} onValueChange={setSelectedFlowDay} className="w-[190px]">
                      <SelectItem value="ALL">Todos los días</SelectItem>
                      {availableFlowDays.map((day) => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
                <BarChart
                  className="mt-6 h-72"
                  data={weeklyFlowData}
                  index="name"
                  categories={["Ingresos", "Despachos"]}
                  colors={["blue", "emerald"]}
                  showLegend={true}
                  yAxisWidth={40}
                />
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <Text className="text-xs text-slate-500">Tendencia móvil de 3 días usando la fecha real de salida en entregado o despachado.</Text>
                  <LineChart
                    className="mt-3 h-32"
                    data={weeklyFlowData}
                    index="name"
                    categories={["TendenciaIngresos", "TendenciaDespachos"]}
                    colors={["indigo", "teal"]}
                    showLegend={true}
                    yAxisWidth={40}
                  />
                </div>
              </Card>
              <Card className="bg-slate-50/50">
                <Title>Estado logístico del Backoffice</Title>
                <div className="space-y-4 mt-6">
                  <div className="flex items-center p-4 bg-white border border-blue-200 rounded-xl">
                    <Icon icon={Activity} color="blue" variant="light" className="mr-4" />
                    <div>
                      <Text className="font-bold text-blue-900">{backofficeStatus}</Text>
                      <Text className="text-xs text-blue-600">
                        {backofficeData.source === 'orderry-only' ? 'Fuente actual: Orderry' : 'Fuente combinada: formularios + Orderry'}
                      </Text>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-white border border-amber-200 rounded-xl">
                    <Icon icon={AlertTriangle} color="amber" variant="light" className="mr-4" />
                    <div>
                      <Text className="font-bold text-amber-900">{backofficeSummary.pendingCollection} casos no recolectados o sin ingreso a sistema</Text>
                      <Text className="text-xs text-amber-600">Si no existe orden o dato en Orderry, el caso se considera pendiente de recolección</Text>
                    </div>
                  </div>
                  {backofficeBreakdown.map((item) => (
                    <div key={item.client} className="flex items-center p-4 bg-white border border-slate-200 rounded-xl">
                      <Icon icon={Truck} color="indigo" variant="light" className="mr-4" />
                      <div>
                        <Text className="font-bold text-slate-900">{item.client}: {item.total} pre-alertas</Text>
                        <Text className="text-xs text-slate-600">
                          {item.matchedToOrderry} vinculadas · TAT sistema {formatHoursMetric(item.avgSystemEntryHours)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Grid>

            <Grid numItemsLg={1} className="gap-6 mt-6">
              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Detalle de Pre-alertas Logísticas</Title>
                    <Text className="mt-2 text-xs text-slate-500">Solicitud, recolección e ingreso a Orderry por cliente.</Text>
                  </div>
                  <Badge color={backofficeData.source === 'sheets+orderry' ? 'emerald' : backofficeData.connected ? 'blue' : 'amber'}>
                    {backofficeData.source === 'sheets+orderry' ? 'Google Sheets + Orderry' : backofficeData.connected ? 'Orderry conectado' : 'Esperando acceso'}
                  </Badge>
                </Flex>
                <div className="mt-4 flex gap-3 flex-wrap">
                  <Select value={selectedBackofficeClient} onValueChange={setSelectedBackofficeClient} className="w-[180px]">
                    <SelectItem value="ALL">Todos los clientes</SelectItem>
                    <SelectItem value="CLARO">CLARO</SelectItem>
                    <SelectItem value="XIAOMI">XIAOMI</SelectItem>
                    <SelectItem value="RETAILER">RETAILER</SelectItem>
                  </Select>
                  <Select value={selectedBackofficeStatus} onValueChange={setSelectedBackofficeStatus} className="w-[180px]">
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    <SelectItem value="Aceptado">Aceptado</SelectItem>
                    <SelectItem value="Pendiente ingreso">Pendiente ingreso</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                  </Select>
                  <input
                    type="text"
                    value={backofficeSearch}
                    onChange={(e) => setBackofficeSearch(e.target.value)}
                    placeholder="Buscar ticket, folio o IMEI"
                    className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                  />
                </div>
                <div className="mt-6 overflow-x-auto max-h-[420px]">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr>
                        <th className="border border-slate-600 px-3 py-2 text-left">Cliente</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">Ticket / Conduce / IMEI-Folio</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">Fecha solicitud</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">Recolección</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">Ingreso Orderry</th>
                        <th className="border border-slate-600 px-3 py-2 text-right">Hrs recolección</th>
                        <th className="border border-slate-600 px-3 py-2 text-right">Días Solicitud → Orderry</th>
                        <th className="border border-slate-600 px-3 py-2 text-right">Hrs Solicitud → Orderry</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">Cruce</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBackofficeRows.length > 0 ? filteredBackofficeRows.map((row, idx) => (
                        <tr key={`${row.client}-${row.reference}-${idx}`} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.client}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">
                            <div className="font-medium text-slate-900">{row.reference || 'Sin ticket'}</div>
                            <div className="text-xs text-slate-600">{row.trackingCode || 'Sin conduce / IMEI-folio'}</div>
                            <div className="text-xs text-slate-500">{row.equipmentName || row.matchedOrderNumber || row.sheetTitle}</div>
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">{formatDateTime(row.requestAt)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">{formatDateTime(row.collectedAt)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">{formatDateTime(row.orderryAt)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{(row.collectionHours ?? calculateDiffHours(row.requestAt, row.collectedAt)) === null ? 'n/d' : (row.collectionHours ?? calculateDiffHours(row.requestAt, row.collectedAt))?.toFixed(1)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{(row.systemDays ?? calculateDiffDays(row.requestAt, row.orderryAt)) === null ? 'n/d' : (row.systemDays ?? calculateDiffDays(row.requestAt, row.orderryAt))?.toFixed(1)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">{(row.systemHours ?? calculateDiffHours(row.requestAt, row.orderryAt)) === null ? 'n/d' : (row.systemHours ?? calculateDiffHours(row.requestAt, row.orderryAt))?.toFixed(1)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">
                            <div>{row.matchMethod || 'Pendiente'}</div>
                            <div className="text-xs text-slate-500">{row.matchedOrderNumber || 'Sin orden'}</div>
                          </td>
                          <td className="border border-slate-200 px-3 py-2">
                            <Badge color={row.status.includes('Acept') || row.status.includes('Recolect') || row.status.includes('En SLA') ? 'emerald' : row.status.includes('Fuera SLA') ? 'rose' : 'amber'}>{row.status}</Badge>
                          </td>
                        </tr>
                      )) : (
                        <tr className="bg-white">
                          <td colSpan={10} className="border border-slate-200 px-3 py-6 text-center text-slate-500">Aún no hay filas visibles desde Google Sheets o faltan credenciales de acceso.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Usuarios que Crearon la Orden</Title>
                    <Text className="mt-2 text-xs text-slate-500">Solo muestra el ingresador del campo Creado por en Orderry.</Text>
                  </div>
                  <Flex className="gap-2 flex-wrap">
                    <Select value={selectedCreatorMonth} onValueChange={(value) => { setSelectedCreatorMonth(value); setSelectedCreatorDay('ALL'); }} className="w-[190px]">
                      <SelectItem value="ALL">Todos los meses</SelectItem>
                      {availableCreatorMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </Select>
                    <Select value={selectedCreatorDay} onValueChange={setSelectedCreatorDay} className="w-[190px]">
                      <SelectItem value="ALL">Todos los días</SelectItem>
                      {availableCreatorDays.map((day) => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="border border-slate-600 px-3 py-2 text-left">Usuario creador</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">Ingresos</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">Despachos</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">WIP</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">Cumplimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backofficeCreatorRows.map((row) => (
                        <tr key={row.user} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.user}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-bold">{row.ingresos}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{row.despachos}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{row.wip}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{row.cumplimiento}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Canal de Ingreso</Title>
                    <Text className="mt-2 text-xs text-slate-500">Cantidades según los filtros activos del dashboard.</Text>
                  </div>
                  <Flex className="gap-2 flex-wrap">
                    <Select value={selectedChannelMonth} onValueChange={(value) => { setSelectedChannelMonth(value); setSelectedChannelDay('ALL'); }} className="w-[190px]">
                      <SelectItem value="ALL">Todos los meses</SelectItem>
                      {availableChannelMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </Select>
                    <Select value={selectedChannelDay} onValueChange={setSelectedChannelDay} className="w-[190px]">
                      <SelectItem value="ALL">Todos los días</SelectItem>
                      {availableChannelDays.map((day) => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="border border-slate-600 px-3 py-2 text-left">Canal de Ingreso</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">Cantidad</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backofficeChannelRows.map((row) => (
                        <tr key={row.channel} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.channel}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-bold">{row.total}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{row.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Tipo de Servicio</Title>
                    <Text className="mt-2 text-xs text-slate-500">Distribución según el filtro activo.</Text>
                  </div>
                  <Flex className="gap-2 flex-wrap">
                    <Select value={selectedServiceMonth} onValueChange={(value) => { setSelectedServiceMonth(value); setSelectedServiceDay('ALL'); }} className="w-[190px]">
                      <SelectItem value="ALL">Todos los meses</SelectItem>
                      {availableServiceMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </Select>
                    <Select value={selectedServiceDay} onValueChange={setSelectedServiceDay} className="w-[190px]">
                      <SelectItem value="ALL">Todos los días</SelectItem>
                      {availableServiceDays.map((day) => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="border border-slate-600 px-3 py-2 text-left">Tipo de Servicio</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">Cantidad</th>
                        <th className="border border-slate-600 px-3 py-2 text-center">% del Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backofficeServiceRows.map((row) => (
                        <tr key={row.service} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.service}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-bold">{row.total}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{row.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-semibold">
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">{selectedProduct === 'ALL' ? 'TOTAL' : `TOTAL ${selectedProduct}`}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{serviceFilteredOrders.length}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </Grid>
          </TabPanel>

          {/* --- PESTAÑA 3: TALLER (CORE) --- */}
          <TabPanel>
            <Grid numItemsSm={1} numItemsLg={6} className="gap-6 mb-8">
              <Card>
                <Text className="text-slate-500">TAT Técnico Promedio · Días</Text>
                <Metric>{technicianSummary.tatDays}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Tiempo promedio por orden completada</Text>
              </Card>
              <Card>
                <Text className="text-slate-500">TAT Técnico Promedio · Horas</Text>
                <Metric>{technicianSummary.tatHours}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Detalle del mismo TAT en horas</Text>
              </Card>
              <Card>
                <Text className="text-slate-500">Productividad · Técnico</Text>
                <Metric>{technicianSummary.productivity}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Promedio por técnico en el período</Text>
              </Card>
              <Card>
                <Text className="text-slate-500">Productividad · Día</Text>
                <Metric>{technicianSummary.productivityDaily}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Equipos reparados por día</Text>
              </Card>
              <Card>
                <Text className="text-slate-500">First Time Fix (FTF)</Text>
                <Metric>{technicianSummary.ftf}</Metric>
                <ProgressBar value={Number.parseFloat(technicianSummary.ftf)} color="emerald" className="mt-2" />
              </Card>
              <Card className="bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Text className="text-indigo-100">Total OS Entregadas</Text>
                <Metric className="text-white">{technicianSummary.delivered}</Metric>
              </Card>
            </Grid>

            <Card className="mb-8">
              <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                <div>
                  <Title>Taller · Desempeño por Técnico</Title>
                  <Text className="mt-1 text-xs text-slate-500">Ejecutor = técnico de taller. Creador = usuario que ingresa la orden. Reparaciones incluye equipos que ya pasaron a Control de Calidad.</Text>
                </div>
                <Flex className="gap-2 flex-wrap">
                  <Select value={selectedTechnicianMonth} onValueChange={(value) => { setSelectedTechnicianMonth(value); setSelectedTechnicianDay('ALL'); }} className="w-[180px]">
                    <SelectItem value="ALL">Todos los meses</SelectItem>
                    {availableTechnicianMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </Select>
                  <Select value={selectedTechnicianDay} onValueChange={setSelectedTechnicianDay} className="w-[180px]">
                    <SelectItem value="ALL">Todos los días</SelectItem>
                    {availableTechnicianDays.map((day) => (
                      <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                    ))}
                  </Select>
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician} className="w-[240px]">
                    <SelectItem value="ALL">Todos los Técnicos / Usuarios</SelectItem>
                    {availableTechnicians.map((technician) => (
                      <SelectItem key={technician} value={technician}>{technician}</SelectItem>
                    ))}
                  </Select>
                </Flex>
              </Flex>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border border-slate-200 text-sm">
                  <thead className="bg-lime-800 text-white">
                    <tr>
                      <th className="border border-lime-700 px-3 py-2 text-left min-w-[320px]">Técnico</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">OS Asignada</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">Diagnósticos</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">Reparaciones</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">No Reparado</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">Controles_QC</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">WIP</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">SLA</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">Cerrada</th>
                      <th className="border border-lime-700 px-3 py-2 text-center">Cerró / Despachó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianReportRows.map((row) => (
                      <tr key={row.name} className="bg-white even:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900 min-w-[320px] whitespace-nowrap">{row.name}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.osAsignada}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.diagnosticos}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.reparaciones}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.noReparado}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.controlesQc}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.wip}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.sla}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.cerrada}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center whitespace-nowrap">{row.closingOwner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="mb-8">
              <Title>Acumulado Reparado por Semana</Title>
              <Text className="mt-1 text-xs text-slate-500">Vista acumulativa semanal para el filtro activo de Taller.</Text>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border border-slate-200 text-sm">
                  <thead className="bg-indigo-700 text-white">
                    <tr>
                      <th className="border border-indigo-600 px-3 py-2 text-left">Semana</th>
                      <th className="border border-indigo-600 px-3 py-2 text-center">Reparado</th>
                      <th className="border border-indigo-600 px-3 py-2 text-center">QC</th>
                      <th className="border border-indigo-600 px-3 py-2 text-center">Cerrada</th>
                      <th className="border border-indigo-600 px-3 py-2 text-center">Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyRepairedRows.map((row) => (
                      <tr key={row.week} className="bg-white even:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.week}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.repaired}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.qc}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center">{row.closed}</td>
                        <td className="border border-slate-200 px-3 py-2 text-center font-bold">{row.accumulated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Grid numItemsLg={2} className="gap-8">
              <Card>
                <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                  <div>
                    <Title>Mix de Reparación vs Complejidad</Title>
                    <Text className="mt-1 text-xs text-slate-500">La métrica Mix se calcula solo con equipos cerrados y permite ver el acumulado por mes o por día usando la fecha de cierre.</Text>
                  </div>
                  <Flex className="gap-2 flex-wrap">
                    <Select value={selectedRepairMixMonth} onValueChange={(value) => { setSelectedRepairMixMonth(value); setSelectedRepairMixDay('ALL'); }} className="w-[200px]">
                      <SelectItem value="ALL">Acumulado todos los meses</SelectItem>
                      {availableRepairMixMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                    </Select>
                    <Select value={selectedRepairMixDay} onValueChange={setSelectedRepairMixDay} className="w-[180px]">
                      <SelectItem value="ALL">Todos los días</SelectItem>
                      {availableRepairMixDays.map((day) => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
                <Grid numItemsSm={1} numItemsLg={3} className="mt-4 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Text className="text-xs text-slate-500">Base Mix · Cerrados</Text>
                    <Metric className="text-slate-900">{repairMixTotal}</Metric>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <Text className="text-xs text-amber-700">WIP del período</Text>
                    <Metric className="text-amber-900">{repairMixWipCount}</Metric>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <Text className="text-xs text-emerald-700">Órdenes analizadas</Text>
                    <Metric className="text-emerald-900">{repairMixTotal + repairMixWipCount}</Metric>
                  </div>
                </Grid>
                <DonutChart
                  className="mt-6 h-56"
                  data={filteredRepairMixData}
                  category="count"
                  index="name"
                  colors={["slate", "emerald", "blue", "amber", "rose", "cyan"]}
                />
                <div className="mt-6 space-y-2">
                  {repairMixPercentData.map((item) => (
                    <Flex key={item.name} justifyContent="between" alignItems="center" className="rounded-lg bg-slate-50 px-3 py-2">
                      <Text className="font-medium text-slate-700">{item.name}</Text>
                      <Text className="text-slate-900">{item.count} · {item.percent}%</Text>
                    </Flex>
                  ))}
                </div>
              </Card>
              <Card>
                 <Title>Distribución de Operación (Volumen)</Title>
                 <Text className="mt-1 text-xs text-slate-500">Bloque L0 + L1 como gestión operativa y L2 como reparación especializada.</Text>
                 <BarChart
                   className="mt-6 h-56"
                   data={repairMixExecutiveBarData}
                   index="bloque"
                   categories={["Reparación L0", "Reparación L1", "Reparación L2", "No Reparado", "DOA-DAP"]}
                   colors={["slate", "emerald", "blue", "rose", "amber"]}
                   stack={true}
                   yAxisWidth={120}
                 />
                 <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
                   <Text className="text-sm font-semibold text-rose-900">Alerta Roja · DOA-DAP</Text>
                   <Text className="mt-1 text-xs text-rose-700">
                     {doaInsight.count} casos · {doaInsight.percent.toFixed(1)}% del total.
                   </Text>
                   <Text className="mt-2 text-xs text-rose-700">Este indicador ayuda a detectar lotes con posible falla de fábrica y soporta reclamos directos con la marca.</Text>
                 </div>
              </Card>
            </Grid>

            <Grid numItemsLg={3} className="gap-6 mt-8">
              <Card className="lg:col-span-2">
                <Title>TAT Promedio por Categoría</Title>
                <Text className="mt-1 text-xs text-slate-500">Comparativo de días promedio según el tipo de trabajo ejecutado.</Text>
                <BarChart
                  className="mt-6 h-72"
                  data={repairCategoryTatChart}
                  index="name"
                  categories={["TAT (días)"]}
                  colors={["indigo"]}
                  layout="vertical"
                  yAxisWidth={150}
                />
              </Card>

              <Card>
                <Title>Insights Gerenciales</Title>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Text className="text-sm font-semibold text-amber-900">No Reparado / Rechazado</Text>
                    <Metric className="mt-1 text-2xl">{noRepairInsight.count}</Metric>
                    <Text className="text-xs text-amber-700">{noRepairInsight.percent.toFixed(1)}% del total · oportunidad directa de mejora comercial.</Text>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <Text className="text-sm font-semibold text-emerald-900">Velocímetro SLA · Estándar L1</Text>
                    <Metric className="mt-1 text-2xl">{l1Insight.tatDays.toFixed(2)} días</Metric>
                    <Text className="text-xs text-emerald-700">Meta de referencia: {l1TatTarget.toFixed(2)} días</Text>
                    <ProgressBar value={l1TatProgress} color={l1Insight.tatDays <= l1TatTarget ? 'emerald' : 'amber'} className="mt-3" />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <Text className="text-sm font-semibold text-slate-800">Resumen rápido</Text>
                    <Text className="mt-1 text-xs text-slate-600">Reparación L2: {repairCategoryInsights.find((item) => item.name === 'Reparación L2')?.count || 0} · {(repairCategoryInsights.find((item) => item.name === 'Reparación L2')?.percent || 0).toFixed(1)}%</Text>
                    <Text className="text-xs text-slate-600">Reparación L1: {l1Insight.count} · {l1Insight.percent.toFixed(1)}%</Text>
                    <Text className="text-xs text-slate-600">Reparación L0: {repairCategoryInsights.find((item) => item.name === 'Reparación L0')?.count || 0} · {(repairCategoryInsights.find((item) => item.name === 'Reparación L0')?.percent || 0).toFixed(1)}%</Text>
                  </div>
                </div>
              </Card>
            </Grid>
          </TabPanel>

          {/* --- PESTAÑA 4: BODEGA --- */}
          <TabPanel>
             <Card className="mb-6">
               <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                 <div>
                   <Title>Bodega · Seguimiento de despacho</Title>
                   <Text className="mt-1 text-xs text-slate-500">Consulta el acumulado por meses, el Top SKU/partes y el tiempo desde solicitud de repuesto hasta despacho técnico.</Text>
                 </div>
                 <Flex className="gap-2 flex-wrap">
                   <Select value={selectedBodegaMonth} onValueChange={(value) => { setSelectedBodegaMonth(value); setSelectedBodegaDay('ALL'); }} className="w-[180px]">
                     <SelectItem value="ALL">Todos los meses</SelectItem>
                     {availableBodegaMonths.map((month) => (
                       <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                     ))}
                   </Select>
                   <Select value={selectedBodegaDay} onValueChange={setSelectedBodegaDay} className="w-[170px]">
                     <SelectItem value="ALL">Todos los días</SelectItem>
                     {availableBodegaDays.map((day) => (
                       <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                     ))}
                   </Select>
                   <Select value={selectedBodegaBrand} onValueChange={(value) => { setSelectedBodegaBrand(value); setSelectedBodegaGroup('ALL'); setSelectedBodegaModel('ALL'); }} className="w-[170px]">
                     <SelectItem value="ALL">Todas las marcas</SelectItem>
                     {availableBodegaBrands.map((brand) => (
                       <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                     ))}
                   </Select>
                   <Select value={selectedBodegaGroup} onValueChange={(value) => { setSelectedBodegaGroup(value); setSelectedBodegaModel('ALL'); }} className="w-[190px]">
                     <SelectItem value="ALL">Grupo de dispositivos</SelectItem>
                     {availableBodegaGroups.map((group) => (
                       <SelectItem key={group} value={group}>{group}</SelectItem>
                     ))}
                   </Select>
                   <Select value={selectedBodegaModel} onValueChange={setSelectedBodegaModel} className="w-[220px]">
                     <SelectItem value="ALL">Todos los modelos</SelectItem>
                     {availableBodegaModels.map((model) => (
                       <SelectItem key={model} value={model}>{model}</SelectItem>
                     ))}
                   </Select>
                 </Flex>
               </Flex>
             </Card>

             <Grid numItemsSm={1} numItemsLg={5} className="gap-6 mb-8">
                <Card>
                   <Text className="text-slate-500 uppercase tracking-widest text-xs">SKU únicos rastreados</Text>
                   <Metric>{bodegaTrackingSummary.skuTracked}</Metric>
                   <Text className="mt-2 text-xs text-slate-500">Productos identificados desde el campo Producto</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500 uppercase tracking-widest text-xs">Despachos acumulados</Text>
                   <Metric>{bodegaTrackingSummary.dispatchedOrders}</Metric>
                   <Text className="mt-2 text-xs text-slate-500">Casos con pieza despachada porque el campo Producto trae dato</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500 uppercase tracking-widest text-xs">Nota de crédito</Text>
                   <Metric>{bodegaTrackingSummary.noteCreditOrders}</Metric>
                   <Text className="mt-2 text-xs text-rose-600">Conteo desde Servicios/Obras con acción Nota de crédito y sin pieza despachada</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500 uppercase tracking-widest text-xs">Lead time repuesto → técnico</Text>
                   <Metric>{bodegaTrackingSummary.avgLeadDays ? `${bodegaTrackingSummary.avgLeadDays}d` : 'n/d'}</Metric>
                   <Text className="mt-2 text-xs text-slate-500">Tiempo promedio desde solicitud de parte hasta despacho</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500 uppercase tracking-widest text-xs">Órdenes Waiting Parts</Text>
                   <Metric>{bodegaTrackingSummary.waitingOrders}</Metric>
                   <Text className="mt-2 text-xs text-amber-600">Seguimiento directo a repuestos pendientes</Text>
                </Card>
             </Grid>

             <Grid numItemsLg={2} className="gap-6">
                <Card>
                   <Title>{selectedBodegaMonth === 'ALL' && selectedBodegaDay === 'ALL' ? 'Acumulado de despacho por mes' : 'Acumulado de despacho por día'}</Title>
                   <Text className="mt-1 text-xs text-slate-500">{selectedBodegaMonth === 'ALL' && selectedBodegaDay === 'ALL' ? 'Comparativo mensual de despachos y casos resueltos con nota de crédito.' : 'Comparativo del período filtrado mostrando detalle diario de despachos y nota de crédito.'}</Text>
                   <LineChart
                     className="mt-6 h-72"
                     data={bodegaMonthlyDispatchData}
                     index="period"
                     categories={["Acumulado", "Nota de crédito"]}
                     colors={["blue", "rose"]}
                     yAxisWidth={60}
                   />
                </Card>
                <Card>
                   <Title>Seguimiento de Productos / SKU despachados</Title>
                   <Text className="mt-1 text-xs text-slate-500">Se prioriza el campo Productos y, si no viene en Orderry, se usa el equipo u OS para conservar el historial operativo.</Text>
                   <BarChart
                     className="mt-6 h-80"
                     data={bodegaTrackingSummary.chartData}
                     index="label"
                     categories={["Despachado", "En espera"]}
                     colors={["emerald", "amber"]}
                     layout="vertical"
                     yAxisWidth={260}
                     stack={true}
                   />
                   <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                     <Text className="text-xs font-semibold text-slate-700">Nombres completos del Top seguimiento</Text>
                     <div className="mt-3 space-y-2">
                       {bodegaTrackingSummary.topSkuRows.slice(0, 8).map((row, index) => (
                         <div key={`${row.sku}-full`} className="rounded-md bg-white px-3 py-2 text-xs text-slate-700">
                           <span className="font-semibold text-slate-900">{index + 1}.</span> {row.sku}
                         </div>
                       ))}
                     </div>
                   </div>
                </Card>
             </Grid>

             <Grid numItemsLg={2} className="gap-6 mt-6">
                <Card className="border border-slate-200">
                   <Title>Top SKU / Partes con seguimiento</Title>
                   <Text className="mt-1 text-xs text-slate-500">Este ranking se actualiza por el mes y día seleccionado.</Text>
                   <div className="mt-4 overflow-x-auto">
                     <table className="min-w-full border border-slate-200 text-sm">
                       <thead className="bg-slate-100">
                         <tr>
                           <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Producto / SKU</th>
                           <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">Mov.</th>
                           <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">Desp.</th>
                           <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">Espera</th>
                           <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">%</th>
                         </tr>
                       </thead>
                       <tbody>
                         {bodegaTrackingSummary.topSkuRows.map((row) => (
                           <tr key={row.sku} className="bg-white even:bg-slate-50">
                             <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.sku}</td>
                             <td className="border border-slate-200 px-3 py-2 text-center">{row.total}</td>
                             <td className="border border-slate-200 px-3 py-2 text-center text-emerald-700">{row.dispatched}</td>
                             <td className="border border-slate-200 px-3 py-2 text-center text-amber-700">{row.waiting}</td>
                             <td className="border border-slate-200 px-3 py-2 text-center">{row.pct}%</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </Card>
                <Card className="bg-rose-50 border-rose-100 border">
                   <Title className="text-rose-900">Casos con Nota de Crédito</Title>
                   <Text className="mt-1 text-xs text-rose-700">Detalle visible con orden de servicio, marca, modelo y número de partes.</Text>
                   <div className="mt-4 overflow-x-auto rounded-xl border border-rose-200 bg-white p-2">
                     <table className="min-w-full text-sm">
                       <thead className="bg-rose-50">
                         <tr>
                           <th className="border border-rose-100 px-3 py-2 text-left font-semibold text-rose-800">OS</th>
                           <th className="border border-rose-100 px-3 py-2 text-left font-semibold text-rose-800">Marca</th>
                           <th className="border border-rose-100 px-3 py-2 text-left font-semibold text-rose-800">Modelo</th>
                           <th className="border border-rose-100 px-3 py-2 text-left font-semibold text-rose-800">SKU</th>
                           <th className="border border-rose-100 px-3 py-2 text-left font-semibold text-rose-800">No. Partes</th>
                         </tr>
                       </thead>
                       <tbody>
                         {bodegaNoteCreditRows.map((row) => (
                           <tr key={row.os} className="bg-white even:bg-rose-50/40">
                             <td className="border border-rose-100 px-3 py-2 font-medium text-slate-900">{row.os}</td>
                             <td className="border border-rose-100 px-3 py-2">{row.brand}</td>
                             <td className="border border-rose-100 px-3 py-2">{row.model}</td>
                             <td className="border border-rose-100 px-3 py-2">{row.sku}</td>
                             <td className="border border-rose-100 px-3 py-2">{row.partsCodes}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </Card>
             </Grid>

             <Card className="mt-6">
               <Title>Historial de despacho</Title>
               <Text className="mt-1 text-xs text-slate-500">Órdenes de varios meses con producto o equipo asociado y tiempo desde solicitud de parte hasta despacho al técnico.</Text>
               <div className="mt-4 overflow-x-auto">
                 <table className="min-w-full border border-slate-200 text-sm">
                   <thead className="bg-slate-100">
                     <tr>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Fecha</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Producto / Parte</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Equipo</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Lead time</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Técnico</th>
                     </tr>
                   </thead>
                   <tbody>
                     {bodegaDispatchHistory.map((row) => (
                       <tr key={`${row.number}-${row.date}`} className="bg-white even:bg-slate-50">
                         <td className="border border-slate-200 px-3 py-2">{row.date}</td>
                         <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.number}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.product}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.equipment}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.status}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.leadTime}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.technician}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </Card>
          </TabPanel>

          {/* --- PESTAÑA 5: QA --- */}
          <TabPanel>
             <Grid numItemsSm={1} numItemsLg={4} className="gap-6 mb-8">
                <Card>
                   <Text className="text-slate-500">QC Failure Rate</Text>
                   <Metric>4.2%</Metric>
                   <BadgeDelta deltaType="moderateDecrease" size="xs">-0.8%</BadgeDelta>
                </Card>
                <Card>
                   <Text className="text-slate-500">Reprocesos (Taller)</Text>
                   <Metric>12</Metric>
                   <Text className="text-xs text-rose-500">Requires review</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500">Average time in QA</Text>
                   <Metric>2.5h</Metric>
                </Card>
                <Card>
                   <Text className="text-slate-500">DOA Rate</Text>
                   <Metric>1.5%</Metric>
                   <BadgeDelta deltaType="unchanged" size="xs">0</BadgeDelta>
                </Card>
             </Grid>

             <Card className="mb-8">
                <Title>Calidad Operativa: Aprobados vs Rechazados</Title>
                <BarChart
                  className="mt-6 h-80"
                  data={QA_RESULT_DATA}
                  index="week"
                  categories={["Aprobados", "Rechazados"]}
                  colors={["emerald", "rose"]}
                  stack={true}
                />
             </Card>

             <Card>
               <Title>Distribución de Fallas detectadas por QA</Title>
               <DonutChart
                 className="mt-6 h-64"
                 data={[
                   { type: 'Funcional', val: 55 },
                   { type: 'Cosmético', val: 25 },
                   { type: 'Software', val: 15 },
                   { type: 'Limpieza', val: 5 },
                 ]}
                 category="val"
                 index="type"
                 colors={["indigo", "cyan", "blue", "slate"]}
                 valueFormatter={(v) => `${v}%`}
               />
             </Card>
          </TabPanel>

          {/* --- PESTAÑA 6: CLAIMS --- */}
          <TabPanel>
             <Grid numItemsSm={1} numItemsLg={4} className="gap-6 mb-8">
                <Card decoration="top" decorationColor="blue">
                   <Text className="text-slate-500 uppercase text-xs">CASOS CERRADOS XIAOMI</Text>
                   <Metric>{claimsSummary.total}</Metric>
                   <Text className="text-xs text-slate-500 mt-2">Teléfonos cerrados en el período</Text>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                   <Text className="text-slate-500 uppercase text-xs">CERRADOS EN PORTAL</Text>
                   <Metric>{claimsSummary.closedInPortal}</Metric>
                   <ProgressBar value={claimsSummary.coverage} color="emerald" className="mt-4" />
                </Card>
                <Card decoration="top" decorationColor="amber">
                   <Text className="text-slate-500 uppercase text-xs">REPORTADOS / PENDIENTES</Text>
                   <Metric>{claimsSummary.reported} / {claimsSummary.pending}</Metric>
                   <Badge color="amber" className="mt-2">Seguimiento Xiaomi</Badge>
                </Card>
                <Card decoration="top" decorationColor="rose">
                   <Text className="text-slate-500 uppercase text-xs">COBERTURA DE VALIDACIÓN</Text>
                   <Metric>{claimsSummary.coverage}%</Metric>
                   <Badge color="rose" className="mt-2">NC: {claimsSummary.noteCredit}</Badge>
                </Card>
             </Grid>

             <Grid numItemsLg={2} className="gap-6 mb-6">
                <Card>
                   <Title>Validador Xiaomi por IMEI / Serie</Title>
                   <Text className="mt-2 text-sm text-slate-600">
                     Pegue aquí el listado copiado o exportado desde la plataforma Xiaomi. El panel marcará automáticamente qué OS ya fueron cargadas.
                   </Text>
                   <textarea
                     value={xiaomiRegistryInput}
                     onChange={(event) => setXiaomiRegistryInput(event.target.value)}
                     placeholder="Pegue IMEI, series o filas completas del portal Xiaomi..."
                     className="mt-4 h-40 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                   />
                   <Flex className="mt-4">
                     <Badge color="blue">Series detectadas: {claimsRegistryTokens.length}</Badge>
                     <Badge color={xiaomiRegistryInput.trim() ? 'emerald' : 'amber'}>
                       {xiaomiRegistryInput.trim() ? 'Comparador activo' : 'Esperando lista del portal'}
                     </Badge>
                   </Flex>
                </Card>
                <Card>
                   <Title>Distribución de validación</Title>
                   {claimsStatusChartData.some((item) => item.casos > 0) ? (
                     <DonutChart
                       className="mt-6 h-72"
                       data={claimsStatusChartData}
                       category="casos"
                       index="name"
                       colors={["emerald", "blue", "amber", "slate"]}
                       valueFormatter={(value) => `${value} casos`}
                     />
                   ) : (
                     <Text className="mt-8 text-sm text-slate-500">Aún no hay casos Xiaomi cerrados para el período seleccionado.</Text>
                   )}
                </Card>
             </Grid>

             <Grid numItemsLg={2} className="gap-6 mb-6">
                <Card>
                   <Title>Tendencia mensual: cargados vs pendientes</Title>
                   {claimsTrendData.length ? (
                     <LineChart
                       className="mt-6 h-72"
                       data={claimsTrendData}
                       index="month"
                       categories={["Cargados", "Pendientes"]}
                       colors={["emerald", "amber"]}
                     />
                   ) : (
                     <Text className="mt-8 text-sm text-slate-500">Sin datos suficientes para tendencia mensual.</Text>
                   )}
                </Card>
                <Card>
                   <Title>Foco operativo</Title>
                   <div className="mt-6 space-y-4">
                     <div>
                       <Text className="text-xs uppercase text-slate-500">Sin serie</Text>
                       <Metric>{claimsSummary.missingSeries}</Metric>
                     </div>
                     <div>
                       <Text className="text-xs uppercase text-slate-500">Reportados en Xiaomi</Text>
                       <Metric>{claimsSummary.reported}</Metric>
                     </div>
                     <div>
                       <Text className="text-xs uppercase text-slate-500">Pendientes por cargar</Text>
                       <Metric>{claimsSummary.pending}</Metric>
                     </div>
                     <div>
                       <Text className="text-xs uppercase text-slate-500">Notas de crédito</Text>
                       <Metric>{claimsSummary.noteCredit}</Metric>
                     </div>
                   </div>
                </Card>
             </Grid>

             <Card>
               <Flex className="mb-4 flex-wrap gap-3">
                 <div>
                   <Title>Detalle de validación Xiaomi</Title>
                   <Text className="text-sm text-slate-500">Casos cerrados de teléfono comparados contra el listado pegado del portal.</Text>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   <Select value={selectedClaimsStatus} onValueChange={setSelectedClaimsStatus}>
                     <SelectItem value="ALL">Todos</SelectItem>
                     <SelectItem value="CERRADO">Cerrados en portal</SelectItem>
                     <SelectItem value="REPORTADO">Reportados</SelectItem>
                     <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                     <SelectItem value="SIN_SERIE">Sin serie</SelectItem>
                   </Select>
                   <input
                     value={claimsSearch}
                     onChange={(event) => setClaimsSearch(event.target.value)}
                     placeholder="Buscar OS, modelo o IMEI"
                     className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                   />
                 </div>
               </Flex>

               <div className="overflow-x-auto">
                 <table className="min-w-full border border-slate-200 text-sm">
                   <thead className="bg-slate-50">
                     <tr>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Cierre</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Modelo</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Serie / IMEI</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Canal</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Match portal</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                     </tr>
                   </thead>
                   <tbody>
                     {claimsFilteredRows.length ? claimsFilteredRows.map((row) => (
                       <tr key={`${row.os}-${row.series}`} className="odd:bg-white even:bg-slate-50/60">
                         <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.os}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.closedAt}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.model}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.series}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.channel}</td>
                         <td className="border border-slate-200 px-3 py-2">{row.portalMatch}</td>
                         <td className="border border-slate-200 px-3 py-2">
                           <Badge color={row.validationStatus === 'Cerrado en portal' ? 'emerald' : row.validationStatus === 'Reportado en Xiaomi' ? 'blue' : row.validationStatus === 'Pendiente de carga' ? 'amber' : 'slate'}>
                             {row.validationStatus}
                           </Badge>
                         </td>
                       </tr>
                     )) : (
                       <tr>
                         <td colSpan={7} className="border border-slate-200 px-3 py-6 text-center text-slate-500">
                           No hay coincidencias para los filtros actuales.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
