# Investigación: XML `AccessDenied` vs Timeline Orderry

## Hallazgo sobre el JSON actual en repo

Archivo analizado: `scripts/output/orderry-history-discovery-TCGT-548123.json` (2026-09-28).

| Hecho | Evidencia |
|-------|-----------|
| **No hay** requests 401/403 con XML `AccessDenied` en ese archivo | `npm run orderry:analyze-discovery` |
| Sesión **no autenticada** | `"auth": "none"`, `GET /app/check-auth` → `isAuthenticated: false` |
| Redirect a login | URLs de analytics con `dl=.../login`, título "Sign in \| Orderry" |
| **No se cargó** la Work Order ni Event Feed | Solo settings/env, i18n en `storage.orderry.com/static/i18n/...`, trackers |
| `interesting[]` **no es timeline** | `/app/settings/env` (config), `base.json` (traducciones) |

**Conclusión:** el XML `AccessDenied` que viste **no proviene de este artefacto guardado**. Suele aparecer en:

1. **Chrome con extensiones** (`chrome-extension://…/activeContentBlocker.js`) — ignorar.
2. **URL firmada a storage/S3** (adjunto, PDF, imagen) sin cookie/firma válida en el contexto del fetch.
3. **Corrida con sesión parcial** distinta a la del JSON commiteado.

---

## Qué es el XML `AccessDenied` (patrón AWS S3)

```xml
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
  ...
</Error>
```

| Campo típico | Significado |
|--------------|-------------|
| `Content-Type: application/xml` | Respuesta S3/compatibles, no API JSON de Orderry |
| Host `storage.orderry.com` o `*.amazonaws.com` | CDN/storage, no `/app/...` |
| Status 403 | Firma expirada, bucket privado, o fetch sin sesión |

### ¿Es la Timeline?

| Escenario | Clasificación |
|-----------|----------------|
| URL contiene `/static/i18n/` | **C** — traducciones (200 en nuestro JSON) |
| URL es download/file/presigned | **B** — adjunto/documento |
| URL tipo `/app/.../orders/.../events` + XML | **A sospechoso** — raro; API Orderry suele ser JSON |
| Initiator `chrome-extension://` | **Extensión** — no Orderry |

**Regla:** no implementar parser sobre XML `AccessDenied`. Buscar JSON estructurado bajo `app.orderry.com` (o GraphQL) que liste cambios de estado con timestamps.

---

## Arquitectura probable (Orderry)

```text
Orderry SPA (app.orderry.com)
   ↓ fetch autenticado (cookies / token refresh)
API interna JSON (timeline / order detail)
   ↓ opcional
STORAGE_URL (storage.orderry.com) — assets, i18n, adjuntos firmados
   ↓
S3 — AccessDenied si se pide la URL firmada fuera de sesión o expirada
```

Los eventos históricos para `order_status_history` deben salir de la **API JSON**, no del blob S3.

---

## Headers / sesión (sin guardar valores)

Tras login web exitoso, las llamadas a `/app/*` suelen llevar (nombres):

- `Cookie` (sesión)
- Posible `Authorization` / token de app tras `/app/token/refresh`
- `Referer` / `Origin` hacia `app.orderry.com`
- CSRF si aplica en POST

**Playwright:** exportar `storageState` con `ORDERRY_PLAYWRIGHT_STORAGE` desde perfil **sin extensiones**.

---

## Comandos

```bash
# Re-analizar JSON existente
npm run orderry:analyze-discovery

# Nueva captura (requiere storage state o credenciales)
npm run orderry:discover-history -- TCGT-548123
```

Salida incluye `timeline.summary`, `access_denied_requests`, `access_denied_neighbors`, `json_event_candidates`.

---

## Criterio para avanzar a parser

Solo cuando `timeline.summary` tenga:

- `timeline_request_found: SI`
- `contains_events: SI` o `contains_status_labels: SI` (p. ej. EN REPARACIÓN)
- `access_denied_is_timeline: NO` para la request elegida
