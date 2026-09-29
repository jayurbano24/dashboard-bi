# Orderry Timeline — API interna (confirmado discover)

## Endpoint Event Feed (Work Order)

| Campo | Valor |
|-------|--------|
| **URL** | `GET https://app.orderry.com/app/event-log/get-object-events` |
| **Query** | `object_id={order_internal_id}` · `context_type=2` (orden / work order) |
| **Método** | GET |
| **Content-Type** | `application/json; charset=utf-8` |
| **Auth** | Sesión web (cookies) + headers SPA (`x-csrftoken`, `x-branch-id`, `x-version`, `Referer`) |
| **Paginación** | Por confirmar en UI con órdenes muy largas (respuesta observada: array JSON) |

### No confundir con

| URL | Rol |
|-----|-----|
| `POST /app/orders/json/get-orders` | Listado grilla |
| `GET /app/orders/json/get-order?id=` | Detalle de una orden |
| `GET /app/orders/{id}/checklist-templates` | Plantillas checklist |
| `storage.orderry.com` XML `AccessDenied` | Adjuntos/CDN, no timeline |

## Ejemplo sanitizado de respuesta

```json
[
  {
    "metadata": {
      "order": { "id": 21892185, "name": "TCGT-544330", "type": 168926 },
      "client": { "id": 14723598, "fullname": "SERVITOTAL" },
      "status": { "id": 1297326 }
    },
    "created_at": 1790627959000,
    "event_type": 28,
    "employee_id": 149216,
    "branch_id": 99393,
    "context_type": 2,
    "company_id": 88547,
    "context_object_id": 21892185,
    "created_by_id": 149216,
    "is_visible": true
  }
]
```

- `created_at`: epoch **ms** (confirmar en más eventos).
- `metadata.status.id`: id de estado Orderry (mapear a nombre vía catálogo existente).
- `event_type`: código de tipo de evento (mapear a etiqueta visible en UI).

## Resolución `object_id`

- En UI: id numérico interno (ej. `21892185`), no siempre igual al número `548123` del label `TCGT-548123`.
- Discover resuelve label → id vía **`GET /v2/orders?numbers=TCGT-548123`** (API pública + `ORDERRY_API_KEY`).

## Parser (pendiente)

Implementar en `parse-internal-api.ts` solo cuando se valide con una WO completa (múltiples cambios de estado visibles en UI).

Reglas scraper: solo persistir eventos con timestamp + status reales del array; no inferir desde `get-order` ni checklist.
