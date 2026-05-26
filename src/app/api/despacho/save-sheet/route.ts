/**
 * POST /api/despacho/save-sheet
 * Saves a completed conduce to Google Sheets via Apps Script webhook.
 * Falls back to authenticated google-spreadsheet library if Apps Script URL not set.
 */

import { NextResponse } from 'next/server';
import { saveDespachoConduce } from '@/lib/google-sheets';

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.id || !Array.isArray(body?.unidadesDespachadas)) {
      return NextResponse.json({ error: 'Payload inválido — se requiere id y unidadesDespachadas.' }, { status: 400 });
    }

    // Path 1: Apps Script webhook (no service account needed)
    if (APPS_SCRIPT_URL) {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveConduce', conduce: body }),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Apps Script error: ${text}` }, { status: 500 });
      }
      return NextResponse.json({ ok: true, rows: body.unidadesDespachadas.length, via: 'apps-script' });
    }

    // Path 2: Authenticated service account
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      await saveDespachoConduce(body);
      return NextResponse.json({ ok: true, rows: body.unidadesDespachadas.length, via: 'service-account' });
    }

    return NextResponse.json(
      { error: 'Sin método de escritura configurado. Agrega GOOGLE_APPS_SCRIPT_URL o credenciales de cuenta de servicio en .env.local' },
      { status: 500 }
    );
  } catch (err: any) {
    console.error('[save-sheet]', err);
    return NextResponse.json({ error: err?.message ?? 'Error al guardar en Sheets.' }, { status: 500 });
  }
}

/**
 * DELETE /api/despacho/save-sheet
 * Body: { id: string }  — elimina todas las filas del conduce en Google Sheets
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const conduceId: string = body?.id;
    if (!conduceId) {
      return NextResponse.json({ error: 'Se requiere id del conduce.' }, { status: 400 });
    }

    if (!APPS_SCRIPT_URL) {
      return NextResponse.json({ error: 'GOOGLE_APPS_SCRIPT_URL no configurada.' }, { status: 500 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteConduce', conduceId }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Apps Script error: ${text}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, deleted: data.deleted ?? 0, via: 'apps-script' });
  } catch (err: any) {
    console.error('[save-sheet DELETE]', err);
    return NextResponse.json({ error: err?.message ?? 'Error al eliminar en Sheets.' }, { status: 500 });
  }
}
