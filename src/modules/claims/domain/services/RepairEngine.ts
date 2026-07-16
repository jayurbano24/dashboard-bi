import { Claim } from '../entities/Claim';
import { RuleEngine } from './RuleEngine';
import { IRuleRepository } from '../interfaces/IRuleRepository';

export class RepairEngine {
  constructor(
    private ruleEngine: RuleEngine,
    private ruleRepository: IRuleRepository
  ) {}

  /**
   * Determines Service Type, Processing Method, and Return Type
   * based on the services, parts, and dynamic rules for the specific manufacturer.
   */
  async process(claim: Claim): Promise<Claim> {
    // 1. Determine Service Type
    const serviceTypeRules = await this.ruleRepository.getRulesByManufacturer(claim.manufacturer, 'SERVICE_TYPE');
    const serviceType = this.ruleEngine.evaluateRules(claim, serviceTypeRules);

    // 2. Determine Processing Method
    const processingMethodRules = await this.ruleRepository.getRulesByManufacturer(claim.manufacturer, 'PROCESSING_METHOD');
    const processingMethod = this.ruleEngine.evaluateRules(claim, processingMethodRules);

    // 3. Determine Return Type
    const returnTypeRules = await this.ruleRepository.getRulesByManufacturer(claim.manufacturer, 'RETURN_TYPE');
    const returnType = this.ruleEngine.evaluateRules(claim, returnTypeRules);

    return {
      ...claim,
      serviceType: serviceType || claim.serviceType,
      processingMethod: processingMethod || claim.processingMethod,
      returnType: returnType || claim.returnType,
    };
  }
}
