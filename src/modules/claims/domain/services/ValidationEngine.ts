import { Claim } from '../entities/Claim';
import { RuleEngine } from './RuleEngine';
import { IRuleRepository } from '../interfaces/IRuleRepository';

export class ValidationEngine {
  constructor(
    private ruleEngine: RuleEngine,
    private ruleRepository: IRuleRepository
  ) {}

  /**
   * Validates a claim to ensure it has all required fields and meets business logic.
   * Modifies the claim's status and validationErrors if invalid.
   */
  async validate(claim: Claim): Promise<Claim> {
    const errors: string[] = [];

    // 1. Hardcoded standard validations
    if (!claim.imei && !claim.serial) {
      errors.push('IMEI or Serial is required');
    }
    if (!claim.diagnosis) {
      errors.push('Original diagnosis is required');
    }
    if (!claim.manufacturerDiagnosisCode || claim.manufacturerDiagnosisCode === 'UNKNOWN') {
      errors.push('Manufacturer diagnosis code could not be mapped');
    }
    
    // 2. Dynamic manufacturer-specific validation rules
    const validationRules = await this.ruleRepository.getRulesByManufacturer(claim.manufacturer, 'VALIDATION');
    
    // For validation, if a rule matches, the action.value represents the error message
    for (const rule of validationRules) {
      // Re-using rule engine: if condition matches (e.g. EXISTS Parts AND NOT_EXISTS ProcessingMethod), 
      // it returns the error string.
      const errorMsg = this.ruleEngine.evaluateRules(claim, [rule]);
      if (errorMsg) {
        errors.push(errorMsg);
      }
    }

    return {
      ...claim,
      status: errors.length > 0 ? 'ERROR' : claim.status,
      validationErrors: errors.length > 0 ? errors : undefined,
    };
  }
}
