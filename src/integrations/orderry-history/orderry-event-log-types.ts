/** Respuesta cruda de GET /app/event-log/get-object-events (context_type=2). */
export type OrderryEventLogItem = {
  created_at: number;
  event_type: number;
  employee_id?: number;
  branch_id?: number;
  context_type?: number;
  company_id?: number;
  context_object_id?: number;
  created_by_id?: number;
  is_visible?: boolean;
  id?: number | string;
  metadata?: {
    status?: { id?: number; name?: string; color?: string };
    /** event_type 0: estado al que entró la orden. */
    new?: { id?: number; name?: string };
    old?: { id?: number; name?: string };
    order?: { id?: number; name?: string; type?: number };
    client?: { id?: number; fullname?: string };
    asset?: { id?: number; name?: string };
    [key: string]: unknown;
  };
};
