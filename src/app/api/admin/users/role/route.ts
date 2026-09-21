import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { APP_AREAS, isAppArea, normalizeAppAreas, type AppArea } from '@/lib/auth-areas';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };

  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;

  if (role !== 'admin') return { error: 'No autorizado', status: 403 };
  return { error: null, status: 200 };
}

export async function PATCH(request: Request) {
  const check = await assertAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  const { user_id, role } = body ?? {};

  const VALID_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'];
  if (!user_id || !role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('user_roles').upsert({ user_id, role }, { onConflict: 'user_id' });

  if (error) {
    console.error('[admin/users/role PATCH]', error);
    return NextResponse.json({ error: 'No se pudo actualizar el rol.' }, { status: 500 });
  }

  const nextAreas: AppArea[] =
    role === 'admin'
      ? [...APP_AREAS]
      : normalizeAppAreas(
          ((await admin.from('role_area_access').select('area').eq('role', role)).data ?? [])
            .map((row: { area: string }) => row.area)
            .filter(isAppArea),
        );

  const { data: existingProfile } = await admin
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user_id)
    .maybeSingle();

  const { error: profileError } = await admin.from('user_profiles').upsert(
    {
      user_id,
      first_name: existingProfile?.first_name ?? '',
      last_name: existingProfile?.last_name ?? '',
      areas: nextAreas,
    },
    { onConflict: 'user_id' },
  );

  if (profileError) {
    console.error('[admin/users/role PATCH profile]', profileError);
    return NextResponse.json({ error: 'No se pudo sincronizar el perfil del usuario.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const check = await assertAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  const { user_id } = body ?? {};
  if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('user_roles').delete().eq('user_id', user_id);

  if (error) {
    console.error('[admin/users/role DELETE]', error);
    return NextResponse.json({ error: 'No se pudo eliminar el acceso.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
