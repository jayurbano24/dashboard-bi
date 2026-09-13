import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLAS_SEPARACION_SAP = [
  'separacion_sap_bsd_equipos',
  'separacion_sap_cajas',
  'separacion_sap_capturas',
  'separacion_sap_rechazos',
  'separacion_sap_bsd_imports',
] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
    }

    const resultados = await Promise.all(
      TABLAS_SEPARACION_SAP.map(async (tabla) => {
        const { error } = await supabase.from(tabla).select('*', { head: true, count: 'exact' });
        return {
          tabla,
          existe: !error,
          error: error?.message ?? null,
        };
      }),
    );

    const faltantes = resultados.filter((r) => !r.existe);
    const ok = faltantes.length === 0;

    return NextResponse.json({
      ok,
      mensaje: ok
        ? 'Todas las tablas de Separación SAP existen en Supabase.'
        : `Faltan ${faltantes.length} tabla(s). Ejecute scripts/migrations/2026-separacion-sap-cajas.sql en el SQL Editor.`,
      tablas: resultados,
      migracion: 'scripts/migrations/2026-separacion-sap-cajas.sql',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error verificando schema.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
