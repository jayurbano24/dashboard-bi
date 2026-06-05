import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/isp/daily-sync
 *
 * Triggered once a day by Vercel Cron (see vercel.json).
 * Secured with CRON_SECRET — Vercel sets the Authorization header automatically.
 *
 * This route does NOT run the Playwright scraper directly (Vercel serverless
 * can't launch browsers). Instead it records a sync request in Supabase so
 * the Windows scheduled task knows when it last ran / was requested.
 *
 * The actual scraping is done by:
 *   python scripts/scrape_isp_portal.py
 * scheduled via Windows Task Scheduler (daily, same time as cron).
 *
 * Alternatively this route can call an external webhook/tunnel if configured.
 */
export async function POST(req: NextRequest) {
  // Verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch latest scraped_at from xiaomi_isp_cases to report last sync
  const { data: latest } = await supabase
    .from('xiaomi_isp_cases')
    .select('scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    message: 'ISP sync acknowledged. Run python scripts/scrape_isp_portal.py on the local machine.',
    last_scraped_at: latest?.scraped_at ?? null,
    triggered_at: new Date().toISOString(),
  });
}

/**
 * GET /api/isp/daily-sync
 * Returns the last sync status (last scraped_at timestamp + total case count).
 */
export async function GET() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const [latestRes, countRes] = await Promise.all([
    supabase
      .from('xiaomi_isp_cases')
      .select('scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('xiaomi_isp_cases')
      .select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    last_scraped_at: latestRes.data?.scraped_at ?? null,
    total_cases: countRes.count ?? 0,
  });
}
