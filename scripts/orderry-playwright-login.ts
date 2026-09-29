/**
 * Abre Chromium (Playwright) para que inicies sesión en Orderry y guarda la sesión en disco.
 * No imprime contraseñas. El archivo de sesión contiene cookies — mantener fuera de git.
 *
 *   npm run orderry:playwright-login
 *
 * La ventana se queda abierta hasta que /app/check-auth diga isAuthenticated.
 * No hace falta pulsar Enter (un Enter accidental cerraba Chromium en la pantalla de login).
 *
 * .env.local:
 *   ORDERRY_WEB_BASE_URL=https://app.orderry.com
 *   ORDERRY_PLAYWRIGHT_STORAGE=scripts/.orderry_playwright_storage.json
 */
import fs from 'node:fs';
import path from 'node:path';

function loadEnvOptional(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
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

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

async function readAuthenticated(page: import('playwright').Page): Promise<boolean> {
  if (page.url().includes('/login')) return false;
  try {
    const auth = await page.evaluate(async () => {
      const response = await fetch('/app/check-auth', { credentials: 'include' });
      if (!response.ok) return { isAuthenticated: false as boolean };
      return (await response.json()) as { isAuthenticated?: boolean };
    });
    return auth.isAuthenticated === true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Cargando Playwright…');
  const env = loadEnvOptional();
  const baseUrl = (env.ORDERRY_WEB_BASE_URL || process.env.ORDERRY_WEB_BASE_URL || 'https://app.orderry.com').replace(
    /\/$/,
    '',
  );
  const storageRel =
    env.ORDERRY_PLAYWRIGHT_STORAGE
    || process.env.ORDERRY_PLAYWRIGHT_STORAGE
    || 'scripts/.orderry_playwright_storage.json';
  const storagePath = path.resolve(process.cwd(), storageRel);

  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Instala Playwright primero:\n  npm install\n  npx playwright install chromium');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  console.log('Abriendo Chromium (sin extensiones)...');
  console.log(`URL base: ${baseUrl}`);
  console.log(`Sesión se guardará en: ${storagePath}\n`);

  const browser = await playwright.chromium.launch({
    headless: false,
    args: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--start-maximized',
    ],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const loginUrl = env.ORDERRY_WEB_LOGIN_URL || `${baseUrl}/login`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.bringToFront();

  console.log('Chromium está abierto. Inicia sesión en ESA ventana (no en Chrome normal).');
  console.log('Cuando veas el dashboard, este script guarda la sesión solo. No pulses Enter.\n');

  const started = Date.now();
  let lastLog = 0;
  let authenticated = false;
  while (Date.now() - started < LOGIN_TIMEOUT_MS) {
    authenticated = await readAuthenticated(page);
    if (authenticated) break;
    if (Date.now() - lastLog > 8_000) {
      const secs = Math.round((Date.now() - started) / 1000);
      console.log(`Esperando login (${secs}s). URL: ${page.url()}`);
      lastLog = Date.now();
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  if (!authenticated) {
    console.error('\nNo se detectó sesión. La ventana seguía en login o check-auth=false.');
    console.error('Vuelve a ejecutar este comando e inicia sesión en la ventana de Chromium.');
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: storagePath });
  console.log(`\nSesión guardada: ${storagePath}`);
  console.log('Siguiente paso: npm run orderry:verify-session');

  await browser.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
