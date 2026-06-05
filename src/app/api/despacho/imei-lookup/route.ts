import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IMEI_LOOKUP_TIMEOUT_MS = Number(process.env.ORDERRY_IMEI_LOOKUP_TIMEOUT_MS || '12000');
const IMEI_LOOKUP_MAX_PAGES = Number(process.env.ORDERRY_IMEI_LOOKUP_MAX_PAGES || '12');

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMEI_LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Known brands — order matters (longer / more specific first) */
const KNOWN_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Honor',
  'ZTE', 'Tecno', 'Realme', 'Oppo', 'OnePlus', 'Google', 'Nokia',
  'Sony', 'LG', 'TCL', 'Alcatel', 'Wiko', 'Itel', 'Infinix',
];

/** Extract brand from a free-text device title */
function extractBrand(title: string): string {
  const upper = title.toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    if (upper.startsWith(brand.toUpperCase())) return brand;
    if (upper.includes(` ${brand.toUpperCase()} `) || upper.includes(` ${brand.toUpperCase()}`)) return brand;
  }
  // Fall back to first word
  return title.split(' ')[0] ?? 'Sin marca';
}

/** Extract model by stripping the brand from the title */
function extractModel(title: string, brand: string): string {
  const stripped = title.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim();
  return stripped || 'Sin modelo';
}

/** Map Orderry status name → ESTADOS_GANADO values used in the dispatch module */
function mapStatus(statusName: string): string {
  const s = statusName.toUpperCase();
  if (s.includes('NOTA DE CREDITO') || s.includes('NOTA CREDITO')) return 'ENTREGADO-NOTA DE CREDITO';
  if (s.includes('LIFE ONE') || s.includes('LIFE-ONE') || s.includes('LIFEONE')) return 'ENTREGADO/LIFE-ONE';
  if (s.includes('BODEGA') || s.includes('CLARO') || s.includes('ARCHIV')) return 'BODEGA CLARO G945/G935';
  if (s.includes('ARCHIV')) return 'Archivado';
  return 'ENTREGADO';
}

/** Extrae todos los valores posibles de IMEI/serial de una orden Orderry */
function normalizeIdentifier(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function imeiCandidates(o: Record<string, any>): string[] {
  const raw = [
    o?.asset?.uid,
    o?.asset?.serial,
    o?.asset?.imei,
    o?.asset?.serial_number,
    o?.serial_number,
    o?.imei,
    // custom fields — cubre f31xxxxx y claves arbitrarias
    ...Object.values(o?.custom_fields ?? {}),
  ];
  return raw
    .map((v) => normalizeIdentifier(v))
    .filter((v) => v.length >= 4 && /\d/.test(v));
}

/** Busca en Orderry con un parámetro de query y devuelve el array de órdenes */
async function fetchOrders(
  baseUrl: string,
  apiKey: string,
  params: Record<string, string>,
): Promise<Record<string, any>[]> {
  try {
    const qs = new URLSearchParams(params);
    const res = await fetchWithTimeout(`${baseUrl}/v2/orders?${qs.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.data) ? body.data : [];
  } catch {
    return [];
  }
}

/** Busca en todas las páginas de Orderry buscando un IMEI específico */
async function findOrderByImeiAllPages(
  baseUrl: string,
  apiKey: string,
  normalizedImei: string,
): Promise<Record<string, any> | undefined> {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const limit = 200;
  let page = 1;
  let totalPages = 1;

  do {
    try {
      const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
      const res = await fetchWithTimeout(`${baseUrl}/v2/orders?${qs.toString()}`, {
        method: 'GET', cache: 'no-store', headers,
      });
      if (!res.ok) break;
      const body = await res.json();
      const orders: Record<string, any>[] = Array.isArray(body?.data) ? body.data : [];
      const found = orders.find((o) => imeiCandidates(o).includes(normalizedImei));
      if (found) return found;
      totalPages = Number(body?.paging?.total_pages ?? 1);
      page += 1;
    } catch {
      break;
    }
  } while (page <= totalPages && page <= IMEI_LOOKUP_MAX_PAGES);

  return undefined;
}

export async function GET(request: NextRequest) {
  const imei = request.nextUrl.searchParams.get('imei')?.trim();
  const orderIdParam = request.nextUrl.searchParams.get('orderId')?.trim();

  if (!imei) {
    return NextResponse.json({ error: 'Se requiere el parámetro imei' }, { status: 400 });
  }

  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key de Orderry no configurada', found: false }, { status: 500 });
  }

  const normalizedImei = normalizeIdentifier(imei);
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    let match: Record<string, any> | undefined;

    // ── Paso 1a: Si tenemos orderId, consultar directo por ID (más rápido y fiable)
    if (orderIdParam) {
      try {
        const directRes = await fetchWithTimeout(`${baseUrl}/v2/orders/${orderIdParam}`, {
          method: 'GET', cache: 'no-store', headers,
        });
        if (directRes.ok) {
          match = await directRes.json();
        }
      } catch {
        // continuar con búsqueda por IMEI
      }
    }

    // ── Paso 1b: Si no, buscar por IMEI en todas las páginas
    if (!match) {
      // Primero intentar búsqueda con filtro q= (más rápido si la API lo soporta)
      for (const paramName of ['q', 'search', 'serial', 'serial_number']) {
        const orders = await fetchOrders(baseUrl, apiKey, { [paramName]: imei, limit: '100', page: '1' });
        const found = orders.find((o) => imeiCandidates(o).includes(normalizedImei));
        if (found) { match = found; break; }
      }

      // Si el filtro no encontró nada, paginar todas las órdenes
      if (!match) {
        match = await findOrderByImeiAllPages(baseUrl, apiKey, normalizedImei);
      }
    }

    if (!match) {
      return NextResponse.json({ found: false, imei });
    }

    // ── Paso 3: Extraer todos los datos relevantes
    const title: string =
      match?.asset?.title ??
      match?.device_name ??
      match?.name ??
      '';

    const marca = extractBrand(title);
    const modelo = extractModel(title, marca);

    // Estado: Orderry v2 puede tenerlo en distintos paths
    const rawStatus: string =
      match?.status?.name ??
      match?.status ??           // a veces es string directo
      match?.order_status?.name ??
      match?.current_status?.name ??
      '';

    const estadoGanado = mapStatus(rawStatus);

    // Número de orden
    const ordenNumero: string =
      match?.number ??
      match?.name ??
      match?.id?.toString() ??
      '';

    // Técnico / ejecutor
    const tecnico: string =
      match?.employee?.full_name ??
      match?.assigned_to?.name ??
      match?.manager?.name ??
      '';

    // Cliente
    const cliente: string =
      match?.client?.name ??
      match?.customer?.name ??
      '';

    // Tipo de orden
    const tipoOrden: string =
      match?.order_type?.name ??
      match?.type?.name ??
      match?.type ??
      '';

    // Almacén
    const almacen: string =
      match?.asset?.location ??
      match?.asset?.warehouse ??
      match?.warehouse?.name ??
      '';

    // Helper: buscar campo en custom_fields ignorando mayúsculas/minúsculas y espacios
    // Orderry devuelve IDs numéricos (f3129962) no nombres — se mapean aquí
    const FIELD_ID: Record<string, string> = {
      'TIPO DE INGRESO':    'f3129962',
      'CANAL DE INGRESO':   'f3129964',
      'COLOR':              'f3129228',
      'GARANTIA':           'f3129961',
      'FECHA DE VENTA POP': 'f3129227',
      'IN COURIER':         'f3151083',
    };
    function getCustomField(obj: Record<string, any> | undefined, ...keys: string[]): string {
      if (!obj) return '';
      // 1) Por ID conocido
      for (const key of keys) {
        const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
        const id = FIELD_ID[kUp];
        if (id && obj[id] != null && String(obj[id]).trim() !== '') return String(obj[id]).trim();
      }
      // 2) Por nombre de clave (fallback)
      for (const key of keys) {
        const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
        const found = Object.entries(obj).find(
          ([k]) => k.toUpperCase().replace(/\s+/g, ' ').trim() === kUp
        );
        if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim();
      }
      return '';
    }
    const cf = match?.custom_fields as Record<string, any> | undefined;

    // Canal de ingreso (agencia/tienda de donde vino el equipo)
    const canalIngreso: string =
      getCustomField(cf, 'CANAL DE INGRESO', 'canal de ingreso', 'Canal de Ingreso', 'CANAL_INGRESO') || 'N/A';

    // Tipo de ingreso (OPERADOR, RETEILER, etc.)
    const tipoIngreso: string =
      getCustomField(cf, 'TIPO DE INGRESO', 'tipo de ingreso', 'Tipo de Ingreso', 'TIPO_INGRESO') || 'N/A';

    // Color del dispositivo
    const colorRaw =
      match?.asset?.color ||
      match?.custom_fields?.color ||
      match?.custom_fields?.Color ||
      match?.custom_fields?.COLOR ||
      '';
    const color: string = colorRaw ? String(colorRaw) : 'N/A';

    // Resultado de reparación basado en el nombre del estado
    let reparada: boolean | null = null;
    const sUp = rawStatus.toUpperCase();
    if (sUp.includes('NO REPARAD') || sUp.includes('SIN REPARACI') || sUp.includes('NO REPAIR')) {
      reparada = false;
    } else if (sUp.includes('REPARAD') || sUp.includes('TERMINAD') || sUp.includes('ARREGLAD')) {
      reparada = true;
    }

    // ID numérico de la orden (necesario para actualizar status)
    const orderId: number | null = match?.id ?? null;

    // Grupo de producto
    const grupo: string = match?.asset?.group ?? '';

    return NextResponse.json({
      found: true,
      imei,
      orderId,
      marca,
      modelo,
      producto: title || `${marca} ${modelo}`.trim(),
      rawStatus,
      estadoGanado,
      ordenNumero,
      tecnico,
      cliente,
      tipoOrden,
      almacen,
      color,
      reparada,
      canalIngreso,
      tipoIngreso,
      grupo,
      // debug: raw order omitted in prod — uncomment to troubleshoot field names:
      // _raw: match,
    });
  } catch (err: any) {
    const detail = String(err?.message || 'Fallo interno en búsqueda de IMEI');
    return NextResponse.json({ error: `Orderry no disponible temporalmente. ${detail}`, found: false }, { status: 502 });
  }
}
