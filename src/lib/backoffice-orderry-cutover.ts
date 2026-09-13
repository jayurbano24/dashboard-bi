/** Orderry reemplazó al sistema anterior a partir de la 2ª semana de febrero 2026. */
const DEFAULT_ORDERRY_CUTOVER = '2026-02-08';

function parseCutoverDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 0, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getOrderryCutoverDate(): Date {
  const raw = process.env.BACKOFFICE_ORDERRY_CUTOVER_DATE || DEFAULT_ORDERRY_CUTOVER;
  return parseCutoverDate(raw) ?? parseCutoverDate(DEFAULT_ORDERRY_CUTOVER)!;
}

export function getOrderryCutoverDateIso(): string {
  const d = getOrderryCutoverDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatOrderryCutoverLabel(locale = 'es-GT'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(getOrderryCutoverDate());
}

export function isOnOrAfterOrderryCutover(dateValue: string | null | undefined): boolean {
  if (!dateValue) return false;

  const rowDate = new Date(dateValue);
  if (Number.isNaN(rowDate.getTime())) return false;

  return rowDate.getTime() >= getOrderryCutoverDate().getTime();
}
