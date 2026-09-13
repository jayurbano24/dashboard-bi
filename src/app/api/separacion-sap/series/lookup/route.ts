import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { loadBsdEquiposActivos } from '@/app/api/separacion-sap/_lib/load-bsd';
import { loadCajasCompletasFromDb } from '@/app/api/separacion-sap/cajas/_lib/load-cajas';
import { lookupSerieEnSap } from '@/modules/separacion-sap/domain/cajas/serie-lookup';

export const dynamic = 'force-dynamic';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

type LookupBody = {
  serial: string;
  centroCaja: string;
  cajaId?: string;
};

export async function POST(request: Request) {
  try {
    await requireUser();
    const admin = getSupabaseAdmin();
    const body = (await request.json()) as LookupBody;

    if (!body.serial?.trim()) return jsonError('Serie requerida.', 400);
    if (!body.centroCaja?.trim()) return jsonError('Centro de caja requerido.', 400);

    const [bsdEquipos, { cajas }] = await Promise.all([
      loadBsdEquiposActivos(),
      loadCajasCompletasFromDb(admin),
    ]);

    const result = lookupSerieEnSap({
      rawSerial: body.serial,
      centroCaja: body.centroCaja.trim().toUpperCase(),
      bsdEquipos,
      cajas,
      excludeCajaId: body.cajaId,
    });

    if (!result.success) {
      const status =
        result.code === 'SERIAL_ALREADY_ASSIGNED' || result.code === 'DUPLICATE_SERIAL'
          ? 409
          : result.code === 'SAP_NOT_LOADED'
            ? 503
            : 422;
      return jsonError(result.message, status, { code: result.code, serial: result.serial });
    }

    return NextResponse.json({ ok: true, lookup: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar serie en SAP.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/series/lookup POST]', message);
    return jsonError(message, 500);
  }
}
