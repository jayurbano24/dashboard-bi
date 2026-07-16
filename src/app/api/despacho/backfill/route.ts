import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    if (upper.includes(` ${brand.toUpperCase()} `) || upper.includes(` ${brand.toUpperCase()}`)) return brand;
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

function extractModeloSap(title: string): string {
  const cleaned = cleanTitle(title);
  const lastSlash = cleaned.lastIndexOf(' / ');
  if (lastSlash > 0) {
    return cleaned.substring(lastSlash + 3).trim();
  }
  return '';
}

export async function GET(request: Request) {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ error: 'API key de Orderry no configurada.' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Faltan credenciales de Supabase.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Obtener todas las filas
    const { data: rows, error: fetchError } = await supabase
      .from('despacho_conduce_rows')
      .select('id, order_id, order_name, payload, imei, serie');

    if (fetchError) {
      throw new Error(`Error al leer despacho_conduce_rows: ${fetchError.message}`);
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'No hay filas en la base de datos.', updated: 0 });
    }

    // Filtrar las filas que necesitan actualización
    const missingRows = rows.filter((row) => {
      const payload = row.payload || {};
      
      // Si ya fue procesado correctamente por el backfill, lo ignoramos para no crear un bucle infinito
      if (payload.backfilled) return false;

      const missingCreatedAt = !payload.created_at;
      const missingOrderName = !row.order_name && !payload.order_name && !payload.ordenNumero;
      const missingModeloSap = !payload.hasOwnProperty('modeloSap');
      const missingDoneAt = !payload.hasOwnProperty('done_at');
      const missingFields = !payload.hasOwnProperty('cliente') || !payload.hasOwnProperty('falla') || !payload.hasOwnProperty('fechaFacturacion') || !payload.hasOwnProperty('tecnico') || !payload.hasOwnProperty('serviciosObras') || (!row.order_name && payload.ordenNumero);
      
      return !!row.order_id && (missingCreatedAt || missingOrderName || missingModeloSap || missingDoneAt || missingFields);
    });

    if (missingRows.length === 0) {
      return NextResponse.json({ ok: true, message: 'Todo está al día. No hay filas pendientes de actualizar.', updated: 0 });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // Mapear IDs de custom fields
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
      for (const key of keys) {
        const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
        const id = FIELD_ID[kUp];
        if (id && obj[id] != null && String(obj[id]).trim() !== '') return String(obj[id]).trim();
      }
      for (const key of keys) {
        const kUp = key.toUpperCase().replace(/\s+/g, ' ').trim();
        const found = Object.entries(obj).find(
          ([k]) => k.toUpperCase().replace(/\s+/g, ' ').trim() === kUp
        );
        if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim();
      }
      return '';
    }

    const batchSize = 30;

    // Procesar en lotes paralelos
    for (let i = 0; i < missingRows.length; i += batchSize) {
      const batch = missingRows.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row) => {
          const payload = row.payload || {};
          const orderId = row.order_id;
          if (!orderId) return;

          try {
            const res = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
              headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
              errors.push(`Fila ID ${row.id} (Orden #${orderId}): HTTP ${res.status}`);
              return;
            }

            const match = await res.json();
            if (!match || !match.id) {
              errors.push(`Fila ID ${row.id} (Orden #${orderId}): Respuesta inválida.`);
              return;
            }

            const cf = match?.custom_fields as Record<string, any> | undefined;

            // Número de orden de Orderry
            const orderName: string =
              match?.number ??
              match?.name ??
              match?.id?.toString() ??
              '';

            let marca = match?.asset?.brand ?? match?.brand ?? '';
            let modelo = match?.asset?.model ?? match?.model ?? '';

            const title = match?.asset?.title ?? match?.device_name ?? match?.name ?? '';

            if (!marca) {
              marca = extractBrand(title);
            }
            if (!modelo) {
              modelo = extractModel(title, marca);
            }

            // Modelo SAP — código al final del título después de ' / '
            const modeloSap = extractModeloSap(title);

            // Contacto / Cliente
            let parsedLaboralPhone = getCustomField(cf, 'Laboral', 'laboral', 'Teléfono Laboral', 'Telefono Laboral');
            if (!parsedLaboralPhone && match?.client && Array.isArray((match.client as any).phones)) {
              const found = (match.client as any).phones.find((p: any) => 
                String(p.label || p.type || '').toLowerCase().includes('laboral') ||
                String(p.name || '').toLowerCase().includes('laboral')
              );
              if (found) parsedLaboralPhone = found.number;
            }
            if (!parsedLaboralPhone && match?.contact && Array.isArray((match.contact as any).phones)) {
              const found = (match.contact as any).phones.find((p: any) => 
                String(p.label || p.type || '').toLowerCase().includes('laboral') ||
                String(p.name || '').toLowerCase().includes('laboral')
              );
              if (found) parsedLaboralPhone = found.number;
            }

            const cliente = getCustomField(cf, 'Nombre', 'nombre') || (
              match?.client ? (
                (match.client as any).name ||
                [(match.client as any).first_name, (match.client as any).last_name].filter(Boolean).join(' ') ||
                (match.client as any).full_name ||
                ''
              ) : ''
            ) || (match?.contact as any)?.name || '';

            const telefono = parsedLaboralPhone || (
              match?.client ? (
                (match.client as any).phone ||
                (Array.isArray((match.client as any).phones) ? (match.client as any).phones[0]?.number : '') ||
                ''
              ) : ''
            ) || (match?.contact as any)?.phone || '';

            let tecnico = 
              match?.engineer?.name ??
              match?.engineer?.full_name ??
              match?.executor?.name ??
              match?.executor?.full_name ??
              getCustomField(cf, 'Ejecutor', 'ejecutor', 'EJECUTOR') ??
              match?.assigned_to?.name ??
              match?.manager?.name ??
              match?.employee?.full_name ??
              '';

            const fechaEnvioTienda = getCustomField(cf, 'Fecha de envio por parte tienda CAC *', 'Fecha de envio por parte tienda CAC', 'fecha de envio por parte tienda CAC', 'Fecha envio tienda', 'Fecha Envío Tienda') || '';
            const motivoNoAplica = getCustomField(cf, 'motivo por que no aplica', 'Motivo por que no aplica', 'Motivo no aplica', 'motivo de exclusion', 'Motivo de exclusión') || '';
            const justificacionTiempo = getCustomField(cf, 'Justificación por que se salio del tiempo', 'justificacion por que se salio del tiempo', 'Justificación de tiempo', 'Justificación por tiempo') || '';
            const falla = String(match?.malfunction || getCustomField(cf, 'Mal funcionamiento *', 'Mal funcionamiento', 'mal funcionamiento', 'Mal Funcionamiento', 'Falla', 'falla') || match?.description || '').trim();
            const folioPdv = getCustomField(cf, 'FOLIO PDV *', 'FOLIO PDV') || '';
            const fechaFacturacion = getCustomField(cf, 'FECHA DE VENTA -POP *', 'FECHA DE VENTA -POP', 'FECHA DE VENTA POP *', 'FECHA DE VENTA POP') || '';
            const garantia = getCustomField(cf, 'GARANTIA', 'garantia') || 'SI';
            const tipoOrden = (match?.order_type as any)?.name ?? '';

            // Fetch actual services performed
            let serviciosObras = '';
            if (orderId) {
              try {
                const itemsRes = await fetch(`${baseUrl}/v2/orders/${orderId}/items`, {
                  headers: { Authorization: `Bearer ${apiKey}` },
                  cache: 'no-store',
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

            // Extraer fechas de Orderry
            const closed_at = match?.closed_at ?? null;

            // done_at: Orderry lo setea al completar la orden.
            // Si es null pero el estatus indica que ya pasó por reparación,
            // usamos modified_at como aproximación de cuándo cambió al estado actual.
            const rawStatusName: string = (match?.status?.name ?? '').toUpperCase();
            const STATUSES_AFTER_REPAIR = [
              'EN CONTROL DE CALIDAD',
              'REPARADO',
              'PARA DEVOLVER',
              'LISTO PARA RETIRAR',
              'ENTREGADO',
              'CERRADO',
              'TERMINADO',
              'COMPLETADO',
              'NO REPARADO',
              'SIN REPARACION',
              'IRREPARABLE',
            ];
            const isAfterRepair = STATUSES_AFTER_REPAIR.some((s) => rawStatusName.includes(s));
            const done_at = match?.done_at ?? (isAfterRepair ? (match?.modified_at ?? null) : null);

            // Construir payload
            const nuevoPayload = {
              ...payload,
              cliente,
              telefono,
              falla,
              serviciosObras,
              tecnico,
              fechaEnvioTienda,
              motivoNoAplica,
              justificacionTiempo,
              garantia,
              tipoOrden,
              folioPdv,
              fechaFacturacion,
              created_at: match?.created_at ?? payload.created_at,
              closed_at,
              done_at,
              marcaDispositivo: marca,
              modeloDispositivo: modelo,
              modeloSap,
              backfilled: true
            };

            // Update payload + order_name column
            const { error: updateError } = await supabase
              .from('despacho_conduce_rows')
              .update({ payload: nuevoPayload, order_name: orderName })
              .eq('id', row.id);

            if (updateError) {
              errors.push(`Fila ID ${row.id}: Error al guardar: ${updateError.message}`);
            } else {
              updatedCount++;
            }
          } catch (err: any) {
            errors.push(`Fila ID ${row.id} (Orden #${orderId}): Exception: ${err.message}`);
          }
        })
      );

      // Espera corta entre lotes
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      ok: true,
      message: `Proceso de lote completado. Se actualizaron ${updatedCount} filas de histórico.`,
      updated: updatedCount,
      errors: errors.slice(0, 50),
      hasMoreErrors: errors.length > 50,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
