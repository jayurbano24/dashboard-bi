import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const VALID_ROLES = ['admin', 'supervisor', 'despacho', 'viewer'];

// POST /api/admin/users/invite — invitar usuario por email
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;

  if (role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const { email, role: requestedRole } = body ?? {};

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }
  if (!requestedRole || !VALID_ROLES.includes(requestedRole)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  // Usar service role key para invitar usuario (necesita permisos admin de Supabase Auth)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { invited_role: requestedRole },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002'}/auth/callback`,
    }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  // Registrar el rol en user_roles para cuando el usuario confirme
  const newUserId = inviteData.user?.id;
  if (newUserId) {
    await adminClient
      .from('user_roles')
      .upsert({ user_id: newUserId, role: requestedRole }, { onConflict: 'user_id' });
  }

  return NextResponse.json({ ok: true, user_id: newUserId });
}
