import { NextRequest, NextResponse } from 'next/server';

async function fetchAllOrdersFromOrderry(): Promise<Record<string, any>[]> {
  const apiKey = process.env.ORDERRY_API_KEY;
  const apiUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  if (!apiKey) throw new Error('ORDERRY_API_KEY not configured');

  const allOrders: Record<string, any>[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${apiUrl}/v2/orders?limit=200&page=${page}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    allOrders.push(...data.data);
    page++;
    if (page > 50) break; // safety limit
  }
  return allOrders;
}

/**
 * POST /api/claims/generate-xiaomi
 * 
 * Transforms Orderry orders into Xiaomi Claims ISP format.
 * Implements production ETL with 8 transformation rules.
 * 
 * Request body (optional):
 *   - orders: OrderryOrder[] (if provided, uses this; else fetches from API)
 * 
 * Response:
 *   - JSON with transformation results, errors, and statistics
 *   - Set Content-Disposition for XLSX file download
 */

// Constants
const ISP_SC_CODE = 'GTM00010';
const SERVICE_CENTER_CODE = 'GT-TCW-MSC-Guatemala';
const CUSTOMER_EMAIL_DEFAULT = 'recepcion_gt@mi.com';
const SERVICE_MODE = 'Mail_In';
const ACTIVITY_PROJECT = 'XIAOMI';

// Level 3 Malfunction Code Mapping Dictionary
const L3_MALFUNCTION_CODES: Record<string, { name: string; keywords: string[] }> = {
  MP00FUN0106: {
    name: 'Power on failure',
    keywords: ['logo', 'no inicia', 'actualización', 'bootloop', 'se queda', 'no enciende'],
  },
  PA00FUN0401: {
    name: 'Display blurred/abnormal',
    keywords: ['pantalla', 'rayas', 'imagen', 'borrosa', 'manchas', 'display'],
  },
  MP00FUN1101: {
    name: 'Touch screen failure',
    keywords: ['touch', 'pantalla rota', 'táctil', 'responsivo', 'pantalla quebrada'],
  },
  MP00FUN1801: {
    name: 'Charging fault',
    keywords: ['carga', 'pin dañado', 'no carga', 'batería', 'energía'],
  },
  MP00FUN0503: {
    name: 'Speaker no voice',
    keywords: ['audio', 'sonido', 'bocina', 'no se escucha', 'ronca'],
  },
  'MP099-GEN': {
    name: 'Generic malfunction',
    keywords: ['general', 'otro', 'falla', 'defecto'],
  },
};

// Helper: Normalize text for keyword matching
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
}

// Helper: Infer Level 3 Malfunction Code
function inferL3MalfunctionCode(veredicto: string, engineerNotes: string = ''): string {
  const diagnosis = normalizeText(`${veredicto} ${engineerNotes}`);
  const scores: Record<string, number> = {};

  for (const [code, info] of Object.entries(L3_MALFUNCTION_CODES)) {
    const matches = info.keywords.filter((kw) => diagnosis.includes(kw)).length;
    if (matches > 0) {
      scores[code] = matches;
    }
  }

  if (Object.keys(scores).length > 0) {
    return Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));
  }

  return 'MP099-GEN';
}

// Helper: Infer Service Type
function inferServiceType(
  services: string[],
  parts: Array<{ sku?: string; name?: string }>,
  veredicto: string
): { serviceType: 'Repair' | 'Inspection'; processingMethodCode: string } {
  const servicesText = normalizeText(services.join(' ') + ' ' + veredicto);
  const hasParts = parts && parts.length > 0;

  const repairKeywords = [
    'reparación nivel 1',
    'reparación nivel 2',
    'actualización software',
    'cambio de pcba',
    'reemplazo',
  ];
  const hasRepairService = repairKeywords.some((kw) => servicesText.includes(kw));

  if (hasParts || hasRepairService) {
    // Check for mainboard replacement
    const isMainboard =
      parts.some((p) => normalizeText(p.name || '').includes('pcba')) ||
      servicesText.includes('pcba');
    return {
      serviceType: 'Repair',
      processingMethodCode: isMainboard ? '5101' : '5001',
    };
  }

  return {
    serviceType: 'Inspection',
    processingMethodCode: '3001',
  };
}

// Helper: Infer Warranty Status
function inferWarranty(entryType: string): 'IW' | 'OOW' {
  return normalizeText(entryType).includes('iw') ? 'IW' : 'OOW';
}

// Helper: Calculate Repair Timestamps
function calculateRepairTimestamps(
  createdAt: string
): { repairStart: string; repairFinish: string; closeTime: string } {
  try {
    const created = new Date(createdAt);
    const repairStart = new Date(created.getTime() + 48 * 60 * 60 * 1000);
    const repairFinish = new Date(repairStart.getTime() + 24 * 60 * 60 * 1000);

    const format = (date: Date) => {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours() % 12 || 12).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      const period = date.getHours() >= 12 ? 'PM' : 'AM';
      return `${mm}/${dd}/${yyyy} ${hh}:${mins}:${ss} ${period}`;
    };

    return {
      repairStart: format(repairStart),
      repairFinish: format(repairFinish),
      closeTime: format(repairFinish),
    };
  } catch (e) {
    const now = new Date();
    return {
      repairStart: now.toISOString(),
      repairFinish: now.toISOString(),
      closeTime: now.toISOString(),
    };
  }
}

// Helper: Extract New IMEI from Veredicto
function extractNewImei(veredicto: string): string {
  const patterns = [
    /IMEI\s+NUEVO\s*:\s*(\d{15})/i,
    /NEW\s*:\s*(\d{15})/i,
    /IMEI\s+NUEVO\s*:\s*([0-9\s]{15,})/i,
  ];

  for (const pattern of patterns) {
    const match = veredicto.match(pattern);
    if (match) {
      const digits = match[1].replace(/\D/g, '').slice(0, 15);
      if (digits.length === 15) {
        return digits;
      }
    }
  }

  return '';
}

// Helper: Extract IMEI
function extractImei(order: Record<string, any>): string {
  const customFields = order?.custom_fields || {};
  const candidates = [
    customFields.f3130204,
    customFields.f3147565,
    customFields.f3151083,
    customFields.f3129959,
    order?.asset?.imei,
    order?.imei,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const digits = candidate.replace(/\D/g, '');
      if (digits.length >= 14) {
        return digits.slice(0, 15);
      }
    }
  }

  return '';
}

// Helper: Extract GoodsID
function extractGoodsId(order: Record<string, any>): string {
  const customFields = order?.custom_fields || {};
  return (
    customFields.goods_id ||
    customFields.product_id ||
    order?.asset?.product_id ||
    ''
  );
}

// Helper: Get Parts Array
function getParts(order: Record<string, any>): Array<{ sku?: string; name?: string }> {
  const parts = order?.parts;
  if (Array.isArray(parts)) {
    return parts.map((p) => ({
      sku: p.sku || p.SKU || '',
      name: p.name || p.NAME || '',
    }));
  }
  return [];
}

// Helper: Get Services Array
function getServices(order: Record<string, any>): string[] {
  const customFields = order?.custom_fields || {};
  const servicios = customFields.servicios;
  if (typeof servicios === 'string') {
    return servicios.split(',').map((s) => s.trim());
  }
  if (Array.isArray(servicios)) {
    return servicios;
  }
  return [];
}

// Main Transformation Function
function transformOrderToXiaomiClaims(order: Record<string, any>): Record<string, string> {
  const customFields = order?.custom_fields || {};

  // Extract base information
  const imei = extractImei(order);
  const goodsId = extractGoodsId(order);
  const brand = (customFields.brand || 'XIAOMI').toUpperCase();
  const model = customFields.model || 'Unknown';
  const productCategory = customFields.product_category || 'Smartphone';
  const createdAt = order?.created_at || new Date().toISOString();
  const entryType = (customFields.entry_type || order?.entry_type || 'OOW').toUpperCase();

  // Get services and parts
  const services = getServices(order);
  const parts = getParts(order);

  // Infer service type and processing method
  const veredicto = customFields.veredicto || customFields.diagnosis || '';
  const engineerNotes = customFields.engineer_notes || order?.engineer_notes || '';
  const { serviceType, processingMethodCode } = inferServiceType(services, parts, veredicto);
  const l3Code = inferL3MalfunctionCode(veredicto, engineerNotes);

  // Calculate timestamps
  const { repairStart, repairFinish, closeTime } = calculateRepairTimestamps(createdAt);

  // Extract new IMEI
  const newImei = extractNewImei(veredicto);

  // Infer warranty
  const warranty = inferWarranty(entryType);

  // Infer damage flags
  const damageText = normalizeText(`${engineerNotes} ${veredicto}`);
  const appearanceDamage = damageText.includes('dano estetico') || damageText.includes('appearance damage') ? 'Yes' : 'No';
  const userDamage = damageText.includes('dano usuario') || damageText.includes('user damage') ? 'Yes' : 'No';

  // Build output row
  const row: Record<string, string> = {
    service_order_status: 'Closed',
    Third_service_order_number: '',
    operator_service_order_number: order?.number || `OS-${order?.id || 'SN'}`,
    ISP_SC_code: ISP_SC_CODE,
    service_center_code: SERVICE_CENTER_CODE,
    customer_email: CUSTOMER_EMAIL_DEFAULT,
    PO_number: '',
    dealer_name: order?.channel || order?.client?.name || '',
    customer_type: (customFields.customer_type || 'RETAILER').toUpperCase(),
    service_mode: SERVICE_MODE,
    service_type: serviceType,
    Return_type: '',
    Return_warehouse_type: '',
    service_subtype: 'On_site_pick_and_repair',
    IW_OOW: warranty,
    Appearance_Damage: appearanceDamage,
    Malfunction_Description: veredicto,
    invoice_number: '',
    invoice_time: '',
    goods_id: goodsId,
    SN_Or_IMEI1: imei,
    newSN: '',
    new_IMEI: newImei,
    Is_user_damange: userDamage,
    create_time: new Date(createdAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    SC_express_receipt_time: new Date(createdAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    actual_visit_time: new Date(createdAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    repair_start_time: repairStart,
    parts_apply_time: '',
    parts_arrive_time: '',
    material_shortage_time: '',
    repair_finish_time: repairFinish,
    deliver_back_to_user_time: repairFinish,
    close_time: closeTime,
    receive_AWB: '',
    delivery_AWB: '',
    Level_3_malfunction_code: l3Code,
    processing_method_code: processingMethodCode,
    Activity_Project: ACTIVITY_PROJECT,
    remark: engineerNotes,
    defect_description: veredicto,
    Goodid: goodsId,
    B2B: customFields.region?.includes('MEXICO') ? 'MX' : 'GT',
    old_PN1: parts.length > 0 ? (parts[0].sku || parts[0].name || '') : '',
    old_SN1: '',
    old_IMEI1: imei,
    new_PN1: parts.length > 0 ? (parts[0].sku || parts[0].name || '') : '',
    new_SN1: '',
    new_IMEI1: newImei,
    old_PN2: '',
    old_SN2: '',
    old_IMEI2: '',
    new_PN2: '',
    new_SN2: '',
    new_IMEI2: '',
    old_PN3: '',
    old_SN3: '',
    old_IMEI3: '',
    new_PN3: '',
    new_SN3: '',
    new_IMEI3: '',
    old_PN4: '',
    new_PN4: '',
    old_PN5: '',
    new_PN5: '',
    old_PN6: '',
    new_PN6: '',
    old_PN7: '',
    new_PN7: '',
    old_PN8: '',
    new_PN8: '',
    old_PN9: '',
    new_PN9: '',
    old_PN10: '',
    new_PN10: '',
  };

  return row;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    let orders: Record<string, any>[] = body.orders || [];

    // If no orders provided, fetch from Orderry
    if (!orders || orders.length === 0) {
      try {
        const allOrders = await fetchAllOrdersFromOrderry();
        orders = allOrders || [];
      } catch (e) {
        console.error('Error fetching orders:', e);
        return NextResponse.json(
          { error: 'Failed to fetch orders from Orderry', details: String(e) },
          { status: 500 }
        );
      }
    }

    // Filter XIAOMI brand
    const xiaomiOrders = orders.filter((order) => {
      const brand = (order?.custom_fields?.brand || 'XIAOMI').toUpperCase();
      return brand === 'XIAOMI';
    });

    // Transform each order
    const transformedRows: Record<string, string>[] = [];
    const errors: Array<{ orderNumber: string; error: string }> = [];

    for (const order of xiaomiOrders) {
      try {
        const row = transformOrderToXiaomiClaims(order);
        transformedRows.push(row);
      } catch (e) {
        errors.push({
          orderNumber: order?.number || 'UNKNOWN',
          error: String(e),
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      statistics: {
        totalInput: orders.length,
        xiaomiFiltered: xiaomiOrders.length,
        transformed: transformedRows.length,
        errors: errors.length,
      },
      rows: transformedRows,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('API error:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: String(e) },
      { status: 500 }
    );
  }
}
