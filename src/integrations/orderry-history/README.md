# Orderry History (timeline scraper / internal API)

**Responsabilidad única:** leer eventos reales de Orderry → normalizar → `order_status_history`.

No calcula fechas del reporte Claro ni escribe columnas derivadas.

## Módulos

| Archivo | Rol |
|---------|-----|
| `types.ts` | Contrato `OrderryTimelineEvent` |
| `september-2026-scope.ts` | Órdenes Claro sept 2026 (`fecha` conduce, como reporte) |
| `persist-status-events.ts` | Insert idempotente vía `insertOrderStatusHistory` |
| `parse-internal-api.ts` | Parser (FASE 3, tras `discover-orderry-history.ts`) |
| `OrderryHistoryClient.ts` | Cliente fetch (FASE 4) |

## Sesión Playwright (login en Orderry)

1. Instalar navegador Chromium de Playwright (una vez):

```bash
npm install
npx playwright install chromium
```

2. En `.env.local` (ajusta la URL si tu tenant no es `app.orderry.com`):

```env
ORDERRY_WEB_BASE_URL=https://app.orderry.com
ORDERRY_PLAYWRIGHT_STORAGE=scripts/.orderry_playwright_storage.json
```

3. Abrir login guiado y guardar cookies/sesión:

```bash
npm run orderry:playwright-login
```

Inicia sesión en la ventana de Chromium que se abre. El script guarda la sesión cuando `/app/check-auth` confirma el login; no hace falta pulsar Enter. El JSON de sesión **no** debe commitearse (está en `.gitignore`).

Alternativa sin archivo: `ORDERRY_WEB_EMAIL` + `ORDERRY_WEB_PASSWORD` en `.env.local` (el discover intentará login automático; 2FA suele requerir el paso guiado).

## Descubrimiento

```bash
npm run orderry:discover-history -- TCGT-548123
npm run orderry:discover-history -- TCGT-548123 --headed
```

## Alcance septiembre 2026

```ts
import { listClaroOrdersForSeptember2026 } from '@/integrations/orderry-history';
```
