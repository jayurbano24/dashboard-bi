import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import AdminUsersClient from './AdminUsersClient';

type UserListRow = {
  user_id: string;
  email: string;
  role: string | null;
  created_at: string;
  status: 'active' | 'invited';
  first_name: string | null;
  last_name: string | null;
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Solo admins pueden acceder
  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;

  if (role !== 'admin') redirect('/no-access');

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: authUsersData }, { data: roles }, { data: profiles }] = await Promise.all([
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminClient
      .from('user_roles')
      .select('user_id, role, created_at'),
    adminClient
      .from('user_profiles')
      .select('user_id, first_name, last_name'),
  ]);

  const roleMap = new Map((roles ?? []).map((row) => [row.user_id, { role: row.role, created_at: row.created_at }]));
  const profileMap = new Map((profiles ?? []).map((row) => [row.user_id, row]));

  const initialUsers: UserListRow[] = (authUsersData?.users ?? []).map((authUser) => {
    const roleRow = roleMap.get(authUser.id);
    const profileRow = profileMap.get(authUser.id);
    const isActive = Boolean(authUser.last_sign_in_at || authUser.email_confirmed_at);

    return {
      user_id: authUser.id,
      email: authUser.email ?? '',
      role: roleRow?.role ?? null,
      created_at: roleRow?.created_at ?? authUser.created_at,
      status: isActive ? 'active' : 'invited',
      first_name: profileRow?.first_name ?? null,
      last_name: profileRow?.last_name ?? null,
    };
  });

  return <AdminUsersClient currentUserId={user.id} initialUsers={initialUsers} />;
}
