import { Claim } from '../entities/Claim';

export interface IManufacturerAdapter {
  manufacturerId: string;
  
  /**
   * Transforms the normalized internal Claim object into the manufacturer's specific format.
   * The return type is any because each manufacturer has a completely different JSON schema.
   */
  transform(claim: Claim): Promise<any>;
}
