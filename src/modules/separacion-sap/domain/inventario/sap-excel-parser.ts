import type { BsdEquipo } from '../../types';

type XlsxModule = typeof import('xlsx');
type Sheet = import('xlsx').WorkSheet;

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return String(value).replace(/[\r\n\t]/g, '').trim();
}

function pickValue(row: Record<string, unknown>, patterns: RegExp[]): string {
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    if (!normalized || normalized.startsWith('__empty')) continue;
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return cellValue(value);
    }
  }
  return '';
}

function rowToEquipo(row: Record<string, unknown>): BsdEquipo | null {
  const rawSerial = pickValue(row, [
    /^serie$/,
    /^serial$/,
    /numero de serie/,
    /n[°o.]?\s*serie/,
    /nro\.?\s*serie/,
    /serie del equipo/,
    /equipment serial/,
    /serial number/,
    /^imei$/,
    /^s?\/?n$/,
    /^equipo$/,
    /num\.?\s*serie/,
  ]);

  const materialCodigo = pickValue(row, [
    /^material$/,
    /^mat$/,
    /^mat\.$/,
    /codigo material/,
    /cod\.?\s*material/,
    /n[°o.]?\s*material/,
    /material code/,
    /^sku$/,
    /num\.?\s*material/,
  ]);

  const materialTexto = pickValue(row, [
    /texto breve/,
    /descripcion/,
    /material description/,
    /texto material/,
    /denominacion/,
    /denominaci/,
    /nombre material/,
  ]);

  const centro = pickValue(row, [
    /^centro$/,
    /^ce\.$/,
    /^bodega$/,
    /^plant$/,
    /centro de costo/,
    /^ctr$/,
  ]);

  const almacen = pickValue(row, [
    /^almacen$/,
    /^alm\.$/,
    /storage location/,
    /^sloc$/,
  ]);

  const lote = pickValue(row, [/^lote$/, /^batch$/]);
  const status = pickValue(row, [
    /^status$/,
    /^estado$/,
    /status sistema/,
    /stat\.?\s*sist/,
    /est\.?\s*stat/,
  ]);

  if (!rawSerial || !materialCodigo) return null;

  const normalizedSerial = rawSerial.replace(/\D/g, '');
  if (!normalizedSerial) return null;

  return {
    materialCodigo,
    materialTexto: materialTexto || `MATERIAL SAP ${materialCodigo}`,
    normalizedSerial,
    centro: (centro || 'G945').toUpperCase(),
    almacen: (almacen || 'D000').toUpperCase(),
    lote: lote || 'NOVALORADO',
    statusSistema: status || 'ALMA',
  };
}

export function parseSapEquiposFromRows(rows: Record<string, unknown>[]): BsdEquipo[] {
  const bySerial = new Map<string, BsdEquipo>();

  for (const row of rows) {
    const equipo = rowToEquipo(row);
    if (equipo) {
      bySerial.set(equipo.normalizedSerial, equipo);
    }
  }

  return Array.from(bySerial.values());
}

const HEADER_HINTS = [
  /serie/,
  /serial/,
  /material/,
  /imei/,
  /equipo/,
  /centro/,
  /almacen/,
  /lote/,
  /status/,
  /stat\.?\s*sist/,
];

function scoreHeaderRow(cells: unknown[]): number {
  const text = cells.map((cell) => normalizeKey(cellValue(cell))).join(' ');
  if (!text.trim()) return 0;
  return HEADER_HINTS.reduce((score, pattern) => (pattern.test(text) ? score + 1 : score), 0);
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(matrix.length, 50); i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;

    const score = scoreHeaderRow(row);
    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function matrixToRows(matrix: unknown[][]): Record<string, unknown>[] {
  const headerIndex = findHeaderRowIndex(matrix);
  if (headerIndex === -1) return [];

  const headers = (matrix[headerIndex] ?? []).map((cell) => cellValue(cell));
  const rows: Record<string, unknown>[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!Array.isArray(line)) continue;

    const values = line.map((cell) => cellValue(cell));
    if (values.every((value) => !value)) continue;

    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const key = header || `__col_${idx}`;
      row[key] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function extractRowsFromSheet(sheet: Sheet, XLSX: XlsxModule): Record<string, unknown>[] {
  const directRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (directRows.length > 0 && parseSapEquiposFromRows(directRows).length > 0) {
    return directRows;
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const matrixRows = matrixToRows(matrix);
  if (matrixRows.length > 0) {
    return matrixRows;
  }

  return directRows;
}

function describeColumns(rows: Record<string, unknown>[]): string {
  const first = rows[0];
  if (!first) return 'sin columnas detectadas';
  return Object.keys(first)
    .filter((key) => !key.startsWith('__col_'))
    .slice(0, 8)
    .join(', ');
}

export function parseSapCsvText(text: string): BsdEquipo[] {
  const lineas = text.split(/\r\n|\n/).filter((linea) => linea.trim().length > 0);
  if (lineas.length <= 1) {
    throw new Error('El archivo no contiene registros de datos.');
  }

  const separador = lineas[0].includes(';') ? ';' : ',';
  const encabezados = lineas[0].split(separador).map((h) => h.trim().replace(/^"(.*)"$/, '$1'));

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const col = lineas[i].split(separador).map((c) => c.trim().replace(/^"(.*)"$/, '$1'));
    if (col.length < 2) continue;

    const row: Record<string, unknown> = {};
    encabezados.forEach((header, idx) => {
      row[header] = col[idx] ?? '';
    });
    rows.push(row);
  }

  const equipos = parseSapEquiposFromRows(rows);
  if (equipos.length === 0) {
    throw new Error(
      `No se detectaron series válidas. Columnas leídas: ${describeColumns(rows)}. Verifique Material y Número de serie.`,
    );
  }

  return equipos;
}

export async function parseSapExcelBuffer(buffer: ArrayBuffer): Promise<BsdEquipo[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  if (workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas.');
  }

  let bestRows: Record<string, unknown>[] = [];
  let bestEquipos: BsdEquipo[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = extractRowsFromSheet(sheet, XLSX);
    const equipos = parseSapEquiposFromRows(rows);

    if (equipos.length > bestEquipos.length) {
      bestRows = rows;
      bestEquipos = equipos;
    }
  }

  if (bestRows.length === 0) {
    throw new Error(
      'La hoja Excel no contiene filas de datos. Verifique que el archivo sea el export de SAP con columnas Material y Número de serie (puede haber filas de título antes del encabezado).',
    );
  }

  if (bestEquipos.length === 0) {
    throw new Error(
      `Se leyeron ${bestRows.length} filas pero no se encontraron series válidas. Columnas detectadas: ${describeColumns(bestRows)}. Se requieren columnas de Material y Número de serie.`,
    );
  }

  return bestEquipos;
}

export async function parseSapArchivo(file: File): Promise<BsdEquipo[]> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    return await parseSapExcelBuffer(buffer);
  }

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    return parseSapCsvText(text);
  }

  throw new Error('Formato no soportado. Suba un archivo Excel (.xlsx, .xls) exportado desde SAP.');
}
