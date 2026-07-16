import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET() {
  const { data: rows } = await supabase
    .from('despacho_conduce_rows')
    .select('id, payload');
      
  let missing = 0;
  for (const r of rows || []) {
    if (r.payload && !r.payload.hasOwnProperty('serviciosObras') && !r.payload.backfilled) {
      missing++;
    }
  }

  return NextResponse.json({ missingCount: missing, total: rows?.length });
}
