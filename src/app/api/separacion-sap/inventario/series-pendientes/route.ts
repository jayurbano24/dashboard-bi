import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fetchEmpacadosSerialsPorCentro } from '@/app/api/separacion-sap/_lib/fetch-capturas';
import { loadBsdEquiposActivos } from '@/app/api/separacion-sap/_lib/load-bsd';
import { seriesPendientesEmpaquePorBodega } from '@/modules/separacion-sap/domain/inventario/inventario-bodega';
import { CENTROS_AUTORIZADOS } from '@/modules/separacion-sap/domain/shared/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

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

export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const centro = request.nextUrl.searchParams.get('centro')?.trim().toUpperCase() ?? '';
    if (!centro || !CENTROS_AUTORIZADOS.includes(centro as (typeof CENTROS_AUTORIZADOS)[number])) {
      return jsonError('Centro inválido (G945, G935 o G944).', 400);
    }

    const admin = getSupabaseAdmin();
    const [bsdEquipos, empacados] = await Promise.all([
      loadBsdEquiposActivos(),
      fetchEmpacadosSerialsPorCentro(admin, centro),
    ]);

    const series = seriesPendientesEmpaquePorBodega(centro, [], bsdEquipos, empacados);

    return NextResponse.json({ ok: true, centro, total: series.length, series });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al listar series pendientes.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/inventario/series-pendientes GET]', message);
    return jsonError(message, 500);
  }
}
