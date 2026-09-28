import type { getSupabaseAdmin } from '@/lib/supabase-admin';
import { loadBsdEquiposActivos } from '@/app/api/separacion-sap/_lib/load-bsd';
import {
  capturaExistsInCaja,
  findDuplicadoSerieEnDb,
} from '@/app/api/separacion-sap/_lib/fetch-capturas';
import { parseSerieFlexible } from '@/modules/separacion-sap/domain/cajas/serie-canonical';
import { lookupSerieEnSap, mensajeDuplicadoSerie } from '@/modules/separacion-sap/domain/cajas/serie-lookup';
import type { SerieLookupResult } from '@/modules/separacion-sap/types';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

/** Lookup SAP + duplicados vía DB (sin cargar miles de capturas en RAM). */
export async function lookupSerieEnSapFromApi(
  admin: AdminClient,
  params: {
    rawSerial: string;
    centroCaja: string;
    cajaId?: string;
  },
): Promise<SerieLookupResult> {
  const parseResult = parseSerieFlexible(params.rawSerial);
  if (!parseResult.ok) {
    return { success: false, code: parseResult.code, message: parseResult.message, serial: params.rawSerial };
  }
  const normalizedSerial = parseResult.value;

  const duplicadoOtra = await findDuplicadoSerieEnDb(admin, normalizedSerial, params.cajaId);
  if (duplicadoOtra) {
    return {
      success: false,
      code: 'SERIAL_ALREADY_ASSIGNED',
      message: mensajeDuplicadoSerie(duplicadoOtra),
      serial: normalizedSerial,
    };
  }

  if (params.cajaId) {
    const duplicadoMisma = await capturaExistsInCaja(admin, params.cajaId, normalizedSerial);
    if (duplicadoMisma) {
      return {
        success: false,
        code: 'DUPLICATE_SERIAL',
        message: `Serie ${normalizedSerial} ya fue capturada en esta caja.`,
        serial: normalizedSerial,
      };
    }
  }

  const bsdEquipos = await loadBsdEquiposActivos();
  return lookupSerieEnSap({
    rawSerial: params.rawSerial,
    centroCaja: params.centroCaja,
    bsdEquipos,
    cajas: [],
    excludeCajaId: params.cajaId,
    omitEscaneoDuplicados: true,
  });
}
