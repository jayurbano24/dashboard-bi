import fs from 'node:fs';
import path from 'node:path';

export function loadEnv(file = '.env.local'): Record<string, string> {
  const envPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(envPath)) {
    throw new Error(`No se encontró ${file}`);
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const i = line.indexOf('=');
        let value = line.slice(i + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [line.slice(0, i).trim(), value];
      }),
  );
}

export function requireEnv(keys: string[], env = loadEnv()): Record<string, string> {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables en .env.local: ${missing.join(', ')}`);
  }
  return env;
}
