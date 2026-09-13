import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { loadBsdEquiposActivos } from '@/app/api/separacion-sap/_lib/load-bsd';
import { loadCajasCompletasFromDb } from '@/app/api/separacion-sap/cajas/_lib/load-cajas';
import { loadCajaById, syncCajaHeaderFromSubgrupos } from '@/app/api/separacion-sap/cajas/_lib/load-caja';
import { lookupSerieEnSap } from '@/modules/separacion-sap/domain/cajas/serie-lookup';
import type { SubgrupoRow } from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import type {
  CrearSubgrupoInput,
  EstadoSubgrupo,
  TipoProductoId,
  ValoracionSubgrupo,
} from '@/modules/separacion-sap/types';

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

type SubgrupoInput = CrearSubgrupoInput & { id?: string };

type CrearSubgrupoGuiadoBody = {
  tipoProducto: TipoProductoId;
  cantidadEsperada: number;
  marca: string;
  modelo: string;
  materialCodigo: string;
  materialTexto: string;
  longitudDigitos: number;
  valoracion: ValoracionSubgrupo;
  cantidadDisponibleSap: number;
  estado?: EstadoSubgrupo;
  primeraSerie: {
    normalizedSerial: string;
    almacen: string;
    lote: string;
    statusBsd: string;
    statusCaptura: string;
  };
};

/** Flujo guiado: crea sub-grupo + primera captura tras escaneo inicial. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: cajaId } = await context.params;
    const admin = getSupabaseAdmin();
    const body = (await request.json()) as CrearSubgrupoGuiadoBody;

    if (!body.cantidadEsperada || body.cantidadEsperada < 1) {
      return jsonError('Indique la cantidad exacta a pistoleo (mínimo 1).', 400);
    }
    if (!body.primeraSerie?.normalizedSerial) {
      return jsonError('Serie inicial requerida.', 400);
    }

    const caja = await loadCajaById(cajaId);
    if (caja.estado !== 'ABIERTA') {
      return jsonError('Solo se pueden crear Sub-Grupos en cajas abiertas.', 409);
    }

    const enProgreso = caja.subgrupos.some((sg) => sg.estado === 'EN_PROGRESO' && sg.cantidadCapturada < sg.cantidadEsperada);
    if (enProgreso) {
      return jsonError('Complete el Sub-Grupo en progreso antes de crear otro.', 409);
    }

    const [bsdEquipos, { cajas }] = await Promise.all([
      loadBsdEquiposActivos(),
      loadCajasCompletasFromDb(admin),
    ]);

    const lookup = lookupSerieEnSap({
      rawSerial: body.primeraSerie.normalizedSerial,
      centroCaja: caja.centro,
      bsdEquipos,
      cajas,
      excludeCajaId: cajaId,
    });

    if (!lookup.success) {
      const status = lookup.code === 'SERIAL_ALREADY_ASSIGNED' || lookup.code === 'DUPLICATE_SERIAL' ? 409 : 422;
      return jsonError(lookup.message, status);
    }

    if (lookup.materialCodigo !== body.materialCodigo.trim()) {
      return jsonError('El material de la serie no coincide con el escaneado.', 422);
    }

    const estadoSubgrupo: EstadoSubgrupo = body.estado ?? 'EN_PROGRESO';
    const orden = caja.subgrupos.length;

    const { data: subgrupoInsert, error: subError } = await admin
      .from('separacion_sap_caja_subgrupos')
      .insert({
        caja_id: cajaId,
        marca: body.marca.trim() || lookup.marcaInferida,
        modelo: body.modelo.trim() || lookup.modeloInferido,
        tipo_producto: body.tipoProducto,
        material_codigo: lookup.materialCodigo,
        material_texto: lookup.materialTexto,
        cantidad_esperada: body.cantidadEsperada,
        cantidad_capturada: 0,
        longitud_digitos: body.longitudDigitos || lookup.longitudDigitos,
        esquema_series: 'S1',
        orden,
        estado: estadoSubgrupo,
        valoracion: body.valoracion ?? lookup.valoracion,
        cantidad_disponible_sap: body.cantidadDisponibleSap ?? lookup.cantidadDisponibleSap,
      })
      .select('*')
      .single();

    if (subError) throw new Error(subError.message);

    const subgrupoId = (subgrupoInsert as SubgrupoRow).id;
    const subgrupoLlenoTrasPrimera = body.cantidadEsperada === 1;

    // Actualizar cantidad_esperada en caja ANTES de la captura (trigger sube cantidad_capturada)
    await syncCajaHeaderFromSubgrupos(cajaId);

    const { error: capError } = await admin.from('separacion_sap_capturas').insert({
      caja_id: cajaId,
      subgrupo_id: subgrupoId,
      normalized_serial: lookup.normalizedSerial,
      normalized_serial_s2: null,
      esquema_series: 'S1',
      material_codigo: lookup.materialCodigo,
      material_texto: lookup.materialTexto,
      centro: lookup.centro,
      almacen: body.primeraSerie.almacen || lookup.almacen,
      lote: body.primeraSerie.lote || lookup.lote,
      status_bsd: body.primeraSerie.statusBsd || lookup.statusSistema,
      status_captura: body.primeraSerie.statusCaptura || 'BASE_ENCONTRADO',
      captured_by: user.email ?? user.id,
    });

    if (capError) {
      await admin.from('separacion_sap_caja_subgrupos').delete().eq('id', subgrupoId);
      if (capError.code === '23505') {
        return jsonError('La serie ya fue capturada en otra caja.', 409);
      }
      throw new Error(capError.message);
    }

    if (subgrupoLlenoTrasPrimera) {
      await admin.from('separacion_sap_caja_subgrupos').update({ estado: 'LLENO' }).eq('id', subgrupoId);
    }

    await syncCajaHeaderFromSubgrupos(cajaId);
    const cajaActualizada = await loadCajaById(cajaId);

    return NextResponse.json({ ok: true, caja: cajaActualizada, subgrupoId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear Sub-Grupo.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas subgrupos POST]', message);
    return jsonError(message, 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: cajaId } = await context.params;
    const admin = getSupabaseAdmin();
    const body = (await request.json()) as { subgrupos: SubgrupoInput[] };

    if (!Array.isArray(body.subgrupos) || body.subgrupos.length === 0) {
      return jsonError('Debe incluir al menos un Sub-Grupo.', 400);
    }

    const caja = await loadCajaById(cajaId);
    if (caja.estado !== 'ABIERTA') {
      return jsonError('Solo se pueden editar Sub-Grupos en cajas abiertas.', 409);
    }

    const { data: existentesRows, error: existentesError } = await admin
      .from('separacion_sap_caja_subgrupos')
      .select('*')
      .eq('caja_id', cajaId);

    if (existentesError) throw new Error(existentesError.message);

    const existentes = (existentesRows as SubgrupoRow[] | null) ?? [];
    const idsEnviados = new Set(body.subgrupos.map((sg) => sg.id).filter(Boolean));

    for (const sg of body.subgrupos) {
      if (!sg.marca?.trim() || !sg.modelo?.trim()) return jsonError('Marca y modelo requeridos.', 400);
      if (!sg.materialCodigo?.trim()) return jsonError('Material SAP requerido.', 400);
      if (!sg.cantidadEsperada || sg.cantidadEsperada <= 0) {
        return jsonError('Cantidad esperada debe ser mayor a 0.', 400);
      }
    }

    for (const existente of existentes) {
      if (!idsEnviados.has(existente.id)) {
        if (existente.cantidad_capturada > 0) {
          return jsonError(
            `No se puede quitar el Sub-Grupo ${existente.material_codigo} porque ya tiene capturas.`,
            409,
          );
        }
        const { error: delError } = await admin.from('separacion_sap_caja_subgrupos').delete().eq('id', existente.id);
        if (delError) throw new Error(delError.message);
      }
    }

    for (let index = 0; index < body.subgrupos.length; index++) {
      const sg = body.subgrupos[index];
      const row = {
        marca: sg.marca.trim(),
        modelo: sg.modelo.trim(),
        tipo_producto: sg.tipoProducto,
        material_codigo: sg.materialCodigo.trim(),
        material_texto: sg.materialTexto?.trim() || '',
        cantidad_esperada: sg.cantidadEsperada,
        longitud_digitos: sg.longitudDigitos || 15,
        esquema_series: sg.esquemaSeries || 'S1',
        orden: index,
      };

      if (sg.id) {
        const prev = existentes.find((e) => e.id === sg.id);
        if (!prev) return jsonError(`Sub-Grupo ${sg.id} no encontrado.`, 404);

        if (prev.cantidad_capturada > 0) {
          const cambioProducto =
            prev.marca !== row.marca ||
            prev.modelo !== row.modelo ||
            prev.tipo_producto !== row.tipo_producto ||
            prev.material_codigo !== row.material_codigo;
          if (cambioProducto) {
            return jsonError(
              `El Sub-Grupo ${prev.material_codigo} tiene capturas y no puede cambiar marca/modelo/material.`,
              409,
            );
          }
          if (sg.cantidadEsperada < prev.cantidad_capturada) {
            return jsonError(
              `Cantidad mínima ${prev.cantidad_capturada} uds (ya capturadas) en ${prev.material_codigo}.`,
              409,
            );
          }
        }

        const { error: updError } = await admin.from('separacion_sap_caja_subgrupos').update(row).eq('id', sg.id);
        if (updError) throw new Error(updError.message);
      } else {
        const { error: insError } = await admin.from('separacion_sap_caja_subgrupos').insert({ ...row, caja_id: cajaId });
        if (insError) throw new Error(insError.message);
      }
    }

    await syncCajaHeaderFromSubgrupos(cajaId);
    const cajaActualizada = await loadCajaById(cajaId);

    return NextResponse.json({ ok: true, caja: cajaActualizada });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar Sub-Grupos.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas subgrupos PUT]', message);
    return jsonError(message, 500);
  }
}
