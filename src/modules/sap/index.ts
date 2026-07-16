import { SAPDispatchService } from './services/sap-dispatch.service';
import { SAPHistoryService } from './services/sap-history.service';
import { SAPLotService } from './services/sap-lot.service';
import { OrderryValidationService } from './services/orderry-validation.service';
import { SAPService } from './services/sap.service';
import {
  SupabaseSapAuditRepository,
  SupabaseSapEquipmentRepository,
  SupabaseSapHistoryRepository,
  SupabaseSapLotRepository,
} from './infrastructure/repositories/supabase.repositories';

export function createSAPService(baseUrl: string): SAPService {
  const equipmentRepo = new SupabaseSapEquipmentRepository();
  const lotRepo = new SupabaseSapLotRepository();
  const historyRepo = new SupabaseSapHistoryRepository();
  const auditRepo = new SupabaseSapAuditRepository();
  const historyService = new SAPHistoryService(historyRepo);
  const lotService = new SAPLotService(lotRepo, equipmentRepo, historyService, auditRepo);
  const dispatchService = new SAPDispatchService(lotRepo, equipmentRepo, historyService, auditRepo);
  const orderryValidation = new OrderryValidationService(baseUrl);

  return new SAPService(lotService, dispatchService, orderryValidation, historyService, equipmentRepo, lotRepo);
}

export function getRequestBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
