export interface CatalogItem {
  id: string;
  catalogType: string;
  key: string;
  value: string;
  manufacturerId?: string;
}

export interface ICatalogRepository {
  getDiagnosisMapping(originalDiagnosis: string, manufacturerId: string): Promise<string | null>;
  getProcessingMethod(key: string, manufacturerId: string): Promise<string | null>;
  getReturnType(key: string, manufacturerId: string): Promise<string | null>;
  getItemsByType(catalogType: string, manufacturerId?: string): Promise<CatalogItem[]>;
}
