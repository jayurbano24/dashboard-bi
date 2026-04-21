import { z } from 'zod';

// Tipos de movimientos que puede hacer un técnico
export const MovementTypeEnum = z.enum([
  'ASSIGNED',      // Orden asignada al técnico
  'IN_PROGRESS',   // Técnico comenzó a trabajar
  'PAUSE',         // Técnico pausó el trabajo
  'RESUME',        // Técnico reanudó el trabajo
  'COMPLETED',     // Técnico completó la orden
  'TRANSFER',      // Se transfiere a otro técnico
  'ON_SITE',       // Técnico llegó al sitio
  'DIAGNOSIS',     // Comenzó diagnóstico
  'REPAIR',        // Comenzó reparación
  'QC_CHECK',      // Control de calidad
  'DELIVERY',      // Entrega al cliente
  'ISSUE',         // Problema/Incidencia
]);

export type MovementType = z.infer<typeof MovementTypeEnum>;

// Schema para un movimiento individual de un técnico
export const TechnicianMovementSchema = z.object({
  id: z.string().optional(),
  order_id: z.string(),           // ID de la orden de servicio
  order_name: z.string(),         // Nombre legible de la orden (ej: TCGT-541015)
  technician_id: z.string(),      // ID único del técnico
  technician_name: z.string(),    // Nombre del técnico
  movement_type: MovementTypeEnum,
  timestamp: z.string().datetime(),
  notes: z.string().optional().nullable(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
  tenant_id: z.enum(['GT', 'CR']),
  duration_minutes: z.number().optional().nullable(), // Para pausas/retrasos
});

export type TechnicianMovement = z.infer<typeof TechnicianMovementSchema>;

// Para crear un movimiento (sin id)
export const CreateTechnicianMovementSchema = TechnicianMovementSchema.omit({ id: true });

// Resumen de movimientos por técnico por día
export const DailyTechnicianSummarySchema = z.object({
  date: z.string(),
  technician_id: z.string(),
  technician_name: z.string(),
  tenant_id: z.enum(['GT', 'CR']),
  total_orders: z.number(),
  completed_orders: z.number(),
  orders_in_progress: z.number(),
  total_active_hours: z.number(),
  movements_count: z.number(),
  movements: z.array(TechnicianMovementSchema),
});

export type DailyTechnicianSummary = z.infer<typeof DailyTechnicianSummarySchema>;
