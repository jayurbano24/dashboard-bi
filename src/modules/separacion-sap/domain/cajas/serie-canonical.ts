import { DOMAIN_ERRORS } from '../shared/constants';
import type { SerieParseResult } from '../../types';

export function parseSerieCanonica(rawInput: unknown, expectedLength = 15): SerieParseResult {
  if (!rawInput || !String(rawInput).trim()) {
    return { ok: false, code: 'INVALID_SERIAL_EMPTY', message: DOMAIN_ERRORS.INVALID_SERIAL_EMPTY };
  }

  const sanitized = String(rawInput).replace(/[\r\n\t]/g, '').trim();

  if (!/^\d+$/.test(sanitized)) {
    return { ok: false, code: 'INVALID_SERIAL_FORMAT', message: DOMAIN_ERRORS.INVALID_SERIAL_FORMAT };
  }

  if (sanitized.length !== Number(expectedLength)) {
    return {
      ok: false,
      code: 'INVALID_SERIAL_LENGTH',
      message: `Serie inválida (${sanitized.length} dígitos). Este modelo requiere exactamente ${expectedLength} dígitos.`,
    };
  }

  return { ok: true, value: sanitized };
}

/** Parseo flexible para flujo guiado (5–30 dígitos numéricos). */
export function parseSerieFlexible(rawInput: unknown): SerieParseResult {
  if (!rawInput || !String(rawInput).trim()) {
    return { ok: false, code: 'INVALID_SERIAL_EMPTY', message: DOMAIN_ERRORS.INVALID_SERIAL_EMPTY };
  }

  const sanitized = String(rawInput).replace(/[\r\n\t]/g, '').trim();
  if (!/^\d+$/.test(sanitized)) {
    return { ok: false, code: 'INVALID_SERIAL_FORMAT', message: DOMAIN_ERRORS.INVALID_SERIAL_FORMAT };
  }
  if (sanitized.length < 5 || sanitized.length > 30) {
    return {
      ok: false,
      code: 'INVALID_SERIAL_LENGTH',
      message: `Serie inválida (${sanitized.length} dígitos). Debe tener entre 5 y 30 dígitos.`,
    };
  }

  return { ok: true, value: sanitized };
}

export function generarNumeroCajaSecuencial(secuencia: number): string {
  return `CAJA-${String(secuencia).padStart(6, '0')}`;
}
