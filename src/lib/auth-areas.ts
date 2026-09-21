/** Áreas/módulos asignables por rol en admin. */
export const APP_AREAS = [
  'Gerencial',
  'Backoffice',
  'Taller',
  'Bodega',
  'Calidad',
  'ERP Xiaomi',
  'Bono Técnico',
  'Despacho',
  'Separación SAP',
] as const;

export type AppArea = (typeof APP_AREAS)[number];

export function isAppArea(value: string): value is AppArea {
  return (APP_AREAS as readonly string[]).includes(value);
}

export function normalizeAppAreas(areas: string[]): AppArea[] {
  return [...new Set(areas)].filter(isAppArea);
}
