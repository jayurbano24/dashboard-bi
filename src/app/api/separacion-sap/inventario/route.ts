import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { extraerMaterialesDesdeBsdG945 } from '@/modules/separacion-sap/domain/inventario/materials';
import { parseSapArchivo } from '@/modules/separacion-sap/domain/inventario/sap-excel-parser';
import { equipoToRow, rowToEquipo, type BsdImportRow } from '@/modules/separacion-sap/infrastructure/inventario/inventario-mapper';
import type { BsdEquipo } from '@/modules/separacion-sap/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const BATCH_SIZE = 500;
const PAGE_SIZE = 1000;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function fetchActiveImport(admin: ReturnType<typeof getSupabaseAdmin>): Promise<BsdImportRow | null> {
  const { data, error } = await admin
    .from('separacion_sap_bsd_imports')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as BsdImportRow | null;
}

async function fetchEquiposByImport(
  admin: ReturnType<typeof getSupabaseAdmin>,
  importBatchId: string,
): Promise<BsdEquipo[]> {
  const equipos: BsdEquipo[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('separacion_sap_bsd_equipos')
      .select('material_codigo, material_texto, normalized_serial, centro, almacen, lote, status_sistema')
      .eq('import_batch_id', importBatchId)
      .order('normalized_serial')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    equipos.push(...page.map(rowToEquipo));

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return equipos;
}

async function clearEquipos(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { error } = await admin
    .from('separacion_sap_bsd_equipos')
    .delete()
    .gte('created_at', '1970-01-01T00:00:00Z');

  if (error) {
    throw new Error(`No se pudo limpiar inventario anterior: ${error.message}`);
  }
}

async function persistInventario(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  userEmail: string | undefined,
  filename: string,
  equipos: BsdEquipo[],
) {
  const materialesG945 = extraerMaterialesDesdeBsdG945(equipos);
  const registrosG945 = equipos.filter((e) => e.centro === 'G945').length;

  const { error: deactivateError } = await admin
    .from('separacion_sap_bsd_imports')
    .update({ activo: false })
    .eq('activo', true);

  if (deactivateError) {
    throw new Error(deactivateError.message);
  }

  const { data: importRow, error: importError } = await admin
    .from('separacion_sap_bsd_imports')
    .insert({
      filename,
      registros_totales: equipos.length,
      registros_g945: registrosG945,
      materiales_detectados: materialesG945.length,
      imported_by: userEmail ?? userId,
      activo: true,
    })
    .select('*')
    .single();

  if (importError || !importRow) {
    throw new Error(importError?.message ?? 'No se pudo registrar la importación.');
  }

  await clearEquipos(admin);

  for (let i = 0; i < equipos.length; i += BATCH_SIZE) {
    const chunk = equipos.slice(i, i + BATCH_SIZE).map((equipo) => equipoToRow(equipo, importRow.id));
    const { error: insertError } = await admin.from('separacion_sap_bsd_equipos').insert(chunk);
    if (insertError) {
      throw new Error(`Error insertando series (${i + 1}-${i + chunk.length}): ${insertError.message}`);
    }
  }

  return {
    id: importRow.id,
    filename: importRow.filename,
    registrosTotales: equipos.length,
    registrosG945,
    materialesDetectados: materialesG945.length,
    cargadoEn: importRow.created_at,
    importedBy: importRow.imported_by,
  };
}

export async function GET() {
  try {
    await requireUser();
    const admin = getSupabaseAdmin();
    const importRow = await fetchActiveImport(admin);

    if (!importRow) {
      return NextResponse.json({
        ok: true,
        import: null,
        equipos: [],
        total: 0,
      });
    }

    const equipos = await fetchEquiposByImport(admin, importRow.id);

    return NextResponse.json({
      ok: true,
      import: {
        id: importRow.id,
        filename: importRow.filename,
        registrosTotales: importRow.registros_totales,
        registrosG945: importRow.registros_g945,
        materialesDetectados: importRow.materiales_detectados,
        cargadoEn: importRow.created_at,
        importedBy: importRow.imported_by,
      },
      equipos,
      total: equipos.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al leer inventario SAP.';
    if (message === 'UNAUTHORIZED') {
      return jsonError('No autenticado.', 401);
    }
    console.error('[separacion-sap/inventario GET]', message);
    return jsonError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const contentType = request.headers.get('content-type') ?? '';

    let filename = 'inventario-sap.xlsx';
    let equipos: BsdEquipo[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return jsonError('Debe enviar un archivo Excel en el campo "file".', 400);
      }
      filename = file.name;
      equipos = await parseSapArchivo(file);
    } else {
      const body = await request.json();
      filename = String(body.filename ?? 'inventario-sap.xlsx').trim();
      if (!Array.isArray(body.equipos) || body.equipos.length === 0) {
        return jsonError('Payload inválido: se esperaba un archivo o arreglo de equipos.', 400);
      }
      equipos = body.equipos.map((item: Record<string, unknown>, index: number) => {
        const materialCodigo = String(item.materialCodigo ?? '').trim();
        const normalizedSerial = String(item.normalizedSerial ?? '').trim();
        if (!materialCodigo || !normalizedSerial) {
          throw new Error(`Registro ${index + 1} sin material o serie.`);
        }
        return {
          materialCodigo,
          materialTexto: String(item.materialTexto ?? `MATERIAL SAP ${materialCodigo}`).trim(),
          normalizedSerial,
          centro: String(item.centro ?? 'G945').trim().toUpperCase(),
          almacen: String(item.almacen ?? 'D000').trim().toUpperCase(),
          lote: String(item.lote ?? 'NOVALORADO').trim(),
          statusSistema: String(item.statusSistema ?? 'ALMA').trim(),
        };
      });
    }

    if (equipos.length === 0) {
      return jsonError('No se encontraron series válidas en el archivo SAP.', 400);
    }

    const admin = getSupabaseAdmin();
    const importMeta = await persistInventario(admin, user.id, user.email ?? undefined, filename, equipos);

    return NextResponse.json({
      ok: true,
      import: importMeta,
      total: equipos.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar inventario SAP.';
    if (message === 'UNAUTHORIZED') {
      return jsonError('No autenticado.', 401);
    }
    console.error('[separacion-sap/inventario POST]', message);
    return jsonError(message, 500);
  }
}
