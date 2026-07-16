import { ICatalogRepository } from '../interfaces/ICatalogRepository';
import { Claim } from '../entities/Claim';

export class DiagnosisEngine {
  constructor(private catalogRepository: ICatalogRepository) {}

  /**
   * Translates the original diagnosis from Orderry into the official manufacturer diagnosis code.
   * Uses only catalog lookups as per requirements (no IF statements).
   */
  async process(claim: Claim): Promise<Claim> {
    const translatedCode = await this.catalogRepository.getDiagnosisMapping(
      claim.diagnosis,
      claim.manufacturer
    );

    return {
      ...claim,
      manufacturerDiagnosisCode: translatedCode || 'UNKNOWN',
    };
  }
}
