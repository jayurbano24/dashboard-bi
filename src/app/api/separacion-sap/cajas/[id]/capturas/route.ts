import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { type CapturaRow } from '@/modules/separacion-sap/infrastructure/cajas/cajas-mapper';
import { loadCajaById, syncCajaHeaderFromSubgrupos } from '@/app/api/separacion-sap/cajas/_lib/load-caja';
import type { CapturaSerie } from '@/modules/separacion-sap/types';

export const dynamic = 'force-dynamic';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: cajaId } = await context.params;
    const admin = getSupabaseAdmin();
    const captura = (await request.json()) as CapturaSerie;

    const subgrupoId =
      captura.subgrupoId && !captura.subgrupoId.startsWith('legacy-') && !captura.subgrupoId.startsWith('sg-')
        ? captura.subgrupoId
        : null;

    await syncCajaHeaderFromSubgrupos(cajaId);

    const { data: inserted, error: insertError } = await admin
      .from('separacion_sap_capturas')
      .insert({
        caja_id: cajaId,
        subgrupo_id: subgrupoId,
        normalized_serial: captura.normalizedSerial,
        normalized_serial_s2: captura.normalizedSerialS2 ?? null,
        esquema_series: captura.esquemaSeries ?? 'S1',
        material_codigo: captura.materialCodigo,
        material_texto: captura.materialTexto ?? null,
        centro: captura.centro,
        almacen: captura.almacen,
        lote: captura.lote ?? null,
        status_bsd: captura.statusBsd ?? null,
        status_captura: captura.statusCaptura ?? 'BASE_ENCONTRADO',
        captured_by: user.email ?? user.id,
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: dupCap } = await admin
          .from('separacion_sap_capturas')
          .select('caja_id, subgrupo_id, normalized_serial, material_codigo, material_texto')
          .eq('normalized_serial', captura.normalizedSerial)
          .maybeSingle();

        if (dupCap) {
          const { data: dupCaja } = await admin
            .from('separacion_sap_cajas')
            .select('numero_caja')
            .eq('id', (dupCap as { caja_id: string }).caja_id)
            .maybeSingle();
          const numero = (dupCaja as { numero_caja: string } | null)?.numero_caja ?? 'desconocida';
          const mat = (dupCap as { material_codigo: string }).material_codigo;
          return jsonError(
            `Serie ${captura.normalizedSerial} ya registrada en ${numero}, Sub-Grupo ${mat}.`,
            409,
          );
        }
        return jsonError('La serie ya fue capturada en otra caja.', 409);
      }
      throw new Error(insertError.message);
    }

    if (subgrupoId) {
      const { data: sgRow } = await admin
        .from('separacion_sap_caja_subgrupos')
        .select('cantidad_esperada, cantidad_capturada')
        .eq('id', subgrupoId)
        .single();

      if (sgRow) {
        const esperada = (sgRow as { cantidad_esperada: number }).cantidad_esperada;
        const capturada = (sgRow as { cantidad_capturada: number }).cantidad_capturada;
        if (capturada >= esperada) {
          await admin.from('separacion_sap_caja_subgrupos').update({ estado: 'LLENO' }).eq('id', subgrupoId);
        }
      }
    }

    const row = inserted as CapturaRow;
    const capturaPersistida: CapturaSerie = {
      id: row.id,
      cajaId: row.caja_id,
      subgrupoId: row.subgrupo_id ?? undefined,
      normalizedSerial: row.normalized_serial,
      normalizedSerialS2: row.normalized_serial_s2,
      esquemaSeries: row.esquema_series,
      materialCodigo: row.material_codigo,
      materialTexto: row.material_texto ?? undefined,
      centro: row.centro,
      almacen: row.almacen,
      lote: row.lote ?? '',
      statusBsd: row.status_bsd ?? '',
      statusCaptura: row.status_captura,
      capturedAt: row.captured_at,
      capturedBy: row.captured_by ?? undefined,
    };

    const caja = await loadCajaById(cajaId);
    return NextResponse.json({ ok: true, captura: capturaPersistida, caja });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar captura.';
    if (message === 'UNAUTHORIZED') return jsonError('No autenticado.', 401);
    console.error('[separacion-sap/cajas capturas POST]', message);
    return jsonError(message, 500);
  }
}
