import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSAPService, getClientIp, getRequestBaseUrl } from '@/modules/sap';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const body = await request.json();
    const sap = createSAPService(getRequestBaseUrl(request));

    const result = await sap.dispatchLot({
      loteId: body.loteId,
      fechaEntrega: body.fechaEntrega,
      conduce: body.conduce,
      transportista: body.transportista,
      recibidoPor: body.recibidoPor,
      observaciones: body.observaciones,
      usuario: user.email || user.id,
      ip: getClientIp(request),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar salida SAP.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
