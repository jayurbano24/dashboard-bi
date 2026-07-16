import { Claim } from '../entities/Claim';

export interface IClaimRepository {
  save(claim: Claim): Promise<void>;
  findById(claimId: string): Promise<Claim | null>;
  findByOrderId(orderId: string): Promise<Claim | null>;
  update(claim: Claim): Promise<void>;
  getPendingClaims(): Promise<Claim[]>;
}
