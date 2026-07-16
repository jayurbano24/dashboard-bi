import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDespachoAgencias } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

const FALLBACK_AGENCIES = [
  'G231-PORTALES', 'G204-MIRAFLORES', 'G225-OAKLAND MALL PLACE', 'G210-PRADERA ZONA 10',
  'G239-PRADERA XELA', 'G252-ESCUINTLA', 'G264-ZACAPA', 'G266-COBAN', 'G268-PETEN',
  'G247-MAZATENANGO PLAZA AMÉRICAS',
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const sheetAgencies = await getDespachoAgencias().catch(() => [] as string[]);

    const merged = [...new Set([...sheetAgencies, ...FALLBACK_AGENCIES].map((a) => a.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));

    return NextResponse.json({ ok: true, agencies: merged });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error cargando agencias.';
    return NextResponse.json({ ok: true, agencies: FALLBACK_AGENCIES, warning: message });
  }
}
