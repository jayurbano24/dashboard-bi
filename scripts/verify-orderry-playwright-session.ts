/**
 * Comprueba si hay sesión Playwright guardada y si Orderry la acepta.
 *
 *   npm run orderry:verify-session
 */
import { loadEnv } from './lib/load-env';
import { resolveOrderryPlaywrightStorage, DEFAULT_ORDERRY_PLAYWRIGHT_STORAGE } from './lib/orderry-playwright-storage';

async function main() {
  let env: Record<string, string> = {};
  try {
    env = loadEnv();
  } catch {
    console.warn('Sin .env.local; usando defaults.');
  }

  const storagePath = resolveOrderryPlaywrightStorage(env.ORDERRY_PLAYWRIGHT_STORAGE);
  if (!storagePath) {
    console.error('No hay archivo de sesión.');
    console.error(`Esperado: ${DEFAULT_ORDERRY_PLAYWRIGHT_STORAGE}`);
    console.error('Ejecuta: npm run orderry:playwright-login');
    process.exit(1);
  }

  console.log(`Storage: ${storagePath}`);

  const playwright = await import('playwright');
  const baseUrl = (env.ORDERRY_WEB_BASE_URL || 'https://app.orderry.com').replace(/\/$/, '');
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--disable-extensions'],
  });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/app/check-auth`, { waitUntil: 'networkidle', timeout: 60_000 });

  const auth = await page.evaluate(async () => {
    const r = await fetch('/app/check-auth', { credentials: 'include' });
    return r.json() as Promise<{ isAuthenticated?: boolean; isStaff?: boolean }>;
  });

  console.log(`check-auth: ${JSON.stringify(auth)}`);
  if (auth.isAuthenticated) {
    console.log('OK — puedes correr: npm run orderry:discover-history -- TCGT-548123');
  } else {
    console.log('Sesión inválida o expirada. Vuelve a: npm run orderry:playwright-login');
  }

  await browser.close();
  process.exit(auth.isAuthenticated ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
