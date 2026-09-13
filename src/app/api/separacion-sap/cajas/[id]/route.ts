import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { userCanDeleteClosedCaja } from '@/lib/separacion-sap-caja-auth';
import {
  assembleCaja,
  type CapturaRow,
  type CajaRow,
  type SubgrupoRow,
} from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import type { EstadoCaja, EsquemaSeries, TipoProductoId } from '@/modules/separacion-sap/types';

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

type CajaRowDb = CajaRow & {
  marca: string;
  modelo: string;
  tipo_producto: TipoProductoId;
  material_codigo: string;
  material_texto: string;
  cantidad_esperada: number;
  cantidad_capturada: number;
  longitud_digitos: number;
  esquema_series: EsquemaSeries;
};

async function loadCajaById(admin: ReturnType<typeof getSupabaseAdmin>, cajaId: string) {
  const { data: cajaRow, error: cajaError } = await admin
    .from('separacion_sap_cajas')
    .select('*')
    .eq('id', cajaId)
    .single();

  if (cajaError) throw new Error(cajaError.message);

  const [{ data: subgruposRows }, { data: capturasRows }] = await Promise.all([
    admin.from('separacion_sap_caja_subgrupos').select('*').eq('caja_id', cajaId).order('orden'),
    admin.from('separacion_sap_capturas').select('*').eq('caja_id', cajaId).order('captured_at', { ascending: false }),
  ]);

  let subgrupos = (subgruposRows as SubgrupoRow[] | null) ?? [];
  const cajaDb = cajaRow as CajaRowDb;
  const esCajaVaciaGuiada =
    cajaDb.material_codigo === 'PENDIENTE' || cajaDb.cantidad_esperada === 0;
  if (subgrupos.length === 0 && cajaDb.material_codigo && !esCajaVaciaGuiada) {
    subgrupos = [
      {
        id: `legacy-${cajaDb.id}`,
        caja_id: cajaDb.id,
        marca: cajaDb.marca,
        modelo: cajaDb.modelo,
        tipo_producto: cajaDb.tipo_producto,
        material_codigo: cajaDb.material_codigo,
        material_texto: cajaDb.material_texto,
        cantidad_esperada: cajaDb.cantidad_esperada,
        cantidad_capturada: cajaDb.cantidad_capturada,
        longitud_digitos: cajaDb.longitud_digitos,
        esquema_series: cajaDb.esquema_series,
        orden: 0,
      },
    ];
  }

  return assembleCaja(cajaDb, subgrupos, (capturasRows as CapturaRow[] | null) ?? []);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const caja = await loadCajaById(admin, id);
    if (caja.estado === 'DESPACHADA') {
      return jsonError('No se pueden eliminar cajas despachadas.', 409);
    }
    if (caja.estado === 'CERRADA') {
      const allowed = await userCanDeleteClosedCaja(user);
      if (!allowed) {
        return jsonError(
          'Solo Gerente General (o usuario autorizado) puede eliminar cajas cerradas.',
          403,
        );
      }
    } else if (caja.estado !== 'ABIERTA') {
      return jsonError('Solo se pueden eliminar cajas abiertas o cerradas (con autorización).', 409);
    }

    const { error } = await admin.from('separacion_sap_cajas').delete().eq('id', id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, id, numeroCaja: caja.numeroCaja });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar caja.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas DELETE]', message);
    return jsonError(message, 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const body = (await request.json()) as {
      estado?: EstadoCaja;
      ubicacion?: string;
      tarima?: string;
    };

    const patch: Record<string, string> = {};
    if (body.estado) {
      patch.estado = body.estado;
      if (body.estado === 'CERRADA') patch.cerrada_en = new Date().toISOString();
      if (body.estado === 'DESPACHADA') patch.despachada_en = new Date().toISOString();
    }
    if (body.ubicacion !== undefined) patch.ubicacion = body.ubicacion;
    if (body.tarima !== undefined) patch.tarima = body.tarima;

    const { error } = await admin.from('separacion_sap_cajas').update(patch).eq('id', id);
    if (error) throw new Error(error.message);

    const caja = await loadCajaById(admin, id);
    return NextResponse.json({ ok: true, caja });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar caja.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas PATCH]', message);
    return jsonError(message, 500);
  }
}
