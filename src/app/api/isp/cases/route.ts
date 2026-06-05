import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/isp/cases
 * Returns the latest scraped ISP cases from Supabase.
 * Query params: limit (default 200), status, from_date
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 1000);
  const status = searchParams.get('status') ?? '';
  const from   = searchParams.get('from_date') ?? '';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let query = supabase
    .from('xiaomi_isp_cases')
    .select(
      'service_order_number, service_type, acceptance_time, creation_time, service_order_status, lv1_model, oow_iw, scraped_at'
    )
    .order('creation_time', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('service_order_status', status);
  if (from)   query = query.gte('creation_time', from);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cases: data, total: data?.length ?? 0 });
}
