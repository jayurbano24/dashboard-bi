import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const VALID_AREAS = ['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'Claims', 'Subir Claims', 'Bono Técnico', 'Despacho'] as const;

// Verifica que quien llama es admin
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };

  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;

  if (role !== 'admin') return { error: 'No autorizado', status: 403 };
  return { error: null, status: 200 };
}

// PATCH /api/admin/users/role — cambiar rol
export async function PATCH(request: Request) {
  const check = await assertAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  const { user_id, role } = body ?? {};

  const VALID_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'];
  if (!user_id || !role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id, role }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nextAreas = role === 'admin'
    ? [...VALID_AREAS]
    : ((await supabase.from('role_area_access').select('area').eq('role', role)).data ?? [])
        .map((row: { area: string }) => row.area)
        .filter((area): area is (typeof VALID_AREAS)[number] => VALID_AREAS.includes(area as (typeof VALID_AREAS)[number]));

  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', user_id)
    .maybeSingle();

  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id,
        first_name: existingProfile?.first_name ?? '',
        last_name: existingProfile?.last_name ?? '',
        areas: nextAreas,
      },
      { onConflict: 'user_id' }
    );

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users/role — eliminar acceso
export async function DELETE(request: Request) {
  const check = await assertAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await request.json();
  const { user_id } = body ?? {};
  if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
