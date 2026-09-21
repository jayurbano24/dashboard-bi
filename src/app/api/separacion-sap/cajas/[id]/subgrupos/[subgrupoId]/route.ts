import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { loadCajaById, syncCajaHeaderFromSubgrupos } from '@/app/api/separacion-sap/cajas/_lib/load-caja';

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

/** Elimina un sub-grupo y sus capturas (libera series para re-captura). */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; subgrupoId: string }> },
) {
  try {
    await requireUser();
    const { id: cajaId, subgrupoId } = await context.params;
    const admin = getSupabaseAdmin();

    const caja = await loadCajaById(cajaId);
    if (caja.estado !== 'ABIERTA') {
      return jsonError('Solo se pueden eliminar Sub-Grupos en cajas abiertas.', 409);
    }

    const subgrupo = caja.subgrupos.find((sg) => sg.id === subgrupoId);
    if (!subgrupo) {
      return jsonError('Sub-Grupo no encontrado en esta caja.', 404);
    }

    const { error: capDelError } = await admin
      .from('separacion_sap_capturas')
      .delete()
      .eq('subgrupo_id', subgrupoId);

    if (capDelError) throw new Error(capDelError.message);

    const { error: sgDelError } = await admin
      .from('separacion_sap_caja_subgrupos')
      .delete()
      .eq('id', subgrupoId)
      .eq('caja_id', cajaId);

    if (sgDelError) throw new Error(sgDelError.message);

    await syncCajaHeaderFromSubgrupos(cajaId);
    const cajaActualizada = await loadCajaById(cajaId);

    return NextResponse.json({ ok: true, caja: cajaActualizada });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar Sub-Grupo.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas subgrupos DELETE]', message);
    return jsonError(message, 500);
  }
}
