import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCentrosDisponibles } from '@/app/api/separacion-sap/_lib/load-bsd';

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
    const centros = await loadCentrosDisponibles();
    return NextResponse.json({ ok: true, centros });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer centros SAP.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/centros GET]', message);
    return jsonError(message, 500);
  }
}
