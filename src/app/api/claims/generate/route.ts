import { NextResponse } from 'next/server';
import { ImportOrderryCommand } from '../../../../modules/claims/application/commands/ImportOrderryCommand';
import { GenerateClaimUseCase } from '../../../../modules/claims/application/useCases/GenerateClaimUseCase';
import { DiagnosisEngine } from '../../../../modules/claims/domain/services/DiagnosisEngine';
import { RepairEngine } from '../../../../modules/claims/domain/services/RepairEngine';
import { ValidationEngine } from '../../../../modules/claims/domain/services/ValidationEngine';
import { RuleEngine } from '../../../../modules/claims/domain/services/RuleEngine';
import { SupabaseClaimRepository } from '../../../../modules/claims/infrastructure/repositories/SupabaseClaimRepository';

// Mocks for DI
const mockCatalogRepo = {
  getDiagnosisMapping: async () => '040102',
  getProcessingMethod: async () => '5101',
  getReturnType: async () => 'REPAIR',
  getItemsByType: async () => []
};

const mockRuleRepo = {
  getRulesByManufacturer: async () => []
};

const mockOrderryConnector = {
  getOrder: async (id: string) => ({
    orderId: id,
    customerName: 'John Doe',
    model: 'Redmi Note 14',
    brand: 'Xiaomi',
    imei: '864512345678901',
    serial: 'SN123456',
    warrantyType: 'IW',
    malfunction: 'No enciende',
    services: [{ id: '1', name: 'Flash' }],
    parts: [{
      id: '2',
      partNumber: 'NEW 5810N7LEDG00-862058079830506',
      title: 'REMPLAZO DE PCBA',
      quantity: 1
    }],
    statusHistory: [],
    technician: 'Tech 1',
    createdAt: new Date().toISOString(),
    status: 'closed'
  })
};

export async function POST(request: Request) {
  try {
    const { orderId, manufacturer } = await request.json();

    if (!orderId || !manufacturer) {
      return NextResponse.json({ error: 'orderId and manufacturer are required' }, { status: 400 });
    }

    // Dependency Injection Setup (In production, use a DI container or a factory)
    const diagnosisEngine = new DiagnosisEngine(mockCatalogRepo);
    const ruleEngine = new RuleEngine();
    const repairEngine = new RepairEngine(ruleEngine, mockRuleRepo);
    const validationEngine = new ValidationEngine(ruleEngine, mockRuleRepo);
    const claimRepository = new SupabaseClaimRepository();

    const generateUseCase = new GenerateClaimUseCase(
      diagnosisEngine,
      repairEngine,
      validationEngine,
      claimRepository
    );

    const importCommand = new ImportOrderryCommand(mockOrderryConnector, generateUseCase);

    // Execute workflow
    const claim = await importCommand.execute(orderId, manufacturer);

    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
