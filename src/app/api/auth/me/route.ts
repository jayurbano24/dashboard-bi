import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    let user: any = null;

    try {
      const result = await supabase.auth.getUser();
      user = result?.data?.user ?? null;
    } catch {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const [{ data: roleData }, { data: profileRow }, { data: areasData }] = await Promise.all([
      supabase.rpc('get_my_role'),
      supabase.from('user_profiles').select('first_name, last_name, areas').eq('user_id', user.id).single(),
      supabase.rpc('get_my_accessible_areas'),
    ]);

    const role = typeof roleData === 'string' ? roleData : null;
    let accessibleAreas = Array.isArray(areasData) ? areasData : [];
    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const metadataFirstName =
      typeof meta.first_name === 'string' ? meta.first_name.trim() :
      typeof meta.given_name === 'string' ? meta.given_name.trim() :
      typeof meta.name === 'string' ? meta.name.trim().split(' ')[0] :
      '';
    const metadataLastName =
      typeof meta.last_name === 'string' ? meta.last_name.trim() :
      typeof meta.family_name === 'string' ? meta.family_name.trim() :
      typeof meta.name === 'string'
        ? meta.name.trim().split(' ').slice(1).join(' ').trim()
        : '';

    if (role && role !== 'admin' && accessibleAreas.length === 0) {
      const { data: fallbackAreas } = await supabase
        .from('role_area_access')
        .select('area')
        .eq('role', role);

      accessibleAreas = Array.isArray(fallbackAreas)
        ? fallbackAreas
            .map((row: { area: string | null }) => row.area)
            .filter((area): area is string => typeof area === 'string' && area.length > 0)
        : [];
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role,
        firstName: profileRow?.first_name ?? (metadataFirstName || null),
        lastName: profileRow?.last_name ?? (metadataLastName || null),
        areas: profileRow?.areas ?? [],
        accessibleAreas,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}