/** Normaliza nombres de estado Orderry para comparación (sin acentos, mayúsculas). */
export function normalizeEstadoLabel(estado: string | null | undefined): string {
  return String(estado ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
