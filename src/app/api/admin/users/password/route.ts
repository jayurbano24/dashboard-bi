import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

export async function PATCH(request: Request) {
  const check = await assertAdmin();
  if (check.error) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await request.json();
  const userId = typeof body?.user_id === 'string' ? body.user_id : '';
  const newPassword = typeof body?.new_password === 'string' ? body.new_password : '';

  if (!userId) {
    return NextResponse.json({ error: 'user_id es obligatorio.' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
