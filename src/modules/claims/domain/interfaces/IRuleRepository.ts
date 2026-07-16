export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'EXISTS' | 'NOT_EXISTS' | 'IN';
  value: string | string[];
}

export interface RuleAction {
  fieldToUpdate: string;
  value: string;
}

export interface Rule {
  id: string;
  manufacturerId: string;
  ruleType: 'SERVICE_TYPE' | 'PROCESSING_METHOD' | 'RETURN_TYPE' | 'VALIDATION';
  priority: number;
  conditions: RuleCondition[];
  action: RuleAction;
}

export interface IRuleRepository {
  getRulesByManufacturer(manufacturerId: string, ruleType?: string): Promise<Rule[]>;
}
