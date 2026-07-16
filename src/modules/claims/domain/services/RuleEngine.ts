import { Claim } from '../entities/Claim';
import { Rule, RuleCondition } from '../interfaces/IRuleRepository';

export class RuleEngine {
  /**
   * Evaluates a set of rules against a Claim and returns the applicable rule's action value.
   * Rules should be pre-sorted by priority (highest first) before passing to this method.
   */
  evaluateRules(claim: Claim, rules: Rule[]): string | undefined {
    for (const rule of rules) {
      if (this.evaluateConditions(claim, rule.conditions)) {
        return rule.action.value;
      }
    }
    return undefined; // No rule matched
  }

  private evaluateConditions(claim: Claim, conditions: RuleCondition[]): boolean {
    return conditions.every((condition) => {
      const fieldValue = this.getFieldValue(claim, condition.field);

      switch (condition.operator) {
        case 'EQUALS':
          return fieldValue === condition.value;
        case 'CONTAINS':
          if (Array.isArray(fieldValue)) {
            // e.g., checking if services array contains a specific service code
            return fieldValue.some((item: any) => 
              typeof item === 'object' 
                ? Object.values(item).includes(condition.value) 
                : item === condition.value
            );
          }
          return typeof fieldValue === 'string' && fieldValue.includes(condition.value as string);
        case 'EXISTS':
          if (Array.isArray(fieldValue)) return fieldValue.length > 0;
          return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
        case 'NOT_EXISTS':
          if (Array.isArray(fieldValue)) return fieldValue.length === 0;
          return fieldValue === undefined || fieldValue === null || fieldValue === '';
        case 'IN':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue as string);
        default:
          return false;
      }
    });
  }

  private getFieldValue(claim: Claim, fieldPath: string): any {
    // Simple path resolution, e.g., "services", "parts", "warranty"
    return (claim as any)[fieldPath];
  }
}
