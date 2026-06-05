import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

export async function PATCH(request: Request) {
  const check = await assertAdmin();
  if (check.error !== null) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const userId = typeof body?.user_id === 'string' ? body.user_id : '';
  const firstName = typeof body?.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body?.last_name === 'string' ? body.last_name.trim() : '';

  if (!userId || !firstName || !lastName) {
    return NextResponse.json({ error: 'user_id, first_name y last_name son obligatorios' }, { status: 400 });
  }

  const supabase = check.supabase;
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('areas')
    .eq('user_id', userId)
    .maybeSingle();

  const areas = Array.isArray(existingProfile?.areas) ? existingProfile.areas : [];

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        areas,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    const missingTable = /user_profiles|schema cache|relation .*user_profiles.* does not exist/i.test(error.message);
    if (missingTable) {
      return NextResponse.json(
        {
          error: 'La tabla public.user_profiles no existe en Supabase. Ejecuta scripts/auth_schema.sql en SQL Editor y luego recarga el schema cache.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}