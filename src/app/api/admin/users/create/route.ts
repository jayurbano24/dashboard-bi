import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const VALID_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'] as const;
const VALID_AREAS = ['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'Claims', 'Subir Claims', 'Bono Técnico', 'Despacho'] as const;

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'No autenticado', status: 401 };

  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;
  if (role !== 'admin') return { error: 'No autorizado', status: 403 };

  return { error: null, status: 200 };
}

export async function POST(request: Request) {
  const check = await assertAdmin();
  if (check.error) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = typeof body?.role === 'string' ? body.role : '';
  const firstName = typeof body?.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body?.last_name === 'string' ? body.last_name.trim() : '';
  const areasFromBody = Array.isArray(body?.areas)
    ? body.areas.filter((area: unknown): area is string => typeof area === 'string')
    : [];

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
  }

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Nombre y apellido son obligatorios.' }, { status: 400 });
  }

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = createData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'No se pudo crear el usuario.' }, { status: 500 });
  }

  const createdAt = createData.user?.created_at ?? new Date().toISOString();

  const { error: roleError } = await adminClient
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  let profileAreas = [...new Set(areasFromBody)].filter((area): area is (typeof VALID_AREAS)[number] =>
    VALID_AREAS.includes(area as (typeof VALID_AREAS)[number])
  );

  if (profileAreas.length === 0 && role !== 'admin') {
    const { data: defaultAccess } = await adminClient
      .from('role_area_access')
      .select('area')
      .eq('role', role);

    profileAreas = (defaultAccess ?? [])
      .map((row: { area: string }) => row.area)
      .filter((area): area is (typeof VALID_AREAS)[number] => VALID_AREAS.includes(area as (typeof VALID_AREAS)[number]));
  }

  if (profileAreas.length === 0 && role === 'admin') {
    profileAreas = [...VALID_AREAS];
  }

  const { error: profileError } = await adminClient
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        areas: profileAreas,
      },
      { onConflict: 'user_id' }
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      user_id: userId,
      email,
      role,
      status: 'active',
      created_at: createdAt,
      first_name: firstName,
      last_name: lastName,
    },
  });
}
