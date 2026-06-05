import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BACKOFFICE_SHEET_CSV_URLS = [
  // Xiaomi pre-alerts tab
  'https://docs.google.com/spreadsheets/d/1parq_eAadR7i6em9gwj5rCQTRJApdj3N0ELFV5LnSSM/export?format=csv&gid=394499655',
  // Retailer pre-alerts tab
  'https://docs.google.com/spreadsheets/d/1parq_eAadR7i6em9gwj5rCQTRJApdj3N0ELFV5LnSSM/export?format=csv&gid=1876689627',
];
const BACKOFFICE_SHEET_CSV_URLS = (process.env.BACKOFFICE_SHEET_CSV_URLS || process.env.BACKOFFICE_SHEET_CSV_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const BACKOFFICE_SHEET_TIMEOUT_MS = Number(process.env.BACKOFFICE_SHEET_TIMEOUT_MS || '20000');

const inferClientFromSheetUrl = (url: string): BackofficePrealertRow['client'] | null => {
  const gid = (url.match(/[?&]gid=(\d+)/i) || [])[1] || '';
  if (gid === '394499655') return 'XIAOMI';
  if (gid === '1876689627') return 'RETAILER';
  return null;
};

type TenantId = 'GT' | 'CR';

export type BackofficePrealertRow = {
  client: 'CLARO' | 'XIAOMI' | 'RETAILER' | 'UNKNOWN';
  sheetTitle: string;
  rowNumber: number;
  customer: string;
  reference: string;
  orderNumber: string;
  guide: string;
  imei: string;
  serial: string;
  equipmentName: string;
  details: string;
  requestAt: string | null;
  collectedAt: string | null;
  orderryAt: string | null;
  status: string;
  raw: Record<string, string>;
};

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const headerValue = (row: Record<string, any>, names: string[]) => {
  const normalizedRow = new Map<string, any>();
  Object.entries(row || {}).forEach(([key, value]) => normalizedRow.set(normalizeHeader(key), value));
  for (const name of names) {
    const value = normalizedRow.get(normalizeHeader(name));
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const stringifySheetValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

const parseGoogleSheetDate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;

  const text = stringifySheetValue(value);
  if (!text) return null;

  const numeric = Number(text);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric) && numeric > 20000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = Math.round(numeric * 24 * 60 * 60 * 1000);
    const date = new Date(excelEpoch.getTime() + millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parts = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (parts) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = parts;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const parseCsvToRows = (csvText: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(value);
      value = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => item.trim().length > 0));
};

const rowsToObjects = (csvText: string) => {
  const rows = parseCsvToRows(csvText);
  const [headers, ...dataRows] = rows;
  if (!headers) return [] as Record<string, any>[];

  return dataRows.map((cells) => {
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
};

const inferBackofficeClient = (row: Record<string, any>) => {
  const text = normalizeHeader([
    headerValue(row, ['Marcas']),
    headerValue(row, ['Servicios Logistico / Pre Alerta', 'Servicios Logístico / Pre Alerta']),
    headerValue(row, ['Tienda / CAC', 'Tienda/CAC']),
    headerValue(row, ['Tipos de Productos', 'Tipos de Productos ']),
  ].join(' '));

  if (text.includes('xiaomi')) return 'XIAOMI';
  if (text.includes('claro')) return 'CLARO';
  if (text.includes('retail') || text.includes('reteiler')) return 'RETAILER';

  const sheetText = normalizeHeader(headerValue(row, ['Servicios Logistico / Pre Alerta', 'Servicios Logístico / Pre Alerta']));
  if (sheetText.includes('claro')) return 'CLARO';
  if (sheetText.includes('xiaomi')) return 'XIAOMI';

  return 'UNKNOWN';
};

const parseBackofficeSheetRows = (
  rows: Record<string, any>[],
  sheetTitle: string,
  defaultClient?: BackofficePrealertRow['client'] | null
): BackofficePrealertRow[] => {
  return rows.map((row, idx) => {
    const raw = Object.fromEntries(
      Object.entries(row || {}).map(([key, value]) => [key, stringifySheetValue(value)])
    );

    const requestAt = parseGoogleSheetDate(headerValue(row, ['Marca temporal', 'Marca temporal ', 'Fecha de Solicitud', 'Fecha']));
    const collectedAt = parseGoogleSheetDate(headerValue(row, ['Fecha', 'Fecha de Entrega', 'Fecha de Recoleccion', 'Fecha de Recolección']));
    const status = stringifySheetValue(headerValue(row, ['Estatus', 'Estado', 'Clasificación'])) || (collectedAt ? 'RECOLECTADO' : 'PENDIENTE');
    const inferredClient = inferBackofficeClient(row);
    const client = inferredClient === 'UNKNOWN' && defaultClient ? defaultClient : inferredClient;
    const customer = stringifySheetValue(
      headerValue(row, ['Tienda / CAC', 'Tienda/CAC', 'Tienda', 'Agencia', 'RETAILER', 'DISTRIBUIDORES', 'Dirección'])
    ) || 'Sin agencia';
    const serialOrImei = stringifySheetValue(
      headerValue(row, ['IMEI / SN', 'IMEI/SN', 'IMEI', 'SERIES', 'Series', 'Serie', 'Códigos de Productos', 'Código de Productos'])
    ) || '';
    const reference = stringifySheetValue(
      headerValue(row, ['Números de Conduce', 'Número de Conduce', 'No. Conduce', 'Conduce', 'Ticket', 'Folio'])
    ) || serialOrImei;
    const guide = stringifySheetValue(
      headerValue(row, ['Códigos de Productos', 'Código de Productos', 'IMEI / SN', 'IMEI/SN', 'SERIES', 'Series', 'Serie'])
    ) || serialOrImei;
    const serial = serialOrImei;
    const model = stringifySheetValue(headerValue(row, ['Modelos', 'Modelo', '\nModelos', 'Tipo de Producto', 'Tipos de Productos', 'Tipos de Productos '])) || '';
    const brand = stringifySheetValue(headerValue(row, ['Marcas', 'MARCA'])) || '';
    const productType = stringifySheetValue(headerValue(row, ['Tipos de Productos', 'Tipos de Productos ', 'Tipo de Producto'])) || '';
    const details = stringifySheetValue(headerValue(row, ['Descripción Fallas', 'Observaciones', 'Comentarios'])) || '';
    const nameAsesor = stringifySheetValue(headerValue(row, ['Nombres del Asesor', 'Nombre Asesor'])) || '';

    return {
      client,
      sheetTitle,
      rowNumber: idx + 2,
      customer,
      reference,
      orderNumber: reference,
      guide,
      imei: serial,
      serial,
      equipmentName: [brand, model, productType].filter(Boolean).join(' ').trim() || productType || model || 'Equipo sin nombre',
      details: [details, nameAsesor].filter(Boolean).join(' | '),
      requestAt,
      collectedAt: collectedAt && String(status).toUpperCase().includes('RECOLECT') ? collectedAt : collectedAt,
      orderryAt: null,
      status,
      raw,
    };
  });
};

export type TechnicianMovementInput = {
  order_id: string;
  order_name: string;
  technician_id: string;
  technician_name: string;
  movement_type: string;
  timestamp: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  tenant_id: TenantId;
  duration_minutes?: number | null;
};

const getSupabaseAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const isMissingTableError = (error: any) => {
  const code = String(error?.code || '');
  return code === '42P01' || code === 'PGRST205';
};

const throwIfError = (error: any, table: string) => {
  if (!error) return;
  if (isMissingTableError(error)) {
    throw new Error(`La tabla ${table} no existe en Supabase.`);
  }
  throw new Error(error?.message || `Error en Supabase (${table}).`);
};

const parseSpanishDateTime = (value: string): Date | null => {
  const input = value.trim();
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[·-]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?$/i;
  const match = input.match(regex);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || '0');
  const meridiem = match[7].toLowerCase();

  if ([day, month, year, hour, minute, second].some((n) => Number.isNaN(n))) return null;
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  if (meridiem === 'p' && hour !== 12) hour += 12;
  if (meridiem === 'a' && hour === 12) hour = 0;

  const parsed = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toIsoDate = (value: string) => {
  const custom = parseSpanishDateTime(value);
  if (custom) return custom.toISOString();

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const normalizeAgencyName = (name: string) => name.trim().toUpperCase();

const makeAppError = (message: string, code: string) => {
  const err: any = new Error(message);
  err.code = code;
  return err;
};

export const saveDespachoConduce = async (conduce: any) => {
  if (!conduce?.id || !Array.isArray(conduce?.unidadesDespachadas)) {
    throw new Error('Payload inválido para guardar conduce.');
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const fechaIso = toIsoDate(String(conduce.fecha || now));
  const conduceId = String(conduce.id || '').trim().toUpperCase();
  if (!conduceId) throw new Error('No. Conduce es obligatorio.');

  const { error: conduceError } = await supabase
    .from('despacho_conduces')
    .insert({
      conduce_id: conduceId,
      fecha: fechaIso,
      doa: Boolean(conduce.doa),
      courrier: String(conduce.courrier || ''),
      numero_guia: String(conduce.numeroGuia || ''),
      precinto: String(conduce.precinto || ''),
      origen: String(conduce.origen || ''),
      operador: String(conduce.operador || ''),
      retail: String(conduce.retail || ''),
      dealer: String(conduce.dealer || ''),
      sucursal: String(conduce.sucursal || ''),
      created_at: now,
    });

  if (conduceError) {
    const dup = String(conduceError?.code || '') === '23505';
    if (dup) {
      throw makeAppError(`No. Conduce ${conduceId} ya existe y no puede repetirse.`, 'DUPLICATE_CONDUCE');
    }
    throwIfError(conduceError, 'despacho_conduces');
  }

  const rows = conduce.unidadesDespachadas.map((unit: any) => ({
    conduce_id: conduceId,
    fecha: fechaIso,
    doa: Boolean(conduce.doa),
    courrier: String(conduce.courrier || ''),
    numero_guia: String(conduce.numeroGuia || ''),
    precinto: String(conduce.precinto || ''),
    origen: String(conduce.origen || ''),
    operador: String(conduce.operador || ''),
    retail: String(conduce.retail || ''),
    dealer: String(conduce.dealer || ''),
    sucursal: String(conduce.sucursal || ''),
    imei: String(unit?.imei || ''),
    serie: String(unit?.serie || ''),
    order_id: unit?.orderId ? String(unit.orderId) : null,
    order_name: String(unit?.orderName || ''),
    marca: String(unit?.marca || ''),
    modelo: String(unit?.modelo || ''),
    grupo: String(unit?.grupo || ''),
    estado: String(unit?.estado || ''),
    payload: {
      ...unit,
      despachadoPor: String(conduce.despachadoPor || ''),
    },
    created_at: now,
  }));

  const { error } = await supabase.from('despacho_conduce_rows').insert(rows);
  if (error) {
    await supabase.from('despacho_conduces').delete().eq('conduce_id', conduceId);
    throwIfError(error, 'despacho_conduce_rows');
  }

  return rows.length;
};

export const getDespachoConduces = async (options?: { page?: number; pageSize?: number }) => {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, Number(options?.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(options?.pageSize || 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: headers, error: headersError, count: headersCount } = await supabase
    .from('despacho_conduces')
    .select('conduce_id, fecha, doa, courrier, numero_guia, precinto, origen, operador, retail, dealer, sucursal', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  throwIfError(headersError, 'despacho_conduces');

  const { data: latestHeader, error: latestHeaderError } = await supabase
    .from('despacho_conduces')
    .select('conduce_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(latestHeaderError, 'despacho_conduces');

  const conduceIds = (headers || []).map((h: any) => String(h.conduce_id || '').trim()).filter(Boolean);
  if (!conduceIds.length) {
    return {
      items: [],
      total: Number(headersCount || 0),
      page,
      pageSize,
      latestConduceId: latestHeader?.conduce_id ? String(latestHeader.conduce_id) : null,
    };
  }

  const { data: detailRows, error: rowsError } = await supabase
    .from('despacho_conduce_rows')
    .select('conduce_id, payload, imei, marca, modelo, grupo, estado, order_id')
    .in('conduce_id', conduceIds)
    .order('created_at', { ascending: true });

  throwIfError(rowsError, 'despacho_conduce_rows');

  const rowsByConduce = new Map<string, any[]>();
  for (const row of detailRows || []) {
    const key = String((row as any).conduce_id || '').trim().toUpperCase();
    if (!rowsByConduce.has(key)) rowsByConduce.set(key, []);
    rowsByConduce.get(key)!.push((row as any).payload || {
      imei: String((row as any).imei || ''),
      marca: String((row as any).marca || ''),
      modelo: String((row as any).modelo || ''),
      grupo: String((row as any).grupo || ''),
      estado: String((row as any).estado || ''),
      orderId: (row as any).order_id ? Number((row as any).order_id) : null,
    });
  }

  const items = (headers || []).map((h: any) => {
    const id = String(h.conduce_id || '').trim().toUpperCase();
    const unidadesDespachadas = rowsByConduce.get(id) || [];
    const despachadoPor = unidadesDespachadas
      .map((u: any) => String(u?.despachadoPor || '').trim())
      .find((v: string) => v.length > 0) || '';
    return {
      id,
      fecha: String(h.fecha || ''),
      despachadoPor,
      doa: Boolean(h.doa),
      courrier: String(h.courrier || ''),
      numeroGuia: String(h.numero_guia || ''),
      precinto: String(h.precinto || ''),
      origen: String(h.origen || ''),
      operador: String(h.operador || ''),
      retail: String(h.retail || ''),
      dealer: String(h.dealer || ''),
      sucursal: String(h.sucursal || ''),
      cantObjetivo: unidadesDespachadas.length,
      unidadesDespachadas,
      unidadesDevolver: [],
    };
  });

  return {
    items,
    total: Number(headersCount || 0),
    page,
    pageSize,
    latestConduceId: latestHeader?.conduce_id ? String(latestHeader.conduce_id) : null,
  };
};

export const deleteDespachoConduce = async (conduceId: string) => {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from('despacho_conduce_rows')
    .delete({ count: 'exact' })
    .eq('conduce_id', conduceId);

  throwIfError(error, 'despacho_conduce_rows');

  const { error: headerDeleteError } = await supabase
    .from('despacho_conduces')
    .delete()
    .eq('conduce_id', String(conduceId || '').trim().toUpperCase());

  throwIfError(headerDeleteError, 'despacho_conduces');
  return count || 0;
};

export const upsertDespachoAgencies = async (agencies: string[]) => {
  const normalized = Array.from(new Set(agencies.map(normalizeAgencyName).filter(Boolean)));
  if (!normalized.length) return 0;

  const supabase = getSupabaseAdmin();
  const rows = normalized.map((name) => ({
    name,
    active: true,
    source: 'orderry',
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('despacho_agencies').upsert(rows, { onConflict: 'name' });
  throwIfError(error, 'despacho_agencies');

  return normalized.length;
};

export const getDespachoAgencias = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_agencies')
    .select('name, active')
    .eq('active', true)
    .order('name', { ascending: true });

  throwIfError(error, 'despacho_agencies');
  return (data || []).map((row: any) => String(row.name));
};

export const appendWebhookEvent = async (payload: {
  event_name: string;
  order_id: string;
  order_name: string;
  tenant_id: string;
  old_status_id?: number;
  new_status_id?: number;
  employee_name?: string;
  created_at: string;
  raw_payload: Record<string, unknown>;
}) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('orderry_webhooks').insert({
    event_name: payload.event_name,
    order_id: payload.order_id,
    order_name: payload.order_name,
    tenant_id: payload.tenant_id,
    old_status_id: payload.old_status_id ?? null,
    new_status_id: payload.new_status_id ?? null,
    employee_name: payload.employee_name || null,
    webhook_at: toIsoDate(payload.created_at),
    raw_payload: payload.raw_payload,
  });

  throwIfError(error, 'orderry_webhooks');
};

export const saveTechnicianMovement = async (movement: TechnicianMovementInput) => {
  const supabase = getSupabaseAdmin();
  const timestamp = toIsoDate(movement.timestamp);

  const { error } = await supabase.from('technician_movements').insert({
    order_id: movement.order_id,
    order_name: movement.order_name,
    technician_id: movement.technician_id,
    technician_name: movement.technician_name,
    movement_type: movement.movement_type,
    timestamp,
    movement_date: timestamp.slice(0, 10),
    notes: movement.notes || null,
    latitude: movement.latitude ?? null,
    longitude: movement.longitude ?? null,
    address: movement.address || null,
    tenant_id: movement.tenant_id,
    duration_minutes: movement.duration_minutes ?? null,
  });

  throwIfError(error, 'technician_movements');
};

export const getTechnicianMovementsByDate = async (
  date: string,
  tenantId?: TenantId,
  technicianId?: string
) => {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('technician_movements')
    .select('*')
    .eq('movement_date', date)
    .order('timestamp', { ascending: true });

  if (tenantId) query = query.eq('tenant_id', tenantId);
  if (technicianId) query = query.eq('technician_id', technicianId);

  const { data, error } = await query;
  throwIfError(error, 'technician_movements');

  return (data || []).map((row: any) => ({
    order_id: String(row.order_id),
    order_name: String(row.order_name),
    technician_id: String(row.technician_id),
    technician_name: String(row.technician_name),
    movement_type: String(row.movement_type),
    timestamp: String(row.timestamp),
    date,
    time: String(row.timestamp || '').slice(11, 19),
    notes: row.notes ? String(row.notes) : '',
    latitude: row.latitude != null ? String(row.latitude) : '',
    longitude: row.longitude != null ? String(row.longitude) : '',
    address: row.address ? String(row.address) : '',
    tenant_id: String(row.tenant_id),
    duration_minutes: row.duration_minutes != null ? String(row.duration_minutes) : '',
  }));
};

export const getTechnicianDailySummary = async (
  date: string,
  technicianId: string,
  tenantId?: TenantId
) => {
  const movements = await getTechnicianMovementsByDate(date, tenantId, technicianId);
  if (!movements.length) return null;

  const orders = new Set(movements.map((m) => m.order_id));
  const completedOrders = new Set(
    movements.filter((m) => m.movement_type === 'COMPLETED').map((m) => m.order_id)
  );
  const inProgressOrders = new Set(
    movements
      .filter((m) => ['IN_PROGRESS', 'ON_SITE', 'DIAGNOSIS', 'REPAIR'].includes(m.movement_type))
      .map((m) => m.order_id)
  );

  const totalActiveHours = movements.reduce((acc, m) => {
    const mins = Number(m.duration_minutes || 0);
    return Number.isNaN(mins) ? acc : acc + mins / 60;
  }, 0);

  return {
    date,
    technician_id: technicianId,
    technician_name: movements[0].technician_name,
    tenant_id: movements[0].tenant_id,
    total_orders: orders.size,
    completed_orders: completedOrders.size,
    orders_in_progress: inProgressOrders.size,
    total_active_hours: Number(totalActiveHours.toFixed(2)),
    movements_count: movements.length,
    movements,
  };
};

export const getBackofficePrealertRows = async (): Promise<BackofficePrealertRow[]> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('backoffice_prealerts')
    .select('*')
    .order('request_at', { ascending: false })
    .limit(800);

  throwIfError(error, 'backoffice_prealerts');

  return (data || []).map((row: any, idx: number) => ({
    client: (row.client || 'UNKNOWN') as BackofficePrealertRow['client'],
    sheetTitle: String(row.sheet_title || 'Supabase'),
    rowNumber: Number(row.row_number || idx + 1),
    customer: String(row.customer || ''),
    reference: String(row.reference || ''),
    orderNumber: String(row.order_number || ''),
    guide: String(row.guide || ''),
    imei: String(row.imei || ''),
    serial: String(row.serial || ''),
    equipmentName: String(row.equipment_name || ''),
    details: String(row.details || ''),
    requestAt: row.request_at ? String(row.request_at) : null,
    collectedAt: row.collected_at ? String(row.collected_at) : null,
    orderryAt: row.orderry_at ? String(row.orderry_at) : null,
    status: String(row.status || ''),
    raw: typeof row.raw === 'object' && row.raw !== null ? row.raw : {},
  }));
};

export const getBackofficePrealertRowsFromGoogleSheets = async (): Promise<BackofficePrealertRow[]> => {
  const urls = BACKOFFICE_SHEET_CSV_URLS.length ? BACKOFFICE_SHEET_CSV_URLS : DEFAULT_BACKOFFICE_SHEET_CSV_URLS;
  const results = await Promise.all(
    urls.map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BACKOFFICE_SHEET_TIMEOUT_MS);

      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) {
          return { rows: [] as BackofficePrealertRow[], error: `No fue posible leer Google Sheets (${response.status}) en ${url}` };
        }

        const csvText = await response.text();
        const rows = rowsToObjects(csvText);
        const gid = (url.match(/[?&]gid=(\d+)/i) || [])[1] || 'unknown';
        const sheetName = `Google Sheets gid:${gid}`;
        const defaultClient = inferClientFromSheetUrl(url);
        return {
          rows: parseBackofficeSheetRows(rows, sheetName, defaultClient),
          error: '',
        };
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return { rows: [] as BackofficePrealertRow[], error: `Tiempo de espera agotado al leer Google Sheets (${url}).` };
        }
        return { rows: [] as BackofficePrealertRow[], error: error?.message || `No fue posible leer Google Sheets (${url}).` };
      } finally {
        clearTimeout(timer);
      }
    })
  );

  const allRows = results.flatMap((result) => result.rows);
  const errors = results.map((result) => result.error).filter(Boolean);

  if (!allRows.length) {
    throw new Error(errors[0] || 'No fue posible leer Google Sheets.');
  }

  return allRows;
};
