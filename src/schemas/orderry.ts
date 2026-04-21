import { z } from 'zod';

// Esquema para el Webhook Real de Orderry (Order.Status.Changed)
export const OrderryWebhookSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  event_name: z.string(),
  context: z.object({
    object_id: z.number(),
    object_type: z.string(),
  }),
  metadata: z.object({
    new: z.object({ id: z.number() }),
    old: z.object({ id: z.number() }).nullable().optional(),
    order: z.object({
      id: z.number(),
      name: z.string(), // Ej: "TCGT-541015" (Permite inferir "GT" o "CR")
    }),
  }),
  'x-signature': z.string(),
  employee: z.object({
    id: z.number().optional(),
    full_name: z.string().optional(),
    email: z.string().optional(),
  }).optional()
});

export type OrderWebhookPayload = z.infer<typeof OrderryWebhookSchema>;

// Mantenemos una estructura tipo de la Orden Completa para el SLA Engine
// Esto es lo que esperaríamos recibir de la REST API al consultar la orden completa
export type FullOrderData = {
  tenant_id: 'GT' | 'CR';
  order_id: string;
  client_type: 'Operator' | 'Retailer' | 'Distributor';
  entry_type: 'IW' | 'OW' | 'DOA' | 'NC' | 'DAP';
  zone: 'GAM' | 'FORANEA';
  status_history: { status: string; timestamp: string }[];
};
