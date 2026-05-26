/**
 * GET /api/despacho/sheet-agencies
 * Returns the list of agencies from the "Agencias Despacho" tab in Google Sheets.
 * Uses authenticated access when credentials are available, otherwise falls back
 * to public CSV export (works when the sheet is shared publicly).
 */

import { NextResponse } from 'next/server';
import { getDespachoAgencias } from '@/lib/google-sheets';

const DESPACHO_SHEET_ID = process.env.GOOGLE_DESPACHO_SHEET_ID || '1YmNih5V_IpFNqErbogJ75ienWBCbveuf2isa7MdZknM';

async function getAgenciasPublicCsv(): Promise<string[]> {
  const url = `https://docs.google.com/spreadsheets/d/${DESPACHO_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Agencias%20Despacho`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const csv = await res.text();

  const rows = csv
    .split('\n')
    .map((line) =>
      line
        .split(',')
        .map((cell) => cell.replace(/^"|"$/g, '').trim())
    )
    .filter((cols) => cols.length >= 1 && cols[0]);

  if (rows.length < 2) return []; // only header or empty

  const [header, ...dataRows] = rows;
  const agenciaIdx = header.findIndex((h) => h.toUpperCase().includes('AGENCIA'));
  const activaIdx  = header.findIndex((h) => h.toUpperCase().includes('ACTIVA'));

  if (agenciaIdx === -1) return [];

  return dataRows
    .map((row) => ({
      name:   (row[agenciaIdx] || '').trim(),
      activa: (activaIdx !== -1 ? row[activaIdx] : 'Sí').toUpperCase(),
    }))
    .filter(({ name, activa }) => name && activa !== 'NO')
    .map(({ name }) => name);
}

export async function GET() {
  // 1. Try authenticated access (requires GOOGLE_SERVICE_ACCOUNT_EMAIL + PRIVATE_KEY)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const agencies = await getDespachoAgencias();
      return NextResponse.json({ agencies, source: 'authenticated' });
    } catch (err: any) {
      console.warn('[sheet-agencies] authenticated failed, trying public CSV:', err?.message);
    }
  }

  // 2. Fallback: public CSV export (works when sheet is shared "Anyone with link can view")
  try {
    const agencies = await getAgenciasPublicCsv();
    return NextResponse.json({ agencies, source: 'public' });
  } catch (err: any) {
    console.error('[sheet-agencies] public CSV failed:', err?.message);
    return NextResponse.json({ agencies: [], error: err?.message ?? 'No se pudo leer agencias.' }, { status: 200 });
  }
}
