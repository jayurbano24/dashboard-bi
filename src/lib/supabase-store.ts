import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKOFFICE_SHEET_ID = '1parq_eAadR7i6em9gwj5rCQTRJApdj3N0ELFV5LnSSM';

const DEFAULT_BACKOFFICE_SHEET_CSV_URLS = [
  // Tienda Xiaomi (Recolección en Tienda + CAC tipo Portales-APT-402)
  `https://docs.google.com/spreadsheets/d/${BACKOFFICE_SHEET_ID}/export?format=csv&gid=394499655`,
  // Claro OPERADOR (agencias G201-Central, G217-Reformita, …)
  `https://docs.google.com/spreadsheets/d/${BACKOFFICE_SHEET_ID}/export?format=csv&gid=984942648`,
  // Retailer / Reteiler (FONS, Max Distelsa, Elektra, …)
  `https://docs.google.com/spreadsheets/d/${BACKOFFICE_SHEET_ID}/export?format=csv&gid=1876689627`,
];
const BACKOFFICE_SHEET_CSV_URLS = (process.env.BACKOFFICE_SHEET_CSV_URLS || process.env.BACKOFFICE_SHEET_CSV_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const BACKOFFICE_SHEET_TIMEOUT_MS = Number(process.env.BACKOFFICE_SHEET_TIMEOUT_MS || '45000');
const BACKOFFICE_SHEETS_CACHE_TTL_MS = Number(process.env.BACKOFFICE_SHEETS_CACHE_TTL_MS || '300000');

let backofficeSheetsCache: { expiresAt: number; result: BackofficeSheetsLoadResult } | null = null;

export type BackofficeSheetsLoadResult = {
  rows: BackofficePrealertRow[];
  sheetsLoaded: number;
  sheetErrors: string[];
};

/** Una pestaña = un cliente. Las agencias Oakland-AOA-403 son tiendas Xiaomi, no Claro. */
const inferClientFromSheetUrl = (url: string): BackofficePrealertRow['client'] | null => {
  const gid = (url.match(/[?&]gid=(\d+)/i) || [])[1] || '';
  if (gid === '394499655') return 'XIAOMI';
  if (gid === '984942648') return 'CLARO';
  if (gid === '1876689627') return 'RETAILER';
  const claroUrl = String(process.env.BACKOFFICE_CLARO_SHEET_CSV_URL || '').trim();
  if (claroUrl && url === claroUrl) return 'CLARO';
  return null;
};

const sheetTitleFromUrl = (url: string) => {
  const gid = (url.match(/[?&]gid=(\d+)/i) || [])[1] || '';
  if (gid === '394499655') return 'Tienda Xiaomi';
  if (gid === '984942648') return 'CLARO';
  if (gid === '1876689627') return 'Retailer';
  return `Google Sheets gid:${gid}`;
};

/** Agencias Claro OPERADOR: G201-Central, G217-Reformita, … */
const CLARO_OPERADOR_AGENCY_PATTERN = /^G\d{2,3}[A-Z]?-/i;

const isClaroOperadorAgency = (value: string): boolean => CLARO_OPERADOR_AGENCY_PATTERN.test(value.trim());

/** Tiendas Xiaomi: Portales-APT-402, Oakland-AOA-403, … (no empiezan con G###). */
const isXiaomiStoreCac = (value: string): boolean => {
  const text = value.trim();
  return /-[A-Z]{3}-\d{2,4}$/i.test(text) && !/^G\d/i.test(text);
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

const GUATEMALA_OFFSET = '-06:00';

const padSheetDatePart = (value: string) => value.padStart(2, '0');

/** Parse Google Sheet timestamps as America/Guatemala (UTC-6), not server local time. */
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
    const iso = `${y}-${padSheetDatePart(m)}-${padSheetDatePart(d)}T${padSheetDatePart(hh)}:${padSheetDatePart(mm)}:${padSheetDatePart(ss)}${GUATEMALA_OFFSET}`;
    const date = new Date(iso);
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

const inferBackofficeClient = (row: Record<string, any>): BackofficePrealertRow['client'] => {
  const service = normalizeHeader(
    headerValue(row, ['Servicios Logistico / Pre Alerta', 'Servicios Logístico / Pre Alerta']),
  );
  const agency = String(
    headerValue(row, [
      'Seleccionar la Agencia',
      'Seleccionar la Agencia ',
      'Tienda / CAC',
      'Tienda/CAC',
      'Tienda',
      'Agencia',
    ]) || '',
  ).trim();
  const retailerName = String(headerValue(row, ['RETAILER', 'DISTRIBUIDORES']) || '').trim();
  const brand = normalizeHeader(headerValue(row, ['Marcas', 'Marcas ', 'MARCA']));
  const blob = normalizeHeader([brand, service, agency, retailerName].join(' '));

  if (retailerName && !isClaroOperadorAgency(retailerName)) return 'RETAILER';
  if (blob.includes('claro') || blob.includes('operador') || blob.includes('distribuidor')) return 'CLARO';
  if (isClaroOperadorAgency(agency)) return 'CLARO';

  if (
    service.includes('agencia') ||
    service.includes('maxd') ||
    service.includes('punto naranja') ||
    service.includes('distel') ||
    service.includes('bright mobiles') ||
    service.includes('cargo express')
  ) {
    return 'RETAILER';
  }

  if (brand.includes('xiaomi')) return 'XIAOMI';
  if (isXiaomiStoreCac(agency)) return 'XIAOMI';
  if (service.includes('recoleccion en tienda') || service.includes('mensajeria de tcw')) return 'XIAOMI';
  if (service.includes('recoleccion tcw') && isClaroOperadorAgency(agency)) return 'CLARO';

  if (blob.includes('retail') || blob.includes('reteiler')) return 'RETAILER';

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

    const requestAt = parseGoogleSheetDate(headerValue(row, ['Marca temporal', 'Marca temporal ', 'Fecha de Solicitud']));
    const collectedAt = parseGoogleSheetDate(headerValue(row, ['Fecha', 'Fecha de Entrega', 'Fecha de Recoleccion', 'Fecha de Recolección']));
    const status = stringifySheetValue(headerValue(row, ['Estatus', 'Estado', 'Clasificación'])) || (collectedAt ? 'RECOLECTADO' : 'PENDIENTE');
    const inferredClient = inferBackofficeClient(row);
    const client =
      inferredClient !== 'UNKNOWN' ? inferredClient : defaultClient || 'UNKNOWN';
    const customer = stringifySheetValue(
      headerValue(row, [
        'Seleccionar la Agencia',
        'Seleccionar la Agencia ',
        'Tienda / CAC',
        'Tienda/CAC',
        'Tienda',
        'Agencia',
        'RETAILER',
        'DISTRIBUIDORES',
        'Dirección',
      ])
    ) || 'Sin agencia';
    const serialOrImei = stringifySheetValue(
      headerValue(row, [
        'IMEI-FOLIO',
        'IMEI-FOLIO ',
        'IMEI / SN',
        'IMEI/SN',
        'IMEI',
        'SERIES',
        'Series',
        'Serie',
        'Códigos de Productos',
        'Código de Productos',
      ])
    ) || '';
    const reference = stringifySheetValue(
      headerValue(row, [
        'Números de Conduce',
        'Número de Conduce',
        'No. Conduce',
        'Conduce',
        'Ticket',
        'Folio',
        'IMEI-FOLIO',
        'IMEI-FOLIO ',
      ])
    ) || serialOrImei;
    const guide = stringifySheetValue(
      headerValue(row, ['Códigos de Productos', 'Código de Productos', 'IMEI / SN', 'IMEI/SN', 'SERIES', 'Series', 'Serie'])
    ) || serialOrImei;
    const serial = serialOrImei;
    const model = stringifySheetValue(
      headerValue(row, ['Modelos', 'Modelo', 'Modelo  ', '\nModelos', 'Tipo de Producto', 'Tipos de Productos', 'Tipos de Productos '])
    ) || '';
    const brand = stringifySheetValue(headerValue(row, ['Marcas', 'Marcas ', 'MARCA'])) || '';
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

export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  }

  return createClient(url, key, {
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
    order_name: String(unit?.orderName || unit?.ordenNumero || ''),
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

export const getDespachoConduces = async (options?: { page?: number; pageSize?: number; searchTerm?: string }) => {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, Number(options?.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(options?.pageSize || 20)));
  const searchTerm = (options?.searchTerm || '').trim();

  let headerQuery = supabase
    .from('despacho_conduces')
    .select('conduce_id, fecha, doa, courrier, numero_guia, precinto, origen, operador, retail, dealer, sucursal', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (searchTerm) {
    const searchParam = `%${searchTerm}%`;
    const { data: searchRows } = await supabase
      .from('despacho_conduce_rows')
      .select('conduce_id')
      .or(`imei.ilike.${searchParam},order_name.ilike.${searchParam}`);
      
    const { data: searchHeaders } = await supabase
      .from('despacho_conduces')
      .select('conduce_id')
      .or(`conduce_id.ilike.${searchParam},courrier.ilike.${searchParam},numero_guia.ilike.${searchParam},dealer.ilike.${searchParam}`);
      
    const ids = new Set([
      ...(searchRows || []).map((r: any) => r.conduce_id),
      ...(searchHeaders || []).map((h: any) => h.conduce_id)
    ]);
    const matchedIds = Array.from(ids);
    
    if (matchedIds.length === 0) {
      return { items: [], total: 0, page, pageSize, latestConduceId: null };
    }
    headerQuery = headerQuery.in('conduce_id', matchedIds);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: headers, error: headersError, count: headersCount } = await headerQuery.range(from, to);

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

const fetchBackofficeSheetCsv = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKOFFICE_SHEET_TIMEOUT_MS);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      return {
        rows: [] as BackofficePrealertRow[],
        error: `No fue posible leer Google Sheets (HTTP ${response.status}) · ${sheetTitleFromUrl(url)}`,
      };
    }

    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE') || csvText.includes('<html')) {
      return {
        rows: [] as BackofficePrealertRow[],
        error: `Google Sheets "${sheetTitleFromUrl(url)}" no está publicado para export CSV. Compártalo como "Cualquier persona con el enlace".`,
      };
    }

    const rows = rowsToObjects(csvText);
    const sheetName = sheetTitleFromUrl(url);
    const defaultClient = inferClientFromSheetUrl(url);
    return {
      rows: parseBackofficeSheetRows(rows, sheetName, defaultClient),
      error: '',
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        rows: [] as BackofficePrealertRow[],
        error: `Tiempo de espera agotado al leer "${sheetTitleFromUrl(url)}".`,
      };
    }
    const message = error instanceof Error ? error.message : `No fue posible leer "${sheetTitleFromUrl(url)}".`;
    return { rows: [] as BackofficePrealertRow[], error: message };
  } finally {
    clearTimeout(timer);
  }
};

/** Carga las 3 pestañas de pre-alertas desde Google Sheets (fuente principal del Backoffice). */
export const loadBackofficePrealertSheets = async (options?: { force?: boolean }): Promise<BackofficeSheetsLoadResult> => {
  const now = Date.now();
  if (!options?.force && backofficeSheetsCache && backofficeSheetsCache.expiresAt > now) {
    return backofficeSheetsCache.result;
  }

  const claroOnlyUrl = String(process.env.BACKOFFICE_CLARO_SHEET_CSV_URL || '').trim();
  const baseUrls = BACKOFFICE_SHEET_CSV_URLS.length ? BACKOFFICE_SHEET_CSV_URLS : DEFAULT_BACKOFFICE_SHEET_CSV_URLS;
  const urls = [...baseUrls];
  if (claroOnlyUrl && !urls.includes(claroOnlyUrl)) {
    urls.push(claroOnlyUrl);
  }

  const results = await Promise.all(urls.map((url) => fetchBackofficeSheetCsv(url)));
  const allRows = results.flatMap((result) => result.rows);
  const sheetErrors = results.map((result) => result.error).filter(Boolean);
  const sheetsLoaded = results.filter((result) => result.rows.length > 0).length;

  const result = { rows: allRows, sheetsLoaded, sheetErrors };
  backofficeSheetsCache = { expiresAt: now + BACKOFFICE_SHEETS_CACHE_TTL_MS, result };
  return result;
};

export const getBackofficePrealertRowsFromGoogleSheets = async (): Promise<BackofficePrealertRow[]> => {
  const { rows, sheetErrors } = await loadBackofficePrealertSheets();
  if (!rows.length) {
    throw new Error(sheetErrors[0] || 'No fue posible leer Google Sheets.');
  }
  return rows;
};

export const getDespachoReportRows = async (filters?: {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  dealer?: string;
  courrier?: string;
  marca?: string;
  modelo?: string;
  doa?: string;
}) => {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('despacho_conduce_rows').select('*');

  if (filters?.startDate) {
    query = query.gte('fecha', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('fecha', filters.endDate);
  }
  if (filters?.dealer && filters.dealer !== 'ALL') {
    query = query.eq('dealer', filters.dealer);
  }
  if (filters?.courrier && filters.courrier !== 'ALL') {
    query = query.eq('courrier', filters.courrier);
  }
  if (filters?.marca && filters.marca !== 'ALL') {
    query = query.eq('marca', filters.marca);
  }
  if (filters?.modelo && filters.modelo !== 'ALL') {
    query = query.eq('modelo', filters.modelo);
  }
  if (filters?.doa && filters.doa !== 'ALL') {
    query = query.eq('doa', filters.doa === 'true');
  }

  const { data, error } = await query.order('fecha', { ascending: false }).limit(3000);
  throwIfError(error, 'despacho_conduce_rows');

  let rows = data || [];
  if (filters?.searchTerm) {
    const search = filters.searchTerm.toLowerCase().trim();
    rows = rows.filter((r: any) => {
      return (
        String(r.imei || '').toLowerCase().includes(search) ||
        String(r.conduce_id || '').toLowerCase().includes(search) ||
        String(r.numero_guia || '').toLowerCase().includes(search) ||
        String(r.precinto || '').toLowerCase().includes(search) ||
        String(r.modelo || '').toLowerCase().includes(search) ||
        String(r.marca || '').toLowerCase().includes(search) ||
        String(r.dealer || '').toLowerCase().includes(search) ||
        String(r.payload?.despachadoPor || '').toLowerCase().includes(search)
      );
    });
  }

  return rows.map((row: any) => ({
    conduceId: String(row.conduce_id || ''),
    fecha: String(row.fecha || ''),
    doa: Boolean(row.doa),
    courrier: String(row.courrier || ''),
    numeroGuia: String(row.numero_guia || ''),
    precinto: String(row.precinto || ''),
    origen: String(row.origen || ''),
    operador: String(row.operador || ''),
    retail: String(row.retail || ''),
    dealer: String(row.dealer || ''),
    sucursal: String(row.sucursal || ''),
    imei: String(row.imei || ''),
    serie: String(row.serie || ''),
    orderId: row.order_id ? Number(row.order_id) : null,
    orderName: String(row.order_name || row.payload?.ordenNumero || row.payload?.order_name || ''),
    marca: String(row.marca || ''),
    modelo: String(row.modelo || ''),
    grupo: String(row.grupo || ''),
    estado: String(row.status_live || row.estado || ''),
    status_live: String(row.status_live || row.estado || ''),
    status_id: row.status_id != null ? Number(row.status_id) : null,
    despachadoPor: String(row.payload?.despachadoPor || ''),
    created_at: row.created_at || row.payload?.created_at || null,
    closed_at: row.closed_at || row.payload?.closed_at || null,
    done_at: row.done_at || row.payload?.done_at || null,
    modified_at: row.modified_at || row.payload?.modified_at || null,
    color_live: row.color || row.payload?.color || row.payload?.COLOR || '',
    fecha_reparacion: row.payload?.done_at || null,
    completado_en: row.fecha || null,
    fecha_entrega: row.fecha || null,
    cliente: row.payload?.cliente || '',
    telefono: row.payload?.telefono || '',
    falla: row.payload?.['Mal funcionamiento *'] || row.payload?.['Mal funcionamiento'] || row.payload?.malFuncionamiento || row.payload?.falla || row.falla || '',
    serviciosObras: row.payload?.serviciosObras || '',
    marcaDispositivo: row.payload?.marcaDispositivo || row.marca || '',
    modeloDispositivo: row.payload?.modeloDispositivo || row.modelo || '',
    modeloSap: row.payload?.modeloSap || '',
    canalIngreso: row.payload?.canalIngreso || row.origen || row.dealer || row.sucursal || '',
    tipoIngreso: row.payload?.tipoIngreso || row.operador || row.retail || row.dealer || '',
    fechaEnvioTienda: row.payload?.fechaEnvioTienda || '',
    motivoNoAplica: row.payload?.motivoNoAplica || '',
    tecnico: row.payload?.tecnico || '',
    justificacionTiempo: row.payload?.justificacionTiempo || '',
    garantia: row.payload?.garantia || '',
    tipo_orden: row.payload?.tipoOrden || '',
    folioPdv: row.payload?.['FOLIO PDV'] || row.payload?.folioPdv || '',
    inCourier: row.payload?.inCourier || row.payload?.['IN COURIER'] || '',
    fechaFacturacion: row.payload?.['FECHA DE VENTA -POP *'] || row.payload?.['FECHA DE VENTA -POP'] || row.payload?.fechaVentaPop || row.payload?.['Fecha de venta -pop'] || row.payload?.['Fecha de Venta -POP'] || row.payload?.fechaFacturacion || '',
    fechaActivacion: row.payload?.fechaActivacion || '',
    rawRecord: (() => {
      const p = row.payload || {};
      const optimized: any = {
        custom_fields: p.custom_fields,
        branch: p.branch,
        client: p.client,
        kindof_good: p.kindof_good,
        status: p.status,
        status_history: p.status_history,
        tipo_orden: p.tipo_orden,
        historial_estados: p.historial_estados,
        'Grupo de dispositivos': p['Grupo de dispositivos'],
        'Tipo de orden': p['Tipo de orden'],
        'Estado': row.status_live || p['Estado'] || row.estado,
        'estado': row.status_live || p['estado'] || row.estado,
        'suma_aprobada_cliente': p['suma_aprobada_cliente'],
        created_at: p.created_at || p['Creado en'] || p['Creado'] || row.created_at,
        id: p.id || p.id_orden || p.ordenNumero || p.order_name || row.order_name || row.order_id || p['Orden #'],
        order_type: p.order_type || p.tipo_orden || p.tipoOrden || p['Tipo de orden'] || row.tipo_orden || row.order_type,
        client_name: p.client?.name || p.cliente || p['Nombre del cliente'] || row.cliente || row.client_name,
        phone: p.client?.phone?.[0]?.number || p.telefono || p['Teléfono del cliente'] || row.telefono || row.phone,
        address: p.client?.address || p.direccion || p['Dirección'] || row.direccion || row.address,
        email: p.client?.email || p.email || row.email,
        brand: p.brand?.name || p.brand || p.marca || p.marcaDispositivo || p['Marca del dispositivo'] || row.marca,
        model: p.model?.name || p.model || p.modelo || p.modeloDispositivo || p['Modelo de dispositivo'] || row.modelo,
        serial: p.serial || p.imei || p['Número de serie'] || row.imei,
        'Marca del dispositivo': p.brand?.name || p.brand || p.marca || p.marcaDispositivo || p['Marca del dispositivo'] || row.marca,
        'Modelo de dispositivo': p.model?.name || p.model || p.modelo || p.modeloDispositivo || p['Modelo de dispositivo'] || row.modelo,
        'Modelo': p.model?.name || p.model || p.modelo || p.modeloDispositivo || p['Modelo de dispositivo'] || row.modelo,

        engineer_notes: p.engineer_notes || p.notas,

        works: p.works || p.servicios || p.serviciosObras,
        parts: p.parts || p.repuestos,
        'Mal funcionamiento': p['Mal funcionamiento *'] || p['Mal funcionamiento'] || p.malFuncionamiento || p.falla || row.falla,
        grupo_dispositivo: p.grupo_dispositivo || p.grupoDispositivo || row.grupo || p['Grupo de dispositivos'],
        'CANAL DE INGRESO': p.canalIngreso || p.origen || p.dealer || p.sucursal || p['CANAL DE INGRESO'] || p.canal_ingreso || row.origen || row.dealer || row.sucursal || row.payload?.canalIngreso,
        'CANAL INGRESO': p.canalIngreso || p.origen || p.dealer || p.sucursal || p['CANAL INGRESO'] || p.canal_ingreso || row.origen || row.dealer || row.sucursal || row.payload?.canalIngreso,
        'FECHA DE VENTA -POP': p['FECHA DE VENTA -POP *'] || p['FECHA DE VENTA -POP'] || p.fechaVentaPop || p.fechaFacturacion || row.payload?.fechaFacturacion,
        'COLOR': row.color || p.color || p.COLOR,
        modified_at: row.modified_at || p.modified_at,
        closed_at: row.closed_at || p.closed_at,
        done_at: row.done_at || p.done_at,
        'GUIAS CAEX': p.guiasCaex || p['GUIAS CAEX'] || p.guia || row.guia,
        'GARANTIA': p.garantia || p['GARANTIA'] || row.payload?.garantia,
        'TIPO DE INGRESO': p.tipoIngreso || p.operador || p.retail || p['TIPO DE INGRESO'] || row.operador || row.retail || row.payload?.tipoIngreso,
        'FOLIO PDV': p['FOLIO PDV'] || p.folioPdv || row.payload?.folioPdv,
        'Precio estimado': p['Precio estimado'] || p.precioEstimado || p.precio,
        'ACCION': p.accion || p['ACCION'],
        'NUMERO DE TRASLADO': p.numeroTraslado || p['NUMERO DE TRASLADO'] || p['NUMERO  DE TRASLADO'],
        'NUMERO  DE TRASLADO': p.numeroTraslado || p['NUMERO DE TRASLADO'] || p['NUMERO  DE TRASLADO'],
        'GoodID': p.GoodID || p.goodId,
        'B2B': p.B2B || p.b2b,
        'COMENTARIOS': p.comentarios || p['COMENTARIOS'],
        'IN COURIER': p.inCourier || p['IN COURIER'],
        'NOTA': p.nota || p['NOTA'],
        'NOTA:': p.nota || p['NOTA'] || p['NOTA:'],
      };
      
      // Asegurar que las 64 columnas estén disponibles si están en la raíz
      const headers = [
        'Creado en', 'Creado', 'Orden #', 'Tipo de orden', 'Estado', 'Nombre del cliente', 
        'Teléfono del cliente', 'Dirección', 'Email', 'Grupo de dispositivos', 'Dispositivo', 
        'Marca', 'Modelo', 'Número de serie / IMEI', 'Contraseña', 'Apariencia', 
        'Defecto (Mal funcionamiento)', 'Lugar de compra', 'Color', 'Nota del cliente', 
        'Nombre comercial del modelo', 'Estado del equipo', 'Reingreso', 'Defecto reportado por el cliente', 
        'Reparación previa', 'Requiere copia de seguridad', 'Contraseña de equipo', 'Defecto real', 
        'Cotización inicial de reparación', 'Plazo de reparación de servicio urgente', 
        'Tiempo estimado de finalización', 'Trabajos de reparación', 'Tipo de garantía de servicios', 
        'Tipo de garantía de repuestos', 'Notas o Comentarios Privados', 'Comentario Público para el cliente', 
        'Costo del servicio', 'Descuento de la orden', 'Monto total', 'Impuesto', 'Monto pagado', 
        'Costo de repuestos (Con IGV)', 'Formas de pago', 'Sucursal', 'Asignado a', 'Etiquetas', 
        'NPS Score', 'NPS Comment', 'Suma total facturada', 'Fecha de facturación', 'Días en estado', 
        'Fecha de venta -pop', 'FOLIO PDV', 'Garantía del dispositivo', 'País', 
        'Suma total de caja registradora', 'Manager', 'Canal de Ingreso', 
        'Suma de la orden - Costo de repuestos', 'Valor residual (Facturado - Costos totales)', 
        'Costos totales', 'Código QR', 'Recomendación de NPS', 'Canal de adquisición de clientes'
      ];
      headers.forEach(h => {
        if (p[h] !== undefined) optimized[h] = p[h];
      });
      return optimized;
    })(),
  }));
};

export const getSapEquipos = async (filters?: {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}) => {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('despacho_sap_equipos').select('*');

  if (filters?.startDate) {
    query = query.gte('dia', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('dia', filters.endDate);
  }

  const { data, error } = await query.order('dia', { ascending: false }).limit(2000);
  
  if (error && isMissingTableError(error)) {
    return [];
  }
  throwIfError(error, 'despacho_sap_equipos');

  let rows = data || [];
  if (filters?.searchTerm) {
    const search = filters.searchTerm.toLowerCase().trim();
    rows = rows.filter((r: any) => {
      return (
        String(r.imei_fisico || '').toLowerCase().includes(search) ||
        String(r.no_documento || '').toLowerCase().includes(search) ||
        String(r.agencia || '').toLowerCase().includes(search) ||
        String(r.marca || '').toLowerCase().includes(search) ||
        String(r.modelo || '').toLowerCase().includes(search) ||
        String(r.guia || '').toLowerCase().includes(search) ||
        String(r.comentario || '').toLowerCase().includes(search)
      );
    });
  }

  return rows.map((r: any) => ({
    id: String(r.id),
    agencia: String(r.agencia || ''),
    imeiFisico: String(r.imei_fisico || ''),
    noDocumento: String(r.no_documento || ''),
    marca: String(r.marca || ''),
    modelo: String(r.modelo || ''),
    guia: String(r.guia || ''),
    dia: String(r.dia || ''),
    comentario: String(r.comentario || ''),
    createdAt: String(r.created_at || ''),
  }));
};

export const saveSapEquipos = async (equipos: any[]) => {
  if (!Array.isArray(equipos) || equipos.length === 0) {
    throw new Error('Arreglo de equipos SAP vacío o inválido.');
  }

  const supabase = getSupabaseAdmin();
  const rows = equipos.map((e) => ({
    agencia: String(e.agencia || '').trim(),
    imei_fisico: String(e.imeiFisico || '').trim(),
    no_documento: String(e.noDocumento || '').trim(),
    marca: String(e.marca || '').trim(),
    modelo: String(e.modelo || '').trim(),
    guia: String(e.guia || '').trim(),
    dia: String(e.dia || new Date().toISOString().slice(0, 10)),
    comentario: String(e.comentario || 'ACEPTADO').trim(),
  }));

  const { data, error } = await supabase
    .from('despacho_sap_equipos')
    .insert(rows)
    .select();

  if (error && isMissingTableError(error)) {
    throw new Error('La tabla despacho_sap_equipos no ha sido creada en Supabase. Corre la migración SQL.');
  }
  
  if (error && String(error.code) === '23505') {
    throw new Error('Uno o más IMEIs ingresados ya existen en el registro de equipos SAP.');
  }

  throwIfError(error, 'despacho_sap_equipos');
  return data?.length || rows.length;
};

export const deleteSapEquipo = async (id: string) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('despacho_sap_equipos').delete().eq('id', id);
  throwIfError(error, 'despacho_sap_equipos');
  return true;
};

// ── SAP Module v2 ────────────────────────────────────────────────────────────

const mapSapEquipoRow = (r: Record<string, unknown>) => ({
  id: String(r.id),
  loteId: r.lote_id ? String(r.lote_id) : null,
  agencia: String(r.agencia || ''),
  imeiFisico: String(r.imei_fisico || ''),
  noDocumento: String(r.no_documento || ''),
  marca: String(r.marca || ''),
  modelo: String(r.modelo || ''),
  guia: String(r.guia || ''),
  notaEntrega: String(r.nota_entrega || r.guia || ''),
  dia: String(r.dia || ''),
  comentario: String(r.comentario || ''),
  material: String(r.material || ''),
  fechaAceptacion: String(r.fecha_aceptacion || r.dia || ''),
  numeroTraslado: String(r.numero_traslado || ''),
  razonNoOrderry: String(r.razon_no_orderry || ''),
  observacionesNoOrderry: String(r.observaciones_no_orderry || ''),
  fechaEntrega: r.fecha_entrega ? String(r.fecha_entrega) : null,
  conduce: String(r.conduce || ''),
  transportista: String(r.transportista || ''),
  recibidoPor: String(r.recibido_por || ''),
  estado: String(r.estado || 'GUARDADO SAP'),
  orderId: r.order_id != null ? Number(r.order_id) : null,
  cliente: String(r.cliente || ''),
  orderryStatus: String(r.orderry_status || ''),
  usuarioRegistro: String(r.usuario_registro || ''),
  foundInOrderry: !r.razon_no_orderry,
  createdAt: String(r.created_at || ''),
  updatedAt: String(r.updated_at || r.created_at || ''),
});

export const findSapEquiposByImeis = async (imeis: string[]) => {
  if (!imeis.length) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_sap_equipos')
    .select('*')
    .in('imei_fisico', imeis.map((i) => i.trim()));
  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'despacho_sap_equipos');
  return (data || []).map(mapSapEquipoRow);
};

export const insertSapLote = async (meta: {
  material: string;
  fechaAceptacion: string;
  numeroTraslado: string;
  notaEntrega: string;
  usuario: string;
  estado: string;
}) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_sap_lotes')
    .insert({
      material: meta.material,
      fecha_aceptacion: meta.fechaAceptacion,
      numero_traslado: meta.numeroTraslado,
      nota_entrega: meta.notaEntrega,
      usuario_registro: meta.usuario,
      estado: meta.estado,
    })
    .select('*')
    .single();
  if (error && isMissingTableError(error)) {
    throw new Error('Ejecute la migración 2026-sap-module-v2.sql en Supabase.');
  }
  throwIfError(error, 'despacho_sap_lotes');
  return {
    id: String(data.id),
    material: String(data.material),
    fechaAceptacion: String(data.fecha_aceptacion),
    numeroTraslado: String(data.numero_traslado || ''),
    notaEntrega: String(data.nota_entrega || ''),
    estado: String(data.estado),
    fechaEntrega: data.fecha_entrega ? String(data.fecha_entrega) : null,
    conduce: String(data.conduce || ''),
    transportista: String(data.transportista || ''),
    recibidoPor: String(data.recibido_por || ''),
    observacionesDespacho: String(data.observaciones_despacho || ''),
    usuarioRegistro: String(data.usuario_registro || ''),
    createdAt: String(data.created_at),
  };
};

export const insertSapEquiposV2 = async (
  loteId: string,
  equipos: Array<Record<string, unknown>>,
  meta: { material: string; fechaAceptacion: string; numeroTraslado: string; notaEntrega: string; usuario: string },
) => {
  const supabase = getSupabaseAdmin();
  const rows = equipos.map((e) => ({
    lote_id: loteId,
    agencia: String(e.agencia || '').trim(),
    imei_fisico: String(e.imeiFisico || '').trim(),
    no_documento: String(e.noDocumento || '').trim(),
    marca: String(e.marca || '').trim(),
    modelo: String(e.modelo || '').trim(),
    guia: String(e.notaEntrega || e.guia || meta.notaEntrega || '').trim(),
    nota_entrega: String(e.notaEntrega || e.guia || meta.notaEntrega || '').trim(),
    dia: String(e.fechaAceptacion || meta.fechaAceptacion),
    fecha_aceptacion: String(e.fechaAceptacion || meta.fechaAceptacion),
    comentario: String(e.comentario || 'ACEPTADO').trim(),
    material: String(e.material || meta.material).trim(),
    numero_traslado: String(e.numeroTraslado || meta.numeroTraslado || '').trim(),
    razon_no_orderry: e.foundInOrderry ? null : String(e.razonNoOrderry || '').trim() || null,
    observaciones_no_orderry: e.foundInOrderry ? null : String(e.observacionesNoOrderry || '').trim() || null,
    order_id: e.orderId != null ? Number(e.orderId) : null,
    cliente: String(e.cliente || '').trim(),
    orderry_status: String(e.orderryStatus || '').trim(),
    usuario_registro: meta.usuario,
    estado: 'GUARDADO SAP',
  }));

  const { data, error } = await supabase.from('despacho_sap_equipos').insert(rows).select('*');
  if (error && isMissingTableError(error)) {
    throw new Error('La tabla despacho_sap_equipos no ha sido creada en Supabase.');
  }
  if (error && String(error.code) === '23505') {
    throw new Error('Uno o más IMEIs ingresados ya existen en el registro de equipos SAP.');
  }
  throwIfError(error, 'despacho_sap_equipos');
  return (data || []).map(mapSapEquipoRow);
};

export const getSapEquiposV2 = async (filters?: {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  loteId?: string;
  estado?: string;
}) => {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('despacho_sap_equipos').select('*');
  if (filters?.startDate) query = query.gte('fecha_aceptacion', filters.startDate);
  if (filters?.endDate) query = query.lte('fecha_aceptacion', filters.endDate);
  if (filters?.loteId) query = query.eq('lote_id', filters.loteId);
  if (filters?.estado) query = query.eq('estado', filters.estado);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(2000);
  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'despacho_sap_equipos');
  let rows = (data || []).map(mapSapEquipoRow);
  if (filters?.searchTerm) {
    const search = filters.searchTerm.toLowerCase().trim();
    rows = rows.filter((r) =>
      [r.imeiFisico, r.noDocumento, r.agencia, r.marca, r.modelo, r.material, r.notaEntrega, r.comentario]
        .some((v) => String(v).toLowerCase().includes(search)),
    );
  }
  return rows;
};

export const updateSapEquiposDispatch = async (
  loteId: string,
  payload: { fechaEntrega: string; conduce: string; transportista: string; recibidoPor: string; estado: string },
) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_sap_equipos')
    .update({
      fecha_entrega: payload.fechaEntrega,
      conduce: payload.conduce,
      transportista: payload.transportista,
      recibido_por: payload.recibidoPor,
      estado: payload.estado,
      updated_at: new Date().toISOString(),
    })
    .eq('lote_id', loteId)
    .select('*');
  throwIfError(error, 'despacho_sap_equipos');
  return (data || []).map(mapSapEquipoRow);
};

export const getSapLoteById = async (id: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('despacho_sap_lotes').select('*').eq('id', id).maybeSingle();
  if (error && isMissingTableError(error)) return null;
  throwIfError(error, 'despacho_sap_lotes');
  if (!data) return null;
  return {
    id: String(data.id),
    material: String(data.material),
    fechaAceptacion: String(data.fecha_aceptacion),
    numeroTraslado: String(data.numero_traslado || ''),
    notaEntrega: String(data.nota_entrega || ''),
    estado: String(data.estado),
    fechaEntrega: data.fecha_entrega ? String(data.fecha_entrega) : null,
    conduce: String(data.conduce || ''),
    transportista: String(data.transportista || ''),
    recibidoPor: String(data.recibido_por || ''),
    observacionesDespacho: String(data.observaciones_despacho || ''),
    usuarioRegistro: String(data.usuario_registro || ''),
    createdAt: String(data.created_at),
  };
};

export const updateSapLoteDispatch = async (
  id: string,
  payload: { fechaEntrega: string; conduce: string; transportista?: string; recibidoPor?: string; observaciones?: string },
) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_sap_lotes')
    .update({
      fecha_entrega: payload.fechaEntrega,
      conduce: payload.conduce.trim(),
      transportista: payload.transportista?.trim() ?? '',
      recibido_por: payload.recibidoPor?.trim() ?? '',
      observaciones_despacho: payload.observaciones?.trim() ?? '',
      estado: 'ENTREGADO SAP',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  throwIfError(error, 'despacho_sap_lotes');
  return {
    id: String(data.id),
    material: String(data.material),
    fechaAceptacion: String(data.fecha_aceptacion),
    numeroTraslado: String(data.numero_traslado || ''),
    notaEntrega: String(data.nota_entrega || ''),
    estado: String(data.estado),
    fechaEntrega: data.fecha_entrega ? String(data.fecha_entrega) : null,
    conduce: String(data.conduce || ''),
    transportista: String(data.transportista || ''),
    recibidoPor: String(data.recibido_por || ''),
    observacionesDespacho: String(data.observaciones_despacho || ''),
    usuarioRegistro: String(data.usuario_registro || ''),
    createdAt: String(data.created_at),
  };
};

export const listSapLotes = async (filters?: { estado?: string }) => {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('despacho_sap_lotes').select('*');
  if (filters?.estado) query = query.eq('estado', filters.estado);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'despacho_sap_lotes');
  return (data || []).map((d) => ({
    id: String(d.id),
    material: String(d.material),
    fechaAceptacion: String(d.fecha_aceptacion),
    numeroTraslado: String(d.numero_traslado || ''),
    notaEntrega: String(d.nota_entrega || ''),
    estado: String(d.estado),
    fechaEntrega: d.fecha_entrega ? String(d.fecha_entrega) : null,
    conduce: String(d.conduce || ''),
    transportista: String(d.transportista || ''),
    recibidoPor: String(d.recibido_por || ''),
    observacionesDespacho: String(d.observaciones_despacho || ''),
    usuarioRegistro: String(d.usuario_registro || ''),
    createdAt: String(d.created_at),
  }));
};

export const appendSapHistory = async (
  entries: Array<{
    equipoId?: string | null;
    loteId?: string | null;
    imei: string;
    accion: string;
    estadoAnterior?: string | null;
    estadoNuevo?: string | null;
    usuario: string;
    ip: string;
    metadata?: Record<string, unknown>;
  }>,
) => {
  if (!entries.length) return;
  const supabase = getSupabaseAdmin();
  const rows = entries.map((e) => ({
    equipo_id: e.equipoId ?? null,
    lote_id: e.loteId ?? null,
    imei: e.imei,
    accion: e.accion,
    estado_anterior: e.estadoAnterior ?? null,
    estado_nuevo: e.estadoNuevo ?? null,
    usuario: e.usuario,
    ip: e.ip,
    metadata: e.metadata ?? {},
  }));
  const { error } = await supabase.from('despacho_sap_history').insert(rows);
  if (error && isMissingTableError(error)) return;
  throwIfError(error, 'despacho_sap_history');
};

export const getSapHistoryByImei = async (imei: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_sap_history')
    .select('*')
    .eq('imei', imei.trim())
    .order('created_at', { ascending: false });
  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'despacho_sap_history');
  return (data || []).map((r) => ({
    id: String(r.id),
    equipoId: r.equipo_id ? String(r.equipo_id) : null,
    loteId: r.lote_id ? String(r.lote_id) : null,
    imei: String(r.imei),
    accion: String(r.accion),
    estadoAnterior: r.estado_anterior ? String(r.estado_anterior) : null,
    estadoNuevo: r.estado_nuevo ? String(r.estado_nuevo) : null,
    usuario: String(r.usuario || ''),
    ip: String(r.ip || ''),
    createdAt: String(r.created_at),
  }));
};

export const getSapHistoryByLote = async (loteId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('despacho_sap_history')
    .select('*')
    .eq('lote_id', loteId)
    .order('created_at', { ascending: false });
  if (error && isMissingTableError(error)) return [];
  throwIfError(error, 'despacho_sap_history');
  return (data || []).map((r) => ({
    id: String(r.id),
    equipoId: r.equipo_id ? String(r.equipo_id) : null,
    loteId: r.lote_id ? String(r.lote_id) : null,
    imei: String(r.imei),
    accion: String(r.accion),
    estadoAnterior: r.estado_anterior ? String(r.estado_anterior) : null,
    estadoNuevo: r.estado_nuevo ? String(r.estado_nuevo) : null,
    usuario: String(r.usuario || ''),
    ip: String(r.ip || ''),
    createdAt: String(r.created_at),
  }));
};

export const logSapAudit = async (entry: {
  usuario: string;
  ip: string;
  accion: string;
  imei?: string;
  antes?: unknown;
  despues?: unknown;
}) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('despacho_sap_audit').insert({
    usuario: entry.usuario,
    ip: entry.ip,
    accion: entry.accion,
    imei: entry.imei ?? '',
    antes: entry.antes ?? null,
    despues: entry.despues ?? null,
  });
  if (error && isMissingTableError(error)) return;
  throwIfError(error, 'despacho_sap_audit');
};

export type HistorialMovimientoInput = {
  orden_id: string;
  fecha_hora_cambio: string;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  grupo_nuevo?: string | null;
  status_id_anterior?: number | null;
  status_id_nuevo?: number | null;
  origen?: string;
  usuario?: string | null;
  payload_crudo?: Record<string, unknown> | null;
};

export type HistorialFechasAgregadas = {
  orden_id: string;
  fecha_entrada_nuevo: string | null;
  fecha_entrada_en_progreso: string | null;
  fecha_entrada_pendiente: string | null;
  fecha_entrada_listo: string | null;
  fecha_entrada_entrega: string | null;
  fecha_entrada_ganado: string | null;
  fecha_entrada_perdido: string | null;
  fecha_para_diagnosticar: string | null;
  fecha_en_reparacion: string | null;
  fecha_para_control_calidad: string | null;
  fecha_para_entregar: string | null;
};

export const insertHistorialMovimiento = async (entry: HistorialMovimientoInput) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('historial_movimientos').insert({
    orden_id: entry.orden_id,
    fecha_hora_cambio: toIsoDate(entry.fecha_hora_cambio),
    estado_anterior: entry.estado_anterior ?? null,
    estado_nuevo: entry.estado_nuevo ?? null,
    grupo_nuevo: entry.grupo_nuevo ?? null,
    status_id_anterior: entry.status_id_anterior ?? null,
    status_id_nuevo: entry.status_id_nuevo ?? null,
    origen: entry.origen ?? 'webhook',
    usuario: entry.usuario ?? null,
    payload_crudo: entry.payload_crudo ?? null,
  });

  if (error && isMissingTableError(error)) {
    throw new Error('La tabla historial_movimientos no existe. Ejecuta scripts/migrations/2026-historial-movimientos.sql');
  }
  throwIfError(error, 'historial_movimientos');
};

export const getHistorialFechasPorOrdenes = async (
  orderIds: string[],
  fechaParaEntregarEstado = 'PARA DEVOLUCION',
): Promise<Map<string, HistorialFechasAgregadas>> => {
  const unique = [...new Set(orderIds.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<string, HistorialFechasAgregadas>();
  if (unique.length === 0) return map;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('get_historial_fechas_por_ordenes', {
    p_orden_ids: unique,
    p_fecha_para_entregar_estado: fechaParaEntregarEstado,
  });

  if (error) {
    if (isMissingTableError(error)) return map;
    throwIfError(error, 'get_historial_fechas_por_ordenes');
  }

  for (const row of (data || []) as HistorialFechasAgregadas[]) {
    map.set(String(row.orden_id), row);
  }
  return map;
};

export type HistorialMovimientoRow = {
  orden_id: string;
  estado_nuevo: string | null;
  status_id_nuevo: number | null;
  fecha_hora_cambio: string;
};

type OrderStatusHistoryRow = {
  order_id: string;
  status_id: number | null;
  status_name: string | null;
  changed_at: string;
};

/** Primera fecha por estado (columnas del reporte) agregada en aplicación. */
export const getHistorialEstadoFechasPorOrdenes = async (
  orderIds: string[],
): Promise<Map<string, Record<string, string>>> => {
  const { aggregateHistorialStatusDates, emptyHistorialStatusDates } = await import(
    '@/modules/report-engine/shared/historial-status-columns'
  );

  const unique = [...new Set(orderIds.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<string, Record<string, string>>();
  if (unique.length === 0) return map;

  const supabase = getSupabaseAdmin();
  const chunkSize = 200;
  const allRows: HistorialMovimientoRow[] = [];

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);

    const { data: historyData, error: historyError } = await supabase
      .from('order_status_history')
      .select('order_id, status_id, status_name, changed_at')
      .in('order_id', chunk);

    if (!historyError) {
      for (const row of (historyData || []) as OrderStatusHistoryRow[]) {
        allRows.push({
          orden_id: String(row.order_id),
          estado_nuevo: row.status_name,
          status_id_nuevo: row.status_id,
          fecha_hora_cambio: row.changed_at,
        });
      }
    } else if (!isMissingTableError(historyError)) {
      throwIfError(historyError, 'order_status_history');
    }

    const { data, error } = await supabase
      .from('historial_movimientos')
      .select('orden_id, estado_nuevo, status_id_nuevo, fecha_hora_cambio, grupo_nuevo')
      .in('orden_id', chunk);

    if (error) {
      if (isMissingTableError(error)) continue;
      throwIfError(error, 'historial_movimientos');
    }
    allRows.push(...((data || []) as HistorialMovimientoRow[]));
  }

  const byOrder = new Map<string, HistorialMovimientoRow[]>();
  for (const row of allRows) {
    const key = String(row.orden_id);
    const list = byOrder.get(key) ?? [];
    list.push(row);
    byOrder.set(key, list);
  }

  const {
    aggregateGrupoEntregaDate,
    aggregateGrupoGanadoDate,
    CLARO_GRUPO_ENTREGA_LABEL,
    CLARO_GRUPO_GANADO_LABEL,
  } = await import('@/modules/report-engine/shared/claro-date-sources');

  for (const orderId of unique) {
    const rows = byOrder.get(orderId) ?? [];
    if (rows.length === 0) {
      map.set(orderId, emptyHistorialStatusDates());
      continue;
    }
    map.set(orderId, {
      ...aggregateHistorialStatusDates(rows),
      [CLARO_GRUPO_GANADO_LABEL]: aggregateGrupoGanadoDate(rows),
      [CLARO_GRUPO_ENTREGA_LABEL]: aggregateGrupoEntregaDate(rows),
    });
  }

  return map;
};

/** Resumen de origen de eventos en historial_movimientos por orden. */
export const getHistorialOrigenByOrders = async (
  orderIds: string[],
): Promise<Map<string, string>> => {
  const unique = [...new Set(orderIds.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = getSupabaseAdmin();
  const chunkSize = 200;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('historial_movimientos')
      .select('orden_id, origen')
      .in('orden_id', chunk);

    if (error) {
      if (isMissingTableError(error)) return map;
      throwIfError(error, 'historial_movimientos');
    }

    const counts = new Map<string, Map<string, number>>();
    for (const row of data || []) {
      const key = String(row.orden_id);
      const origen = String(row.origen || 'desconocido');
      const byOrigen = counts.get(key) ?? new Map<string, number>();
      byOrigen.set(origen, (byOrigen.get(origen) ?? 0) + 1);
      counts.set(key, byOrigen);
    }

    const missingHistorial = chunk.filter((orderId) => {
      const byOrigen = counts.get(orderId);
      return !byOrigen || byOrigen.size === 0;
    });

    if (missingHistorial.length > 0) {
      const { data: oshData, error: oshError } = await supabase
        .from('order_status_history')
        .select('order_id, source')
        .in('order_id', missingHistorial);

      if (!oshError) {
        const oshCounts = new Map<string, Map<string, number>>();
        for (const row of oshData || []) {
          const key = String(row.order_id);
          const source = String(row.source || 'order_status_history');
          const bySource = oshCounts.get(key) ?? new Map<string, number>();
          bySource.set(source, (bySource.get(source) ?? 0) + 1);
          oshCounts.set(key, bySource);
        }
        for (const orderId of missingHistorial) {
          const bySource = oshCounts.get(orderId);
          if (!bySource || bySource.size === 0) continue;
          const parts = [...bySource.entries()].map(([s, n]) => `${s} (${n})`);
          map.set(orderId, `${parts.join(', ')} — order_status_history`);
        }
      } else if (!isMissingTableError(oshError)) {
        throwIfError(oshError, 'order_status_history');
      }
    }

    for (const orderId of chunk) {
      if (map.has(orderId)) continue;
      const byOrigen = counts.get(orderId);
      if (!byOrigen || byOrigen.size === 0) {
        map.set(orderId, 'Sin historial — ejecute backfill o active webhook');
        continue;
      }
      const parts = [...byOrigen.entries()].map(([o, n]) => `${o} (${n})`);
      const hasWebhook = byOrigen.has('webhook');
      const onlyBackfill = byOrigen.size === 1 && byOrigen.has('backfill_incompleto');
      const suffix = onlyBackfill
        ? ' — punto de partida, no historial real previo'
        : hasWebhook
          ? ''
          : '';
      map.set(orderId, `${parts.join(', ')}${suffix}`);
    }
  }

  return map;
};

export const deduplicateReportRowsByOrder = <T extends { orderId?: number | null; orderName?: string; fecha?: string }>(
  rows: T[],
): T[] => {
  const byOrder = new Map<string, T>();

  for (const row of rows) {
    const key = row.orderId ? String(row.orderId) : String(row.orderName || '').trim();
    if (!key) continue;

    const existing = byOrder.get(key);
    if (!existing) {
      byOrder.set(key, row);
      continue;
    }

    const existingTs = new Date(String(existing.fecha || 0)).getTime();
    const rowTs = new Date(String(row.fecha || 0)).getTime();
    if (rowTs >= existingTs) {
      byOrder.set(key, row);
    }
  }

  return [...byOrder.values()];
};

