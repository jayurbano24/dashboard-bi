import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const userId = data.user?.id;
      if (userId) {
        const userMetadata = data.user.user_metadata ?? {};
        const firstName = typeof userMetadata.first_name === 'string' ? userMetadata.first_name : 'Usuario';
        const lastName = typeof userMetadata.last_name === 'string' ? userMetadata.last_name : 'Nuevo';
        const areas = Array.isArray(userMetadata.areas) ? userMetadata.areas.filter((area) => typeof area === 'string') : [];

        await supabase.from('user_profiles').upsert(
          {
            user_id: userId,
            first_name: firstName,
            last_name: lastName,
            areas,
          },
          { onConflict: 'user_id' }
        );

        await supabase.from('user_roles').upsert(
          { user_id: userId, role: 'viewer' },
          { onConflict: 'user_id' }
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
