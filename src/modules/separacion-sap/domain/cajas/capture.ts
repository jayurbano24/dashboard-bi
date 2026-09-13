import { capturasPorSubgrupo, subgrupoPorId, totalesCaja } from './caja-utils';
import { DOMAIN_ERRORS, ESTADOS_CAJA } from '../shared/constants';
import { buscarDuplicadoSerie, mensajeDuplicadoSerie } from './serie-lookup';
import { parseSerieCanonica } from './serie-canonical';
import type { BsdEquipo, CajaEntidad, CaptureResult } from '../../types';

export function ejecutarCapturaSerieTransaccional(params: {
  cajas: CajaEntidad[];
  bsdEquipos: BsdEquipo[];
  cajaId: string;
  subgrupoId?: string;
  rawSerial: string;
  rawSerialS2?: string | null;
  userId?: string;
}): CaptureResult {
  const { cajas, bsdEquipos, cajaId, subgrupoId, rawSerial, rawSerialS2 = null, userId } = params;
  const caja = cajas.find((item) => item.id === cajaId);

  if (!caja) {
    return { success: false, code: 'BOX_NOT_FOUND', message: 'Caja no encontrada.' };
  }
  if (caja.estado !== ESTADOS_CAJA.ABIERTA) {
    return { success: false, code: 'BOX_NOT_OPEN', message: DOMAIN_ERRORS.BOX_NOT_OPEN };
  }
  if (caja.subgrupos.length === 0) {
    return { success: false, code: 'NO_SUBGRUPOS', message: 'La caja no tiene Sub-Grupos configurados.' };
  }

  const { cantidadEsperada, cantidadCapturada } = totalesCaja(caja);
  if (cantidadCapturada >= cantidadEsperada) {
    return { success: false, code: 'BOX_QUANTITY_REACHED', message: DOMAIN_ERRORS.BOX_QUANTITY_REACHED };
  }
  if (bsdEquipos.length === 0) {
    return { success: false, code: 'SAP_NOT_LOADED', message: DOMAIN_ERRORS.SAP_NOT_LOADED };
  }

  let targetSubgrupo = subgrupoId ? subgrupoPorId(caja, subgrupoId) : undefined;
  if (subgrupoId && !targetSubgrupo) {
    return { success: false, code: 'SUBGRUPO_NOT_FOUND', message: 'Sub-Grupo no encontrado en esta caja.' };
  }

  const expectedDigits = targetSubgrupo?.longitudDigitos || 15;
  const parseResultS1 = parseSerieCanonica(rawSerial, expectedDigits);
  if (!parseResultS1.ok) {
    return {
      success: false,
      code: parseResultS1.code,
      message: parseResultS1.message,
      serial: rawSerial,
    };
  }
  const s1Normalized = parseResultS1.value;

  const itemBsdProbe = bsdEquipos.find((item) => item.normalizedSerial === s1Normalized);
  if (!targetSubgrupo && itemBsdProbe) {
    targetSubgrupo = caja.subgrupos.find(
      (sg) =>
        sg.materialCodigo === itemBsdProbe.materialCodigo &&
        capturasPorSubgrupo(caja, sg.id) < sg.cantidadEsperada,
    );
  }

  if (!targetSubgrupo) {
    return {
      success: false,
      code: 'SUBGRUPO_REQUIRED',
      message: 'Seleccione el Sub-Grupo activo o escanee una serie cuyo material coincida con un Sub-Grupo pendiente.',
    };
  }

  const capturasEnSubgrupo = capturasPorSubgrupo(caja, targetSubgrupo.id);
  if (capturasEnSubgrupo >= targetSubgrupo.cantidadEsperada) {
    return {
      success: false,
      code: 'SUBGRUPO_QUANTITY_REACHED',
      message: `El Sub-Grupo ${targetSubgrupo.materialCodigo} ya alcanzó su cantidad esperada (${targetSubgrupo.cantidadEsperada}).`,
    };
  }

  let s2Normalized: string | null = null;
  if (targetSubgrupo.esquemaSeries === 'S1_S2') {
    if (!rawSerialS2) {
      return { success: false, code: 'MISSING_S2', message: 'Este modelo requiere registrar S-2 (Serie Secundaria).' };
    }
    const parseResultS2 = parseSerieCanonica(rawSerialS2, expectedDigits);
    if (!parseResultS2.ok) {
      return {
        success: false,
        code: parseResultS2.code,
        message: `S-2: ${parseResultS2.message}`,
        serial: rawSerialS2,
      };
    }
    s2Normalized = parseResultS2.value;
    if (s1Normalized === s2Normalized) {
      return { success: false, code: 'S1_S2_IDENTICAL', message: DOMAIN_ERRORS.S1_S2_IDENTICAL };
    }
  }

  const yaEnEstaCaja = caja.capturas.find(
    (cap) => cap.normalizedSerial === s1Normalized || (s2Normalized && cap.normalizedSerialS2 === s2Normalized),
  );
  if (yaEnEstaCaja) {
    const sgDup = yaEnEstaCaja.subgrupoId ? subgrupoPorId(caja, yaEnEstaCaja.subgrupoId) : undefined;
    const subgrupoLabel = sgDup
      ? `Sub-Grupo ${sgDup.materialCodigo} (${sgDup.materialTexto})`
      : `material ${yaEnEstaCaja.materialCodigo}`;
    return {
      success: false,
      code: 'DUPLICATE_SERIAL',
      message: `Serie ${s1Normalized} ya registrada en esta caja, ${subgrupoLabel}.`,
      serial: s1Normalized,
    };
  }

  const duplicadoGlobal = buscarDuplicadoSerie(cajas, s1Normalized, cajaId);
  if (duplicadoGlobal) {
    return {
      success: false,
      code: 'SERIAL_ALREADY_ASSIGNED',
      message: mensajeDuplicadoSerie(duplicadoGlobal),
      serial: s1Normalized,
    };
  }

  const itemBsdFinal = bsdEquipos.find((item) => item.normalizedSerial === s1Normalized);
  if (!itemBsdFinal) {
    return { success: false, code: 'BASE_NOT_FOUND', message: DOMAIN_ERRORS.BASE_NOT_FOUND, serial: s1Normalized };
  }
  if (itemBsdFinal.centro !== caja.centro) {
    return {
      success: false,
      code: 'CENTER_MISMATCH',
      message: `El Centro de la serie (${itemBsdFinal.centro}) no coincide con el Centro de la caja (${caja.centro}).`,
      serial: s1Normalized,
    };
  }
  if (itemBsdFinal.materialCodigo !== targetSubgrupo.materialCodigo) {
    return {
      success: false,
      code: 'MATERIAL_MISMATCH',
      message: `El material de la serie (${itemBsdFinal.materialCodigo}) no corresponde al Sub-Grupo activo (${targetSubgrupo.materialCodigo} — ${targetSubgrupo.marca} ${targetSubgrupo.modelo}).`,
      serial: s1Normalized,
    };
  }

  return {
    success: true,
    code: 'BASE_ENCONTRADO',
    message: 'La serie existe en SAP y fue capturada con éxito.',
    subgrupoId: targetSubgrupo.id,
    captura: {
      id: `CAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cajaId,
      subgrupoId: targetSubgrupo.id,
      normalizedSerial: s1Normalized,
      normalizedSerialS2: s2Normalized,
      esquemaSeries: targetSubgrupo.esquemaSeries,
      materialCodigo: itemBsdFinal.materialCodigo,
      materialTexto: itemBsdFinal.materialTexto || targetSubgrupo.materialTexto,
      centro: itemBsdFinal.centro,
      almacen: itemBsdFinal.almacen,
      lote: itemBsdFinal.lote,
      statusBsd: itemBsdFinal.statusSistema,
      statusCaptura: 'BASE_ENCONTRADO',
      capturedAt: new Date().toISOString(),
      capturedBy: userId || 'OPERADOR_01',
    },
  };
}
