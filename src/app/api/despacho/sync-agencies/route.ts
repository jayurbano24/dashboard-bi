/**
 * POST /api/despacho/sync-agencies
 * Sends the full Orderry agencies list to the Google Apps Script webhook
 * so it writes them into the "Agencias Despacho" tab of the Google Sheet.
 *
 * Also accepts GET to just return the current agencies list from Orderry.
 */

import { NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

async function getOrderryAgencies(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/despacho/origins`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener agencias de Orderry');
  const data = await res.json();
  return Array.isArray(data.origins) ? (data.origins as string[]) : [];
}

export async function POST() {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json(
      { error: 'GOOGLE_APPS_SCRIPT_URL no configurada en .env.local' },
      { status: 500 }
    );
  }

  try {
    const agencies = await getOrderryAgencies();

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'syncAgencies', agencies }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Apps Script error: ${text}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, synced: agencies.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error de red' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const agencies = await getOrderryAgencies();
    return NextResponse.json({ agencies });
  } catch (err: any) {
    return NextResponse.json({ agencies: [], error: err?.message }, { status: 200 });
  }
}
