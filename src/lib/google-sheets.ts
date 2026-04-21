import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const DEFAULT_SHEET_ID = '1parq_eAadR7i6em9gwj5rCQTRJApdj3N0ELFV5LnSSM';
const SHEET_ID = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;

type SheetClient = 'CLARO' | 'XIAOMI' | 'RETAILER' | 'UNKNOWN';

export type BackofficeSheetRow = {
  client: SheetClient;
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

const CLIENT_TAB_ALIASES: Record<Exclude<SheetClient, 'UNKNOWN'>, string[]> = {
  CLARO: ['CLARO'],
  XIAOMI: ['XIAOMI'],
  RETAILER: ['RETAILER', 'RETEILER', 'OTROS CLIENTES', 'OTROS CLIENTES RETEILER', 'OTROS_CLIENTES'],
};

const hasGoogleCredentials = Boolean(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
);

const jwt = hasGoogleCredentials
  ? new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    })
  : undefined;

const ensureGoogleCredentials = () => {
  if (!hasGoogleCredentials) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY para escritura en Google Sheets.');
  }
};

const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeRowObject = (row: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()])
  );
};

const parseCsv = (content: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;
      currentRow.push(currentCell);
      if (currentRow.some((cell) => String(cell || '').trim().length > 0)) {
        rows.push(currentRow.map((cell) => String(cell || '').trim()));
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => String(cell || '').trim().length > 0)) {
    rows.push(currentRow.map((cell) => String(cell || '').trim()));
  }

  return rows;
};

const pickValue = (row: Record<string, string>, candidates: string[]) => {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const exactMatch = Object.entries(row).find(([key, value]) => key === normalizedCandidate && String(value || '').trim());
    if (exactMatch) return String(exactMatch[1]).trim();
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    if (!normalizedCandidate) continue;

    const partialMatch = Object.entries(row).find(([key, value]) => {
      if (!String(value || '').trim()) return false;
      return key.includes(normalizedCandidate) || normalizedCandidate.includes(key);
    });

    if (partialMatch) return String(partialMatch[1]).trim();
  }

  return '';
};

const parseDateValue = (value: string) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/a\.?\s*m\.?/gi, 'AM')
    .replace(/p\.?\s*m\.?/gi, 'PM')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const localMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (localMatch) {
    const [, dd, mm, yyyy, hh = '0', min = '0', sec = '0', meridiem = ''] = localMatch;
    const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;

    let hours = Number(hh);
    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'PM' && hours < 12) hours += 12;
    if (upperMeridiem === 'AM' && hours === 12) hours = 0;

    const parsed = new Date(Number(year), Number(mm) - 1, Number(dd), hours, Number(min), Number(sec));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const directDate = new Date(normalized);
  return Number.isNaN(directDate.getTime()) ? null : directDate.toISOString();
};

const inferClientFromTitle = (title: string): SheetClient => {
  const normalized = normalizeHeader(title);

  if (normalized.includes('CLARO')) return 'CLARO';
  if (normalized.includes('XIAOMI')) return 'XIAOMI';
  if (normalized.includes('RETAIL') || normalized.includes('RETEIL') || normalized.includes('OTROS')) return 'RETAILER';

  return 'UNKNOWN';
};

const inferClientFromRow = (raw: Record<string, string>, sheetTitle: string): SheetClient => {
  const searchText = normalizeHeader(
    [
      raw.CLIENTE,
      raw.CUENTA,
      raw.RETAILER,
      raw.DISTRIBUIDORES,
      raw.DISTRIBUIDOR,
      raw.CANAL,
      raw.MARCA,
      raw.TIPO_DE_PRODUCTO,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const hasXiaomiSignals = searchText.includes('XIAOMI') || searchText.includes('REDMI') || searchText.includes('POCO');
  const hasRetailerSignals =
    searchText.includes('RETAIL') ||
    searchText.includes('RETEIL') ||
    searchText.includes('DISTRIBUIDOR') ||
    searchText.includes('AGENCIA_WAY') ||
    searchText.includes('MAXDISTELSA') ||
    searchText.includes('PUNTO_NARANJA');

  if (searchText.includes('CLARO')) return 'CLARO';
  if (hasRetailerSignals && !hasXiaomiSignals) return 'RETAILER';
  if (hasXiaomiSignals) return 'XIAOMI';
  if (hasRetailerSignals) return 'RETAILER';

  return inferClientFromTitle(sheetTitle);
};

const getSpreadsheetDocument = async () => {
  try {
    if (!jwt) {
      throw new Error('No service account configured for authenticated Sheets access.');
    }

    const doc = new GoogleSpreadsheet(SHEET_ID, jwt as any);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    if (!hasGoogleCredentials) {
      throw new Error('No se pudo leer Google Sheets sin credenciales autenticadas. Se intentará acceso público desde el formulario.');
    }
    throw error;
  }
};

export const getGoogleSheet = async (sheetIndex: number = 0) => {
  try {
    const doc = await getSpreadsheetDocument();
    const sheet = doc.sheetsByIndex[sheetIndex];
    if (!sheet) throw new Error(`No se encontró la hoja en el índice ${sheetIndex}.`);
    return sheet;
  } catch (error) {
    console.error('Error conectando a Google Sheets:', error);
    throw error;
  }
};

export const getGoogleSheetByTitle = async (sheetTitles: string | string[]) => {
  const doc = await getSpreadsheetDocument();
  const titles = Array.isArray(sheetTitles) ? sheetTitles : [sheetTitles];

  const foundSheet = doc.sheetsByIndex.find((sheet) =>
    titles.some((title) => normalizeHeader(sheet.title) === normalizeHeader(title))
  );

  if (!foundSheet) {
    throw new Error(`No se encontró ninguna hoja con los nombres: ${titles.join(', ')}`);
  }

  return foundSheet;
};

const mapRawBackofficeRow = (raw: Record<string, string>, sheetTitle: string, rowNumber: number): BackofficeSheetRow | null => {
  const reference = pickValue(raw, [
    'TICKET DEL CLIENTE',
    'TICKET CLIENTE',
    'PRE ALERTA',
    'PREALERTA',
    'CORRELATIVO',
    'NO CASO',
    'CASO',
    'TICKET',
    'REFERENCIA',
    'FOLIO',
    'NUMERO DE ORDEN',
  ]);
  const orderNumber = pickValue(raw, ['ORDERRY', 'NUMERO ORDEN', 'NO ORDEN', 'ORDER', 'ORDER ID', 'OT']);
  const guide = pickValue(raw, [
    'NUMEROS DE CONDUCE/IMEI-FOLIO',
    'NUMEROS DE CONDUCE IMEI FOLIO',
    'NUMERO DE CONDUCE',
    'NUMEROS DE CONDUCE',
    'NO. CONDUCE',
    'NO CONDUCE',
    'CONDUCE/IMEI/FOLIO',
    'CONDUCE',
    'GUIA',
    'NUMERO GUIA',
    'NO GUIA',
    'TRACKING',
  ]);
  const imei = pickValue(raw, ['IMEI', 'IMEI / SN', 'IMEI/SN', 'IMEI SN', 'IMEI 1', 'IMEI1', 'IMEI-FOLIO']);
  const serial = pickValue(raw, ['SERIAL', 'SERIE', 'SERIE/', 'SERIE /', 'NO SERIE', 'NUMERO SERIE', 'SN']);
  const customer = pickValue(raw, ['CLIENTE', 'CUENTA', 'RETAILER', 'DISTRIBUIDORES', 'DISTRIBUIDOR', 'CANAL', 'CUSTOMER', 'MARCA']) || sheetTitle;
  const equipmentName = pickValue(raw, ['EQUIPO', 'MODELO', 'TIPO DE PRODUCTO', 'TIPO PRODUCTO', 'PRODUCTO', 'DISPOSITIVO', 'NOMBRE EQUIPO', 'ARTICULO']);
  const details = pickValue(raw, ['DETALLE', 'DESCRIPCION', 'OBSERVACION', 'OBSERVACIONES', 'COMENTARIO', 'NOTAS', 'MALFUNCION', 'FALLA REPORTADA']);
  const requestAt = parseDateValue(pickValue(raw, ['MARCA TEMPORAL', 'MARCA DE TIEMPO', 'FECHA SOLICITUD', 'FECHA DE SOLICITUD', 'SOLICITUD', 'TIMESTAMP', 'FECHA', 'DATE']));
  const collectedAt = parseDateValue(pickValue(raw, ['FECHA RECOLECCION', 'RECOLECCION', 'FECHA RETIRO', 'FECHA RECOLECTADO', 'FECHA PICKUP']));
  const orderryAt = parseDateValue(pickValue(raw, ['FECHA INGRESO ORDERRY', 'INGRESO ORDERRY', 'FECHA INGRESO SISTEMA', 'INGRESO A SISTEMA', 'CREACION ORDERRY']));
  const status = pickValue(raw, ['ESTADO', 'STATUS', 'OBSERVACION', 'OBSERVACIONES']);

  if (!reference && !orderNumber && !guide && !imei && !serial && !equipmentName && !requestAt) {
    return null;
  }

  return {
    client: inferClientFromRow(raw, sheetTitle),
    sheetTitle,
    rowNumber,
    customer,
    reference: reference || guide || imei || serial || equipmentName || `FILA-${rowNumber || 'SN'}`,
    orderNumber,
    guide,
    imei,
    serial,
    equipmentName,
    details,
    requestAt,
    collectedAt,
    orderryAt,
    status,
    raw,
  };
};

const getPublicSheetRowsByTitle = async (sheetTitle: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTitle)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No fue posible leer la pestaña pública ${sheetTitle}.`);

  const csv = await response.text();
  const rows = parseCsv(csv);
  if (!rows.length) return [] as BackofficeSheetRow[];

  const [headerRow, ...dataRows] = rows;
  return dataRows
    .map((row, index) => {
      const raw = normalizeRowObject(
        Object.fromEntries(headerRow.map((header, columnIndex) => [header, row[columnIndex] || '']))
      );
      return mapRawBackofficeRow(raw, sheetTitle, index + 2);
    })
    .filter((row): row is BackofficeSheetRow => Boolean(row));
};

export const getBackofficePrealertRows = async (): Promise<BackofficeSheetRow[]> => {
  const result: BackofficeSheetRow[] = [];

  if (hasGoogleCredentials) {
    const doc = await getSpreadsheetDocument();

    const selectedSheets = doc.sheetsByIndex.filter((sheet) => {
      const sheetName = normalizeHeader(sheet.title);
      return Object.values(CLIENT_TAB_ALIASES).some((aliases) => aliases.some((alias) => sheetName === normalizeHeader(alias)));
    });

    const sheetsToRead = selectedSheets.length ? selectedSheets : doc.sheetsByIndex.slice(0, 3);

    for (const sheet of sheetsToRead) {
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();

      rows.forEach((row: any) => {
        const raw = normalizeRowObject((row.toObject?.() || {}) as Record<string, unknown>);
        const mappedRow = mapRawBackofficeRow(raw, sheet.title, Number(row.rowNumber || row._rowNumber || 0));
        if (mappedRow) result.push(mappedRow);
      });
    }
  } else {
    for (const [, aliases] of Object.entries(CLIENT_TAB_ALIASES)) {
      let loaded = false;
      for (const alias of aliases) {
        try {
          const publicRows = await getPublicSheetRowsByTitle(alias);
          if (publicRows.length) {
            result.push(...publicRows);
            loaded = true;
            break;
          }
        } catch {
          // try next alias
        }
      }

      if (!loaded) {
        continue;
      }
    }
  }

  const dedupeMap = new Map<string, BackofficeSheetRow>();

  result.forEach((row) => {
    const dedupeKey = [
      row.requestAt || '',
      normalizeHeader(row.reference || ''),
      normalizeHeader(row.guide || ''),
      normalizeHeader(row.imei || ''),
      normalizeHeader(row.serial || ''),
      normalizeHeader(row.customer || ''),
      normalizeHeader(row.equipmentName || ''),
    ].join('|');

    const existing = dedupeMap.get(dedupeKey);
    if (!existing) {
      dedupeMap.set(dedupeKey, row);
      return;
    }

    const scoreRow = [row.guide, row.imei, row.serial, row.orderNumber, row.equipmentName].filter(Boolean).length;
    const scoreExisting = [existing.guide, existing.imei, existing.serial, existing.orderNumber, existing.equipmentName].filter(Boolean).length;
    const rowPriority = row.client === 'XIAOMI' ? 2 : row.client === 'CLARO' ? 1 : 0;
    const existingPriority = existing.client === 'XIAOMI' ? 2 : existing.client === 'CLARO' ? 1 : 0;

    if (scoreRow > scoreExisting || (scoreRow === scoreExisting && rowPriority > existingPriority)) {
      dedupeMap.set(dedupeKey, row);
    }
  });

  const deduped = Array.from(dedupeMap.values());

  return deduped.sort((a, b) => {
    const aTime = a.requestAt ? new Date(a.requestAt).getTime() : 0;
    const bTime = b.requestAt ? new Date(b.requestAt).getTime() : 0;
    return bTime - aTime;
  });
};

export const appendWebhookToSheet = async (webhookData: {
  fecha: string;
  orderName: string;
  tenantId: string;
  oldStatusId?: number;
  newStatusId: number;
  empleado: string;
}) => {
  ensureGoogleCredentials();
  const sheet = await getGoogleSheet(0);

  await sheet.addRow({
    Fecha: webhookData.fecha,
    'Nombre Orden': webhookData.orderName,
    Sede: webhookData.tenantId,
    'Estado Anterior': webhookData.oldStatusId || 'N/A',
    'Estado Nuevo': webhookData.newStatusId,
    Empleado: webhookData.empleado,
  });
};

// ============ TECHNICIAN MOVEMENTS ============

export type TechnicianMovementSheetRow = {
  order_id: string;
  order_name: string;
  technician_id: string;
  technician_name: string;
  movement_type: string;
  timestamp: string;
  date: string;
  time: string;
  notes: string;
  latitude: string;
  longitude: string;
  address: string;
  tenant_id: string;
  duration_minutes: string;
};

const ensureTechnicianMovementsSheet = async () => {
  const doc = await getSpreadsheetDocument();
  const sheetTitle = 'Movimientos Técnicos';
  const normalizedTitle = normalizeHeader(sheetTitle);

  let sheet = doc.sheetsByIndex.find((s) => normalizeHeader(s.title) === normalizedTitle);

  if (!sheet) {
    sheet = await doc.addSheet({ title: sheetTitle });

    // Agregar headers
    await sheet.setHeaderRow([
      'Fecha',
      'Hora',
      'Orden ID',
      'Orden Nombre',
      'Técnico ID',
      'Técnico Nombre',
      'Tipo Movimiento',
      'Notas',
      'Latitud',
      'Longitud',
      'Dirección',
      'Sede',
      'Duración (min)',
      'Timestamp ISO',
    ]);
  }

  return sheet;
};

export const saveTechnicianMovement = async (movement: {
  order_id: string;
  order_name: string;
  technician_id: string;
  technician_name: string;
  movement_type: string;
  timestamp: string;
  notes?: string | null;
  latitude?: number;
  longitude?: number;
  address?: string;
  tenant_id: 'GT' | 'CR';
  duration_minutes?: number | null;
}) => {
  ensureGoogleCredentials();
  const sheet = await ensureTechnicianMovementsSheet();

  const date = new Date(movement.timestamp);
  const dateStr = date.toLocaleDateString('es-CR');
  const timeStr = date.toLocaleTimeString('es-CR');

  await sheet.addRow({
    Fecha: dateStr,
    Hora: timeStr,
    'Orden ID': movement.order_id,
    'Orden Nombre': movement.order_name,
    'Técnico ID': movement.technician_id,
    'Técnico Nombre': movement.technician_name,
    'Tipo Movimiento': movement.movement_type,
    Notas: movement.notes || '',
    Latitud: movement.latitude || '',
    Longitud: movement.longitude || '',
    Dirección: movement.address || '',
    Sede: movement.tenant_id,
    'Duración (min)': movement.duration_minutes || '',
    'Timestamp ISO': movement.timestamp,
  });
};

export const getTechnicianMovementsByDate = async (
  date: string,
  tenantId?: 'GT' | 'CR'
): Promise<TechnicianMovementSheetRow[]> => {
  const doc = await getSpreadsheetDocument();
  const sheetTitle = 'Movimientos Técnicos';
  const normalizedTitle = normalizeHeader(sheetTitle);

  const sheet = doc.sheetsByIndex.find((s) => normalizeHeader(s.title) === normalizedTitle);

  if (!sheet) return [];

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  const targetDate = new Date(date);
  const targetDateStr = targetDate.toLocaleDateString('es-CR');

  return rows
    .map((row: any) => ({
      order_id: String(row.get('Orden ID') || ''),
      order_name: String(row.get('Orden Nombre') || ''),
      technician_id: String(row.get('Técnico ID') || ''),
      technician_name: String(row.get('Técnico Nombre') || ''),
      movement_type: String(row.get('Tipo Movimiento') || ''),
      timestamp: String(row.get('Timestamp ISO') || ''),
      date: String(row.get('Fecha') || ''),
      time: String(row.get('Hora') || ''),
      notes: String(row.get('Notas') || ''),
      latitude: String(row.get('Latitud') || ''),
      longitude: String(row.get('Longitud') || ''),
      address: String(row.get('Dirección') || ''),
      tenant_id: String(row.get('Sede') || ''),
      duration_minutes: String(row.get('Duración (min)') || ''),
    }))
    .filter((row) => {
      const rowDate = new Date(row.timestamp);
      const match = rowDate.toLocaleDateString('es-CR') === targetDateStr;

      if (tenantId && row.tenant_id !== tenantId) return false;
      return match;
    });
};

export const getTechnicianMovementsByTechnicianAndDate = async (
  technicianId: string,
  date: string,
  tenantId?: 'GT' | 'CR'
): Promise<TechnicianMovementSheetRow[]> => {
  const movements = await getTechnicianMovementsByDate(date, tenantId);
  return movements.filter((m) => m.technician_id === technicianId);
};

export const getTechnicianDailySummary = async (
  date: string,
  technicianId: string,
  tenantId?: 'GT' | 'CR'
) => {
  const movements = await getTechnicianMovementsByTechnicianAndDate(technicianId, date, tenantId);

  if (!movements.length) {
    return null;
  }

  const uniqueOrders = new Set(movements.map((m) => m.order_id));
  const completedOrders = movements.filter((m) => m.movement_type === 'COMPLETED');
  const inProgressMovements = movements.filter(
    (m) => m.movement_type === 'IN_PROGRESS' || m.movement_type === 'ON_SITE' || m.movement_type === 'DIAGNOSIS' || m.movement_type === 'REPAIR'
  );

  const totalActiveHours = movements
    .filter((m) => m.duration_minutes)
    .reduce((sum, m) => sum + (Number(m.duration_minutes) || 0), 0) / 60;

  return {
    date,
    technician_id: technicianId,
    technician_name: movements[0]?.technician_name || '',
    tenant_id: (movements[0]?.tenant_id || 'GT') as 'GT' | 'CR',
    total_orders: uniqueOrders.size,
    completed_orders: completedOrders.length,
    orders_in_progress: inProgressMovements.length,
    total_active_hours: Number(totalActiveHours.toFixed(2)),
    movements_count: movements.length,
    movements,
  };
};
