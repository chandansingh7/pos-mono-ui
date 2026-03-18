export interface TaxRuleResponse {
  id: number;
  taxCategory: string;
  label: string;
  rate: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxRuleRequest {
  taxCategory: string;
  label: string;
  rate: number;
}
