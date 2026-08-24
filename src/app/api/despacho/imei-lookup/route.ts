import { NextRequest, NextResponse } from 'next/server';
import { normalizeDeviceModel } from '@/lib/model-aliases';

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
  'Sony', 'LG', 'TCL', 'Alcatel', 'Wiko', 'Itel', 'Infinix', 'PCD', 'Acer',
];

/** Words/phrases to strip before brand detection */
const GENERIC_PREFIXES = [
  'SMARTPHONE', 'TELEFONO MOVIL', 'TELÉFONO MÓVIL',
  'FEATURE PHONE', 'SMARTWATCH', 'TABLET', 'ACCESORIO',
];

/** Clean a title by removing generic category prefixes and separators */
function cleanTitle(title: string): string {
  let cleaned = title.trim();
  // Remove leading generic prefixes (may appear with " / " separator)
  for (const prefix of GENERIC_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s*[/\\-]*\\s*`, 'i');
    cleaned = cleaned.replace(re, '').trim();
  }
  return cleaned;
}

/** Extract brand from a free-text device title */
function extractBrand(title: string): string {
  const cleaned = cleanTitle(title);
  const upper = cleaned.toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    if (upper.startsWith(brand.toUpperCase())) return brand;
    if (upper.includes(` ${brand.toUpperCase()} `) || upper.includes(` ${brand.toUpperCase()}`)) return brand;
  }
  // Fall back to first word of cleaned title (no longer "SMARTPHONE")
  const firstWord = cleaned.split(/[\s/]+/)[0] ?? '';
  return firstWord || 'Sin marca';
}

/** Extract model by stripping brand, generic words, and SAP code after last '/' */
function extractModel(title: string, brand: string): string {
  let cleaned = cleanTitle(title);
  // Remove the brand
  cleaned = cleaned.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim();
  // Remove trailing SAP code after last " / " (e.g., "/ 25078RA3EL")
  const lastSlash = cleaned.lastIndexOf(' / ');
  if (lastSlash > 0) {
    cleaned = cleaned.substring(0, lastSlash).trim();
  }
  const model = cleaned || 'Sin modelo';
  // Unificar variantes conocidas (ej. ZXV10 Android10/12 -> ZXV10 B866V)
  return normalizeDeviceModel(model);
}

/** Extract SAP code — typically after the last " / " in the title */
function extractModeloSap(title: string): string {
  const cleaned = cleanTitle(title);
  const lastSlash = cleaned.lastIndexOf(' / ');
  if (lastSlash > 0) {
    return cleaned.substring(lastSlash + 3).trim();
  }
  return '';
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
    const cf = match?.custom_fields as Record<string, any> | undefined;

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

    // Extraer marca y modelo. Orderry v2 puede traerlos directo en asset.brand / asset.model
    let marca = match?.asset?.brand ?? match?.brand ?? '';
    let modelo = match?.asset?.model ?? match?.model ?? '';

    const title: string =
      match?.asset?.title ??
      match?.device_name ??
      match?.name ??
      '';

    if (!marca) {
      marca = extractBrand(title);
    }
    
    if (!modelo) {
      modelo = extractModel(title, marca);
    }

    // Modelo SAP — código al final del título después de ' / '
    const modeloSap = extractModeloSap(title);

    const colorRaw =
      match?.asset?.color ||
      match?.custom_fields?.color ||
      match?.custom_fields?.Color ||
      match?.custom_fields?.COLOR ||
      '';
    const color: string = colorRaw ? String(colorRaw) : 'N/A';

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
    let tecnico: string =
      match?.engineer?.name ??
      match?.engineer?.full_name ??
      match?.executor?.name ??
      match?.executor?.full_name ??
      getCustomField(cf, 'Ejecutor', 'ejecutor', 'EJECUTOR') ??
      match?.assigned_to?.name ??
      match?.manager?.name ??
      match?.employee?.full_name ??
      '';

    // Cliente (Nombre) y Teléfono (Laboral)
    let parsedLaboralPhone = getCustomField(cf, 'Laboral', 'laboral', 'Teléfono Laboral', 'Telefono Laboral');
    if (!parsedLaboralPhone && match?.client && Array.isArray((match.client as any).phones)) {
      const found = (match.client as any).phones.find((p: any) => 
        String(p.label || p.type || '').toLowerCase().includes('laboral') ||
        String(p.name || '').toLowerCase().includes('laboral')
      );
      if (found) {
        parsedLaboralPhone = found.number;
      }
    }
    if (!parsedLaboralPhone && match?.contact && Array.isArray((match.contact as any).phones)) {
      const found = (match.contact as any).phones.find((p: any) => 
        String(p.label || p.type || '').toLowerCase().includes('laboral') ||
        String(p.name || '').toLowerCase().includes('laboral')
      );
      if (found) {
        parsedLaboralPhone = found.number;
      }
    }

    const cliente: string = getCustomField(cf, 'Nombre', 'nombre') || (
      match?.client ? (
        (match.client as any).name ||
        [(match.client as any).first_name, (match.client as any).last_name].filter(Boolean).join(' ') ||
        (match.client as any).full_name ||
        ''
      ) : ''
    ) || (match?.contact as any)?.name || '';

    const telefono: string = parsedLaboralPhone || (
      match?.client ? (
        (match.client as any).phone ||
        (Array.isArray((match.client as any).phones) ? (match.client as any).phones[0]?.number : '') ||
        ''
      ) : ''
    ) || (match?.contact as any)?.phone || '';

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

    // Canal de ingreso (agencia/tienda de donde vino el equipo)
    const canalIngreso: string =
      getCustomField(cf, 'CANAL DE INGRESO', 'canal de ingreso', 'Canal de Ingreso', 'CANAL_INGRESO') || 'N/A';

    // Tipo de ingreso (OPERADOR, RETEILER, etc.)
    const tipoIngreso: string =
      getCustomField(cf, 'TIPO DE INGRESO', 'tipo de ingreso', 'Tipo de Ingreso', 'TIPO_INGRESO') || 'N/A';

    // Nuevos campos solicitados
    const fechaEnvioTienda = getCustomField(cf, 'Fecha de envio por parte tienda CAC *', 'Fecha de envio por parte tienda CAC', 'fecha de envio por parte tienda CAC', 'Fecha envio tienda', 'Fecha Envío Tienda') || '';
    const motivoNoAplica = getCustomField(cf, 'motivo por que no aplica', 'Motivo por que no aplica', 'Motivo no aplica', 'motivo de exclusion', 'Motivo de exclusión') || '';
    const justificacionTiempo = getCustomField(cf, 'Justificación por que se salio del tiempo', 'justificacion por que se salio del tiempo', 'Justificación de tiempo', 'Justificación por tiempo') || '';
    const falla = String(match?.malfunction || getCustomField(cf, 'Mal funcionamiento *', 'Mal funcionamiento', 'mal funcionamiento', 'Mal Funcionamiento', 'Falla', 'falla') || match?.description || '').trim();
    const folioPdv = getCustomField(cf, 'FOLIO PDV *', 'FOLIO PDV') || '';
    const fechaFacturacion = getCustomField(cf, 'FECHA DE VENTA -POP *', 'FECHA DE VENTA -POP', 'FECHA DE VENTA POP *', 'FECHA DE VENTA POP') || '';

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

    let serviciosObras = '';
    if (orderId) {
      try {
        const itemsRes = await fetchWithTimeout(`${baseUrl}/v2/orders/${orderId}/items`, {
          method: 'GET',
          cache: 'no-store',
          headers,
        });
        if (itemsRes.ok) {
          const items = await itemsRes.json();
          if (Array.isArray(items)) {
            let foundItemTecnico = '';
            const services = items
              .filter((item: any) => item?.entity?.type === 'service')
              .map((item: any) => {
                if (!foundItemTecnico) {
                  foundItemTecnico = item?.engineer?.name || item?.engineer?.full_name || 
                                     item?.executor?.name || item?.executor?.full_name || 
                                     item?.technician?.name || item?.technician?.full_name || 
                                     item?.employee?.name || item?.employee?.full_name || '';
                }
                return String(item?.entity?.title || '').trim();
              })
              .filter(Boolean);
            if (services.length > 0) {
              serviciosObras = services.join(', ');
            }
            if (foundItemTecnico) {
              tecnico = foundItemTecnico;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    if (!serviciosObras) {
      serviciosObras = getCustomField(cf, 'Servicios/Obras', 'servicios/obras', 'Servicios', 'Obras') || 
                       String(match?.services || match?.works || match?.description || '');
    }

    // Grupo de producto
    const grupo: string = match?.asset?.group ?? '';

    const garantia = getCustomField(cf, 'GARANTIA', 'garantia') || 'SI';

    return NextResponse.json({
      found: true,
      imei,
      orderId,
      marca,
      modelo,
      modeloSap,
      producto: title || `${marca} ${modelo}`.trim(),
      rawStatus,
      estadoGanado,
      ordenNumero,
      tecnico,
      cliente,
      telefono,
      tipoOrden,
      almacen,
      color,
      reparada,
      canalIngreso,
      tipoIngreso,
      grupo,
      falla,
      fechaEnvioTienda,
      motivoNoAplica,
      justificacionTiempo,
      garantia,
      serviciosObras,
      folioPdv,
      fechaFacturacion,
      created_at: match?.created_at ?? null,
      closed_at: match?.closed_at ?? null,
      // done_at: si Orderry no lo setea, inferir de modified_at cuando el estatus indica que ya pasó por reparación
      done_at: (() => {
        if (match?.done_at) return match.done_at;
        const sUp = rawStatus.toUpperCase();
        const afterRepair = ['EN CONTROL DE CALIDAD','REPARADO','PARA DEVOLVER','LISTO PARA RETIRAR','ENTREGADO','CERRADO','TERMINADO','COMPLETADO','NO REPARADO','SIN REPARACION','IRREPARABLE'];
        return afterRepair.some((s) => sUp.includes(s)) ? (match?.modified_at ?? null) : null;
      })(),
      // debug: raw order omitted in prod — uncomment to troubleshoot field names:
      // _raw: match,
    });
  } catch (err: any) {
    const detail = String(err?.message || 'Fallo interno en búsqueda de IMEI');
    return NextResponse.json({ error: `Orderry no disponible temporalmente. ${detail}`, found: false }, { status: 502 });
  }
}
