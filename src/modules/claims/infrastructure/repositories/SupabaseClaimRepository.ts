import { IClaimRepository } from '../../domain/interfaces/IClaimRepository';
import { Claim } from '../../domain/entities/Claim';

/**
 * Mock implementation of Supabase Repository.
 * In a real scenario, this would use @supabase/supabase-js
 */
export class SupabaseClaimRepository implements IClaimRepository {
  async save(claim: Claim): Promise<void> {
    console.log('Saving claim to Supabase:', claim.claimId);
    // await supabase.from('claim').insert(claim)
  }

  async findById(claimId: string): Promise<Claim | null> {
    return null;
  }

  async findByOrderId(orderId: string): Promise<Claim | null> {
    return null;
  }

  async update(claim: Claim): Promise<void> {
    console.log('Updating claim in Supabase:', claim.claimId);
  }

  async getPendingClaims(): Promise<Claim[]> {
    return [];
  }
}
