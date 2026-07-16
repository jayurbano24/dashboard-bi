import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSAPService, getClientIp, getRequestBaseUrl } from '@/modules/sap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireUser(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const sap = createSAPService(getRequestBaseUrl(request));

    const imei = searchParams.get('imei');
    if (imei) {
      const history = await sap.getHistoryByImei(imei);
      return NextResponse.json({ ok: true, history });
    }

    const loteId = searchParams.get('loteId');
    if (loteId && searchParams.get('history') === '1') {
      const history = await sap.getHistoryByLote(loteId);
      return NextResponse.json({ ok: true, history });
    }

    const rows = await sap.listEquipos({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      searchTerm: searchParams.get('searchTerm') || undefined,
      loteId: loteId || undefined,
      estado: searchParams.get('estado') || undefined,
    });

    const lotes = searchParams.get('lotes') === '1'
      ? await sap.listLotes({ estado: searchParams.get('estado') || undefined })
      : undefined;

    return NextResponse.json({ ok: true, count: rows.length, rows, lotes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer equipos SAP.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message === 'UNAUTHORIZED' ? 'No autenticado.' : message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const sap = createSAPService(getRequestBaseUrl(request));
    const ip = getClientIp(request);
    const usuario = user.email || user.id;

    const result = await sap.saveLot({
      material: body.material,
      fechaAceptacion: body.fechaAceptacion,
      numeroTraslado: body.numeroTraslado,
      notaEntrega: body.notaEntrega,
      equipos: Array.isArray(body.equipos) ? body.equipos : [],
      usuario,
      ip,
    });

    return NextResponse.json({
      ok: true,
      count: result.count,
      loteId: result.lote.id,
      lote: result.lote,
      equipos: result.equipos,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar equipos SAP.';
    const status = message === 'UNAUTHORIZED' ? 401 : 400;
    return NextResponse.json({ error: message === 'UNAUTHORIZED' ? 'No autenticado.' : message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Se requiere id del registro SAP.' }, { status: 400 });

    const sap = createSAPService(getRequestBaseUrl(request));
    await sap.deleteEquipo(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar registro SAP.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message === 'UNAUTHORIZED' ? 'No autenticado.' : message }, { status });
  }
}
