import { SAP_SERIE_NOT_FOUND_BEHAVIOR } from '../shared/sap-config';
import { inferirMarcaModeloDesdeMaterial } from './marca-modelo-sap';
import { inferirValoracion } from './valoracion';
import { parseSerieFlexible } from './serie-canonical';
import { DOMAIN_ERRORS } from '../shared/constants';
import type { BsdEquipo, CajaEntidad, DuplicadoSerieInfo, SerieLookupResult } from '../../types';

export function contarMaterialEnCentro(
  bsdEquipos: BsdEquipo[],
  materialCodigo: string,
  centro: string,
): number {
  return bsdEquipos.filter((e) => e.materialCodigo === materialCodigo && e.centro === centro).length;
}

export function buscarDuplicadoSerie(
  cajas: CajaEntidad[],
  normalizedSerial: string,
  excludeCajaId?: string,
): DuplicadoSerieInfo | null {
  for (const caja of cajas) {
    if (excludeCajaId && caja.id === excludeCajaId) continue;
    const cap = caja.capturas.find((c) => c.normalizedSerial === normalizedSerial);
    if (!cap) continue;

    const sg = cap.subgrupoId ? caja.subgrupos.find((s) => s.id === cap.subgrupoId) : undefined;
    return {
      normalizedSerial,
      cajaId: caja.id,
      numeroCaja: caja.numeroCaja,
      subgrupoId: cap.subgrupoId ?? null,
      materialCodigo: cap.materialCodigo,
      materialTexto: sg?.materialTexto ?? cap.materialTexto ?? '',
    };
  }
  return null;
}

export function mensajeDuplicadoSerie(info: DuplicadoSerieInfo): string {
  const subgrupoLabel = info.materialCodigo
    ? `Sub-Grupo ${info.materialCodigo}${info.materialTexto ? ` (${info.materialTexto})` : ''}`
    : 'Sub-Grupo desconocido';
  return `Serie ${info.normalizedSerial} ya registrada en ${info.numeroCaja}, ${subgrupoLabel}.`;
}

export function lookupSerieEnSap(params: {
  rawSerial: string;
  centroCaja: string;
  bsdEquipos: BsdEquipo[];
  cajas: CajaEntidad[];
  excludeCajaId?: string;
}): SerieLookupResult {
  const { rawSerial, centroCaja, bsdEquipos, cajas, excludeCajaId } = params;

  if (bsdEquipos.length === 0) {
    return { success: false, code: 'SAP_NOT_LOADED', message: DOMAIN_ERRORS.SAP_NOT_LOADED };
  }

  const parseResult = parseSerieFlexible(rawSerial);
  if (!parseResult.ok) {
    return { success: false, code: parseResult.code, message: parseResult.message, serial: rawSerial };
  }
  const normalizedSerial = parseResult.value;

  const duplicado = buscarDuplicadoSerie(cajas, normalizedSerial, excludeCajaId);
  if (duplicado) {
    return {
      success: false,
      code: 'SERIAL_ALREADY_ASSIGNED',
      message: mensajeDuplicadoSerie(duplicado),
      serial: normalizedSerial,
    };
  }

  const duplicadoEnMismaCaja = cajas
    .filter((c) => c.id === excludeCajaId)
    .flatMap((c) => c.capturas)
    .find((c) => c.normalizedSerial === normalizedSerial);
  if (duplicadoEnMismaCaja) {
    return {
      success: false,
      code: 'DUPLICATE_SERIAL',
      message: DOMAIN_ERRORS.DUPLICATE_SERIAL,
      serial: normalizedSerial,
    };
  }

  const itemBsd = bsdEquipos.find((e) => e.normalizedSerial === normalizedSerial);

  if (!itemBsd) {
    if (SAP_SERIE_NOT_FOUND_BEHAVIOR === 'BLOCK') {
      return {
        success: false,
        code: 'BASE_NOT_FOUND',
        message: DOMAIN_ERRORS.BASE_NOT_FOUND,
        serial: normalizedSerial,
      };
    }
    // PENDING / ALLOW — el caller decide cómo proceder; lookup falla con código específico
    return {
      success: false,
      code: 'BASE_NOT_FOUND_CONFIGURABLE',
      message: `Serie ${normalizedSerial} no encontrada en inventario SAP. Comportamiento configurado: ${SAP_SERIE_NOT_FOUND_BEHAVIOR}.`,
      serial: normalizedSerial,
    };
  }

  if (itemBsd.centro !== centroCaja) {
    return {
      success: false,
      code: 'CENTER_MISMATCH',
      message: `Serie pertenece al centro ${itemBsd.centro}, pero la caja está asignada a ${centroCaja}.`,
      serial: normalizedSerial,
    };
  }

  const { marca, modelo } = inferirMarcaModeloDesdeMaterial(itemBsd.materialCodigo, itemBsd.materialTexto);
  const valoracion = inferirValoracion(itemBsd.statusSistema);
  const cantidadDisponibleSap = contarMaterialEnCentro(bsdEquipos, itemBsd.materialCodigo, centroCaja);

  return {
    success: true,
    code: 'BASE_ENCONTRADO',
    normalizedSerial,
    materialCodigo: itemBsd.materialCodigo,
    materialTexto: itemBsd.materialTexto,
    centro: itemBsd.centro,
    almacen: itemBsd.almacen,
    lote: itemBsd.lote,
    statusSistema: itemBsd.statusSistema,
    valoracion,
    cantidadDisponibleSap,
    marcaInferida: marca,
    modeloInferido: modelo,
    longitudDigitos: normalizedSerial.length,
  };
}
