import { NextResponse } from 'next/server';
import { deleteDespachoConduce, getDespachoConduces, saveDespachoConduce } from '@/lib/supabase-store';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '20');
    const result = await getDespachoConduces({ page, pageSize });
    return NextResponse.json({ ok: true, ...result, via: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al leer historial de Supabase.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = await saveDespachoConduce(body);
    return NextResponse.json({ ok: true, rows, via: 'supabase' });
  } catch (err: any) {
    if (err?.code === 'DUPLICATE_CONDUCE') {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message ?? 'Error al guardar en Supabase.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError) {
      return NextResponse.json({ error: 'No se pudo validar el rol.' }, { status: 500 });
    }

    if (String(roleData || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const conduceId: string = body?.id;
    if (!conduceId) {
      return NextResponse.json({ error: 'Se requiere id del conduce.' }, { status: 400 });
    }

    const deleted = await deleteDespachoConduce(conduceId);
    return NextResponse.json({ ok: true, deleted, via: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al eliminar en Supabase.' }, { status: 500 });
  }
}

