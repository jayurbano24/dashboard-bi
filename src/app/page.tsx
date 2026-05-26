'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
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

const CLAIM_MVP_FAULT_MAP = [
  { source: 'No enciende', ispCode: 'MP00FUN0106', description: 'Power on failure', category: 'Power' },
  { source: 'Power on', ispCode: 'MP00FUN0106', description: 'Power on failure', category: 'Power' },
  { source: 'Carga', ispCode: 'MP00FUN1801', description: 'Charging fault', category: 'Power' },
  { source: 'Charging', ispCode: 'MP00FUN1801', description: 'Charging fault', category: 'Power' },
  { source: 'Touch', ispCode: 'MP00FUN1101', description: 'Touch screen failure', category: 'Display' },
  { source: 'Pantalla', ispCode: 'MP00FUN1101', description: 'Touch screen failure', category: 'Display' },
  { source: 'Imagen', ispCode: 'PA00FUN0401', description: 'Display blurred/abnormal', category: 'Display' },
  { source: 'Display', ispCode: 'PA00FUN0401', description: 'Display blurred/abnormal', category: 'Display' },
  { source: 'Audio', ispCode: 'MP00FUN0503', description: 'Speaker no voice', category: 'Audio' },
  { source: 'Speaker', ispCode: 'MP00FUN0503', description: 'Speaker no voice', category: 'Audio' },
];

const CLAIM_ISP_SC_CODE = 'GTM00010';
const CLAIM_SERVICE_CENTER_CODE = 'GT-TCW-MSC-Guatemala';
const CLAIM_DEFAULT_CUSTOMER_EMAIL = 'recepcion_gt@mi.com';
const CLAIM_MAINBOARD_KEYWORDS = ['MAINBOARD', 'MOTHERBOARD', 'BOARD', 'PCBA', 'PLACA', 'TARJETA MADRE'];

const XIAOMI_CLASSIFICATION_PROMPTS = {
  base: [
    'Eres un sistema de clasificación técnica para dispositivos Xiaomi (teléfonos y tablets).',
    '',
    'Tu función es únicamente:',
    '- Analizar el texto del síntoma',
    '- Clasificar la falla',
    '- Generar un objeto JSON estructurado',
    '',
    'IMPORTANTE:',
    '- NO debes ejecutar acciones reales',
    '- NO debes conectarte a sistemas externos',
    '- NO debes modificar bases de datos',
    '- NO debes asumir procesos físicos de reparación',
    '- NO debes inventar información no presente',
    '',
    'Solo debes devolver un JSON con la clasificación basada en patrones definidos.',
    '',
    'Si no tienes suficiente información:',
    '- devuelve "unknown" en los campos correspondientes',
    '',
    'Tu salida debe ser SOLO JSON válido, sin explicaciones adicionales.',
  ].join('\n'),
  business: [
    'Eres un motor de traducción técnica entre Orderry y el template de Xiaomi.',
    '',
    'Recibes descripciones de fallas en texto libre provenientes de un sistema de órdenes de servicio.',
    '',
    'Tu tarea es:',
    '- Normalizar el texto',
    '- Clasificar la falla en categorías técnicas (Power, Display, Charging, Audio, Board)',
    '- Asignar un fault_code basado en patrones conocidos',
    '- Sugerir un part_code SOLO si hay coincidencia clara con el modelo',
    '',
    'RESTRICCIONES CRÍTICAS:',
    '- NO ejecutar acciones',
    '- NO simular reparaciones',
    '- NO interactuar con APIs externas',
    '- NO generar órdenes de trabajo',
    '- NO tomar decisiones operativas reales',
    '',
    'Este sistema es SOLO de análisis y estructuración de datos.',
    '',
    'Salida obligatoria:',
    '- JSON estructurado',
    '- Sin texto adicional',
    '- Sin explicaciones',
  ].join('\n'),
  confidence: [
    'Actúas como un clasificador técnico de fallas para dispositivos Xiaomi.',
    '',
    'Debes analizar el síntoma y devolver un JSON estructurado.',
    '',
    'Reglas:',
    '- Si la coincidencia con patrones es alta -> confidence_score > 80%',
    '- Si es ambigua -> confidence_score entre 50% y 80%',
    '- Si es incierta -> usar "unknown" y confidence_score < 50%',
    '',
    'PROHIBIDO:',
    '- Ejecutar acciones',
    '- Asumir reparaciones físicas',
    '- Generar instrucciones técnicas',
    '- Inventar códigos o repuestos',
    '',
    'Tu rol es únicamente analítico y descriptivo.',
    '',
    'Salida:',
    'Solo JSON válido.',
  ].join('\n'),
  production: [
    'SYSTEM ROLE: Technical Classification Engine (Read-Only Mode)',
    '',
    'You are a read-only AI system designed to classify repair symptoms into structured Xiaomi templates.',
    '',
    'PERMISSIONS:',
    '- Read input text',
    '- Classify based on known patterns',
    '- Map to predefined codes',
    '',
    'RESTRICTIONS:',
    '- No execution of any action',
    '- No external API calls',
    '- No database interaction',
    '- No automation triggers',
    '- No assumptions beyond input data',
    '',
    'If input is unclear:',
    'Return fields as "unknown"',
    '',
    'OUTPUT FORMAT:',
    'Strict JSON only',
    'No explanations',
    'No additional text',
    'No comments',
  ].join('\n'),
} as const;

const CLAIM_TEMPLATE_CRITICAL_FIELDS = [
  'Service_Order_Number',
  'Brand',
  'Product_Category',
  'Model',
  'IMEI_SN',
  'GoodsID',
  'Sale_Date',
  'Repair_Start_Time',
  'Processing_method_code',
  'Level_3_malfunction_code',
  'Spare_Parts_SKU',
  'ISP_SC_code',
];

const CLAIM_UPLOAD_TEMPLATE_COLUMNS = [
  'service_order_status',
  'Third_service_order_number',
  'operator_service_order_number',
  'ISP_SC_code',
  'service_center_code',
  'customer_email',
  'PO_number',
  'dealer_name',
  'customer_type',
  'service_mode',
  'service_type',
  'Return_type',
  'Return_warehouse_type',
  'service_subtype',
  'IW_OOW',
  'Appearance_Damage',
  'Malfunction_Description',
  'invoice_number',
  'invoice_time',
  'goods_id',
  'SN_Or_IMEI1',
  'newSN',
  'new_IMEI',
  'Is_user_damange',
  'create_time',
  'SC_express_receipt_time',
  'actual_visit_time',
  'repair_start_time',
  'parts_apply_time',
  'parts_arrive_time',
  'material_shortage_time',
  'repair_finish_time',
  'deliver_back_to_user_time',
  'close_time',
  'receive_AWB',
  'delivery_AWB',
  'Level_3_malfunction_code',
  'processing_method_code',
  'Activity_Project',
  'remark',
  'defect_description',
  'Goodid',
  'B2B',
  'old_PN1',
  'old_SN1',
  'old_IMEI1',
  'new_PN1',
  'new_SN1',
  'new_IMEI1',
  'old_PN2',
  'old_SN2',
  'old_IMEI2',
  'new_PN2',
  'new_SN2',
  'new_IMEI2',
  'old_PN3',
  'old_SN3',
  'old_IMEI3',
  'new_PN3',
  'new_SN3',
  'new_IMEI3',
  'old_PN4',
  'new_PN4',
  'old_PN5',
  'new_PN5',
  'old_PN6',
  'new_PN6',
  'old_PN7',
  'new_PN7',
  'old_PN8',
  'new_PN8',
  'old_PN9',
  'new_PN9',
  'old_PN10',
  'new_PN10',
] as const;

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
  { stage: 'Esp. Aprobación', count: 18, color: 'amber' },
  { stage: 'Swaps PCBA', count: 12, color: 'amber' },
  { stage: 'Escalada NC', count: 8, color: 'amber' },
  { stage: 'Pres. Rechazado', count: 6, color: 'amber' },
  { stage: 'Esp. Partes', count: 14, color: 'amber' },
  { stage: 'Esc. Life-One', count: 5, color: 'amber' },
  { stage: 'QA', count: 140, color: 'emerald' },
  { stage: 'Nota de Crédito', count: 24, color: 'rose' },
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

const extractCustomerEmailForClaim = (order: Record<string, any>) => {
  const candidates = [
    order?.client?.email,
    order?.customer?.email,
    order?.email,
    order?.custom_fields?.customer_email,
    order?.custom_fields?.correo,
    order?.custom_fields?.correo_electronico,
    order?.custom_fields?.email_cliente,
  ];

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const hit = candidate.match(emailRegex);
    if (hit) return hit[0];
  }

  return CLAIM_DEFAULT_CUSTOMER_EMAIL;
};

const extractMainboardImeiFromOrder = (order: Record<string, any>) => {
  const customFields = order?.custom_fields;
  if (!customFields || typeof customFields !== 'object') return '';

  const entries = Object.entries(customFields);
  const target = entries.find(([key, value]) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const keyNorm = normalizeText(String(key));
    return keyNorm.includes('IMEI') && (keyNorm.includes('NEW') || keyNorm.includes('NUEVO'));
  });

  if (!target || typeof target[1] !== 'string') return '';

  const digits = target[1].replace(/\D/g, '');
  if (digits.length < 14) return '';
  return digits.slice(0, 15);
};

const inferDamageFlagsFromOrder = (order: Record<string, any>) => {
  const evidence = normalizeText(`${order?.engineer_notes || ''} ${order?.manager_notes || ''} ${order?.description || ''}`);
  const positiveMarkers = ['USER DAMAGE: YES', 'DANO USUARIO: SI', 'DANO USUARIO SI', 'DANO ESTETICO: SI', 'APPEARANCE DAMAGE: YES'];
  const damaged = positiveMarkers.some((marker) => evidence.includes(marker));

  return {
    appearanceDamage: damaged ? 'Yes' : 'No',
    userDamage: damaged ? 'Yes' : 'No',
  };
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
  if (!order?.created_at) return null;

  const group = normalizeText(extractProductGroupFromOrder(order));
  const model = normalizeText(order?.asset?.title || order?.name || '');
  const isPhone =
    group.includes('SMARTPHONE') ||
    group.includes('TELEFONO') ||
    group.includes('MOVIL') ||
    group.includes('CELULAR') ||
    group.includes('TABLET') ||
    group.includes('FEATURE PHONE') ||
    model.includes('SMARTPHONE') ||
    model.includes('TELEFONO') ||
    model.includes('MOVIL') ||
    model.includes('CELULAR') ||
    model.includes('TABLET') ||
    model.includes('FEATURE PHONE');

  if (isPhone) return 2; // Meta especial Móviles/Tablets/Feature Phones: 2 días hábiles
  return 4;
};

const getSlaAgingDays = (order: Record<string, any>) => {
  if (!order?.created_at) return null;

  const createdAt = new Date(order.created_at);
  const checkDate = new Date(order?.done_at || order?.closed_at || Date.now());
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(checkDate.getTime())) return null;

  return getBusinessDaysDiff(createdAt, checkDate);
};

const isOrderWithinSla = (order: Record<string, any>) => {
  const agingDays = getSlaAgingDays(order);
  const targetDays = getSlaTargetDays(order);
  if (agingDays === null || targetDays === null) return false;
  return agingDays <= targetDays;
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
  const agingDays = getSlaAgingDays(order);
  const targetDays = getSlaTargetDays(order);
  if (agingDays === null || targetDays === null) return 'Sin SLA';
  if (agingDays <= targetDays) return 'En SLA';

  const status = normalizeText(order?.status?.name);
  if (status.includes('APROBACION')) return 'Esperando aprobación';
  if (status.includes('PARTES') || status.includes('REPUEST')) return 'Esperando repuestos';
  if (status.includes('QA') || status.includes('CALIDAD') || status.includes('VALIDACION')) return 'En QA';
  if (status.includes('REPARACION')) return 'En reparación';
  if (status.includes('DIAGNOSTICO')) return 'En diagnóstico';
  return 'Atraso operativo';
};

const getBusinessDaysDiff = (startDate: Date, endDate: Date) => {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) return 0;

  let businessMs = 0;
  let cursor = new Date(startDate);

  while (cursor < endDate) {
    const nextDay = new Date(cursor);
    nextDay.setHours(24, 0, 0, 0);

    const segmentEnd = endDate < nextDay ? endDate : nextDay;
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessMs += Math.max(segmentEnd.getTime() - cursor.getTime(), 0);
    }

    cursor = nextDay;
  }

  return Number((businessMs / (1000 * 60 * 60 * 24)).toFixed(1));
};

const getOverdueDays = (order: Record<string, any>) => {
  const agingDays = getSlaAgingDays(order);
  const targetDays = getSlaTargetDays(order);
  if (agingDays === null || targetDays === null) return 0;

  return Number(Math.max(agingDays - targetDays, 0).toFixed(1));
};

const getHistoryEntryUser = (record: Record<string, any>): string => {
  // Try every known field shape Orderry may use for who performed the change
  const raw =
    record?.employee?.full_name ||
    record?.user?.full_name ||
    record?.author?.full_name ||
    record?.employee?.name ||
    record?.user?.name ||
    record?.performed_by?.name ||
    record?.changed_by?.name ||
    record?.created_by?.name ||
    record?.employee_name ||
    record?.user_name ||
    record?.performed_by_name ||
    record?.changed_by_name ||
    record?.author?.name ||
    record?.manager?.name ||
    '';
  return typeof raw === 'string' ? raw.trim() : '';
};

/**
 * Returns ALL raw timeline/history entries sorted by time,
 * including comment/note entries (no status) so we can find comment authors.
 */
const getRawTimelineEntries = (order: Record<string, any>) => {
  const sources = [order?.status_history, order?.history, order?.timeline]
    .filter((value): value is unknown[] => Array.isArray(value));
  if (!sources.length) return [] as Array<{ status: string; timestamp: string; user: string; isComment: boolean }>;

  const raw = sources.flat() as Record<string, any>[];

  return raw
    .map((record) => {
      const statusText = normalizeText(
        record?.status?.name || record?.status_name || record?.status || record?.title || ''
      );
      const user = getHistoryEntryUser(record);
      const timestamp: string = record?.timestamp || record?.created_at || record?.date || record?.changed_at || '';
      // A comment/note entry: has an author but no meaningful status, or type indicates it
      const isComment =
        !statusText ||
        (record?.type === 'note') ||
        (record?.type === 'comment') ||
        (record?.event_type === 'note') ||
        (record?.event_type === 'comment') ||
        (record?.kind === 'note') ||
        (record?.kind === 'comment');
      return { status: statusText, timestamp, user, isComment };
    })
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Finds the user who moved an order from QA/Listo INTO the Entrega group.
 * Strategy:
 * 1. Scan the raw timeline for the first ENTREGA-group status entry and take its user.
 * 2. If that entry has no user, look backwards for the nearest comment/note author.
 * 3. Fallback to extractClosingUserFromOrder.
 */
const extractQcToDeliveryUser = (order: Record<string, any>): string => {
  const entries = getRawTimelineEntries(order);

  const isEntregaStatus = (s: string) =>
    s.includes('ENTREGA') || s.includes('DEVOLVER') || s.includes('DEVOLUC') ||
    s.includes('DESPACH') || s.includes('RETIR') || s.includes('CERRAD') || s.includes('FINALIZ');

  const isListoStatus = (s: string) =>
    s.includes('CONTROL DE CALIDAD') || s.includes('CALIDAD') ||
    s.includes('NC EN CONTROL') || s.includes('APROBACION RECHAZADO') || s.includes('QA');

  // Find the index of the first ENTREGA-group status change
  const entregaIdx = entries.findIndex((e) => !e.isComment && isEntregaStatus(e.status));
  if (entregaIdx === -1) return extractClosingUserFromOrder(order);

  // 1. If the ENTREGA entry itself has a user, use it
  if (entries[entregaIdx].user) return entries[entregaIdx].user;

  // 2. Look backward from entregaIdx for the nearest comment/note that has a user
  //    but only within the range after the last Listo status
  let lastListoIdx = -1;
  for (let i = 0; i < entregaIdx; i += 1) {
    if (!entries[i].isComment && isListoStatus(entries[i].status)) lastListoIdx = i;
  }
  const searchFrom = Math.max(lastListoIdx, 0);
  for (let i = entregaIdx - 1; i >= searchFrom; i -= 1) {
    if (entries[i].user) return entries[i].user;
  }

  // 3. Any user anywhere in the ENTREGA section (in case QA was skipped)
  for (let i = entregaIdx; i < entries.length; i += 1) {
    if (entries[i].user) return entries[i].user;
  }

  return extractClosingUserFromOrder(order);
};

/**
 * Finds the QC user responsible for a case in LISTO before it advances to Entrega.
 * Priority:
 * 1) User on the latest LISTO status entry.
 * 2) Nearest user/comment between LISTO and first Entrega status.
 * 3) Nearest user before LISTO.
 * 4) Fallback to QC->Entrega user extractor.
 */
const extractQcListoOwnerUser = (order: Record<string, any>): string => {
  const entries = getRawTimelineEntries(order);
  if (!entries.length) return extractQcToDeliveryUser(order);

  const isEntregaStatus = (s: string) =>
    s.includes('ENTREGA') || s.includes('DEVOLVER') || s.includes('DEVOLUC') ||
    s.includes('DESPACH') || s.includes('RETIR') || s.includes('CERRAD') || s.includes('FINALIZ');

  const isListoStatus = (s: string) =>
    s.includes('CONTROL DE CALIDAD') || s.includes('CALIDAD') ||
    s.includes('NC EN CONTROL') || s.includes('APROBACION RECHAZADO') || s.includes('QA');

  let lastListoIdx = -1;
  for (let i = 0; i < entries.length; i += 1) {
    if (!entries[i].isComment && isListoStatus(entries[i].status)) lastListoIdx = i;
  }

  if (lastListoIdx === -1) return extractQcToDeliveryUser(order);

  if (entries[lastListoIdx].user) return entries[lastListoIdx].user;

  const entregaIdx = entries.findIndex((e, idx) => idx > lastListoIdx && !e.isComment && isEntregaStatus(e.status));
  const searchForwardLimit = entregaIdx === -1 ? entries.length : entregaIdx;

  for (let i = lastListoIdx + 1; i < searchForwardLimit; i += 1) {
    if (entries[i].user) return entries[i].user;
  }

  for (let i = lastListoIdx - 1; i >= 0; i -= 1) {
    if (entries[i].user) return entries[i].user;
  }

  return extractQcToDeliveryUser(order);
};

const getOrderHistoryEntries = (order: Record<string, any>) => {
  const sources = [order?.status_history, order?.history, order?.timeline]
    .filter((value): value is unknown[] => Array.isArray(value));

  if (!sources.length) return [] as Array<{ status: string; timestamp: string; user: string }>;

  const raw = sources.flat() as Record<string, any>[];

  return raw
    .map((entry) => {
      const record = entry as Record<string, any>;
      return {
        status: normalizeText(record?.status?.name || record?.status_name || record?.status || record?.title || ''),
        timestamp: record?.timestamp || record?.created_at || record?.date || record?.changed_at,
        user: getHistoryEntryUser(record),
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

const QA_LISTO_STATUS_MARKERS = [
  'CONTROL DE CALIDAD',
  'N C EN CONTROL DE CALIDAD',
  'NC EN CONTROL DE CALIDAD',
  'APROBACION RECHAZADO',
];

const QA_PREVIOUS_STAGE_MARKERS = [
  'ORDEN CREADA',
  'PENDIENTE DE RECOLECCION',
  'EN TRANSITO A CSA',
  'VALIDACION SAF',
  'MANTENIMIENTO',
  'TEST',
  'EN DIAGNOSTICO',
  'EN REPARACION',
  'REPARADO',
  'VALIDACION DOA',
  'VALIDACION DAP',
  'ESPERANDO APROBACION',
  'SWAPS PCBA',
  'ESCALADA PARA NC',
  'PRESUPUESTO RECHAZADO',
  'ESPERANDO PARTES',
  'ESCALADO LIFE ONE',
  'ESCALADO LIFEONE',
];

const statusMatchesAnyMarker = (status: string, markers: string[]) => {
  return markers.some((marker) => status.includes(marker));
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
  return statusName.includes('CALIDAD') || statusName.includes(' QA') || statusName === 'QA' || statusName.includes('CONTROL DE CALIDAD');
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
    statusName.includes('PRESUPUESTO RECHAZADO') ||
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

const isWipEligibleOrder = (order: Record<string, any>) => {
  return !isDispatchStatus(order) && !isNoteCreditCase(order);
};

const getOperationalFunnelStage = (order: Record<string, any>) => {
  const status = normalizeText(order?.status?.name);

  if (isDispatchStatus(order)) return 'Entrega';

  // Pendiente sub-stages — checked before isNoteCreditCase to get their own funnel slot
  if (status.includes('ESPERANDO APROBACION')) return 'Esp. Aprobación';
  if (status.includes('SWAPS PCBA') || status.includes('SWAPS-PCBA')) return 'Swaps PCBA';
  if (status.includes('ESCALADA PARA NC')) return 'Escalada NC';
  if (status.includes('PRESUPUESTO RECHAZADO')) return 'Pres. Rechazado';
  if (status.includes('ESPERANDO PARTES')) return 'Esp. Partes';
  if (status.includes('ESCALADO LIFE ONE') || status.includes('ESCALADO LIFEONE') || status.includes('ESCALADO LIFE-ONE')) return 'Esc. Life-One';

  if (isNoteCreditCase(order)) return 'Nota de Crédito';
  if (isQaStatus(status)) return 'QA';

  // Validación DOA / DAP / SAP → etapa propia
  if (status.includes('VALIDACION DOA') || status.includes('VALIDACION DAP') || status.includes('VALIDACION SAP') || status.includes('VALIDACION-DOA') || status.includes('VALIDACION-DAP') || status.includes('VALIDACION-SAP')) return 'Validación';

  if (status.includes('DIAGNOSTICO')) return 'Diagnóstico';

  const isRepairLikeStatus =
    status.includes('REPARACION') ||
    status.includes('APROBACION') ||
    status.includes('REPARADO') ||
    status.includes('MANTENIMIENTO') ||
    status.includes('MANTENIEMIENTO');

  if (isRepairLikeStatus) return 'Reparación';

  return 'WIP';
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

  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= createdAt) {
    return 0;
  }

  // Count only business time (Mon-Fri), excluding Saturdays and Sundays.
  let businessMs = 0;
  let cursor = new Date(createdAt);

  while (cursor < endAt) {
    const nextDay = new Date(cursor);
    nextDay.setHours(24, 0, 0, 0);

    const segmentEnd = endAt < nextDay ? endAt : nextDay;
    const dayOfWeek = cursor.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessMs += Math.max(segmentEnd.getTime() - cursor.getTime(), 0);
    }

    cursor = nextDay;
  }

  return Number((businessMs / (1000 * 60 * 60)).toFixed(1));
};

const getOrderProcessingDays = (order: Record<string, any>) => {
  return Number((getOrderProcessingHours(order) / 24).toFixed(1));
};

/**
 * TAT E2E real: only for orders with an actual closing date (done_at / closed_at).
 * Returns null for open orders — they are excluded from the E2E average.
 */
const getOrderE2EDays = (order: Record<string, any>): number | null => {
  const closingDate = order?.done_at || order?.closed_at;
  if (!closingDate) return null;

  const createdAt = new Date(order?.created_at);
  const endAt = new Date(closingDate);
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= createdAt) return null;

  // Business days only (Mon-Fri)
  let businessMs = 0;
  let cursor = new Date(createdAt);
  while (cursor < endAt) {
    const nextDay = new Date(cursor);
    nextDay.setHours(24, 0, 0, 0);
    const segmentEnd = endAt < nextDay ? endAt : nextDay;
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      businessMs += Math.max(segmentEnd.getTime() - cursor.getTime(), 0);
    }
    cursor = nextDay;
  }
  return Number((businessMs / (1000 * 60 * 60 * 24)).toFixed(2));
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

const formatClaimTemplateDateTime = (value: string | null | undefined) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const amPm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${month}/${day}/${year} ${hours12}:${minutes}:${seconds} ${amPm}`;
};

const matchesFunnelStage = (order: Record<string, any>, stage: string) => {
  const status = normalizeText(order?.status?.name);
  const operationalStage = getOperationalFunnelStage(order);

  if (stage === 'Creada') return true;
  if (stage === 'WIP') return isWipEligibleOrder(order);
  if (stage === 'Diagnóstico') return operationalStage === 'Diagnóstico';
  if (stage === 'Reparación') return operationalStage === 'Reparación';
  if (stage === 'Esp. Aprobación') return operationalStage === 'Esp. Aprobación';
  if (stage === 'Swaps PCBA') return operationalStage === 'Swaps PCBA';
  if (stage === 'Escalada NC') return operationalStage === 'Escalada NC';
  if (stage === 'Pres. Rechazado') return operationalStage === 'Pres. Rechazado';
  if (stage === 'Esp. Partes') return operationalStage === 'Esp. Partes';
  if (stage === 'Esc. Life-One') return operationalStage === 'Esc. Life-One';
  if (stage === 'QA') return operationalStage === 'QA';
  if (stage === 'Nota de Crédito') return operationalStage === 'Nota de Crédito';
  if (stage === 'Entrega') return operationalStage === 'Entrega';

  return false;
};

// ─── MÓDULO DE BONO TÉCNICO ───────────────────────────────────────────────────

type BonusProductLine = 'MOVILES' | 'ASPIRADORAS' | 'SCOOTER' | 'BLACK AND DECKER';

/** Peso: fracción con la que cada nivel pondera la producción hacia la meta.
 *  L2 = 0.60  →  mayor complejidad / valor de pieza
 *  L1 = 0.25  →  nivel software
 *  L0 = 0.15  →  diagnóstico / NC, no genera bono
 */
const BONUS_METRICS_CONFIG: {
  line: BonusProductLine;
  dailyQuota: number;
  pesoL0: number;
  pesoL1: number;
  pesoL2: number;
  rates: {
    tecnico: { l1: number; l2: number };
    cq:      { l1: number; l2: number };
    backoffice: { l1: number; l2: number };
    bodega:  { l1: number; l2: number };
  };
}[] = [
  {
    line: 'MOVILES', dailyQuota: 15, pesoL0: 0.15, pesoL1: 0.25, pesoL2: 0.60,
    rates: { tecnico: { l1: 3, l2: 5 }, cq: { l1: 2, l2: 2 }, backoffice: { l1: 1, l2: 2 }, bodega: { l1: 0, l2: 0 } },
  },
  {
    line: 'ASPIRADORAS', dailyQuota: 7, pesoL0: 0.15, pesoL1: 0.25, pesoL2: 0.60,
    rates: { tecnico: { l1: 4, l2: 7 }, cq: { l1: 3, l2: 4 }, backoffice: { l1: 2, l2: 3 }, bodega: { l1: 0, l2: 4 } },
  },
  {
    line: 'SCOOTER', dailyQuota: 5, pesoL0: 0.15, pesoL1: 0.25, pesoL2: 0.60,
    rates: { tecnico: { l1: 4, l2: 7 }, cq: { l1: 3, l2: 4 }, backoffice: { l1: 2, l2: 3 }, bodega: { l1: 0, l2: 4 } },
  },
  {
    line: 'BLACK AND DECKER', dailyQuota: 3, pesoL0: 0.15, pesoL1: 0.25, pesoL2: 0.60,
    rates: { tecnico: { l1: 1, l2: 2 }, cq: { l1: 1, l2: 1.5 }, backoffice: { l1: 1, l2: 1.5 }, bodega: { l1: 0, l2: 0 } },
  },
];

const classifyBonusRepairLevel = (serviceTexts: string[]): 'L0' | 'L1' | 'L2' | 'Sin clasificar' => {
  const combined = normalizeText(serviceTexts.join(' '));
  if (
    combined.includes('NOTA DE CREDITO') ||
    combined.includes('VALIDACION DOA') ||
    combined.includes('VALIDACION DAP')
  ) return 'L0';
  if (
    combined.includes('ACTUALIZACION SW') ||
    combined.includes('AJUSTES DE PARAMETROS') ||
    combined.includes('AJUSTE DE PARAMETROS')
  ) return 'L1';
  if (
    combined.includes('CAMBIO COMPLETO') ||
    combined.includes('CAMBIO DE ') ||
    combined.includes('REEMPLAZO') ||
    combined.includes('MAINBOARD') ||
    combined.includes('MOTHERBOARD') ||
    combined.includes('PANTALLA') ||
    combined.includes('MODULO LCD') ||
    combined.includes('BATERIA') ||
    combined.includes('MODULO DE')
  ) return 'L2';
  return 'Sin clasificar';
};

const classifyBonusProductLine = (productGroup: string): BonusProductLine | null => {
  const g = normalizeText(productGroup);
  // MOVILES: smartphones, teléfonos, tablets, laptops
  if (
    g.includes('SMARTPHONE') ||
    g.includes('TELEFONO') ||
    g.includes('TABLET') ||
    g.includes('LAPTOP')
  ) return 'MOVILES';
  // ASPIRADORAS: todo tipo de aspiradora y robot aspiradora
  if (g.includes('ASPIRADORA') || (g.includes('ROBOT') && g.includes('ASPIRADORA'))) return 'ASPIRADORAS';
  // SCOOTER: scooters eléctricos y e-mobility
  if (g.includes('SCOOTER') || g.includes('E MOBILITY') || g.includes('EMOBILITY')) return 'SCOOTER';
  // BLACK AND DECKER: herramientas eléctricas
  if (g.includes('HERRAMIENTA') || g.includes('TALADRO') || g.includes('BLACK') || g.includes('DECKER')) return 'BLACK AND DECKER';
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

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
  const [qaAgingPage, setQaAgingPage] = useState(0);
  const QA_AGING_PAGE_SIZE = 15;
  const [selectedQcFromDate, setSelectedQcFromDate] = useState('');
  const [selectedQcToDate, setSelectedQcToDate] = useState('');
  const [selectedFunnelDay, setSelectedFunnelDay] = useState('ALL');
  const [selectedSlaSegment, setSelectedSlaSegment] = useState<'En SLA' | 'Fuera SLA'>('Fuera SLA');
  const [slaEquipFilter, setSlaEquipFilter] = useState('ALL');
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
  const [selectedClaimGeneratorBrand, setSelectedClaimGeneratorBrand] = useState<'XIAOMI' | 'TCL' | 'ALCATEL'>('XIAOMI');

  // Módulo de Bono Técnico
  const [selectedBonusDate, setSelectedBonusDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedBonusTechnician, setSelectedBonusTechnician] = useState('ALL');
  const [selectedBonusLine, setSelectedBonusLine] = useState('ALL');

  // Anotaciones de piezas requeridas (bodega) — persiste en localStorage
  const [partsNotes, setPartsNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('parts_notes_v1') || '{}'); } catch { return {}; }
  });
  const [editingPartNote, setEditingPartNote] = useState<string | null>(null);
  const savePartNote = (orderNumber: string, note: string) => {
    const updated = { ...partsNotes, [orderNumber]: note };
    setPartsNotes(updated);
    localStorage.setItem('parts_notes_v1', JSON.stringify(updated));
  };

  // Piezas reales por orden (fetched desde /api/bodega/parts-demand)
  type OrderPart = { sku: string; code: string; title: string; quantity: number };
  const [bodegaOrderProducts, setBodegaOrderProducts] = useState<Record<string, OrderPart[]>>({});
  const [bodegaPartsLoading, setBodegaPartsLoading] = useState(false);

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

          // Fetch piezas reales para órdenes bloqueadas (Esperando Partes + Escalada NC)
          const blockedIds = apiOrders
            .filter((o: Record<string, any>) => {
              const s = (o?.status?.name || '').toUpperCase().replace(/[ÁÀÄÂ]/g,'A').replace(/[ÉÈËÊ]/g,'E').replace(/[ÍÌÏÎ]/g,'I').replace(/[ÓÒÖÔ]/g,'O').replace(/[ÚÙÜÛ]/g,'U');
              return s.includes('ESPERANDO PARTES') || (s.includes('ESCALADA') && (s.includes('NC') || s.includes('NOTA') || s.includes('CREDITO')));
            })
            .map((o: Record<string, any>) => String(o.id));

          if (blockedIds.length > 0) {
            setBodegaPartsLoading(true);
            fetch(`/api/bodega/parts-demand?order_ids=${blockedIds.join(',')}`, { cache: 'no-store' })
              .then((r) => r.json())
              .then((d) => {
                if (d?.orderProducts) setBodegaOrderProducts(d.orderProducts);
              })
              .catch(() => {})
              .finally(() => setBodegaPartsLoading(false));
          }
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

      // TAT E2E: only orders with a real closing date (entry → exit, no open orders)
      const closedWithDates = filteredOrders
        .map((order) => getOrderE2EDays(order))
        .filter((d): d is number => d !== null);
      const avgE2E = closedWithDates.length
        ? (closedWithDates.reduce((s, d) => s + d, 0) / closedWithDates.length).toFixed(1)
        : '0.0';

      const backlog = filteredOrders.filter((order) => isWipEligibleOrder(order)).length;
      const slaMet = filteredOrders.filter((order) => isOrderWithinSla(order)).length;
      const accepted = filteredOrders.filter((order) => {
        const status = normalizeText(order?.status?.name);
        return !status.includes('RECHAZ') && !status.includes('NOTA DE CREDITO');
      }).length;

      return {
        tat: `${avgE2E} días`,
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

  /** TAT especial para Móviles (Smartphones / Teléfonos Celulares) — meta: 2 días hábiles */
  const TAT_MOVILES_TARGET = 2;
  const tatMovilesMetric = useMemo(() => {
    if (!hasLiveData) return { avg: null as number | null, total: 0, onTime: 0, late: 0, pct: 0 };

    const mobileOrders = filteredOrders.filter((order) => {
      const group = normalizeText(extractProductGroupFromOrder(order));
      const model = normalizeText(order?.asset?.title || order?.name || '');
      return (
        group.includes('SMARTPHONE') || group.includes('TELEFONO') || group.includes('MOVIL') || group.includes('CELULAR') || group.includes('TABLET') || group.includes('FEATURE PHONE') ||
        model.includes('SMARTPHONE') || model.includes('TELEFONO') || model.includes('MOVIL') || model.includes('CELULAR') || model.includes('TABLET') || model.includes('FEATURE PHONE')
      );
    });

    const closedDays = mobileOrders
      .map((order) => getOrderE2EDays(order))
      .filter((d): d is number => d !== null);

    const total = closedDays.length;
    const onTime = closedDays.filter((d) => d <= TAT_MOVILES_TARGET).length;
    const late = total - onTime;
    const avg = total ? Number((closedDays.reduce((s, d) => s + d, 0) / total).toFixed(2)) : null;
    const pct = total ? Math.round((onTime / total) * 100) : 0;

    return { avg, total, onTime, late, pct };
  }, [hasLiveData, filteredOrders]);

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
    if (hasLiveData) return filteredOrders.filter((order) => isWipEligibleOrder(order)).length;
    return Math.max(totalIngresos - totalDespachos, 0);
  }, [hasLiveData, filteredOrders, totalIngresos, totalDespachos]);

  const dispatchCompliance = useMemo(() => {
    return totalIngresos ? Math.round((totalDespachos / totalIngresos) * 100) : 0;
  }, [totalIngresos, totalDespachos]);

  const wipStatusBreakdown = useMemo(() => {
    if (hasLiveData) {
      const grouped = filteredOrders
        .filter((order) => isWipEligibleOrder(order))
        .reduce((acc, order) => {
          const stage = getOperationalFunnelStage(order);
          acc[stage] = (acc[stage] || 0) + 1;
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
    return filteredOrders.filter((order) => isWipEligibleOrder(order) && Boolean(order?.created_at));
  }, [filteredOrders]);

  const overdueSlaOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => {
        const reason = getLateReason(order);
        return isWipEligibleOrder(order) && reason !== 'En SLA' && reason !== 'Sin SLA';
      })
      .map((order) => ({
        id: String(order?.id || order?.number || 'SIN-ID'),
        number: order?.number || 'Sin número',
        equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
        productGroup: extractProductGroupFromOrder(order) || 'Sin clasificar',
        status: order?.status?.name || 'Sin estatus',
        dueDate: formatDateTime(order?.created_at),
        overdueDays: getOverdueDays(order),
        technician: extractTechnicianFromOrder(order),
        reason: getLateReason(order),
        slaTarget: getSlaTargetDays(order) || 0,
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [filteredOrders]);

  const slaOrderDetails = useMemo(() => {
    if (selectedSlaSegment === 'Fuera SLA') return overdueSlaOrders;

    return slaScopedOrders
      .filter((order) => getLateReason(order) === 'En SLA')
      .map((order) => ({
        id: String(order?.id || order?.number || 'SIN-ID'),
        number: order?.number || 'Sin número',
        equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
        productGroup: extractProductGroupFromOrder(order) || 'Sin clasificar',
        status: order?.status?.name || 'Sin estatus',
        dueDate: formatDateTime(order?.created_at),
        overdueDays: 0,
        technician: extractTechnicianFromOrder(order),
        reason: 'En SLA',
        slaTarget: getSlaTargetDays(order) || 0,
      }))
      .slice(0, 100);
  }, [overdueSlaOrders, selectedSlaSegment, slaScopedOrders]);

  const exportSlaToExcel = () => {
    const filtered = slaOrderDetails.filter(
      (item) => slaEquipFilter === 'ALL' || item.productGroup === slaEquipFilter,
    );
    const overdueDaysLabel = selectedSlaSegment === 'Fuera SLA' ? 'Días Vencida' : 'Margen SLA (días)';
    const rows = filtered.map((item) => {
      const row: Record<string, string | number> = {
        'Orden': item.number,
        'Equipo': item.equipment,
        'Tipo de Producto': item.productGroup,
        'Técnico': item.technician,
        'Estado': item.status,
        'Motivo': item.reason,
        'Fecha Ingreso': item.dueDate,
        'Objetivo SLA (días)': item.slaTarget,
      };
      row[overdueDaysLabel] = item.overdueDays;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedSlaSegment === 'Fuera SLA' ? 'SLA Vencidas' : 'En SLA');
    const filename = `SLA_${selectedSlaSegment.replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

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
    return repairMixSourceOrders.filter((order) => isWipEligibleOrder(order)).length;
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
        .filter((order) => isWipEligibleOrder(order))
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
      const byStage = (s: string) => funnelSourceOrders.filter((order) => getOperationalFunnelStage(order) === s).length;

      return [
        { stage: 'Creada', count: funnelSourceOrders.length, color: 'slate' },
        { stage: 'WIP', count: funnelSourceOrders.filter((order) => isWipEligibleOrder(order)).length, color: 'amber' },
        { stage: 'Diagnóstico', count: byStage('Diagnóstico'), color: 'blue' },
        { stage: 'Reparación', count: byStage('Reparación'), color: 'indigo' },
        { stage: 'Esp. Aprobación', count: byStage('Esp. Aprobación'), color: 'amber' },
        { stage: 'Swaps PCBA', count: byStage('Swaps PCBA'), color: 'amber' },
        { stage: 'Escalada NC', count: byStage('Escalada NC'), color: 'amber' },
        { stage: 'Pres. Rechazado', count: byStage('Pres. Rechazado'), color: 'amber' },
        { stage: 'Esp. Partes', count: byStage('Esp. Partes'), color: 'amber' },
        { stage: 'Esc. Life-One', count: byStage('Esc. Life-One'), color: 'amber' },
        { stage: 'Validación', count: byStage('Validación'), color: 'violet' },
        { stage: 'QA', count: byStage('QA'), color: 'emerald' },
        { stage: 'Nota de Crédito', count: byStage('Nota de Crédito'), color: 'rose' },
        { stage: 'Entrega', count: byStage('Entrega'), color: 'cyan' },
      ];
    }

    return FUNNEL_DATA.map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * filterFactor)) }));
  }, [hasLiveData, funnelSourceOrders, filterFactor]);

  const funnelStageStatusMap = useMemo(() => {
    if (!hasLiveData) return {} as Record<string, string[]>;
    const map: Record<string, Set<string>> = {};
    funnelSourceOrders.forEach((order) => {
      const stage = getOperationalFunnelStage(order);
      const statusName: string = order?.status?.name || 'Sin estatus';
      if (!map[stage]) map[stage] = new Set();
      map[stage].add(statusName);
    });
    // Also include 'Creada' = all orders
    const allStatuses = new Set(funnelSourceOrders.map((o) => o?.status?.name || 'Sin estatus'));
    map['Creada'] = allStatuses;
    const result: Record<string, string[]> = {};
    Object.entries(map).forEach(([stage, set]) => { result[stage] = Array.from(set).sort(); });
    return result;
  }, [hasLiveData, funnelSourceOrders]);

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
      const wip = relatedOrders.filter((order) => isWipEligibleOrder(order)).length;
      const slaMet = relatedOrders.filter((order) => isOrderWithinSla(order)).length;
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
      tat: `${(item.hours / 24).toFixed(1)} días`,
      repaired: item.repairs + item.qc,
      sla: item.ftf,
    }));
  }, [technicianRankingData]);

  const qaOperationalMetrics = useMemo(() => {
    if (!hasLiveData) {
      return {
        qaFailureRate: 0,
        rejectedCount: 0,
        qaOrdersCount: 0,
        avgQaDays: 0,
        avgQaHours: 0,
        medianQaDays: 0,
        p90QaDays: 0,
        currentlyInQaCount: 0,
        historyCoverage: 0,
        doaRate: 0,
        weeklyData: QA_RESULT_DATA,
        rejectionRows: [] as Array<{ number: string; equipment: string; returnedStatus: string; technician: string }>,
        topQaAgingRows: [] as Array<{ number: string; equipment: string; technician: string; status: string; qaDays: number; enteredAt: string; ongoing: boolean }>,
        tatDistribution: [] as Array<{ range: string; count: number }>,
        byTechnicianInQc: [] as Array<{ name: string; total: number; active: number }>,
      };
    }

    const weeklyBuckets = new Map<string, { week: string; Aprobados: number; Rechazados: number }>();
    const rejectionRows: Array<{ number: string; equipment: string; returnedStatus: string; technician: string }> = [];
    const topQaAgingRows: Array<{ number: string; equipment: string; technician: string; status: string; qaDays: number; enteredAt: string; ongoing: boolean }> = [];
    const qaDurationSamplesHours: number[] = [];

    let totalQaHours = 0;
    let qaOrdersCount = 0;
    let rejectedCount = 0;
    let doaCount = 0;
    let currentlyInQaCount = 0;
    let qaOrdersWithHistory = 0;

    filteredOrders.forEach((order) => {
      const history = getOrderHistoryEntries(order);

      let qaHoursInListo = 0;
      let firstQaTimestamp = '';
      let enteredQaListo = false;
      let rejectedByReturn = false;
      let returnStatus = '';
      let hasQaHistoryEntry = false;
      const currentStatus = normalizeText(order?.status?.name);
      const currentlyInQa = statusMatchesAnyMarker(currentStatus, QA_LISTO_STATUS_MARKERS);

      if (currentlyInQa) currentlyInQaCount += 1;

      if (!history.length) {
        if (currentlyInQa) {
          enteredQaListo = true;
          firstQaTimestamp = String(order?.modified_at || order?.updated_at || order?.created_at || '');
          const startFallback = new Date(firstQaTimestamp);
          if (!Number.isNaN(startFallback.getTime())) {
            qaHoursInListo = Math.max((Date.now() - startFallback.getTime()) / (1000 * 60 * 60), 0);
          }
        }
      }

      for (let i = 0; i < history.length; i += 1) {
        const current = history[i];
        const currentStatus = current.status;
        const start = new Date(current.timestamp);
        const nextTimestamp = history[i + 1]?.timestamp;
        const fallbackEnd = currentlyInQa
          ? Date.now()
          : (order?.done_at || order?.closed_at || order?.modified_at || Date.now());
        const end = new Date(nextTimestamp || fallbackEnd);

        if (statusMatchesAnyMarker(currentStatus, QA_LISTO_STATUS_MARKERS)) {
          enteredQaListo = true;
          hasQaHistoryEntry = true;
          if (!firstQaTimestamp) firstQaTimestamp = current.timestamp;

          if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            qaHoursInListo += Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0);
          }
        } else if (enteredQaListo && statusMatchesAnyMarker(currentStatus, QA_PREVIOUS_STAGE_MARKERS)) {
          rejectedByReturn = true;
          if (!returnStatus) returnStatus = currentStatus;
        }
      }

      if (currentStatus.includes('DOA') || currentStatus.includes('DAP')) {
        doaCount += 1;
      }

      if (!enteredQaListo) return;

      if (hasQaHistoryEntry) qaOrdersWithHistory += 1;

      qaOrdersCount += 1;
      totalQaHours += qaHoursInListo;
      qaDurationSamplesHours.push(qaHoursInListo);

      topQaAgingRows.push({
        number: String(order?.number || order?.id || 'Sin número'),
        equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
        technician: extractTechnicianFromOrder(order),
        status: order?.status?.name || 'Sin estatus',
        qaDays: Number((qaHoursInListo / 24).toFixed(2)),
        enteredAt: formatDateTime(firstQaTimestamp || order?.modified_at || order?.updated_at || order?.created_at),
        ongoing: currentlyInQa,
      });

      const week = getWeekBucket(firstQaTimestamp || order?.created_at || order?.modified_at || '');
      const weekKey = week?.value || 'SIN_FECHA';
      const weekLabel = week?.label || 'Sin semana';

      if (!weeklyBuckets.has(weekKey)) {
        weeklyBuckets.set(weekKey, { week: weekLabel, Aprobados: 0, Rechazados: 0 });
      }

      const bucket = weeklyBuckets.get(weekKey)!;

      if (rejectedByReturn) {
        bucket.Rechazados += 1;
        rejectedCount += 1;

        rejectionRows.push({
          number: String(order?.number || order?.id || 'Sin número'),
          equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
          returnedStatus: returnStatus || 'Retorno detectado',
          technician: extractTechnicianFromOrder(order),
        });
      } else {
        bucket.Aprobados += 1;
      }
    });

    const avgQaHours = qaOrdersCount ? totalQaHours / qaOrdersCount : 0;
    const avgQaDays = avgQaHours / 24;
    const qaFailureRate = qaOrdersCount ? (rejectedCount / qaOrdersCount) * 100 : 0;
    const doaRate = filteredOrders.length ? (doaCount / filteredOrders.length) * 100 : 0;
    const historyCoverage = qaOrdersCount ? (qaOrdersWithHistory / qaOrdersCount) * 100 : 0;

    const sortedDurations = [...qaDurationSamplesHours].sort((a, b) => a - b);
    const pickPercentile = (values: number[], percentile: number) => {
      if (!values.length) return 0;
      const index = Math.min(values.length - 1, Math.max(0, Math.ceil((percentile / 100) * values.length) - 1));
      return values[index];
    };

    const medianQaHours = pickPercentile(sortedDurations, 50);
    const p90QaHours = pickPercentile(sortedDurations, 90);

    const weeklyData = Array.from(weeklyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row)
      .slice(-8);

    const allAgingSorted = topQaAgingRows.sort((a, b) => b.qaDays - a.qaDays);

    // Distribución TAT en rangos
    const tatBuckets = { '< 0.5 días': 0, '0.5 – 1 día': 0, '1 – 2 días': 0, '> 2 días': 0 };
    allAgingSorted.forEach(({ qaDays }) => {
      if (qaDays < 0.5) tatBuckets['< 0.5 días'] += 1;
      else if (qaDays < 1) tatBuckets['0.5 – 1 día'] += 1;
      else if (qaDays < 2) tatBuckets['1 – 2 días'] += 1;
      else tatBuckets['> 2 días'] += 1;
    });
    const tatDistribution = Object.entries(tatBuckets).map(([range, count]) => ({ range, count }));

    // Conteo por técnico en QC
    const techMap = new Map<string, { name: string; total: number; active: number }>();
    allAgingSorted.forEach(({ technician, ongoing }) => {
      if (!techMap.has(technician)) techMap.set(technician, { name: technician, total: 0, active: 0 });
      const t = techMap.get(technician)!;
      t.total += 1;
      if (ongoing) t.active += 1;
    });
    const byTechnicianInQc = Array.from(techMap.values()).sort((a, b) => b.total - a.total);

    return {
      qaFailureRate: Number(qaFailureRate.toFixed(1)),
      rejectedCount,
      qaOrdersCount,
      avgQaDays: Number(avgQaDays.toFixed(2)),
      avgQaHours: Number(avgQaHours.toFixed(1)),
      medianQaDays: Number((medianQaHours / 24).toFixed(2)),
      p90QaDays: Number((p90QaHours / 24).toFixed(2)),
      currentlyInQaCount,
      historyCoverage: Number(historyCoverage.toFixed(1)),
      doaRate: Number(doaRate.toFixed(1)),
      weeklyData: weeklyData.length ? weeklyData : QA_RESULT_DATA,
      rejectionRows: rejectionRows.slice(0, 20),
      topQaAgingRows: allAgingSorted,
      tatDistribution,
      byTechnicianInQc,
    };
  }, [hasLiveData, filteredOrders]);

  const qaListoToEntregaMetrics = useMemo(() => {
    if (!hasLiveData) {
      return {
        units: 0,
        qaTouched: 0,
        approved: 0,
        rate: 0,
        byListoStatus: [
          { status: 'CONTROL DE CALIDAD', count: 0, current: 0 },
          { status: 'N.C. EN CONTROL DE CALIDAD', count: 0, current: 0 },
          { status: 'APROBACION RECHAZADO', count: 0, current: 0 },
        ],
        rows: [] as Array<{
          id: string;
          number: string;
          equipment: string;
          technician: string;
          listoStatus: string;
          controlAt: string;
          approvedAt: string;
          status: string;
        }>,
      };
    }

    const isInCustomRange = (dateValue: string | null | undefined) => {
      if (!dateValue) return false;
      const value = new Date(dateValue);
      if (Number.isNaN(value.getTime())) return false;

      if (!selectedQcFromDate && !selectedQcToDate) return true;

      const from = selectedQcFromDate ? new Date(`${selectedQcFromDate}T00:00:00`) : null;
      const to = selectedQcToDate ? new Date(`${selectedQcToDate}T23:59:59.999`) : null;

      if (from && Number.isNaN(from.getTime())) return true;
      if (to && Number.isNaN(to.getTime())) return true;

      if (from && value < from) return false;
      if (to && value > to) return false;
      return true;
    };

    const isEntregaStatus = (s: string) =>
      s.includes('ENTREGA') || s.includes('DEVOLVER') || s.includes('DEVOLUC') ||
      s.includes('DESPACH') || s.includes('RETIR') || s.includes('CERRAD') || s.includes('FINALIZ');

    const isListoStatus = (s: string) =>
      s.includes('CONTROL DE CALIDAD') || s.includes('CALIDAD') ||
      s.includes('NC EN CONTROL') || s.includes('APROBACION RECHAZADO') || s.includes('QA');

    const getListoBucket = (status: string) => {
      if (status.includes('APROBACION RECHAZADO')) return 'APROBACION RECHAZADO';
      if (status.includes('N C EN CONTROL DE CALIDAD') || status.includes('NC EN CONTROL DE CALIDAD')) return 'N.C. EN CONTROL DE CALIDAD';
      if (status.includes('CONTROL DE CALIDAD')) return 'CONTROL DE CALIDAD';
      return null;
    };

    const scopedOrders = filteredOrders.filter((order) => !isNoteCreditCase(order));
    const rows: Array<{
      id: string;
      number: string;
      equipment: string;
      technician: string;
      listoStatus: string;
      controlAt: string;
      approvedAt: string;
      status: string;
      sortDate: string;
    }> = [];

    const listoStatusCounter: Record<string, number> = {
      'CONTROL DE CALIDAD': 0,
      'N.C. EN CONTROL DE CALIDAD': 0,
      'APROBACION RECHAZADO': 0,
    };
    const listoCurrentCounter: Record<string, number> = {
      'CONTROL DE CALIDAD': 0,
      'N.C. EN CONTROL DE CALIDAD': 0,
      'APROBACION RECHAZADO': 0,
    };

    let qaTouched = 0;
    let approved = 0;

    scopedOrders.forEach((order) => {
      const entries = getRawTimelineEntries(order);
      const currentBucket = getListoBucket(normalizeText(order?.status?.name));
      if (currentBucket) listoCurrentCounter[currentBucket] += 1;

      let controlAt = '';
      let approvedAt = '';
      let listoStatus = '—';

      for (let i = 0; i < entries.length; i += 1) {
        const row = entries[i];
        if (row.isComment) continue;

        const listoBucket = getListoBucket(row.status);
        if (!controlAt && isListoStatus(row.status) && isInCustomRange(row.timestamp)) {
          controlAt = row.timestamp;
          if (listoBucket) listoStatus = listoBucket;
        }

        if (!approvedAt && isEntregaStatus(row.status)) {
          const prevListoEntry = entries
            .slice(0, i)
            .reverse()
            .find((item) => !item.isComment && isListoStatus(item.status));
          const hasListoBefore = Boolean(prevListoEntry);
          if (hasListoBefore && isInCustomRange(row.timestamp)) {
            approvedAt = row.timestamp;
            const prevBucket = prevListoEntry ? getListoBucket(prevListoEntry.status) : null;
            if (prevBucket) {
              listoStatus = prevBucket;
              listoStatusCounter[prevBucket] += 1;
            }
          }
        }
      }

      if (controlAt) qaTouched += 1;
      if (approvedAt) approved += 1;

      // Fallback for partial timelines: infer using current status and closing date.
      if (!controlAt) {
        const currentStatus = normalizeText(order?.status?.name);
        const inferredListo = getListoBucket(currentStatus);
        const inferredControlAt = order?.modified_at || order?.updated_at || order?.created_at || '';
        if (inferredListo && isInCustomRange(inferredControlAt)) {
          controlAt = inferredControlAt;
          listoStatus = inferredListo;
          qaTouched += 1;
        }
      }

      if (!approvedAt && isDispatchStatus(order)) {
        const inferredApprovedAt = order?.done_at || order?.closed_at || '';
        if (controlAt && inferredApprovedAt && isInCustomRange(inferredApprovedAt)) {
          approvedAt = inferredApprovedAt;
          approved += 1;
          if (listoStatus !== '—') listoStatusCounter[listoStatus] += 1;
        }
      }

      if (controlAt || approvedAt) {
        const sortDate = approvedAt || controlAt;
        rows.push({
          id: String(order?.id || order?.number || sortDate),
          number: order?.number || 'Sin número',
          equipment: order?.asset?.title || order?.name || 'Equipo sin nombre',
          technician: extractTechnicianFromOrder(order),
          listoStatus,
          controlAt: controlAt ? formatDateTime(controlAt) : '—',
          approvedAt: approvedAt ? formatDateTime(approvedAt) : '—',
          status: order?.status?.name || 'Sin estatus',
          sortDate,
        });
      }
    });

    const units = approved;
    const rate = qaTouched ? Number(((units / qaTouched) * 100).toFixed(1)) : 0;

    const detailRows = rows
      .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
      .slice(0, 40)
      .map(({ sortDate, ...rest }) => rest);

    return {
      units,
      qaTouched,
      approved,
      rate,
      byListoStatus: [
        {
          status: 'CONTROL DE CALIDAD',
          count: listoStatusCounter['CONTROL DE CALIDAD'],
          current: listoCurrentCounter['CONTROL DE CALIDAD'],
        },
        {
          status: 'N.C. EN CONTROL DE CALIDAD',
          count: listoStatusCounter['N.C. EN CONTROL DE CALIDAD'],
          current: listoCurrentCounter['N.C. EN CONTROL DE CALIDAD'],
        },
        {
          status: 'APROBACION RECHAZADO',
          count: listoStatusCounter['APROBACION RECHAZADO'],
          current: listoCurrentCounter['APROBACION RECHAZADO'],
        },
      ],
      rows: detailRows,
    };
  }, [hasLiveData, filteredOrders, selectedQcFromDate, selectedQcToDate]);

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

  // ── MRP: Plan de Compra Inteligente ─────────────────────────────────────────
  const mrpData = useMemo(() => {
    const LEAD_TIME = 21;
    const BUFFER_PCT = 0.15;

    // Estimar el rango de días de los datos disponibles (mínimo 7, máximo 90)
    let daySpan = 30;
    if (hasLiveData && bodegaFilteredOrders.length > 0) {
      const dates = bodegaFilteredOrders
        .map((o) => new Date(getBodegaEventDate(o)).getTime())
        .filter((t) => !isNaN(t));
      if (dates.length >= 2) {
        const msSpan = Math.max(...dates) - Math.min(...dates);
        daySpan = Math.max(7, Math.min(90, Math.round(msSpan / 86400000)));
      }
    }

    // ── Demanda real por pieza (SKU de parte, no modelo de equipo) ───────────
    // Fuente: bodegaOrderProducts (fetched desde /api/bodega/parts-demand)
    // Agrupa todas las piezas usadas en órdenes bloqueadas → demanda backorder real
    const partDemandMap = new Map<string, {
      sku: string; code: string; title: string;
      backorderUnits: number; backorderOrders: string[];
    }>();

    Object.entries(bodegaOrderProducts).forEach(([, parts]) => {
      (parts as OrderPart[]).forEach((part) => {
        const key = part.code || part.sku;
        if (!partDemandMap.has(key)) {
          partDemandMap.set(key, {
            sku: part.sku, code: part.code, title: part.title,
            backorderUnits: 0, backorderOrders: [],
          });
        }
        const entry = partDemandMap.get(key)!;
        entry.backorderUnits += part.quantity;
        entry.backorderOrders.push(key);
      });
    });

    // Si tenemos datos reales de piezas, usar esos; sino, fallback a topSkuRows (modelos)
    const hasRealParts = partDemandMap.size > 0;

    let rows: Array<{
      sku: string; code: string; title: string;
      consumoDiario: number; forecast21d: number;
      backorder: number; compraSugerida: number;
      prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
      isRealPart: boolean;
    }>;

    if (hasRealParts) {
      // MRP basado en piezas reales de órdenes bloqueadas
      rows = Array.from(partDemandMap.values()).map((part) => {
        // Consumo diario estimado: backorder acumulado ÷ daySpan
        const consumoDiario = daySpan > 0 ? part.backorderUnits / daySpan : 0;
        const forecast21d = Math.ceil(consumoDiario * LEAD_TIME);
        const backorder = part.backorderUnits;
        const compraSugerida = Math.ceil((forecast21d + backorder) * (1 + BUFFER_PCT));

        let prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
        if (backorder >= 3) prioridad = 'URGENTE';
        else if (backorder >= 1) prioridad = 'ALTA';
        else if (consumoDiario >= 0.3) prioridad = 'MEDIA';
        else prioridad = 'BAJA';

        return {
          sku: part.sku, code: part.code, title: part.title,
          consumoDiario: Number(consumoDiario.toFixed(2)),
          forecast21d, backorder, compraSugerida, prioridad, isRealPart: true,
        };
      }).sort((a, b) => b.backorder - a.backorder || b.consumoDiario - a.consumoDiario);
    } else {
      // Fallback: usar topSkuRows (modelos de equipo) mientras no haya datos de piezas
      rows = bodegaTrackingSummary.topSkuRows.map((sku) => {
        const consumoDiario = daySpan > 0 ? sku.dispatched / daySpan : 0;
        const forecast21d = Math.ceil(consumoDiario * LEAD_TIME);
        const backorder = sku.waiting;
        const compraSugerida = Math.ceil((forecast21d + backorder) * (1 + BUFFER_PCT));

        let prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
        if (backorder > 0 && sku.dispatched === 0) prioridad = 'URGENTE';
        else if (backorder > 0) prioridad = 'ALTA';
        else if (consumoDiario >= 0.3) prioridad = 'MEDIA';
        else prioridad = 'BAJA';

        return {
          sku: sku.sku, code: '', title: sku.sku,
          consumoDiario: Number(consumoDiario.toFixed(2)),
          forecast21d, backorder, compraSugerida, prioridad, isRealPart: false,
        };
      });
    }

    const urgentes = rows.filter((r) => r.prioridad === 'URGENTE' || r.prioridad === 'ALTA');
    const totalForecast = rows.reduce((s, r) => s + r.forecast21d, 0);
    const totalBackorder = rows.reduce((s, r) => s + r.backorder, 0);

    return { rows, urgentes, totalForecast, totalBackorder, daySpan, hasRealParts };
  }, [hasLiveData, bodegaTrackingSummary, bodegaFilteredOrders, bodegaOrderProducts]);

  const blockedOrdersDetail = useMemo(() => {
    if (!hasLiveData) return { esperandoPartes: [], escaladaNc: [] };
    const today = new Date();
    const toRow = (order: Record<string, any>) => {
      const model = order?.asset?.title || `${order?.asset?.brand || ''} ${order?.asset?.model || ''}`.trim() || 'Sin modelo';
      const malfunction = (order?.malfunction || '—').trim();
      const orderNumber = order?.number || '—';
      const orderId = String(order?.id || '');
      const ref = order?.modified_at || order?.created_at;
      const daysWaiting = ref ? Math.floor((today.getTime() - new Date(ref).getTime()) / 86400000) : 0;
      return { orderNumber, orderId, model, malfunction, daysWaiting };
    };
    const esperandoPartes = bodegaFilteredOrders
      .filter((order) => normalizeText(order?.status?.name || '').includes('ESPERANDO PARTES'))
      .map(toRow)
      .sort((a, b) => b.daysWaiting - a.daysWaiting);
    const escaladaNc = bodegaFilteredOrders
      .filter((order) => {
        const s = normalizeText(order?.status?.name || '');
        return s.includes('ESCALADA') && (s.includes('NC') || s.includes('NOTA') || s.includes('CREDITO'));
      })
      .map(toRow)
      .sort((a, b) => b.daysWaiting - a.daysWaiting);
    return { esperandoPartes, escaladaNc };
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

  const claimsGeneratorRows = useMemo(() => {
    const normalizedBrand = normalizeText(selectedClaimGeneratorBrand);

    const isWithinCurrentScope = (order: Record<string, any>) => {
      const referenceDate = order?.closed_at || order?.done_at || order?.modified_at || order?.created_at;

      if (selectedSede !== 'ALL' && extractSedeFromOrder(order) !== selectedSede) return false;

      if (isCustomMonthRangeActive) {
        return isWithinMonthRange(referenceDate, selectedStartMonth, selectedEndMonth);
      }

      return isWithinSelectedRange(referenceDate, selectedDateRange);
    };

    const matchesBrand = (order: Record<string, any>) => {
      const brand = normalizeText(extractBrandFromOrder(order));
      if (normalizedBrand === 'ALCATEL') {
        return brand.includes('ALCATEL');
      }
      return brand.includes(normalizedBrand);
    };

    const inferL3Code = (order: Record<string, any>) => {
      const diagnosisText = normalizeText(`${order?.malfunction || ''} ${order?.fault || ''} ${order?.problem || ''} ${order?.description || ''} ${order?.engineer_notes || ''}`);
      const hit = CLAIM_MVP_FAULT_MAP.find((row) => diagnosisText.includes(normalizeText(row.source)));
      return {
        code: hit?.ispCode || 'MP099-GEN',
        description: hit?.description || 'Generic malfunction',
      };
    };

    return ordersData
      .filter((order) => isWithinCurrentScope(order) && matchesBrand(order))
      .filter((order) => {
        const historyHasQa = getOrderHistoryEntries(order).some((entry) => isQaStatus(normalizeText(entry.status)));
        return historyHasQa || isQaStatus(normalizeText(order?.status?.name)) || Boolean(order?.done_at || order?.closed_at || isDispatchStatus(order));
      })
      .map((order) => {
        const identifiers = getClaimIdentifierCandidates(order);
        const imeiCandidate = identifiers
          .map((value) => value.replace(/\D/g, ''))
          .find((digits) => digits.length >= 14 && digits.length <= 17);
        const imei = imeiCandidate ? imeiCandidate.slice(0, 15) : '';

        const goodsId = [
          order?.custom_fields?.goods_id,
          order?.custom_fields?.GoodsID,
          order?.custom_fields?.f3151083,
          order?.custom_fields?.f3147565,
        ].find((value) => typeof value === 'string' && value.trim())?.trim() || '';

        const saleDate = [
          order?.custom_fields?.sale_date,
          order?.custom_fields?.fecha_venta,
          order?.custom_fields?.f3129959,
          order?.created_at,
        ].find((value) => typeof value === 'string' && value.trim()) || '';

        const repairStartOriginal = [
          order?.custom_fields?.repair_start_time,
          order?.custom_fields?.Repair_Start_Time,
          order?.custom_fields?.f3130204,
        ].find((value) => typeof value === 'string' && value.trim()) || '';

        const createdAt = new Date(order?.created_at || '');
        const generatedRepairStart = !Number.isNaN(createdAt.getTime())
          ? new Date(createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString()
          : '';
        const repairStart = generatedRepairStart || repairStartOriginal;
        const repairStartDate = repairStart ? new Date(repairStart) : null;
        const repairFinish = repairStartDate && !Number.isNaN(repairStartDate.getTime())
          ? new Date(repairStartDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
          : '';

        const parts = extractProductEntriesFromOrder(order);
        const hasParts = parts.length > 0 || getPartsCost(order) > 0;
        const repairContext = normalizeText(`${extractServicesFromOrder(order)} ${parts.map((item) => item.name).join(' | ')} ${order?.description || ''} ${order?.engineer_notes || ''}`);
        const isMainboardRepair = CLAIM_MAINBOARD_KEYWORDS.some((keyword) => repairContext.includes(keyword));
        const processingMethodCode = !hasParts ? '3001' : isMainboardRepair ? '5101' : '5001';
        const l3Match = inferL3Code(order);
        const l3MalfunctionCode = l3Match.code;
        const createdAtRaw = String(order?.created_at || '');
        const saleDateFormatted = formatClaimTemplateDateTime(saleDate);
        const repairStartFormatted = formatClaimTemplateDateTime(repairStart);
        const repairFinishFormatted = formatClaimTemplateDateTime(repairFinish);
        const createdAtFormatted = formatClaimTemplateDateTime(createdAtRaw);
        const diagnosisText = `${order?.malfunction || ''} ${order?.fault || ''} ${order?.problem || ''} ${order?.description || ''} ${order?.engineer_notes || ''}`.trim();
        const remark = `${order?.resume || ''} ${order?.manager_notes || ''} ${order?.engineer_notes || ''}`.trim();
        const serviceType = hasParts ? 'Repair' : 'Inspection';
        const serviceSubtype = 'On_site_pick_and_repair';
        const iwOow = extractWarrantyFromOrder(order) === 'Sí' ? 'IW' : 'OOW';
        const { appearanceDamage, userDamage } = inferDamageFlagsFromOrder(order);
        const partCodes = parts.map((item) => item.name).slice(0, 10);
        const newBoardImei = extractMainboardImeiFromOrder(order);
        const customerEmail = extractCustomerEmailForClaim(order);

        const templateRow = Object.fromEntries(
          CLAIM_UPLOAD_TEMPLATE_COLUMNS.map((column) => [column, ''])
        ) as Record<(typeof CLAIM_UPLOAD_TEMPLATE_COLUMNS)[number], string>;

        templateRow.service_order_status = order?.done_at || order?.closed_at || isDispatchStatus(order) ? 'Closed' : 'Open';
        templateRow.Third_service_order_number = '';
        templateRow.operator_service_order_number = order?.number || `OS-${order?.id || 'SN'}`;
        templateRow.ISP_SC_code = CLAIM_ISP_SC_CODE;
        templateRow.service_center_code = CLAIM_SERVICE_CENTER_CODE;
        templateRow.customer_email = customerEmail;
        templateRow.PO_number = '';
        templateRow.dealer_name = extractEntryChannel(order);
        templateRow.customer_type = extractEntryType(order) === 'SIN CLASIFICAR' ? 'RETAILER' : extractEntryType(order).toUpperCase();
        templateRow.service_mode = 'Mail_In';
        templateRow.service_type = serviceType;
        templateRow.Return_type = '';
        templateRow.Return_warehouse_type = '';
        templateRow.service_subtype = serviceSubtype;
        templateRow.IW_OOW = iwOow;
        templateRow.Appearance_Damage = appearanceDamage;
        templateRow.Malfunction_Description = l3Match.description;
        templateRow.invoice_number = '';
        templateRow.invoice_time = '';
        templateRow.goods_id = goodsId;
        templateRow.SN_Or_IMEI1 = imei;
        templateRow.newSN = '';
        templateRow.new_IMEI = '';
        templateRow.Is_user_damange = userDamage;
        templateRow.create_time = createdAtFormatted;
        templateRow.SC_express_receipt_time = createdAtFormatted;
        templateRow.actual_visit_time = createdAtFormatted;
        templateRow.repair_start_time = repairStartFormatted;
        templateRow.parts_apply_time = '';
        templateRow.parts_arrive_time = '';
        templateRow.material_shortage_time = '';
        templateRow.repair_finish_time = repairFinishFormatted;
        templateRow.deliver_back_to_user_time = repairFinishFormatted;
        templateRow.close_time = repairFinishFormatted;
        templateRow.receive_AWB = '';
        templateRow.delivery_AWB = '';
        templateRow.Level_3_malfunction_code = l3MalfunctionCode;
        templateRow.processing_method_code = processingMethodCode;
        templateRow.Activity_Project = selectedClaimGeneratorBrand;
        templateRow.remark = remark;
        templateRow.defect_description = l3Match.description;
        templateRow.Goodid = goodsId;
        templateRow.B2B = extractSedeFromOrder(order).includes('MEXICO') ? 'MX' : 'GT';

        if (serviceType === 'Repair' && partCodes.length > 0) {
          templateRow.old_PN1 = partCodes[0];
          templateRow.new_PN1 = partCodes[0];
        }

        if (processingMethodCode === '5101') {
          templateRow.old_SN1 = imei;
          templateRow.old_IMEI1 = imei;
          templateRow.new_SN1 = newBoardImei;
          templateRow.new_IMEI1 = newBoardImei;
        }

        partCodes.forEach((partCode, index) => {
          const partPosition = index + 1;
          const newPnKey = `new_PN${partPosition}` as keyof typeof templateRow;
          templateRow[newPnKey] = partCode;

          if (partPosition <= 10) {
            const oldSnKey = `old_SN${partPosition}` as keyof typeof templateRow;
            const oldImeiKey = `old_IMEI${partPosition}` as keyof typeof templateRow;
            const newSnKey = `new_SN${partPosition}` as keyof typeof templateRow;
            const newImeiKey = `new_IMEI${partPosition}` as keyof typeof templateRow;
            templateRow[oldSnKey] = '';
            templateRow[oldImeiKey] = '';
            templateRow[newSnKey] = '';
            templateRow[newImeiKey] = '';
          }
        });

        const missingFields = [
          imei ? null : 'IMEI_SN',
          goodsId ? null : 'GoodsID',
          saleDate ? null : 'Sale_Date',
        ].filter((value): value is string => Boolean(value));

        return {
          os: order?.number || `OS-${order?.id || 'SN'}`,
          model: extractModelFromOrder(order),
          category: normalizeText(extractProductGroupFromOrder(order)).includes('TABLET') ? 'Tablet' : 'Smartphone',
          imei,
          goodsId,
          saleDate,
          repairStart,
          processingMethodCode,
          l3MalfunctionCode,
          spareParts: parts.map((item) => item.name).join(' | ') || 'Sin repuestos',
          ispScCode: CLAIM_ISP_SC_CODE,
          missingFields,
          autoFilledRepairStart: Boolean(repairStart),
          autoDetectedL1: processingMethodCode === '3001',
          autoDetectedL3: l3MalfunctionCode === 'MP099-GEN',
          templateRow,
        };
      });
  }, [
    isCustomMonthRangeActive,
    ordersData,
    selectedClaimGeneratorBrand,
    selectedDateRange,
    selectedEndMonth,
    selectedClaimGeneratorBrand,
    selectedSede,
    selectedStartMonth,
  ]);

  const claimsTemplateDownloadRows = useMemo(() => {
    return claimsGeneratorRows.map((row) => row.templateRow);
  }, [claimsGeneratorRows]);

  const downloadClaimsTemplateCsv = (rows: Array<Record<string, string>>, fileName: string) => {
    if (typeof window === 'undefined') return;

    const escapeCsv = (value: string) => {
      if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const lines = [
      CLAIM_UPLOAD_TEMPLATE_COLUMNS.join(','),
      ...rows.map((row) => CLAIM_UPLOAD_TEMPLATE_COLUMNS.map((column) => escapeCsv(String(row[column] || ''))).join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadClaimsTemplate = () => {
    if (!claimsTemplateDownloadRows.length) {
      downloadClaimsTemplateCsv([], `claims_template_${selectedClaimGeneratorBrand.toLowerCase()}_vacio.csv`);
      return;
    }

    downloadClaimsTemplateCsv(
      claimsTemplateDownloadRows,
      `claims_template_${selectedClaimGeneratorBrand.toLowerCase()}.csv`
    );
  };

  const handleDownloadClaimsTemplateEmpty = () => {
    downloadClaimsTemplateCsv([], `claims_template_${selectedClaimGeneratorBrand.toLowerCase()}_vacio.csv`);
  };

  const claimsGeneratorSummary = useMemo(() => {
    const total = claimsGeneratorRows.length;
    const validRows = claimsGeneratorRows.filter((row) => row.missingFields.length === 0).length;
    const incompleteRows = total - validRows;

    const missingByField = claimsGeneratorRows.reduce((acc, row) => {
      row.missingFields.forEach((field) => {
        acc[field] = (acc[field] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      validRows,
      incompleteRows,
      missingByField: Object.entries(missingByField)
        .map(([field, count]) => ({ field, count }))
        .sort((a, b) => b.count - a.count),
      autoFilledRepairStart: claimsGeneratorRows.filter((row) => row.autoFilledRepairStart).length,
      autoDetectedL1: claimsGeneratorRows.filter((row) => row.autoDetectedL1).length,
      autoDetectedL3Fallback: claimsGeneratorRows.filter((row) => row.autoDetectedL3).length,
    };
  }, [claimsGeneratorRows]);

  const claimsGeneratorConfig = useMemo(() => {
    if (selectedClaimGeneratorBrand === 'TCL' || selectedClaimGeneratorBrand === 'ALCATEL') {
      return {
        template: '.csv con encabezados ISP multimarca',
        codingLogic: 'Catálogo de códigos TCL/Alcatel',
      };
    }

    return {
      template: '.xlsx Xiaomi con template ISP actualizado',
      codingLogic: 'Catálogo Xiaomi MP00...',
    };
  }, [selectedClaimGeneratorBrand]);

  const claimsPythonPrompt = useMemo(() => {
    return [
      `Actúa como Data Engineer Senior para postventa ${selectedClaimGeneratorBrand}.`,
      'Construye un script Python listo para producción que lea 3 archivos reales (órdenes, códigos de falla, catálogo de partes),',
      `filtre únicamente la marca ${selectedClaimGeneratorBrand} en órdenes que hayan pasado Control de Calidad, aplique validaciones y genere un archivo ${claimsGeneratorConfig.template}.`,
      '',
      'Reglas obligatorias:',
      '1) Repair_Start_Time siempre = Created_At + 48 horas.',
      '2) Repair_Finish_Time y Close_Time siempre = Repair_Start_Time + 24 horas.',
      '3) Si no hay repuestos: service_type=Inspection y processing_method_code=3001.',
      '4) Si hay repuestos: service_type=Repair y processing_method_code=5001 (o 5101 para mainboard).',
      '5) Rellenar constantes obligatorias: ISP_SC_code=GTM00010, service_center_code=GT-TCW-MSC-Guatemala, service_mode=Mail_In.',
      '6) customer_email por defecto recepcion_gt@mi.com cuando no exista correo del cliente.',
      '7) Appearance_Damage e Is_user_damange por defecto No salvo marca explícita del técnico.',
      '8) Si falta Level_3_malfunction_code: inferir por palabras clave del diagnóstico técnico.',
      '',
      'Campos críticos mínimos en la salida:',
      CLAIM_TEMPLATE_CRITICAL_FIELDS.join(', '),
      '',
      `Contexto actual del dashboard: ${claimsGeneratorRows.length} órdenes candidatas, ${claimsGeneratorSummary.validRows} completas, ${claimsGeneratorSummary.incompleteRows} con faltantes.`,
      'Incluye logging, validación de esquema, manejo de errores y exportación final.',
    ].join('\n');
  }, [
    claimsGeneratorConfig.template,
    claimsGeneratorRows.length,
    claimsGeneratorSummary.incompleteRows,
    claimsGeneratorSummary.validRows,
    selectedClaimGeneratorBrand,
  ]);

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

  // ─── Módulo de Bono Técnico ────────────────────────────────────────────────
  const bonusRawRows = useMemo(() => {
    const rows: {
      date: string;
      technician: string;
      productLine: BonusProductLine;
      level: 'L0' | 'L1' | 'L2' | 'Sin clasificar';
      orderNumber: string;
    }[] = [];

    for (const order of ordersData) {
      const technician = extractTechnicianFromOrder(order);
      if (!technician || technician === 'Sin asignar') continue;

      const productGroup = extractProductGroupFromOrder(order);
      const productLine = classifyBonusProductLine(productGroup);
      if (!productLine) continue;

      const history = getOrderHistoryEntries(order);

      // Collect all calendar days where "Entrega" appears in history
      const entregaDays = new Set<string>();
      // Collect all calendar days where "Listo" appears in history
      const listoDays = new Set<string>();

      for (const entry of history) {
        const s = entry.status; // already normalized inside getOrderHistoryEntries
        const day = entry.timestamp ? entry.timestamp.slice(0, 10) : '';
        if (!day) continue;
        if (s.includes('ENTREGA')) entregaDays.add(day);
        if (s.includes('LISTO')) listoDays.add(day);
      }

      // Find the earliest day where BOTH Entrega AND Listo appear
      const matchingDays = [...entregaDays].filter((d) => listoDays.has(d)).sort();
      if (matchingDays.length === 0) continue;

      const dateKey = matchingDays[0];

      const serviceTexts = [
        ...extractNamesFromCollection(order?.services),
        ...extractNamesFromCollection(order?.works),
        ...extractNamesFromCollection(order?.jobs),
        ...extractProductEntriesFromOrder(order).map((e) => e.name),
      ];
      const level = classifyBonusRepairLevel(serviceTexts);

      rows.push({
        date: dateKey,
        technician,
        productLine,
        level,
        orderNumber: String(order?.number || order?.id || ''),
      });
    }

    return rows;
  }, [ordersData]);

  /** Producción diaria por técnico en Control de Calidad (independiente del bono Entrega+Listo).
   *  Usa el momento en que cada orden entró a CQ en el historial para asignar fecha y día. */
  const bonusQcAggregates = useMemo(() => {
    type QcKey = `${string}|${string}|${BonusProductLine}`;
    const map = new Map<QcKey, {
      date: string; technician: string; productLine: BonusProductLine;
      l0: number; l1: number; l2: number; unclassified: number;
    }>();

    for (const order of ordersData) {
      const technician = extractTechnicianFromOrder(order);
      if (!technician || technician === 'Sin asignar') continue;

      const productGroup = extractProductGroupFromOrder(order);
      const productLine = classifyBonusProductLine(productGroup);
      if (!productLine) continue;

      const history = getOrderHistoryEntries(order);
      // Find when the order entered Control de Calidad
      const qcEntry = history.find(
        (e) => e.status.includes('CONTROL DE CALIDAD') || e.status.includes('CALIDAD') || e.status.includes('CQ')
      );
      if (!qcEntry?.timestamp) continue;
      const dateKey = qcEntry.timestamp.slice(0, 10);

      const serviceTexts = [
        ...extractNamesFromCollection(order?.services),
        ...extractNamesFromCollection(order?.works),
        ...extractNamesFromCollection(order?.jobs),
        ...extractProductEntriesFromOrder(order).map((e) => e.name),
      ];
      const level = classifyBonusRepairLevel(serviceTexts);

      const key: QcKey = `${dateKey}|${technician}|${productLine}`;
      const prev = map.get(key) ?? { date: dateKey, technician, productLine, l0: 0, l1: 0, l2: 0, unclassified: 0 };
      if (level === 'L0') prev.l0++;
      else if (level === 'L1') prev.l1++;
      else if (level === 'L2') prev.l2++;
      else prev.unclassified++;
      map.set(key, prev);
    }

    return Array.from(map.values()).map((entry) => {
      const config = BONUS_METRICS_CONFIG.find((c) => c.line === entry.productLine)!;
      const total = entry.l0 + entry.l1 + entry.l2 + entry.unclassified;
      const weighted = Number((entry.l0 * config.pesoL0 + entry.l1 * config.pesoL1 + entry.l2 * config.pesoL2).toFixed(2));
      const meetsQuota = weighted >= config.dailyQuota;
      return { ...entry, total, weighted, quota: config.dailyQuota, meetsQuota };
    }).sort((a, b) => b.date.localeCompare(a.date) || a.technician.localeCompare(b.technician));
  }, [ordersData]);

  const bonusDailyAggregates = useMemo(() => {
    type AggKey = `${string}|${string}|${BonusProductLine}`;
    const map = new Map<
      AggKey,
      { date: string; technician: string; productLine: BonusProductLine; l0: number; l1: number; l2: number; unclassified: number }
    >();

    for (const row of bonusRawRows) {
      const key = `${row.date}|${row.technician}|${row.productLine}` as AggKey;
      if (!map.has(key)) {
        map.set(key, { date: row.date, technician: row.technician, productLine: row.productLine, l0: 0, l1: 0, l2: 0, unclassified: 0 });
      }
      const entry = map.get(key)!;
      if (row.level === 'L0') entry.l0 += 1;
      else if (row.level === 'L1') entry.l1 += 1;
      else if (row.level === 'L2') entry.l2 += 1;
      else entry.unclassified += 1;
    }

    return Array.from(map.values()).map((entry) => {
      const config = BONUS_METRICS_CONFIG.find((c) => c.line === entry.productLine)!;
      const total = entry.l0 + entry.l1 + entry.l2 + entry.unclassified;
      // Producción ponderada por peso
      const weighted = entry.l0 * config.pesoL0 + entry.l1 * config.pesoL1 + entry.l2 * config.pesoL2;
      const surplusWeighted = Math.max(0, weighted - config.dailyQuota);
      // Distribuir excedente ponderado de vuelta a unidades físicas: L2 primero (mayor valor)
      const surplusL2 = surplusWeighted > 0 ? Math.min(entry.l2, surplusWeighted / config.pesoL2) : 0;
      const remaining = surplusWeighted - surplusL2 * config.pesoL2;
      const surplusL1 = remaining > 0 ? Math.min(entry.l1, remaining / config.pesoL1) : 0;
      // Incentivo según peso — "según el peso se paga" — tarifa de Técnico
      const incentive = surplusL2 * config.rates.tecnico.l2 + surplusL1 * config.rates.tecnico.l1;
      return { ...entry, total, weighted: Number(weighted.toFixed(2)), quota: config.dailyQuota, surplusWeighted: Number(surplusWeighted.toFixed(2)), surplusL1: Number(surplusL1.toFixed(2)), surplusL2: Number(surplusL2.toFixed(2)), incentive: Number(incentive.toFixed(2)) };
    }).sort((a, b) => b.date.localeCompare(a.date) || a.technician.localeCompare(b.technician));
  }, [bonusRawRows]);

  const bonusFilteredRows = useMemo(() => {
    return bonusDailyAggregates.filter((row) => {
      if (selectedBonusDate && row.date !== selectedBonusDate) return false;
      if (selectedBonusTechnician !== 'ALL' && row.technician !== selectedBonusTechnician) return false;
      if (selectedBonusLine !== 'ALL' && row.productLine !== selectedBonusLine) return false;
      return true;
    });
  }, [bonusDailyAggregates, selectedBonusDate, selectedBonusTechnician, selectedBonusLine]);

  const bonusSummary = useMemo(() => {
    const totalIncentive = bonusFilteredRows.reduce((s, r) => s + r.incentive, 0);
    const techsWithSurplus = new Set(bonusFilteredRows.filter((r) => r.surplusWeighted > 0).map((r) => r.technician)).size;
    const totalSurplusUnits = bonusFilteredRows.reduce((s, r) => s + r.surplusL2 + r.surplusL1, 0);
    const totalUnits = bonusFilteredRows.reduce((s, r) => s + r.total, 0);

    const byTechnician = Array.from(
      bonusFilteredRows.reduce((acc, row) => {
        const prev = acc.get(row.technician) ?? { name: row.technician, incentive: 0, units: 0, surplus: 0 };
        acc.set(row.technician, {
          name: row.technician,
          incentive: prev.incentive + row.incentive,
          units: prev.units + row.total,
          surplus: prev.surplus + row.surplusL2 + row.surplusL1,
        });
        return acc;
      }, new Map<string, { name: string; incentive: number; units: number; surplus: number }>())
        .values()
    ).sort((a, b) => b.incentive - a.incentive);

    return { totalIncentive, techsWithSurplus, totalSurplusUnits, totalUnits, byTechnician };
  }, [bonusFilteredRows]);
  // ──────────────────────────────────────────────────────────────────────────

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
          <Tab icon={TrendingUp}>📤 Subir Claims</Tab>
          <Tab icon={Activity}>🏅 Bono Técnico</Tab>
        </TabList>
        <div className="flex justify-end px-4 pb-2">
          <Link
            href="/despacho"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            Módulo de Despacho
          </Link>
        </div>

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

            {/* ── TAT Especial Móviles (meta 2 días) ── */}
            <Card decoration="left" decorationColor={tatMovilesMetric.avg !== null && tatMovilesMetric.avg <= TAT_MOVILES_TARGET ? 'emerald' : 'rose'} className="mb-6">
              <Flex justifyContent="between" alignItems="center" className="gap-4 flex-wrap">
                <div>
                  <Flex alignItems="center" className="gap-2 mb-1">
                    <Icon icon={Clock} variant="light" size="sm" color="blue" />
                    <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">TAT Especial · Móviles (Smartphones / Celulares)</Text>
                    <Badge color="blue">Meta: {TAT_MOVILES_TARGET} días hábiles</Badge>
                  </Flex>
                  <Metric className={`text-3xl font-extrabold ${tatMovilesMetric.avg !== null && tatMovilesMetric.avg <= TAT_MOVILES_TARGET ? 'text-emerald-700' : tatMovilesMetric.avg !== null ? 'text-rose-600' : 'text-slate-400'}`}>
                    {tatMovilesMetric.avg !== null ? `${tatMovilesMetric.avg} días` : '— sin datos'}
                  </Metric>
                  <Text className="text-xs text-slate-500 mt-1">Promedio E2E en días hábiles · {tatMovilesMetric.total} órdenes cerradas de móviles/tablets/feature phones en el período filtrado</Text>
                </div>
                <Grid numItemsSm={3} className="gap-4 min-w-[320px]">
                  <div className="text-center">
                    <Text className="text-xs text-slate-500 uppercase">En tiempo</Text>
                    <Metric className="text-2xl text-emerald-700">{tatMovilesMetric.onTime}</Metric>
                    <Text className="text-xs text-emerald-600 font-semibold">≤ {TAT_MOVILES_TARGET} días</Text>
                  </div>
                  <div className="text-center">
                    <Text className="text-xs text-slate-500 uppercase">Tarde</Text>
                    <Metric className="text-2xl text-rose-600">{tatMovilesMetric.late}</Metric>
                    <Text className="text-xs text-rose-500 font-semibold">&gt; {TAT_MOVILES_TARGET} días</Text>
                  </div>
                  <div className="text-center">
                    <Text className="text-xs text-slate-500 uppercase">% Cumplimiento</Text>
                    <Metric className={`text-2xl font-bold ${tatMovilesMetric.pct >= 80 ? 'text-emerald-700' : 'text-rose-600'}`}>{tatMovilesMetric.pct}%</Metric>
                    <Text className="text-xs text-slate-500">de {tatMovilesMetric.total} cerradas</Text>
                  </div>
                </Grid>
              </Flex>
              <ProgressBar
                value={tatMovilesMetric.pct}
                color={tatMovilesMetric.pct >= 80 ? 'emerald' : tatMovilesMetric.pct >= 60 ? 'amber' : 'rose'}
                className="mt-4"
              />
            </Card>

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
                  <button
                    type="button"
                    onClick={exportSlaToExcel}
                    className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    ↓ Exportar Excel
                  </button>
                </Flex>
                <div className="mt-4 flex flex-wrap gap-2 items-center">
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
                  <div className="ml-auto">
                    <Select value={slaEquipFilter} onValueChange={setSlaEquipFilter} className="w-[220px]">
                      <SelectItem value="ALL">Todos los tipos</SelectItem>
                      {Array.from(new Set(slaOrderDetails.map((o) => o.productGroup).filter(Boolean))).sort().map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="mt-6 overflow-x-auto max-h-[380px]">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Orden</th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Equipo</th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Ingreso</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">{selectedSlaSegment === 'Fuera SLA' ? 'Días vencida' : 'Margen SLA'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaOrderDetails.filter((item) => slaEquipFilter === 'ALL' || item.productGroup === slaEquipFilter).length > 0
                        ? slaOrderDetails.filter((item) => slaEquipFilter === 'ALL' || item.productGroup === slaEquipFilter).map((item) => (
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
                          <td className="border border-slate-200 px-3 py-2 text-slate-700">
                            <div>{item.dueDate}</div>
                            <div className="text-xs text-slate-500">Objetivo: {item.slaTarget} días</div>
                          </td>
                          <td className={`border border-slate-200 px-3 py-2 text-right font-semibold ${selectedSlaSegment === 'Fuera SLA' ? 'text-rose-600' : 'text-emerald-600'}`}>{item.overdueDays}</td>
                        </tr>
                      )) : (
                        <tr className="bg-white">
                          <td colSpan={5} className="border border-slate-200 px-3 py-6 text-center text-slate-500">
                            {slaEquipFilter !== 'ALL' ? `Sin resultados para "${slaEquipFilter}".` : 'No hay órdenes para el estado SLA seleccionado.'}
                          </td>
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
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mt-8 relative">
                  {filteredFunnelData.map((step, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedFunnelStage(step.stage)}
                      className={`relative flex flex-col items-center rounded-xl p-1 transition-all group ${selectedFunnelStage === step.stage ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                    >
                       <div className={`w-full h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-${step.color}-100 bg-${step.color}-500 transition-all hover:scale-105`}>
                          {step.count}
                       </div>
                       <Text className="mt-3 font-semibold text-slate-700">{step.stage}</Text>
                       {/* Tooltip con estados agrupados */}
                       {funnelStageStatusMap[step.stage]?.length > 0 && (
                         <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 hidden group-hover:block w-56 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl p-3 pointer-events-none">
                           <div className="font-bold text-slate-300 mb-1.5 uppercase tracking-wide text-[10px]">Estados incluidos</div>
                           <ul className="space-y-0.5">
                             {funnelStageStatusMap[step.stage].map((s) => (
                               <li key={s} className="truncate text-slate-100">• {s}</li>
                             ))}
                           </ul>
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                         </div>
                       )}
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

             {/* ── MRP: PLAN DE COMPRA INTELIGENTE ── */}
             <div className="mt-8 space-y-6">
               {/* Header */}
               <div className="flex items-center gap-3">
                 <div className="h-8 w-1.5 rounded-full bg-[#001e6c]" />
                 <div>
                   <h2 className="text-lg font-bold text-slate-800">Plan de Compra Inteligente (MRP)</h2>
                   <p className="text-xs text-slate-500">Basado en consumo real de los últimos {mrpData.daySpan} días · Lead time: 21 días · Buffer: 15%</p>
                 </div>
               </div>

               {/* Resumen ejecutivo KPIs */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                   <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SKUs con demanda</p>
                   <p className="text-3xl font-bold text-slate-800 mt-1">{mrpData.rows.length}</p>
                   <p className="text-[11px] text-slate-400 mt-1">repuestos en seguimiento</p>
                 </div>
                 <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                   <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Backorder activo</p>
                   <p className="text-3xl font-bold text-amber-700 mt-1">{mrpData.totalBackorder}</p>
                   <p className="text-[11px] text-amber-600 mt-1">unidades no atendidas</p>
                 </div>
                 <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                   <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Alertas urgentes</p>
                   <p className="text-3xl font-bold text-rose-700 mt-1">{mrpData.urgentes.length}</p>
                   <p className="text-[11px] text-rose-500 mt-1">SKUs requieren compra inmediata</p>
                 </div>
                 <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                   <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Forecast 21 días</p>
                   <p className="text-3xl font-bold text-blue-700 mt-1">{mrpData.totalForecast}</p>
                   <p className="text-[11px] text-blue-500 mt-1">unidades proyectadas totales</p>
                 </div>
               </div>

               {/* Alertas críticas */}
               {mrpData.urgentes.length > 0 && (
                 <div className="rounded-xl border border-rose-300 bg-rose-50 p-4">
                   <div className="flex items-center gap-2 mb-3">
                     <span className="text-rose-600 font-bold text-sm uppercase tracking-wide">🔴 Alertas Críticas — Compra Urgente</span>
                   </div>
                   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                     {mrpData.urgentes.map((r) => (
                       <div key={r.sku} className="rounded-lg bg-white border border-rose-200 px-3 py-2 flex justify-between items-start gap-2">
                         <div className="min-w-0">
                           <p className="text-xs font-semibold text-slate-800 truncate" title={r.sku}>{r.sku}</p>
                           <p className="text-[11px] text-rose-600 mt-0.5">Backorder: {r.backorder} · Forecast: {r.forecast21d}</p>
                         </div>
                         <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${r.prioridad === 'URGENTE' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>{r.prioridad}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Tabla plan de compra */}
               <Card>
                 <div className="flex items-start justify-between flex-wrap gap-2">
                   <div>
                     <Title>📦 Plan de Compra {mrpData.hasRealParts ? '— Piezas Reales' : '— Estimado por Modelo'}</Title>
                     <Text className="text-xs text-slate-500 mt-1">
                       {mrpData.hasRealParts
                         ? `Basado en ${Object.keys(bodegaOrderProducts).length} órdenes bloqueadas · SKUs de piezas reales desde Orderry · Compra = backorder + forecast 21d + buffer 15%`
                         : 'Cargando piezas… o no hay órdenes bloqueadas. Usando modelos de equipo como estimado.'}
                     </Text>
                   </div>
                   {bodegaPartsLoading && (
                     <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 animate-pulse">
                       ⏳ Cargando piezas desde Orderry…
                     </span>
                   )}
                   {mrpData.hasRealParts && (
                     <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                       ✅ Datos reales de piezas
                     </span>
                   )}
                 </div>
                 <div className="mt-4 overflow-x-auto">
                   <table className="min-w-full text-xs border border-slate-200">
                     <thead className="bg-slate-800 text-white">
                       <tr>
                         <th className="px-3 py-2 text-left font-semibold">Código</th>
                         <th className="px-3 py-2 text-left font-semibold">Repuesto / Descripción</th>
                         <th className="px-3 py-2 text-center font-semibold">Backorder</th>
                         <th className="px-3 py-2 text-center font-semibold">Forecast 21d</th>
                         <th className="px-3 py-2 text-center font-semibold">Compra sugerida</th>
                         <th className="px-3 py-2 text-center font-semibold">Prioridad</th>
                       </tr>
                     </thead>
                     <tbody>
                       {mrpData.rows.map((r) => (
                         <tr key={r.sku} className="bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors">
                           <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{r.code || '—'}</td>
                           <td className="px-3 py-2 text-slate-800 max-w-[280px] truncate" title={r.title}>{r.title}</td>
                           <td className={`px-3 py-2 text-center font-bold ${r.backorder > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{r.backorder > 0 ? r.backorder : '—'}</td>
                           <td className="px-3 py-2 text-center font-semibold text-blue-700">{r.forecast21d}</td>
                           <td className="px-3 py-2 text-center font-bold text-emerald-700">{r.compraSugerida}</td>
                           <td className="px-3 py-2 text-center">
                             <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full
                               ${r.prioridad === 'URGENTE' ? 'bg-rose-600 text-white' :
                                 r.prioridad === 'ALTA' ? 'bg-amber-500 text-white' :
                                 r.prioridad === 'MEDIA' ? 'bg-blue-500 text-white' :
                                 'bg-slate-200 text-slate-600'}`}>
                               {r.prioridad}
                             </span>
                           </td>
                         </tr>
                       ))}
                       {mrpData.rows.length === 0 && (
                         <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Sin datos de piezas disponibles</td></tr>
                       )}
                     </tbody>
                     {mrpData.rows.length > 0 && (
                       <tfoot className="bg-slate-100 font-bold text-slate-700">
                         <tr>
                           <td className="px-3 py-2 text-right" colSpan={2}>TOTAL</td>
                           <td className="px-3 py-2 text-center text-rose-600">{mrpData.totalBackorder || '—'}</td>
                           <td className="px-3 py-2 text-center text-blue-700">{mrpData.totalForecast}</td>
                           <td className="px-3 py-2 text-center text-emerald-700">{mrpData.rows.reduce((s, r) => s + r.compraSugerida, 0)}</td>
                           <td />
                         </tr>
                       </tfoot>
                     )}
                   </table>
                 </div>
               </Card>

               {/* Impacto económico estimado */}
               <Card className="border-rose-200 bg-rose-50/40">
                 <Title className="text-rose-900">💰 Impacto Económico — Nota de Crédito / Backorder</Title>
                 <div className="mt-4 grid sm:grid-cols-3 gap-4">
                   <div className="rounded-lg bg-white border border-rose-100 p-4">
                     <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Órdenes Nota de Crédito</p>
                     <p className="text-2xl font-bold text-rose-700 mt-1">{bodegaTrackingSummary.noteCreditOrders}</p>
                     <p className="text-[11px] text-slate-500 mt-1">Órdenes sin reparación por falta de repuesto</p>
                   </div>
                   <div className="rounded-lg bg-white border border-amber-100 p-4">
                     <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">En espera de repuestos</p>
                     <p className="text-2xl font-bold text-amber-700 mt-1">{bodegaTrackingSummary.waitingOrders}</p>
                     <p className="text-[11px] text-slate-500 mt-1">Órdenes bloqueadas en estado Esperando Partes</p>
                   </div>
                   <div className="rounded-lg bg-white border border-blue-100 p-4">
                     <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Fill Rate actual</p>
                     <p className="text-2xl font-bold text-blue-700 mt-1">{bodegaTrackingSummary.fillRate}%</p>
                     <p className="text-[11px] text-slate-500 mt-1">Porcentaje de demanda atendida con stock disponible</p>
                   </div>
                 </div>
                 <div className="mt-4 rounded-lg bg-white border border-rose-100 p-3 text-xs text-slate-600">
                   <span className="font-semibold text-rose-700">Nota:</span> El ingreso perdido por backorder se estima como el número de órdenes NC × el ingreso promedio por reparación del modelo afectado. Para cuantificación exacta, configurar tarifa base por modelo en el sistema de precios.
                 </div>
               </Card>

               {/* ── DETALLE ÓRDENES BLOQUEADAS ── */}
               <Card className="border-amber-200 bg-amber-50/30">
                 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                   <Title className="text-amber-900">⏳ Órdenes Esperando Piezas ({blockedOrdersDetail.esperandoPartes.length})</Title>
                   <div className="flex items-center gap-2">
                     {bodegaPartsLoading && <span className="text-[11px] text-blue-600 animate-pulse">⏳ Cargando piezas…</span>}
                     <Text className="text-xs text-slate-500">Piezas se cargan automáticamente desde Orderry · clic ✏️ para anotar manualmente</Text>
                   </div>
                 </div>
                 {blockedOrdersDetail.esperandoPartes.length === 0 ? (
                   <Text className="text-slate-400 text-sm">No hay órdenes actualmente en espera de piezas.</Text>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-xs">
                       <thead>
                         <tr className="bg-amber-100 text-amber-900 uppercase text-[10px] tracking-wide">
                           <th className="px-3 py-2 text-left font-semibold">Orden</th>
                           <th className="px-3 py-2 text-left font-semibold">Modelo</th>
                           <th className="px-3 py-2 text-left font-semibold">Falla reportada</th>
                           <th className="px-3 py-2 text-left font-semibold">Piezas registradas en Orderry</th>
                           <th className="px-3 py-2 text-left font-semibold w-40">Nota manual ✏️</th>
                           <th className="px-3 py-2 text-center font-semibold">Días</th>
                         </tr>
                       </thead>
                       <tbody>
                         {blockedOrdersDetail.esperandoPartes.map((row, i) => {
                           const apiParts: OrderPart[] = bodegaOrderProducts[row.orderId] || [];
                           return (
                             <tr key={row.orderNumber} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/50'}>
                               <td className="px-3 py-2 font-mono font-bold text-amber-800 whitespace-nowrap">{row.orderNumber}</td>
                               <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={row.model}>{row.model}</td>
                               <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={row.malfunction}>{row.malfunction}</td>
                               <td className="px-3 py-2 max-w-[220px]">
                                 {apiParts.length > 0 ? (
                                   <div className="flex flex-col gap-0.5">
                                     {apiParts.map((p) => (
                                       <span key={p.sku} className="inline-flex items-center gap-1 text-[11px]">
                                         <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1">{p.code}</span>
                                         <span className="text-slate-500 truncate" title={p.title}>{p.title.replace(p.code + '-', '').slice(0, 40)}</span>
                                       </span>
                                     ))}
                                   </div>
                                 ) : bodegaPartsLoading ? (
                                   <span className="text-slate-300 italic text-[11px]">cargando…</span>
                                 ) : (
                                   <span className="text-slate-300 italic text-[11px]">sin piezas registradas</span>
                                 )}
                               </td>
                               <td className="px-3 py-2 w-40">
                                 {editingPartNote === row.orderNumber ? (
                                   <input
                                     autoFocus
                                     defaultValue={partsNotes[row.orderNumber] || ''}
                                     onBlur={(e) => { savePartNote(row.orderNumber, e.target.value.trim()); setEditingPartNote(null); }}
                                     onKeyDown={(e) => { if (e.key === 'Enter') { savePartNote(row.orderNumber, (e.target as HTMLInputElement).value.trim()); setEditingPartNote(null); } if (e.key === 'Escape') setEditingPartNote(null); }}
                                     className="w-full border border-amber-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                                     placeholder="Ej: PCBA/DISPLAY"
                                   />
                                 ) : (
                                   <button
                                     onClick={() => setEditingPartNote(row.orderNumber)}
                                     className={`w-full text-left px-2 py-0.5 rounded truncate transition-colors ${partsNotes[row.orderNumber] ? 'text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100' : 'text-slate-300 italic bg-slate-50 hover:bg-amber-50 hover:text-amber-700'}`}
                                   >
                                     {partsNotes[row.orderNumber] || '+ Nota'}
                                   </button>
                                 )}
                               </td>
                               <td className="px-3 py-2 text-center">
                                 <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${
                                   row.daysWaiting >= 14 ? 'bg-rose-100 text-rose-700' : row.daysWaiting >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                 }`}>{row.daysWaiting}d</span>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
               </Card>

               <Card className="border-rose-200 bg-rose-50/30">
                 <div className="flex items-center justify-between mb-3">
                   <Title className="text-rose-900">🔴 Escaladas a Nota de Crédito ({blockedOrdersDetail.escaladaNc.length})</Title>
                   <Text className="text-xs text-slate-500">Sin pieza disponible — proceso de NC pendiente</Text>
                 </div>
                 {blockedOrdersDetail.escaladaNc.length === 0 ? (
                   <Text className="text-slate-400 text-sm">No hay órdenes escaladas a NC actualmente.</Text>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-xs">
                       <thead>
                         <tr className="bg-rose-100 text-rose-900 uppercase text-[10px] tracking-wide">
                           <th className="px-3 py-2 text-left font-semibold">Orden</th>
                           <th className="px-3 py-2 text-left font-semibold">Modelo</th>
                           <th className="px-3 py-2 text-left font-semibold">Falla reportada</th>
                           <th className="px-3 py-2 text-left font-semibold">Piezas registradas en Orderry</th>
                           <th className="px-3 py-2 text-left font-semibold w-40">Nota manual ✏️</th>
                           <th className="px-3 py-2 text-center font-semibold">Días</th>
                         </tr>
                       </thead>
                       <tbody>
                         {blockedOrdersDetail.escaladaNc.map((row, i) => {
                           const apiParts: OrderPart[] = bodegaOrderProducts[row.orderId] || [];
                           return (
                             <tr key={row.orderNumber} className={i % 2 === 0 ? 'bg-white' : 'bg-rose-50/50'}>
                               <td className="px-3 py-2 font-mono font-bold text-rose-800 whitespace-nowrap">{row.orderNumber}</td>
                               <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={row.model}>{row.model}</td>
                               <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={row.malfunction}>{row.malfunction}</td>
                               <td className="px-3 py-2 max-w-[220px]">
                                 {apiParts.length > 0 ? (
                                   <div className="flex flex-col gap-0.5">
                                     {apiParts.map((p) => (
                                       <span key={p.sku} className="inline-flex items-center gap-1 text-[11px]">
                                         <span className="font-mono font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1">{p.code}</span>
                                         <span className="text-slate-500 truncate" title={p.title}>{p.title.replace(p.code + '-', '').slice(0, 40)}</span>
                                       </span>
                                     ))}
                                   </div>
                                 ) : bodegaPartsLoading ? (
                                   <span className="text-slate-300 italic text-[11px]">cargando…</span>
                                 ) : (
                                   <span className="text-slate-300 italic text-[11px]">sin piezas registradas</span>
                                 )}
                               </td>
                               <td className="px-3 py-2 w-40">
                                 {editingPartNote === row.orderNumber ? (
                                   <input
                                     autoFocus
                                     defaultValue={partsNotes[row.orderNumber] || ''}
                                     onBlur={(e) => { savePartNote(row.orderNumber, e.target.value.trim()); setEditingPartNote(null); }}
                                     onKeyDown={(e) => { if (e.key === 'Enter') { savePartNote(row.orderNumber, (e.target as HTMLInputElement).value.trim()); setEditingPartNote(null); } if (e.key === 'Escape') setEditingPartNote(null); }}
                                     className="w-full border border-rose-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                                     placeholder="Ej: PCBA/DISPLAY"
                                   />
                                 ) : (
                                   <button
                                     onClick={() => setEditingPartNote(row.orderNumber)}
                                     className={`w-full text-left px-2 py-0.5 rounded truncate transition-colors ${partsNotes[row.orderNumber] ? 'text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100' : 'text-slate-300 italic bg-slate-50 hover:bg-rose-50 hover:text-rose-700'}`}
                                   >
                                     {partsNotes[row.orderNumber] || '+ Nota'}
                                   </button>
                                 )}
                               </td>
                               <td className="px-3 py-2 text-center">
                                 <span className="inline-block px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-700">{row.daysWaiting}d</span>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
               </Card>
             </div>
          </TabPanel>

          {/* --- PESTAÑA 5: QA --- */}
          <TabPanel>
             <Grid numItemsSm={1} numItemsLg={4} className="gap-6 mb-8">
                <Card>
                   <Text className="text-slate-500">QC Failure Rate</Text>
                   <Metric>{qaOperationalMetrics.qaFailureRate}%</Metric>
                   <Text className="text-xs text-slate-500 mt-2">Rechazos por retorno a estados anteriores tras pasar por Listo/Control de calidad</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500">Reprocesos (Taller)</Text>
                   <Metric>{qaOperationalMetrics.rejectedCount}</Metric>
                   <Text className="text-xs text-rose-500">Órdenes que regresaron a estados previos</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500">Tiempo promedio en Listo (QC)</Text>
                   <Metric>{qaOperationalMetrics.avgQaDays.toFixed(2)} días</Metric>
                   <Text className="text-xs text-slate-500">Promedio equivalente: {qaOperationalMetrics.avgQaHours.toFixed(1)}h · Mediana: {qaOperationalMetrics.medianQaDays.toFixed(2)}d</Text>
                </Card>
                <Card>
                   <Text className="text-slate-500">Órdenes evaluadas en QC</Text>
                   <Metric>{qaOperationalMetrics.qaOrdersCount}</Metric>
                   <Text className="text-xs text-slate-500">DOA/DAP en período: {qaOperationalMetrics.doaRate}%</Text>
                </Card>
             </Grid>

             <Grid numItemsSm={1} numItemsLg={3} className="gap-6 mb-8">
               <Card>
                 <Text className="text-slate-500">P90 tiempo en Listo (QC)</Text>
                 <Metric>{qaOperationalMetrics.p90QaDays.toFixed(2)} días</Metric>
                 <Text className="text-xs text-slate-500">El 90% de las órdenes tarda este valor o menos.</Text>
               </Card>
               <Card>
                 <Text className="text-slate-500">Órdenes actualmente en QC</Text>
                 <Metric>{qaOperationalMetrics.currentlyInQaCount}</Metric>
                 <Text className="text-xs text-slate-500">Casos activos en estatus del grupo Listo.</Text>
               </Card>
               <Card>
                 <Text className="text-slate-500">Cobertura de historial</Text>
                 <Metric>{qaOperationalMetrics.historyCoverage}%</Metric>
                 <ProgressBar value={Math.max(0, Math.min(qaOperationalMetrics.historyCoverage, 100))} color="blue" className="mt-3" />
                 <Text className="text-xs text-slate-500 mt-2">Porcentaje de órdenes QC con historial para TAT exacto.</Text>
               </Card>
             </Grid>

             <Card className="mb-8">
                <Title>Calidad Operativa: Aprobados vs Rechazados</Title>
                <BarChart
                  className="mt-6 h-80"
                  data={qaOperationalMetrics.weeklyData}
                  index="week"
                  categories={["Aprobados", "Rechazados"]}
                  colors={["emerald", "rose"]}
                  stack={true}
                />
             </Card>

             <Card>
               <Title>Órdenes rechazadas por retorno de estado</Title>
               <Text className="mt-2 text-xs text-slate-500">Si una orden pasó por Listo/Control de calidad y volvió a estados anteriores, se marca como rechazo.</Text>
               <div className="mt-4 overflow-x-auto">
                 <table className="min-w-full border border-slate-200 text-sm">
                   <thead className="bg-slate-100">
                     <tr>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Equipo</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado de retorno</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Técnico</th>
                     </tr>
                   </thead>
                   <tbody>
                     {qaOperationalMetrics.rejectionRows.length ? qaOperationalMetrics.rejectionRows.map((row, idx) => (
                       <tr key={`${row.number}-${row.returnedStatus}-${idx}`} className="bg-white even:bg-slate-50">
                         <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.number}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.equipment}</td>
                         <td className="border border-slate-200 px-3 py-2 text-rose-700">{row.returnedStatus}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.technician}</td>
                       </tr>
                     )) : (
                       <tr className="bg-white">
                         <td colSpan={4} className="border border-slate-200 px-3 py-6 text-center text-slate-500">No se detectaron rechazos por retorno en el período filtrado.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </Card>

             {/* Gráficos: distribución TAT + por técnico */}
             <Grid numItemsLg={2} className="gap-6 mt-6">
               <Card>
                 <Title>Distribución TAT en Control de Calidad</Title>
                 <Text className="mt-1 text-xs text-slate-500">Rango de tiempo que las órdenes permanecen en el grupo Listo.</Text>
                 {qaOperationalMetrics.tatDistribution.some((d) => d.count > 0) ? (
                   <DonutChart
                     className="mt-6 h-52"
                     data={qaOperationalMetrics.tatDistribution}
                     index="range"
                     category="count"
                     colors={['emerald', 'amber', 'orange', 'rose']}
                     valueFormatter={(v) => `${v} órdenes`}
                     showLabel
                   />
                 ) : (
                   <Text className="mt-6 text-sm text-slate-400 text-center py-8">Sin datos en el período.</Text>
                 )}
               </Card>
               <Card>
                 <Title>Equipos en QC por Técnico</Title>
                 <Text className="mt-1 text-xs text-slate-500">Cantidad de órdenes en Control de Calidad asignadas a cada técnico.</Text>
                 {qaOperationalMetrics.byTechnicianInQc.length > 0 ? (
                   <BarChart
                     className="mt-4 h-52"
                     data={qaOperationalMetrics.byTechnicianInQc}
                     index="name"
                     categories={['active', 'total']}
                     colors={['amber', 'blue']}
                     layout="vertical"
                     yAxisWidth={140}
                     valueFormatter={(v) => `${v}`}
                     stack={false}
                   />
                 ) : (
                   <Text className="mt-6 text-sm text-slate-400 text-center py-8">Sin datos en el período.</Text>
                 )}
               </Card>
             </Grid>

             <Card className="mt-6">
               <Title>Top TAT en Control de Calidad</Title>
               <Text className="mt-2 text-xs text-slate-500">Órdenes con mayor permanencia en el grupo Listo — todas las unidades con paginación.</Text>
               <div className="mt-4 overflow-x-auto">
                 <table className="min-w-full border border-slate-200 text-sm">
                   <thead className="bg-slate-100">
                     <tr>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Equipo</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Técnico</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado actual</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Entró a QC</th>
                       <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">TAT QC (días)</th>
                       <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">Activo</th>
                     </tr>
                   </thead>
                   <tbody>
                     {qaOperationalMetrics.topQaAgingRows.length ? (
                       qaOperationalMetrics.topQaAgingRows
                         .slice(qaAgingPage * QA_AGING_PAGE_SIZE, (qaAgingPage + 1) * QA_AGING_PAGE_SIZE)
                         .map((row, idx) => (
                           <tr key={`${row.number}-${idx}`} className="bg-white even:bg-slate-50">
                             <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.number}</td>
                             <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.equipment}</td>
                             <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.technician}</td>
                             <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.status}</td>
                             <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.enteredAt}</td>
                             <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-900">{row.qaDays.toFixed(2)}</td>
                             <td className="border border-slate-200 px-3 py-2 text-center">
                               <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.ongoing ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {row.ongoing ? 'En QC' : 'Cerrado'}
                               </span>
                             </td>
                           </tr>
                         ))
                     ) : (
                       <tr className="bg-white">
                         <td colSpan={7} className="border border-slate-200 px-3 py-6 text-center text-slate-500">No hay órdenes con permanencia en QC para el período filtrado.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
               {/* Paginación */}
               {qaOperationalMetrics.topQaAgingRows.length > QA_AGING_PAGE_SIZE && (
                 <Flex justifyContent="between" alignItems="center" className="mt-4 px-1">
                   <Text className="text-xs text-slate-500">
                     {qaAgingPage * QA_AGING_PAGE_SIZE + 1}–{Math.min((qaAgingPage + 1) * QA_AGING_PAGE_SIZE, qaOperationalMetrics.topQaAgingRows.length)} de {qaOperationalMetrics.topQaAgingRows.length} órdenes
                   </Text>
                   <Flex className="gap-2">
                     <button
                       type="button"
                       disabled={qaAgingPage === 0}
                       onClick={() => setQaAgingPage((p) => p - 1)}
                       className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                     >← Anterior</button>
                     <button
                       type="button"
                       disabled={(qaAgingPage + 1) * QA_AGING_PAGE_SIZE >= qaOperationalMetrics.topQaAgingRows.length}
                       onClick={() => setQaAgingPage((p) => p + 1)}
                       className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                     >Siguiente →</button>
                   </Flex>
                 </Flex>
               )}
             </Card>

             {/* Salida desde QC/Listo hacia Entrega */}
             <Card className="mt-6">
               <Title>Unidades que salen de Control de Calidad (Grupo Listo)</Title>
               <Text className="mt-1 text-xs text-slate-500">Filtra por fecha para saber cuántos equipos pasaron por Control y cuántos fueron aprobados/salieron a Entrega.</Text>

               <Flex justifyContent="between" alignItems="end" className="mt-4 gap-3 flex-wrap">
                 <div className="flex items-end gap-2 flex-wrap">
                   <div>
                     <Text className="text-xs text-slate-500 mb-1">Desde</Text>
                     <input
                       type="date"
                       value={selectedQcFromDate}
                       onChange={(e) => setSelectedQcFromDate(e.target.value)}
                       className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"
                     />
                   </div>
                   <div>
                     <Text className="text-xs text-slate-500 mb-1">Hasta</Text>
                     <input
                       type="date"
                       value={selectedQcToDate}
                       onChange={(e) => setSelectedQcToDate(e.target.value)}
                       className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"
                     />
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       setSelectedQcFromDate('');
                       setSelectedQcToDate('');
                     }}
                     className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                   >Limpiar</button>
                 </div>
                 <Text className="text-xs text-slate-500">Detalle mostrado: {qaListoToEntregaMetrics.rows.length} OS</Text>
               </Flex>

               <Grid numItemsSm={1} numItemsLg={4} className="gap-6 mt-4">
                 <Card decoration="top" decorationColor="cyan">
                   <Text className="text-slate-500">Unidades Listo → Entrega</Text>
                   <Metric>{qaListoToEntregaMetrics.units}</Metric>
                   <Text className="mt-2 text-xs text-slate-500 font-medium">Transiciones detectadas por historial</Text>
                 </Card>
                 <Card decoration="top" decorationColor="emerald">
                   <Text className="text-slate-500">Órdenes que pasaron por QC/Listo</Text>
                   <Metric>{qaListoToEntregaMetrics.qaTouched}</Metric>
                   <Text className="mt-2 text-xs text-slate-500 font-medium">Base para evaluar salida a Entrega</Text>
                 </Card>
                 <Card decoration="top" decorationColor="blue">
                   <Text className="text-slate-500">Órdenes aprobadas</Text>
                   <Metric>{qaListoToEntregaMetrics.approved}</Metric>
                   <Text className="mt-2 text-xs text-slate-500 font-medium">Aprobadas y avanzadas a Entrega</Text>
                 </Card>
                 <Card decoration="top" decorationColor="indigo">
                   <Text className="text-slate-500">% de salida desde QC/Listo</Text>
                   <Metric>{qaListoToEntregaMetrics.rate}%</Metric>
                   <Text className="mt-2 text-xs text-slate-500 font-medium">Unidades que sí avanzaron a Entrega</Text>
                 </Card>
               </Grid>

               <div className="mt-5 overflow-x-auto">
                 <table className="min-w-full border border-slate-200 text-sm">
                   <thead className="bg-slate-100">
                     <tr>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado del grupo Listo</th>
                       <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Actualmente en estado</th>
                       <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Cantidad que salió</th>
                       <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">%</th>
                     </tr>
                   </thead>
                   <tbody>
                     {qaListoToEntregaMetrics.byListoStatus.map((row) => (
                       <tr key={row.status} className="bg-white even:bg-slate-50">
                         <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.status}</td>
                         <td className="border border-slate-200 px-3 py-2 text-right text-slate-700 font-semibold">{row.current}</td>
                         <td className="border border-slate-200 px-3 py-2 text-right text-cyan-700 font-semibold">{row.count}</td>
                         <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{qaListoToEntregaMetrics.units ? ((row.count / qaListoToEntregaMetrics.units) * 100).toFixed(1) : '0.0'}%</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               <div className="mt-5 overflow-x-auto">
                 <table className="min-w-full border border-slate-200 text-sm">
                   <thead className="bg-slate-100">
                     <tr>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Equipo</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Técnico</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado Listo</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Pasó por Control</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Aprobado / Salió</th>
                       <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado actual</th>
                     </tr>
                   </thead>
                   <tbody>
                     {qaListoToEntregaMetrics.rows.length ? qaListoToEntregaMetrics.rows.map((row) => (
                       <tr key={row.id} className="bg-white even:bg-slate-50">
                         <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.number}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.equipment}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.technician}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.listoStatus}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.controlAt}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.approvedAt}</td>
                         <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.status}</td>
                       </tr>
                     )) : (
                       <tr className="bg-white">
                         <td colSpan={7} className="border border-slate-200 px-3 py-6 text-center text-slate-500">Sin movimientos de Control/Aprobación en el rango seleccionado.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
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

          {/* --- PESTAÑA 7: SUBIR CLAIMS --- */}
          <TabPanel>
            <Card className="mb-6">
              <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                <div>
                  <Title>Generador de Claims · MVP</Title>
                  <Text className="mt-1 text-xs text-slate-500">Embudo operativo: filtro de marca/estado, semáforo, traductor de códigos y plantilla final para carga en portal ISP.</Text>
                </div>
                <Flex className="gap-2 flex-wrap">
                  <Select value={selectedClaimGeneratorBrand} onValueChange={(value) => setSelectedClaimGeneratorBrand(value as 'XIAOMI' | 'TCL' | 'ALCATEL')} className="w-[170px]">
                    <SelectItem value="XIAOMI">Xiaomi</SelectItem>
                    <SelectItem value="TCL">TCL</SelectItem>
                    <SelectItem value="ALCATEL">Alcatel</SelectItem>
                  </Select>
                  <button
                    type="button"
                    onClick={handleDownloadClaimsTemplate}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Descargar template {claimsTemplateDownloadRows.length ? '(con datos)' : '(vacío)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadClaimsTemplateEmpty}
                    className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Descargar solo encabezados
                  </button>
                  <Badge color="amber">Filas para exportar: {claimsTemplateDownloadRows.length}</Badge>
                  <Badge color="indigo">Template: {claimsGeneratorConfig.template}</Badge>
                  <Badge color="blue">Lógica: {claimsGeneratorConfig.codingLogic}</Badge>
                  <Badge color="emerald">Columnas: {CLAIM_UPLOAD_TEMPLATE_COLUMNS.length}</Badge>
                </Flex>
              </Flex>
            </Card>

            <Grid numItemsSm={1} numItemsLg={4} className="gap-6 mb-6">
              <Card decoration="top" decorationColor="blue">
                <Text className="text-slate-500 uppercase text-xs">Órdenes candidatas</Text>
                <Metric>{claimsGeneratorSummary.total}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Marca + estado de QA/Control en período activo</Text>
              </Card>
              <Card decoration="top" decorationColor="emerald">
                <Text className="text-slate-500 uppercase text-xs">Semáforo verde</Text>
                <Metric>{claimsGeneratorSummary.validRows}</Metric>
                <ProgressBar
                  className="mt-4"
                  value={claimsGeneratorSummary.total ? (claimsGeneratorSummary.validRows / claimsGeneratorSummary.total) * 100 : 0}
                  color="emerald"
                />
              </Card>
              <Card decoration="top" decorationColor="rose">
                <Text className="text-slate-500 uppercase text-xs">Semáforo rojo</Text>
                <Metric>{claimsGeneratorSummary.incompleteRows}</Metric>
                <Text className="mt-2 text-xs text-rose-600">Registros con faltantes críticos</Text>
              </Card>
              <Card decoration="top" decorationColor="amber">
                <Text className="text-slate-500 uppercase text-xs">Reglas auto aplicadas</Text>
                <Metric>{claimsGeneratorSummary.autoFilledRepairStart + claimsGeneratorSummary.autoDetectedL1 + claimsGeneratorSummary.autoDetectedL3Fallback}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Repair start + método + L3 fallback</Text>
              </Card>
            </Grid>

            <TabGroup>
              <TabList variant="solid" className="mb-4">
                <Tab>① Semáforo</Tab>
                <Tab>② Traductor</Tab>
                <Tab>③ Reglas Auto</Tab>
                <Tab>④ Template 68</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <Grid numItemsLg={2} className="gap-6">
                    <Card>
                      <Title>Validación de campos críticos</Title>
                      <Text className="mt-1 text-xs text-slate-500">Verde: completo. Rojo: faltan IMEI, GoodsID o fecha de venta.</Text>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border border-slate-200 text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Campo faltante</th>
                              <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Casos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claimsGeneratorSummary.missingByField.length ? claimsGeneratorSummary.missingByField.map((row) => (
                              <tr key={row.field} className="bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.field}</td>
                                <td className="border border-slate-200 px-3 py-2 text-right text-rose-700 font-semibold">{row.count}</td>
                              </tr>
                            )) : (
                              <tr className="bg-white">
                                <td colSpan={2} className="border border-slate-200 px-3 py-6 text-center text-emerald-700">Todos los registros cumplen campos críticos.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                    <Card>
                      <Title>Muestra de órdenes para carga</Title>
                      <Text className="mt-1 text-xs text-slate-500">Estado por orden previo a exportación.</Text>
                      <div className="mt-4 overflow-x-auto max-h-[360px]">
                        <table className="min-w-full border border-slate-200 text-sm">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Modelo</th>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Semáforo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claimsGeneratorRows.slice(0, 20).map((row) => (
                              <tr key={`${row.os}-${row.imei || 'na'}`} className="bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.os}</td>
                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.model}</td>
                                <td className="border border-slate-200 px-3 py-2">
                                  <Badge color={row.missingFields.length ? 'rose' : 'emerald'}>
                                    {row.missingFields.length ? `Rojo · faltan ${row.missingFields.join(', ')}` : 'Verde · listo'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </Grid>
                </TabPanel>

                <TabPanel>
                  <Card>
                    <Title>Tabla maestra de mapeo (Español → ISP)</Title>
                    <Text className="mt-1 text-xs text-slate-500">Top 10 mapeos operativos más frecuentes para normalizar diagnóstico hacia código ISP.</Text>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full border border-slate-200 text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Descripción Orderry</th>
                            <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Código ISP</th>
                            <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Categoría</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CLAIM_MVP_FAULT_MAP.map((row, index) => (
                            <tr key={`${row.ispCode}-${row.source}-${index}`} className="bg-white even:bg-slate-50">
                              <td className="border border-slate-200 px-3 py-2">{row.source}</td>
                              <td className="border border-slate-200 px-3 py-2 font-semibold text-blue-700">{row.ispCode}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </TabPanel>

                <TabPanel>
                  <Grid numItemsLg={2} className="gap-6">
                    <Card>
                      <Title>Reglas automáticas activas</Title>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <Text className="text-sm font-semibold text-slate-800">1) Tiempos SLA (TAT Xiaomi)</Text>
                          <Text className="text-xs text-slate-600 mt-1">Repair_Start = Create + 48h; Repair_Finish y Close = Repair_Start + 24h.</Text>
                          <Badge color="blue" className="mt-2">Aplicadas: {claimsGeneratorSummary.autoFilledRepairStart}</Badge>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <Text className="text-sm font-semibold text-slate-800">2) Processing_method_code faltante</Text>
                          <Text className="text-xs text-slate-600 mt-1">Sin repuestos = 3001; con repuestos = 5001; mainboard = 5101.</Text>
                          <Badge color="indigo" className="mt-2">Inspección (3001): {claimsGeneratorSummary.autoDetectedL1}</Badge>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <Text className="text-sm font-semibold text-slate-800">3) Level_3_malfunction_code faltante</Text>
                          <Text className="text-xs text-slate-600 mt-1">Se infiere por palabras clave del diagnóstico técnico.</Text>
                          <Badge color="amber" className="mt-2">Fallback MP099: {claimsGeneratorSummary.autoDetectedL3Fallback}</Badge>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <Text className="text-sm font-semibold text-slate-800">4) Constantes obligatorias</Text>
                          <Text className="text-xs text-slate-600 mt-1">Se inyectan ISP_SC_code, service_center_code, service_mode y customer_email default.</Text>
                          <Badge color="emerald" className="mt-2">ISP_SC_code = GTM00010</Badge>
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <Title>Preview transformado por orden</Title>
                      <Text className="mt-1 text-xs text-slate-500">Vista simplificada del resultado que alimenta el archivo de subida.</Text>
                      <div className="mt-4 overflow-x-auto max-h-[430px]">
                        <table className="min-w-full border border-slate-200 text-sm">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">OS</th>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">IMEI/SN</th>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Método</th>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">L3 Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claimsGeneratorRows.slice(0, 25).map((row) => (
                              <tr key={`${row.os}-${row.l3MalfunctionCode}`} className="bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.os}</td>
                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.imei || 'Sin IMEI'}</td>
                                <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.processingMethodCode}</td>
                                <td className="border border-slate-200 px-3 py-2 text-blue-700 font-semibold">{row.l3MalfunctionCode}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </Grid>
                </TabPanel>

                <TabPanel>
                  <Grid numItemsLg={2} className="gap-6">
                    <Card>
                      <Title>Columnas exactas del template</Title>
                      <Text className="mt-1 text-xs text-slate-500">Este bloque ya usa los encabezados reales que compartiste para la carga ISP.</Text>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border border-slate-200 text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Campo</th>
                              <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CLAIM_UPLOAD_TEMPLATE_COLUMNS.map((field) => (
                              <tr key={field} className="bg-white even:bg-slate-50">
                                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{field}</td>
                                <td className="border border-slate-200 px-3 py-2">
                                  <Badge color={CLAIM_TEMPLATE_CRITICAL_FIELDS.includes(field as typeof CLAIM_TEMPLATE_CRITICAL_FIELDS[number]) ? 'amber' : 'emerald'}>
                                    {CLAIM_TEMPLATE_CRITICAL_FIELDS.includes(field as typeof CLAIM_TEMPLATE_CRITICAL_FIELDS[number]) ? 'Crítico / validar' : 'Mapeado o vacío controlado'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleDownloadClaimsTemplate}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Descargar template CSV (con datos)
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadClaimsTemplateEmpty}
                          className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Descargar template vacío
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(claimsPythonPrompt);
                            }
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Copiar prompt Python
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(XIAOMI_CLASSIFICATION_PROMPTS.base);
                            }
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Copiar prompt Base (JSON)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(XIAOMI_CLASSIFICATION_PROMPTS.business);
                            }
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Copiar prompt Negocio
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(XIAOMI_CLASSIFICATION_PROMPTS.confidence);
                            }
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Copiar prompt Confianza
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(XIAOMI_CLASSIFICATION_PROMPTS.production);
                            }
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                          Copiar prompt Producción
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.alert('Siguiente paso: ejecutar el script Python con tus 3 archivos reales para generar el .xlsx/.csv de carga ISP.');
                            }
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Generar script Python completo
                        </button>
                      </div>
                    </Card>

                    <Card>
                      <Title>Preview del template con datos</Title>
                      <Text className="mt-1 text-xs text-slate-500">Se muestran las primeras órdenes ya preparadas con tus encabezados reales. Puedes desplazarte horizontalmente para ver todo el layout.</Text>
                      <div className="mt-4 overflow-x-auto max-h-[520px] rounded-xl border border-slate-200">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              {CLAIM_UPLOAD_TEMPLATE_COLUMNS.map((column) => (
                                <th key={column} className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {claimsTemplateDownloadRows.slice(0, 5).map((row, index) => (
                              <tr key={`template-row-${index}`} className="bg-white even:bg-slate-50">
                                {CLAIM_UPLOAD_TEMPLATE_COLUMNS.map((column) => (
                                  <td key={`${index}-${column}`} className="border border-slate-200 px-3 py-2 text-slate-700 whitespace-nowrap">{row[column] || ''}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </Grid>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </TabPanel>

          {/* ─── PESTAÑA 8: MÓDULO DE BONO TÉCNICO ─────────────────────── */}
          <TabPanel>
            {/* Header */}
            <Card className="mb-6">
              <Flex justifyContent="between" alignItems="center" className="gap-3 flex-wrap">
                <div>
                  <Title>Módulo de Bono Técnico · TechComm Wireless</Title>
                  <Text className="mt-1 text-xs text-slate-500">
                    Incentivo por producción excedente. Solo cuenta órdenes en estado Control de Calidad. Meta mínima diaria antes de generar bono.
                  </Text>
                </div>
                <Flex className="gap-2 flex-wrap">
                  <Badge color="blue">Órdenes Entrega+Listo: {bonusRawRows.length}</Badge>
                  <Badge color={bonusSummary.techsWithSurplus > 0 ? 'emerald' : 'slate'}>
                    Técnicos con excedente: {bonusSummary.techsWithSurplus}
                  </Badge>
                  <Badge color="amber">Total unidades filtradas: {bonusSummary.totalUnits}</Badge>
                </Flex>
              </Flex>
            </Card>

            {/* Filtros */}
            <Card className="mb-6">
              <Flex justifyContent="start" alignItems="end" className="gap-4 flex-wrap">
                <div>
                  <Text className="text-xs text-slate-500 mb-1">Fecha</Text>
                  <input
                    type="date"
                    value={selectedBonusDate}
                    onChange={(e) => setSelectedBonusDate(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <Text className="text-xs text-slate-500 mb-1">Técnico</Text>
                  <Select value={selectedBonusTechnician} onValueChange={setSelectedBonusTechnician} className="w-[220px]">
                    <SelectItem value="ALL">Todos los técnicos</SelectItem>
                    {availableTechnicians.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </Select>
                </div>
                <div>
                  <Text className="text-xs text-slate-500 mb-1">Línea de Producto</Text>
                  <Select value={selectedBonusLine} onValueChange={setSelectedBonusLine} className="w-[220px]">
                    <SelectItem value="ALL">Todas las líneas</SelectItem>
                    {BONUS_METRICS_CONFIG.map((c) => (
                      <SelectItem key={c.line} value={c.line}>{c.line}</SelectItem>
                    ))}
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedBonusDate(''); setSelectedBonusTechnician('ALL'); setSelectedBonusLine('ALL'); }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >Limpiar filtros</button>
              </Flex>
            </Card>

            {/* KPI cards */}
            <Grid numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
              <Card decoration="top" decorationColor="indigo">
                <Text className="text-slate-500 uppercase text-xs">Incentivo Total del Día</Text>
                <Metric>Q {bonusSummary.totalIncentive.toFixed(2)}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Suma de excedentes liquidados en período filtrado</Text>
              </Card>
              <Card decoration="top" decorationColor="emerald">
                <Text className="text-slate-500 uppercase text-xs">Técnicos con Excedente</Text>
                <Metric>{bonusSummary.techsWithSurplus}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Superaron su meta diaria</Text>
              </Card>
              <Card decoration="top" decorationColor="amber">
                <Text className="text-slate-500 uppercase text-xs">Unidades Excedentes Netas</Text>
                <Metric>{bonusSummary.totalSurplusUnits}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Por encima de la meta acumulada</Text>
              </Card>
              <Card decoration="top" decorationColor="blue">
                <Text className="text-slate-500 uppercase text-xs">Total Unidades Procesadas</Text>
                <Metric>{bonusSummary.totalUnits}</Metric>
                <Text className="mt-2 text-xs text-slate-500">Órdenes en Control de Calidad</Text>
              </Card>
            </Grid>

            {/* ── Producción en Control de Calidad ── */}
            <Card className="mb-6">
              <Flex justifyContent="between" alignItems="center" className="mb-4 gap-3 flex-wrap">
                <div>
                  <Title>Producción en Control de Calidad por Ejecutor</Title>
                  <Text className="text-xs text-slate-500 mt-1">
                    Órdenes enviadas a CQ por día y técnico. Ponderada = L0×15% + L1×25% + L2×60%. Verde = cumple meta, rojo = no cumple.
                  </Text>
                </div>
                <Badge color="cyan">
                  {bonusQcAggregates.filter((r) =>
                    (!selectedBonusDate || r.date === selectedBonusDate) &&
                    (selectedBonusTechnician === 'ALL' || r.technician === selectedBonusTechnician) &&
                    (selectedBonusLine === 'ALL' || r.productLine === selectedBonusLine)
                  ).length} registros
                </Badge>
              </Flex>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Fecha</th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Ejecutor</th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Línea</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-500">L0</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-indigo-700">L1</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-blue-700">L2</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Total</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-purple-700">Ponderada</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Meta</th>
                      <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">¿Cumple?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonusQcAggregates.filter((r) =>
                      (!selectedBonusDate || r.date === selectedBonusDate) &&
                      (selectedBonusTechnician === 'ALL' || r.technician === selectedBonusTechnician) &&
                      (selectedBonusLine === 'ALL' || r.productLine === selectedBonusLine)
                    ).length > 0 ? (
                      bonusQcAggregates
                        .filter((r) =>
                          (!selectedBonusDate || r.date === selectedBonusDate) &&
                          (selectedBonusTechnician === 'ALL' || r.technician === selectedBonusTechnician) &&
                          (selectedBonusLine === 'ALL' || r.productLine === selectedBonusLine)
                        )
                        .map((row, i) => (
                          <tr key={i} className="bg-white even:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 text-slate-600">{row.date}</td>
                            <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.technician}</td>
                            <td className="border border-slate-200 px-3 py-2">
                              <Badge color={
                                row.productLine === 'MOVILES' ? 'blue' :
                                row.productLine === 'SCOOTER' ? 'emerald' :
                                row.productLine === 'ASPIRADORAS' ? 'cyan' : 'orange'
                              }>{row.productLine}</Badge>
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-right text-slate-500">{row.l0}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right text-indigo-700 font-semibold">{row.l1}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right text-blue-700 font-semibold">{row.l2}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-bold text-slate-900">{row.total}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right font-bold text-purple-700">{row.weighted.toFixed(2)}</td>
                            <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{row.quota}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">
                              {row.meetsQuota ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  ✓ Sí
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-700">
                                  ✗ No ({(row.quota - row.weighted).toFixed(2)} faltan)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr className="bg-white">
                        <td colSpan={10} className="border border-slate-200 px-3 py-8 text-center text-slate-500">
                          No hay órdenes en Control de Calidad para los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Chart + config matrix side by side */}
            {/* Charts row: incentive + units repaired */}
            {bonusSummary.byTechnician.length > 0 && (
              <Grid numItemsLg={2} className="gap-6 mb-6">
                <Card>
                  <Title>Incentivo por Técnico (Q)</Title>
                  <Text className="mt-1 text-xs text-slate-500">Bono acumulado en el período filtrado.</Text>
                  <BarChart
                    className="mt-4 h-64"
                    data={bonusSummary.byTechnician}
                    index="name"
                    categories={['incentive']}
                    colors={['indigo']}
                    layout="vertical"
                    yAxisWidth={180}
                    valueFormatter={(v) => `Q ${v.toFixed(2)}`}
                  />
                </Card>
                <Card>
                  <Title>Unidades Reparadas por Técnico</Title>
                  <Text className="mt-1 text-xs text-slate-500">Total de unidades en Control de Calidad en el período filtrado.</Text>
                  <BarChart
                    className="mt-4 h-64"
                    data={bonusSummary.byTechnician}
                    index="name"
                    categories={['units']}
                    colors={['emerald']}
                    layout="vertical"
                    yAxisWidth={180}
                    valueFormatter={(v) => `${v} uds`}
                  />
                </Card>
              </Grid>
            )}
            {bonusSummary.byTechnician.length === 0 && (
              <Card className="mb-6">
                <Text className="text-sm text-slate-400 text-center py-8">Sin datos en el período seleccionado.</Text>
              </Card>
            )}
            <div className="mb-6">
              <Card>
                <Title>CONFIG_METRICAS — Referencia</Title>
                <Text className="mt-1 text-xs text-slate-500">Cuotas ponderadas y tarifas por rol y línea (Q). Peso: L0=15% · L1=25% · L2=60%.</Text>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-200 px-2 py-2 text-left font-semibold text-slate-700">Línea</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-slate-700">Meta</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-amber-700">Técnico L1</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-amber-800">Técnico L2</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-blue-600">CQ L1</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-blue-700">CQ L2</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-slate-500">Back L1</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-slate-600">Back L2</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-slate-400">Bod L1</th>
                        <th className="border border-slate-200 px-2 py-2 text-right font-semibold text-slate-500">Bod L2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BONUS_METRICS_CONFIG.map((cfg) => (
                        <tr key={cfg.line} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-2 py-2 font-semibold text-slate-800">{cfg.line}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right font-bold text-slate-700">{cfg.dailyQuota}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-amber-700">Q{cfg.rates.tecnico.l1.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right font-semibold text-amber-800">Q{cfg.rates.tecnico.l2.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-blue-600">Q{cfg.rates.cq.l1.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-blue-700">Q{cfg.rates.cq.l2.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-slate-500">Q{cfg.rates.backoffice.l1.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-slate-600">Q{cfg.rates.backoffice.l2.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-slate-400">Q{cfg.rates.bodega.l1.toFixed(2)}</td>
                          <td className="border border-slate-200 px-2 py-2 text-right text-slate-500">Q{cfg.rates.bodega.l2.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <Text className="text-xs font-semibold text-amber-800">Regla de cálculo (según el peso se paga)</Text>
                  <Text className="text-xs text-amber-700 mt-1">
                    1. Producción ponderada = L0×0.15 + L1×0.25 + L2×0.60.<br/>
                    2. Si Ponderada &gt; Meta → Excedente ponderado = Ponderada − Meta.<br/>
                    3. Convertir excedente a unidades físicas: L2 primero (÷0.60), luego L1 (÷0.25).<br/>
                    4. Incentivo = Excedente_L2_físico × Tarifa_L2 + Excedente_L1_físico × Tarifa_L1.<br/>
                    5. L0 (DOA/NC) pesa 0.15 hacia la meta pero no genera bono.
                  </Text>
                </div>
              </Card>
            </div>

            {/* Detalle diario */}
            <Card>
              <Flex justifyContent="between" alignItems="center" className="mb-4 gap-3 flex-wrap">
                <div>
                  <Title>Detalle Diario por Técnico y Línea</Title>
                  <Text className="text-xs text-slate-500 mt-1">Registro de producción: L0 = Diagnóstico/NC, L1 = Software, L2 = Mecánica/Hardware.</Text>
                </div>
                <Badge color="slate">{bonusFilteredRows.length} registros</Badge>
              </Flex>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Fecha</th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Técnico (Ejecutor)</th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Línea</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-500">L0 NC/DOA</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-indigo-700">L1 SW</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-blue-700">L2 HW</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Total</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Meta</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-amber-700">Excedente</th>
                      <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-emerald-700">Incentivo (Q)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonusFilteredRows.length ? bonusFilteredRows.map((row, idx) => (
                      <tr key={`${row.date}-${row.technician}-${row.productLine}-${idx}`} className="bg-white even:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">{row.date}</td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{row.technician}</td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700">
                          <Badge color={
                            row.productLine === 'MOVILES' ? 'blue' :
                            row.productLine === 'SCOOTER' ? 'emerald' :
                            row.productLine === 'ASPIRADORAS' ? 'cyan' : 'orange'
                          }>
                            {row.productLine}
                          </Badge>
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-500">{row.l0}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-indigo-700 font-semibold">{row.l1}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-blue-700 font-semibold">{row.l2}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-bold text-slate-900">{row.total}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-slate-600">{row.quota}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right">
                          <span className={`font-semibold ${row.surplusWeighted > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                            {row.surplusWeighted > 0 ? `+${(row.surplusL2 + row.surplusL1).toFixed(2)}` : '0'}
                          </span>
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right">
                          <span className={`font-bold ${row.incentive > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {row.incentive > 0 ? `Q ${row.incentive.toFixed(2)}` : '—'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr className="bg-white">
                        <td colSpan={10} className="border border-slate-200 px-3 py-8 text-center text-slate-500">
                          {bonusRawRows.length === 0
                            ? 'No hay órdenes con Entrega y Listo el mismo día. Verifica la conexión con Orderry.'
                            : 'No hay registros para los filtros seleccionados.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {bonusFilteredRows.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100">
                        <td colSpan={6} className="border border-slate-200 px-3 py-2 font-bold text-slate-700 text-right">TOTALES</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-bold text-slate-900">{bonusSummary.totalUnits}</td>
                        <td className="border border-slate-200 px-3 py-2"></td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-bold text-amber-700">+{bonusSummary.totalSurplusUnits}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-bold text-emerald-700">Q {bonusSummary.totalIncentive.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>

            {/* Resumen acumulado por técnico */}
            {bonusSummary.byTechnician.length > 0 && (
              <Card className="mt-6">
                <Title>Resumen Acumulado por Técnico</Title>
                <Text className="mt-1 text-xs text-slate-500">Total de bono generado, unidades producidas y excedentes en el período filtrado.</Text>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Técnico</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">Total Unidades</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-amber-700">Unidades Excedentes</th>
                        <th className="border border-slate-200 px-3 py-2 text-right font-semibold text-emerald-700">Incentivo Total (Q)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonusSummary.byTechnician.map((row) => (
                        <tr key={row.name} className="bg-white even:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">{row.name}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right text-slate-700 font-semibold">{row.units}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right">
                            <span className={`font-semibold ${row.surplus > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                              {row.surplus > 0 ? `+${row.surplus}` : '—'}
                            </span>
                          </td>
                          <td className="border border-slate-200 px-3 py-2 text-right">
                            <span className={`font-bold ${row.incentive > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {row.incentive > 0 ? `Q ${row.incentive.toFixed(2)}` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabPanel>

        </TabPanels>
      </TabGroup>
    </div>
  );
}
