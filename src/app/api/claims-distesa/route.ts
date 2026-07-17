import { NextResponse } from 'next/server';
import { getDespachoReportRows } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    let rows = await getDespachoReportRows({
      startDate,
      endDate,
    });

    // Filtro estricto en el backend para forzar la exclusión
    rows = rows.filter(row => {
      const rawStr = JSON.stringify(row.rawRecord || {}).toUpperCase();
      const isExcluded = 
        rawStr.includes('TELEFONO') ||
        rawStr.includes('SMARTPHONE') ||
        rawStr.includes('FEATURE PHONE') ||
        rawStr.includes('CELULAR') ||
        rawStr.includes('TABLET') ||
        rawStr.includes('PAD') ||
        rawStr.includes('BLACK AND DECKER') ||
        rawStr.includes('BLACK & DECKER') ||
        rawStr.includes('REMINGTON');
        
      return !isExcluded;
    });

    return NextResponse.json({ ok: true, count: rows.length, rows });

  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Error fetching claims data' }, 
      { status: 500 }
    );
  }
}
