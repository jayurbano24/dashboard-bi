import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSAPService, getRequestBaseUrl } from '@/modules/sap';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const imei = searchParams.get('imei');
    if (!imei?.trim()) {
      return NextResponse.json({ error: 'Parámetro imei requerido.' }, { status: 400 });
    }

    const sap = createSAPService(getRequestBaseUrl(request));
    const result = await sap.validateImei(imei, request.headers.get('cookie') || undefined);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error validando IMEI.';
    return NextResponse.json({ error: message, found: false }, { status: 500 });
  }
}
