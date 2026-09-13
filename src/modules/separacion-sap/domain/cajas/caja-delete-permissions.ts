import type { EstadoCaja } from '../../types';

/** Único correo con permiso explícito además del perfil Gerente General. */
export const CAJA_DELETE_CLOSED_ALLOWED_EMAIL = 'gurbano@techcommwireless.com';

export const CAJA_DELETE_CLOSED_JOB_TITLE = 'Gerente General';

export function normalizePerfilLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function isGerenteGeneralProfile(jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false;
  return normalizePerfilLabel(jobTitle) === normalizePerfilLabel(CAJA_DELETE_CLOSED_JOB_TITLE);
}

export function canDeleteClosedCaja(params: {
  email?: string | null;
  jobTitle?: string | null;
}): boolean {
  const email = params.email?.trim().toLowerCase() ?? '';
  if (email === CAJA_DELETE_CLOSED_ALLOWED_EMAIL.toLowerCase()) return true;
  return isGerenteGeneralProfile(params.jobTitle);
}

export function puedeMostrarEliminarCaja(estado: EstadoCaja, canDeleteClosed: boolean): boolean {
  if (estado === 'ABIERTA') return true;
  if (estado === 'CERRADA') return canDeleteClosed;
  return false;
}

export function readJobTitleFromMetadata(meta: Record<string, unknown>): string | null {
  const candidates = [meta.job_title, meta.profile, meta.cargo, meta.perfil];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
