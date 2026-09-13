import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { loadCajasCompletasFromDb } from '@/app/api/separacion-sap/cajas/_lib/load-cajas';
import type { CrearSubgrupoInput } from '@/modules/separacion-sap/types';

export const dynamic = 'force-dynamic';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  try {
    await requireUser();
    const admin = getSupabaseAdmin();
    const result = await loadCajasCompletasFromDb(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer cajas.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas GET]', message);
    return jsonError(message, 500);
  }
}

type CrearCajaBody = {
  centro: string;
  almacen: string;
  observaciones?: string;
  /** Flujo guiado: caja vacía; sub-grupos se crean al pistoleo. */
  subgrupos?: CrearSubgrupoInput[];
};

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const admin = getSupabaseAdmin();
    const body = (await request.json()) as CrearCajaBody;

    if (!body.centro?.trim()) return jsonError('Centro requerido.', 400);
    if (!body.almacen?.trim()) return jsonError('Almacén requerido.', 400);

    const subgrupos = body.subgrupos ?? [];

    for (const sg of subgrupos) {
      if (!sg.marca?.trim() || !sg.modelo?.trim()) return jsonError('Marca y modelo requeridos en cada Sub-Grupo.', 400);
      if (!sg.materialCodigo?.trim()) return jsonError('Material SAP requerido en cada Sub-Grupo.', 400);
      if (!sg.cantidadEsperada || sg.cantidadEsperada <= 0) {
        return jsonError('Cantidad esperada debe ser mayor a 0 en cada Sub-Grupo.', 400);
      }
    }

    const { data: numeroData, error: numeroError } = await admin.rpc('next_separacion_sap_numero_caja');
    if (numeroError) throw new Error(numeroError.message);
    const numeroCaja = String(numeroData);

    const primerSg = subgrupos[0];
    const cantidadTotal = subgrupos.reduce((sum, sg) => sum + sg.cantidadEsperada, 0);
    const cajaVacia = subgrupos.length === 0;

    const cajaRow = {
      numero_caja: numeroCaja,
      centro: body.centro.trim().toUpperCase(),
      marca: cajaVacia ? 'PENDIENTE' : subgrupos.length > 1 ? 'MULTI' : primerSg.marca.trim(),
      modelo: cajaVacia ? 'PENDIENTE' : subgrupos.length > 1 ? `${subgrupos.length} líneas` : primerSg.modelo.trim(),
      tipo_producto: cajaVacia ? 'UNIDAD_COMPLETA' : primerSg.tipoProducto,
      subgrupo: cajaVacia ? 'PENDIENTE' : subgrupos.length > 1 ? 'MULTI' : primerSg.materialCodigo.trim(),
      material_codigo: cajaVacia ? 'PENDIENTE' : primerSg.materialCodigo.trim(),
      material_texto: cajaVacia ? '' : primerSg.materialTexto?.trim() || '',
      almacen: body.almacen.trim(),
      cantidad_esperada: cajaVacia ? 0 : cantidadTotal,
      cantidad_capturada: 0,
      estado: 'ABIERTA' as const,
      longitud_digitos: cajaVacia ? 15 : primerSg.longitudDigitos || 15,
      esquema_series: cajaVacia ? 'S1' : primerSg.esquemaSeries || 'S1',
      observaciones: body.observaciones?.trim() || '',
      created_by: user.email ?? user.id,
    };

    let insertResult = await admin.from('separacion_sap_cajas').insert(cajaRow).select('*').single();

    // Compatibilidad: BD antigua exige cantidad_esperada > 0 — placeholder 1 hasta aplicar migración
    if (insertResult.error && cajaVacia && insertResult.error.message.includes('cantidad_esperada_check')) {
      insertResult = await admin
        .from('separacion_sap_cajas')
        .insert({ ...cajaRow, cantidad_esperada: 1 })
        .select('*')
        .single();
    }

    if (insertResult.error) throw new Error(insertResult.error.message);
    const cajaId = (insertResult.data as { id: string }).id;

    if (subgrupos.length > 0) {
      const subgruposInsert = subgrupos.map((sg, index) => ({
        caja_id: cajaId,
        marca: sg.marca.trim(),
        modelo: sg.modelo.trim(),
        tipo_producto: sg.tipoProducto,
        material_codigo: sg.materialCodigo.trim(),
        material_texto: sg.materialTexto?.trim() || '',
        cantidad_esperada: sg.cantidadEsperada,
        cantidad_capturada: 0,
        longitud_digitos: sg.longitudDigitos || 15,
        esquema_series: sg.esquemaSeries || 'S1',
        orden: index,
        estado: 'EN_PROGRESO',
      }));

      const { error: subError } = await admin.from('separacion_sap_caja_subgrupos').insert(subgruposInsert);

      if (subError) {
        if (subError.message.includes('does not exist')) {
          return jsonError(
            'Tabla separacion_sap_caja_subgrupos no existe. Ejecute scripts/migrations/2026-separacion-sap-caja-subgrupos.sql en Supabase.',
            500,
          );
        }
        await admin.from('separacion_sap_cajas').delete().eq('id', cajaId);
        throw new Error(subError.message);
      }
    }

    const { cajas } = await loadCajasCompletasFromDb(admin);
    const caja = cajas.find((c) => c.id === cajaId);
    if (!caja) throw new Error('Caja creada pero no encontrada al recargar.');

    return NextResponse.json({ ok: true, caja });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear caja.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas POST]', message);
    return jsonError(message, 500);
  }
}
