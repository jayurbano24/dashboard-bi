import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const VALID_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'] as const;
const VALID_AREAS = ['Gerencial', 'Backoffice', 'Taller', 'Bodega', 'Calidad', 'ERP Xiaomi', 'Bono Técnico', 'Despacho'] as const;

type AdminCheckResult =
  | { error: string; status: number; supabase?: never }
  | { error: null; status: 200; supabase: Awaited<ReturnType<typeof createClient>> };

async function assertAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };

  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;

  if (role !== 'admin') return { error: 'No autorizado', status: 403 };
  return { error: null, status: 200, supabase };
}

export async function GET() {
  const check = await assertAdmin();
  if (check.error !== null) return NextResponse.json({ error: check.error }, { status: check.status });

  const supabase = check.supabase;
  const { data, error } = await supabase
    .from('role_area_access')
    .select('id, role, area, created_at')
    .order('role', { ascending: true })
    .order('area', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    roles: VALID_ROLES,
    areas: VALID_AREAS,
    access: data ?? [],
  });
}

export async function PATCH(request: Request) {
  const check = await assertAdmin();
  if (check.error !== null) return NextResponse.json({ error: check.error }, { status: check.status });

  const supabase = check.supabase;
  const body = await request.json();
  const role = typeof body?.role === 'string' ? body.role : '';
  const areas = Array.isArray(body?.areas)
    ? body.areas.filter((area: unknown): area is string => typeof area === 'string')
    : [];

  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  if (role === 'admin') {
    return NextResponse.json({ error: 'El rol admin siempre tiene acceso a todas las áreas' }, { status: 400 });
  }

  const normalizedAreas = [...new Set(areas)].filter((area): area is (typeof VALID_AREAS)[number] =>
    VALID_AREAS.includes(area as (typeof VALID_AREAS)[number])
  );

  const { error: deleteError } = await supabase
    .from('role_area_access')
    .delete()
    .eq('role', role);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (normalizedAreas.length > 0) {
    const payload = normalizedAreas.map((area: (typeof VALID_AREAS)[number]) => ({ role, area }));
    const { error: insertError } = await supabase
      .from('role_area_access')
      .insert(payload);

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role, areas: normalizedAreas });
}