# Sistema de Seguimiento de Movimientos de Técnicos

Este sistema registra todos los movimientos que realiza cada técnico en cada orden de servicio, permitiendo generar reportes detallados de actividades diarias.

## 📋 Características

- **Registro automático**: Los cambios de estado en Orderry se registran automáticamente como movimientos
- **Registro manual**: Los técnicos pueden registrar movimientos manualmente via API
- **Tracking geográfico**: Opcional, incluye latitud/longitud
- **Reportes diarios**: Genera resúmenes de actividad por técnico y por día
- **Integración con Google Sheets**: Todos los datos se guardan en una hoja de cálculo

## 🔄 Tipos de Movimientos

```typescript
'ASSIGNED'      // Orden asignada al técnico
'IN_PROGRESS'   // Técnico comenzó a trabajar
'PAUSE'         // Técnico pausó el trabajo
'RESUME'        // Técnico reanudó el trabajo
'COMPLETED'     // Técnico completó la orden
'TRANSFER'      // Se transfiere a otro técnico
'ON_SITE'       // Técnico llegó al sitio
'DIAGNOSIS'     // Comenzó diagnóstico
'REPAIR'        // Comenzó reparación
'QC_CHECK'      // Control de calidad
'DELIVERY'      // Entrega al cliente
'ISSUE'         // Problema/Incidencia
```

## 📡 API Endpoints

### 1. Registrar un Movimiento

**POST** `/api/technician-movements`

Registra manualmente un nuevo movimiento de técnico.

**Request:**
```bash
curl -X POST http://localhost:3000/api/technician-movements \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "541015",
    "order_name": "TCGT-541015",
    "technician_id": "TECH-001",
    "technician_name": "Juan Pérez",
    "movement_type": "IN_PROGRESS",
    "timestamp": "2026-04-20T14:30:00Z",
    "notes": "Iniciando diagnóstico del equipo",
    "tenant_id": "GT",
    "location": {
      "latitude": 9.9281,
      "longitude": -84.0907,
      "address": "San José, Centro"
    },
    "duration_minutes": 30
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Movimiento registrado exitosamente",
  "data": {
    "order_id": "541015",
    "order_name": "TCGT-541015",
    "technician_id": "TECH-001",
    "technician_name": "Juan Pérez",
    "movement_type": "IN_PROGRESS",
    "timestamp": "2026-04-20T14:30:00Z",
    "tenant_id": "GT"
  }
}
```

---

### 2. Obtener Movimientos por Día

**GET** `/api/technician-movements?date=2026-04-20&tenant_id=GT`

Obtiene todos los movimientos de un día específico, agrupados por técnico.

**Parámetros:**
- `date` (requerido): Fecha en formato `YYYY-MM-DD`
- `tenant_id` (opcional): `GT` o `CR` para filtrar por sede
- `technician_id` (opcional): Para obtener solo movimientos de un técnico

**Response:**
```json
{
  "date": "2026-04-20",
  "tenant_id": "GT",
  "total_movements": 24,
  "technicians_count": 3,
  "technicians": [
    {
      "technician_id": "TECH-001",
      "technician_name": "Juan Pérez",
      "movements": [
        {
          "order_id": "541015",
          "order_name": "TCGT-541015",
          "technician_id": "TECH-001",
          "technician_name": "Juan Pérez",
          "movement_type": "ASSIGNED",
          "timestamp": "2026-04-20T08:00:00Z",
          "date": "20/04/2026",
          "time": "08:00:00 AM",
          "notes": "Orden asignada",
          "tenant_id": "GT"
        },
        {
          "order_id": "541015",
          "order_name": "TCGT-541015",
          "technician_id": "TECH-001",
          "technician_name": "Juan Pérez",
          "movement_type": "ON_SITE",
          "timestamp": "2026-04-20T09:30:00Z",
          "date": "20/04/2026",
          "time": "09:30:00 AM",
          "notes": "Llegada al sitio del cliente",
          "latitude": "9.9281",
          "longitude": "-84.0907",
          "address": "San José, Centro",
          "tenant_id": "GT"
        }
      ],
      "total_movements": 8,
      "orders_count": 4
    }
  ]
}
```

---

### 3. Obtener Reporte Diario

**GET** `/api/technician-movements/daily-report?date=2026-04-20&tenant_id=GT`

Genera un reporte detallado de actividades del día con estadísticas por técnico.

**Response:**
```json
{
  "date": "2026-04-20",
  "tenant_id": "GT",
  "total_movements": 24,
  "unique_technicians": 3,
  "unique_orders": 8,
  "completed_orders_today": 5,
  "completion_rate": "62%",
  "movement_types_distribution": {
    "ASSIGNED": 8,
    "ON_SITE": 8,
    "DIAGNOSIS": 6,
    "REPAIR": 8,
    "COMPLETED": 5,
    "DELIVERY": 5,
    "PAUSE": 2,
    "ISSUE": 1
  },
  "summary": [
    {
      "technician_id": "TECH-001",
      "technician_name": "Juan Pérez",
      "tenant_id": "GT",
      "total_movements": 10,
      "total_orders": 4,
      "completed_orders": 3,
      "in_progress_orders": 1,
      "total_active_hours": 7.5,
      "movement_types": {
        "ASSIGNED": 4,
        "ON_SITE": 4,
        "DIAGNOSIS": 3,
        "REPAIR": 4,
        "COMPLETED": 3,
        "DELIVERY": 3
      },
      "first_movement": "2026-04-20T08:00:00Z",
      "last_movement": "2026-04-20T17:30:00Z",
      "work_duration_hours": 9.5
    }
  ]
}
```

---

## 🔗 Obtener Resumen de Técnico

**GET** `/api/technician-movements?date=2026-04-20&technician_id=TECH-001&tenant_id=GT`

Obtiene un resumen específico de un técnico para un día.

**Response:**
```json
{
  "date": "2026-04-20",
  "technician_id": "TECH-001",
  "technician_name": "Juan Pérez",
  "tenant_id": "GT",
  "total_orders": 4,
  "completed_orders": 3,
  "orders_in_progress": 1,
  "total_active_hours": 7.5,
  "movements_count": 10,
  "movements": [
    {
      "order_id": "541015",
      "order_name": "TCGT-541015",
      "technician_id": "TECH-001",
      "technician_name": "Juan Pérez",
      "movement_type": "ASSIGNED",
      "timestamp": "2026-04-20T08:00:00Z",
      "date": "20/04/2026",
      "time": "08:00:00 AM",
      "notes": "Orden asignada",
      "tenant_id": "GT"
    }
  ]
}
```

---

## 📊 Google Sheets Integration

Todos los movimientos se guardan automáticamente en una hoja de Google Sheets llamada **"Movimientos Técnicos"** con las siguientes columnas:

| Columna | Descripción |
|---------|-------------|
| Fecha | Fecha del movimiento (DD/MM/YYYY) |
| Hora | Hora del movimiento (HH:MM:SS) |
| Orden ID | ID de la orden en Orderry |
| Orden Nombre | Nombre legible (ej: TCGT-541015) |
| Técnico ID | Identificador único del técnico |
| Técnico Nombre | Nombre completo del técnico |
| Tipo Movimiento | Tipo de movimiento (ASSIGNED, IN_PROGRESS, etc) |
| Notas | Observaciones/detalles |
| Latitud | Coordenada geográfica (opcional) |
| Longitud | Coordenada geográfica (opcional) |
| Dirección | Dirección del sitio (opcional) |
| Sede | Sede (GT o CR) |
| Duración (min) | Minutos de duración (opcional) |
| Timestamp ISO | Timestamp completo ISO 8601 |

---

## 🔐 Variables de Entorno Requeridas

```env
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_SHEET_ID=1parq_eAadR7i6em9gwj5rCQTRJApdj3N0ELFV5LnSSM

# Orderry
ORDERRY_API_KEY=tu_api_key_orderry
ORDERRY_API_URL=https://api.orderry.com
ORDERRY_WEBHOOK_SECRET=secret_orderry_key_123
```

---

## 📱 Ejemplo Completo: Cliente Mobile/App

```typescript
// Técnico llega al sitio
async function reportArrival(orderId: string, technicianId: string) {
  const response = await fetch('/api/technician-movements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId,
      order_name: `TCGT-${orderId}`,
      technician_id: technicianId,
      technician_name: 'Juan Pérez',
      movement_type: 'ON_SITE',
      timestamp: new Date().toISOString(),
      notes: 'Llegada al sitio',
      tenant_id: 'GT',
      location: {
        latitude: 9.9281,
        longitude: -84.0907
      }
    })
  });
  return response.json();
}

// Técnico comienza diagnóstico
async function startDiagnosis(orderId: string, technicianId: string) {
  const response = await fetch('/api/technician-movements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId,
      order_name: `TCGT-${orderId}`,
      technician_id: technicianId,
      technician_name: 'Juan Pérez',
      movement_type: 'DIAGNOSIS',
      timestamp: new Date().toISOString(),
      notes: 'Iniciando diagnóstico del equipo',
      tenant_id: 'GT',
      duration_minutes: 45
    })
  });
  return response.json();
}

// Obtener actividad del día
async function getDailyReport(date: string, tenantId: string = 'GT') {
  const response = await fetch(
    `/api/technician-movements/daily-report?date=${date}&tenant_id=${tenantId}`
  );
  return response.json();
}
```

---

## 🎯 Casos de Uso

### 1. Dashboard de Actividad en Tiempo Real
Monitorear qué técnico está haciendo qué en cada momento del día.

### 2. Reportes de Productividad
Ver cuántas órdenes completó cada técnico y en cuánto tiempo.

### 3. Análisis de Tiempos
Identificar cuellos de botella en diagnóstico vs reparación vs QC.

### 4. Geolocalización
Rastrear ubicación de técnicos durante el día de trabajo.

### 5. Facturación por Actividad
Generar facturas basadas en movimientos y duración de trabajo.

---

## ⚙️ Automáticamente Registrado

El sistema registra automáticamente movimientos cuando:
- ✅ Una orden cambia de estado en Orderry (via webhook)
- ✅ Se registra un movimiento manualmente via API

---

## 🚀 Próximos Pasos

1. Integrar en tu app mobile de técnicos
2. Crear dashboard de visualización
3. Generar reportes PDF diarios
4. Implementar alertas si técnico no registra movimiento

