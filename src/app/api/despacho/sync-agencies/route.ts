import { NextResponse } from 'next/server';
import { upsertDespachoAgencies } from '@/lib/supabase-store';

async function getOrderryAgencies(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/despacho/origins`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener agencias de Orderry');
  const data = await res.json();
  return Array.isArray(data.origins) ? (data.origins as string[]) : [];
}

export async function POST() {
  try {
    const agencies = await getOrderryAgencies();
    const synced = await upsertDespachoAgencies(agencies);
    return NextResponse.json({ ok: true, synced, via: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al sincronizar agencias.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const agencies = await getOrderryAgencies();
    return NextResponse.json({ agencies });
  } catch (err: any) {
    return NextResponse.json({ agencies: [], error: err?.message }, { status: 200 });
  }
}

