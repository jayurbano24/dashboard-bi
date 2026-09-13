import { BusinessCalendarEngine } from '@/modules/report-engine/domain/BusinessCalendarEngine';
import { CatalogEngine } from '@/modules/report-engine/domain/CatalogEngine';

export type GamNoGam = 'GAM' | 'NO GAM';

const catalog = new CatalogEngine();
const businessCalendar = new BusinessCalendarEngine();

/** Misma jornada que Claro Mensual (49 h / 5 días). */
const CLARO_BUSINESS_HOURS_PER_DAY = 9.8;

export const CLARO_SLA_TARGET_DAYS: Record<GamNoGam, number> = {
  GAM: 4,
  'NO GAM': 2,
};

export const resolveAgencyPrefixFromCanal = (canal: string): string => {
  const prefixMatch = canal.match(/^([A-Za-z0-9]+)/);
  return prefixMatch ? prefixMatch[1].toUpperCase() : '';
};

export const resolveGamNoGamFromCanal = (canal: string): GamNoGam => {
  const agencyPrefix = resolveAgencyPrefixFromCanal(canal);
  const region = catalog.getRegion(agencyPrefix);
  return catalog.isGam(region) ? 'GAM' : 'NO GAM';
};

export const getClaroSlaTargetDays = (gamNoGam: GamNoGam): number => CLARO_SLA_TARGET_DAYS[gamNoGam];

export const getClaroSlaBusinessDays = (startDate: Date, endDate: Date): number => {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return 0;
  }

  const workingMinutes = businessCalendar.calculateWorkingMinutes(startDate, endDate);
  return Number(((workingMinutes / 60) / CLARO_BUSINESS_HOURS_PER_DAY).toFixed(1));
};

export const formatClaroSlaTargetLabel = (gamNoGam: GamNoGam): string =>
  `${CLARO_SLA_TARGET_DAYS[gamNoGam]} días (${gamNoGam})`;
