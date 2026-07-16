import { Claim } from '../../domain/entities/Claim';
import { IClaimRepository } from '../../domain/interfaces/IClaimRepository';
import { DiagnosisEngine } from '../../domain/services/DiagnosisEngine';
import { RepairEngine } from '../../domain/services/RepairEngine';
import { ValidationEngine } from '../../domain/services/ValidationEngine';

/**
 * Use case to process an imported raw order and generate a fully built Claim.
 */
export class GenerateClaimUseCase {
  constructor(
    private diagnosisEngine: DiagnosisEngine,
    private repairEngine: RepairEngine,
    private validationEngine: ValidationEngine,
    private claimRepository: IClaimRepository
  ) {}

  async execute(rawClaimData: Claim): Promise<Claim> {
    // 1. Process Diagnosis mapping
    let claim = await this.diagnosisEngine.process(rawClaimData);

    // 2. Process Repair Engine (Service Type, Processing Method, Return Type)
    claim = await this.repairEngine.process(claim);

    // 3. Validate the final claim structure
    claim = await this.validationEngine.validate(claim);

    // 4. Save the built claim
    await this.claimRepository.save(claim);

    return claim;
  }
}
