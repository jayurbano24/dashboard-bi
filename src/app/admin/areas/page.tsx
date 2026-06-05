import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminAreasClient from './AdminAreasClient';

export default async function AdminAreasPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleData } = await supabase.rpc('get_my_role');
  const role = typeof roleData === 'string' ? roleData : null;

  if (role !== 'admin') redirect('/no-access');

  const { data: access } = await supabase
    .from('role_area_access')
    .select('id, role, area, created_at')
    .order('role', { ascending: true })
    .order('area', { ascending: true });

  return <AdminAreasClient initialAccess={access ?? []} />;
}