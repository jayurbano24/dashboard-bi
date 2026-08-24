/**
 * Catálogo de alias de modelos para unificar variantes históricas
 * a un nombre canónico en reportes, dashboard y despacho.
 */
const MODEL_ALIASES: Array<{ canonical: string; patterns: RegExp[] }> = [
  {
    canonical: 'ZXV10 B866V',
    patterns: [
      /^ZXV10\s*866V2\s*SO\s*ANDROID\s*10$/i,
      /^ZXV10\s*866V2\s*SO\s*ANDROID\s*12$/i,
      /^ZXV10\s*B866V[-\s]*Android$/i,
      /^ZXV10\s*B866V$/i,
      /ZXV10.*866V2.*ANDROID\s*10/i,
      /ZXV10.*866V2.*ANDROID\s*12/i,
      /ZXV10.*B866V.*Android/i,
    ],
  },
];

export function normalizeDeviceModel(raw: string | null | undefined): string {
  const value = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return value;

  for (const alias of MODEL_ALIASES) {
    if (alias.patterns.some((re) => re.test(value))) {
      return alias.canonical;
    }
  }

  return value;
}

export function getModelAliasMap(): Record<string, string> {
  return {
    'ZXV10 866V2 SO ANDROID10': 'ZXV10 B866V',
    'ZXV10 866V2 SO ANDROID12': 'ZXV10 B866V',
    'ZXV10 B866V-Android': 'ZXV10 B866V',
    'ZXV10 B866V': 'ZXV10 B866V',
  };
}
