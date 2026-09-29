import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_ORDERRY_PLAYWRIGHT_STORAGE = path.resolve(
  process.cwd(),
  'scripts/.orderry_playwright_storage.json',
);

/** Ruta absoluta al storageState si existe (env o default del repo). */
export function resolveOrderryPlaywrightStorage(envPath?: string): string | null {
  const candidates: string[] = [];
  if (envPath?.trim()) {
    candidates.push(path.resolve(process.cwd(), envPath.trim()));
  }
  candidates.push(DEFAULT_ORDERRY_PLAYWRIGHT_STORAGE);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}
