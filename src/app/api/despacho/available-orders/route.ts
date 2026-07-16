import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KNOWN_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Honor',
  'ZTE', 'Tecno', 'Realme', 'Oppo', 'OnePlus', 'Google', 'Nokia',
  'Sony', 'LG', 'TCL', 'Alcatel', 'Wiko', 'Itel', 'Infinix', 'PCD', 'Acer',
];

const GENERIC_PREFIXES = [
  'SMARTPHONE', 'TELEFONO MOVIL', 'TELÉFONO MÓVIL',
  'FEATURE PHONE', 'SMARTWATCH', 'TABLET', 'ACCESORIO',
];

function cleanTitle(title: string): string {
  let cleaned = title.trim();
  for (const prefix of GENERIC_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s*[/\\-]*\\s*`, 'i');
    cleaned = cleaned.replace(re, '').trim();
  }
  return cleaned;
}

function extractBrand(title: string): string {
  const cleaned = cleanTitle(title);
  const upper = cleaned.toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    if (upper.startsWith(brand.toUpperCase())) return brand;
    if (upper.includes(` ${brand.toUpperCase()} `) || upper.endsWith(` ${brand.toUpperCase()}`)) return brand;
  }
  const firstWord = cleaned.split(/[\s/]+/)[0] ?? '';
  return firstWord || 'Sin marca';
}

function extractModel(title: string, brand: string): string {
  let cleaned = cleanTitle(title);
  cleaned = cleaned.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim();
  const lastSlash = cleaned.lastIndexOf(' / ');
  if (lastSlash > 0) {
    cleaned = cleaned.substring(0, lastSlash).trim();
  }
  return cleaned || 'Sin modelo';
}

/**
 * Estados del GRUPO ENTREGA en Orderry:
 * PARA DEVOLVER, PARA DEVOLVER CAC, PARA DEVOLVER - NOTA DE CREDITO,
 * PARA DEVOLVER/LIFE-ONE, PARA DEVOLVER CAMBIO AGENCIA,
 * NOTA DE CREDITO VALIDACION SAP
 */
function isPermitido(estado: string): boolean {
  const s = estado.toUpperCase().trim();
  const PERMITIDOS = [
    'DEVOL',
    'ESCALADA',
    'NOTA DE CREDITO',
    'NOTA DE CRÉDITO',
  ];
  return PERMITIDOS.some((p) => s.includes(p));
}

/**
 * Los valores del dropdown ahora coinciden exactamente con Orderry,
 * por lo que no se necesita mapeo. Se mantiene solo para RETAILER legacy.
 */
function mapTipoToOrderry(tipo: string): string {
  const t = tipo.toUpperCase().trim();
  // RETAILER (antiguo) → RETEILER (Orderry)
  if (t === 'RETAILER') return 'RETEILER';
  return tipo;
}

/**
 * IDs de custom fields en Orderry (específicos del workspace).
 * Confirmados inspeccionando respuesta real de la API.
 */
const FIELD_ID: Record<string, string> = {
  'TIPO DE INGRESO':  'f3129962',
  'CANAL DE INGRESO': 'f3129964',
  'COLOR':            'f3129228',
  'GARANTIA':         'f3129961',
  'FECHA DE VENTA POP': 'f3129227',
  'IN COURIER':       'f3151083',
};

/**
 * Lee un custom field de Orderry.
 * Primero intenta por ID conocido, luego por nombre (por si el endpoint devuelve nombres).
 * Soporta objeto plano {f3129962: "valor"} o array [{name, value}].
 */
function getCustomField(obj: Record<string, unknown> | unknown[] | undefined, ...keys: string[]): string {
  if (!obj) return '';

  // Formato array: [{name, value}, ...]
  if (Array.isArray(obj)) {
    for (const key of keys) {
      const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
      const entry = obj.find((item) => {
        const i = item as Record<string, unknown>;
        return String(i?.name ?? i?.label ?? i?.field_name ?? '').toUpperCase().replace(/\s+/g, ' ').trim() === kUp;
      }) as Record<string, unknown> | undefined;
      const val = entry?.value ?? entry?.val ?? entry?.field_value;
      if (val != null && String(val).trim() !== '') return String(val).trim();
    }
    return '';
  }

  const flat = obj as Record<string, unknown>;

  // 1) Intentar por ID conocido del workspace (ej: f3129962)
  for (const key of keys) {
    const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
    const id = FIELD_ID[kUp];
    if (id && flat[id] != null && String(flat[id]).trim() !== '') {
      return String(flat[id]).trim();
    }
  }

  // 2) Fallback: buscar por nombre de clave exacto (por si un endpoint devuelve nombres)
  for (const key of keys) {
    const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
    const found = Object.entries(flat).find(
      ([k]) => k.toUpperCase().replace(/\s+/g, ' ').trim() === kUp,
    );
    if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim();
  }
  return '';
}

function getImei(o: Record<string, unknown>): string {
  const asset = o?.asset as Record<string, unknown> | undefined;
  const cf = o?.custom_fields as Record<string, unknown> | undefined;
  const candidates = [
    asset?.uid, asset?.serial, asset?.imei, asset?.serial_number,
    o?.serial_number, o?.imei,
    ...(cf ? Object.values(cf) : []),
  ];
  return (
    candidates
      .map((v) => String(v ?? '').replace(/[\s\-]/g, ''))
      .find((v) => v.length >= 8) ?? ''
  );
}

/** Coincidencia flexible para tipo de ingreso (maneja variantes como RETEILER/RETAILER) */
function matchesTipo(filter: string, value: string): boolean {
  if (!filter) return true;
  const f = filter.toUpperCase().trim();
  const v = value.toUpperCase().trim();
  // Si el filtro está activo pero el campo está vacío → no coincide
  if (!v) return false;
  if (f === v || v.includes(f) || f.includes(v)) return true;
  // Variantes conocidas
  if (f === 'RETAILER' && (v.includes('RETAIL') || v.startsWith('RETE'))) return true;
  if (f === 'DISTRIBUIDOR' && v.includes('DISTRIB')) return true;
  return false;
}

async function fetchPage(
  baseUrl: string,
  apiKey: string,
  page: number,
): Promise<Record<string, unknown>[]> {
  try {
    const qs = new URLSearchParams({ limit: '200', page: String(page) });
    const res = await fetch(`${baseUrl}/v2/orders?${qs}`, {
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

type CfRaw = Record<string, unknown> | unknown[] | undefined;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tipoFilter = searchParams.get('tipoIngreso')?.trim() || '';
  const canalFilter = searchParams.get('canalIngreso')?.trim().toUpperCase() || '';
  const debug = searchParams.get('debug') === '1';

  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada', count: 0, orders: [] }, { status: 500 });
  }

  try {
    // Fetch 3 páginas en paralelo (600 órdenes max, respuesta rápida)
    const pages = await Promise.all([
      fetchPage(baseUrl, apiKey, 1),
      fetchPage(baseUrl, apiKey, 2),
      fetchPage(baseUrl, apiKey, 3),
    ]);
    const allOrders = pages.flat();

    // Debug: devuelve la estructura raw de la 1ra orden para diagnosticar custom_fields
    if (debug && allOrders.length > 0) {
      const sample = allOrders[0];
      return NextResponse.json({
        debug: true,
        sampleOrder: {
          id: sample.id,
          number: sample.number,
          status: sample.status,
          custom_fields: sample.custom_fields,
          asset: sample.asset,
        },
        totalFetched: allOrders.length,
      });
    }

    const filteredOrders = allOrders.filter((o) => {
      const rawStatus: string =
        (o?.status as Record<string, string> | null)?.name ??
        String(o?.status ?? '') ??
        '';
      if (!isPermitido(rawStatus)) return false;

      const cf: CfRaw = o?.custom_fields as CfRaw;
      const orderTipo = getCustomField(cf, 'TIPO DE INGRESO', 'tipo de ingreso');
      const orderCanal = getCustomField(cf, 'CANAL DE INGRESO', 'canal de ingreso').toUpperCase();

      // Mapear CLARO/TIGO/MOVISTAR → OPERADOR para comparar contra el campo Orderry
      const mappedTipo = tipoFilter ? mapTipoToOrderry(tipoFilter) : '';
      const tipoOk = !mappedTipo || matchesTipo(mappedTipo, orderTipo);
      // Canal: debe coincidir exactamente (no pasar si el campo está vacío)
      const canalOk = !canalFilter || (
        orderCanal.length > 0 && (
          orderCanal.includes(canalFilter) || canalFilter.includes(orderCanal)
        )
      );

      return tipoOk && canalOk;
    });

    const orders = (await Promise.all(
      filteredOrders.map(async (o) => {
        const assetObj = o?.asset as Record<string, unknown> | undefined;
        let marca = String(assetObj?.brand ?? o?.brand ?? '');
        let modelo = String(assetObj?.model ?? o?.model ?? '');

        const title: string =
          String(assetObj?.title ?? o?.device_name ?? o?.name ?? '');

        if (!marca) {
          marca = extractBrand(title);
        }
        if (!modelo) {
          modelo = extractModel(title, marca);
        }
        const rawStatus: string =
          (o?.status as Record<string, string> | null)?.name ??
          String(o?.status ?? '');
        const imei = getImei(o);
        const cf: CfRaw = o?.custom_fields as CfRaw;
        const asset = o?.asset as Record<string, unknown> | undefined;
        // Color: asset.color o custom field f3129228
        const colorRaw =
          asset?.color ||
          getCustomField(cf, 'COLOR', 'color', 'Color') ||
          '';

        // Mapeo de "Datos de contacto: Nombre y Laboral" para Cliente y Teléfono
        let parsedLaboralPhone = getCustomField(cf, 'Laboral', 'laboral', 'Teléfono Laboral', 'Telefono Laboral') || '';
        if (!parsedLaboralPhone && o?.client && Array.isArray((o.client as any).phones)) {
          const found = (o.client as any).phones.find((p: any) => 
            String(p.label || p.type || '').toLowerCase().includes('laboral') ||
            String(p.name || '').toLowerCase().includes('laboral')
          );
          if (found) {
            parsedLaboralPhone = found.number;
          }
        }
        if (!parsedLaboralPhone && o?.contact && Array.isArray((o.contact as any).phones)) {
          const found = (o.contact as any).phones.find((p: any) => 
            String(p.label || p.type || '').toLowerCase().includes('laboral') ||
            String(p.name || '').toLowerCase().includes('laboral')
          );
          if (found) {
            parsedLaboralPhone = found.number;
          }
        }

        const clientName = getCustomField(cf, 'Nombre', 'nombre') || (
          o?.client ? (
            (o.client as any).name ||
            [(o.client as any).first_name, (o.client as any).last_name].filter(Boolean).join(' ') ||
            (o.client as any).full_name ||
            ''
          ) : ''
        ) || (o?.contact as any)?.name || '';

        const clientPhone = parsedLaboralPhone || (
          o?.client ? (
            (o.client as any).phone ||
            (Array.isArray((o.client as any).phones) ? (o.client as any).phones[0]?.number : '') ||
            ''
          ) : ''
        ) || (o?.contact as any)?.phone || '';
        const malFuncionamiento = String(o?.malfunction || getCustomField(cf, 'Mal funcionamiento', 'mal funcionamiento', 'Mal Funcionamiento') || '').trim();
        const marcaDispositivo = getCustomField(cf, 'Marca del dispositivo', 'marca del dispositivo', 'Marca') || marca || '';
        const modeloDispositivo = getCustomField(cf, 'Modelo de dispositivo', 'modelo de dispositivo', 'Modelo', 'Modelo Sap') || modelo || '';

        // Nuevos campos solicitados
        const fechaEnvioTienda = getCustomField(cf, 'Fecha de envio por parte tienda CAC', 'fecha de envio por parte tienda CAC', 'Fecha envio tienda', 'Fecha Envío Tienda') || '';
        const motivoNoAplica = getCustomField(cf, 'motivo por que no aplica', 'Motivo por que no aplica', 'Motivo no aplica', 'motivo de exclusion', 'Motivo de exclusión') || '';
        const tecnicoName = o?.executor ? (
          (o.executor as any).name || (o.executor as any).full_name || ''
        ) : (o?.manager ? ((o.manager as any).name || (o.manager as any).full_name || '') : '');
        const justificacionTiempo = getCustomField(cf, 'Justificación por que se salio del tiempo', 'justificacion por que se salio del tiempo', 'Justificación de tiempo', 'Justificación por tiempo') || '';

        const garantia = getCustomField(cf, 'GARANTIA', 'garantia') || 'SI';
        const tipoOrden = (o?.order_type as any)?.name ?? '';

        // Fetch actual services performed
        let serviciosObras = '';
        const orderId = o?.id;
        if (orderId) {
          try {
            const itemsRes = await fetch(`${baseUrl}/v2/orders/${orderId}/items`, {
              headers: { Authorization: `Bearer ${apiKey}` },
              cache: 'no-store',
            });
            if (itemsRes.ok) {
              const items = await itemsRes.json();
              if (Array.isArray(items)) {
                const services = items
                  .filter((item: any) => item?.entity?.type === 'service')
                  .map((item: any) => String(item?.entity?.title || '').trim())
                  .filter(Boolean);
                if (services.length > 0) {
                  serviciosObras = services.join(', ');
                }
              }
            }
          } catch {
            // ignore
          }
        }
        if (!serviciosObras) {
          serviciosObras = getCustomField(cf, 'Servicios/Obras', 'servicios/obras', 'Servicios', 'Obras') || 
                           String(o?.services || o?.works || o?.description || '');
        }

        return {
          imei,
          orderId: (o?.id ?? null) as number | null,
          ordenNumero: String(o?.number ?? o?.name ?? o?.id ?? ''),
          marca,
          modelo,
          producto: title || `${marca} ${modelo}`.trim(),
          estado: rawStatus,
          color: colorRaw ? String(colorRaw) : 'N/A',
          canalIngreso: getCustomField(cf, 'CANAL DE INGRESO', 'canal de ingreso') || 'N/A',
          tipoIngreso: getCustomField(cf, 'TIPO DE INGRESO', 'tipo de ingreso') || 'N/A',
          created_at: o?.created_at ? new Date((o.created_at as number) * 1000).toISOString() : null,
          closed_at: o?.closed_at ? new Date((o.closed_at as number) * 1000).toISOString() : null,
          cliente: clientName,
          telefono: clientPhone,
          falla: malFuncionamiento,
          serviciosObras,
          marcaDispositivo,
          modeloDispositivo,
          fechaEnvioTienda,
          motivoNoAplica,
          tecnico: tecnicoName,
          justificacionTiempo,
          garantia,
          tipoOrden,
        };
      })
    )).filter((o) => o.imei.length >= 8);

    return NextResponse.json({ count: orders.length, orders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, count: 0, orders: [] }, { status: 500 });
  }
}
