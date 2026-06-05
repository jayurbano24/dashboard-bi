import { NextResponse } from 'next/server';
import { getDespachoAgencias } from '@/lib/supabase-store';

export async function GET() {
  try {
    const agencies = await getDespachoAgencias();
    return NextResponse.json({ agencies, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ agencies: [], error: err?.message ?? 'No se pudo leer agencias.' }, { status: 200 });
  }
}

