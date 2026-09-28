import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { userCanDeleteClosedCaja } from '@/lib/separacion-sap-caja-auth';
import { loadCajaById } from '@/app/api/separacion-sap/cajas/_lib/load-caja';
import type { EstadoCaja } from '@/modules/separacion-sap/types';

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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const caja = await loadCajaById(id);
    return NextResponse.json({ ok: true, caja });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer caja.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas GET id]', message);
    return jsonError(message, 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const caja = await loadCajaById(id);
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

    const caja = await loadCajaById(id);
    return NextResponse.json({ ok: true, caja });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar caja.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas PATCH]', message);
    return jsonError(message, 500);
  }
}
