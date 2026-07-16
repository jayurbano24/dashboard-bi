import { IOrderryConnector } from '../interfaces/IOrderryConnector';
import { GenerateClaimUseCase } from '../useCases/GenerateClaimUseCase';
import { Claim } from '../../domain/entities/Claim';

export class ImportOrderryCommand {
  constructor(
    private orderryConnector: IOrderryConnector,
    private generateClaimUseCase: GenerateClaimUseCase
  ) {}

  async execute(orderId: string, manufacturer: string): Promise<Claim> {
    const orderData = await this.orderryConnector.getOrder(orderId);
    if (!orderData) {
      throw new Error(`Order ${orderId} not found in Orderry`);
    }

    // Adapt OrderryData to normalized Claim entity (Claim Builder logic)
    const rawClaim: Claim = {
      claimId: `CLM-${orderId}`,
      orderId: orderData.orderId,
      manufacturer: manufacturer,
      brand: orderData.brand,
      model: orderData.model,
      imei: orderData.imei,
      serial: orderData.serial,
      warranty: orderData.warrantyType,
      diagnosis: orderData.malfunction,
      services: orderData.services.map(s => ({
        id: s.id || Math.random().toString(),
        name: s.title || s.name,
        code: s.code || ''
      })),
      parts: orderData.parts.map(p => {
        const rawPartNumber = p.code || p.partNumber || '';
        // Remove "NEW " from the beginning if it exists
        const cleanedPartNumber = rawPartNumber.replace(/^NEW\s+/i, '');
        
        let finalPartNumber = cleanedPartNumber;
        let extractedImei = p.sn || p.imei || p.serial || '';

        // If partNumber contains a hyphen followed by a 15-digit IMEI (e.g. 5810N7LEDG00-862058079830506)
        const imeiMatch = cleanedPartNumber.match(/^(.*?)-(\d{15})$/);
        if (imeiMatch) {
            finalPartNumber = imeiMatch[1];
            extractedImei = imeiMatch[2];
        }
        
        // Infer if it's a PCBA (based on tags, description, or if it has an IMEI attached)
        const description = p.title || p.description || '';
        const isPcba = description.toUpperCase().includes('PCBA') || (p.tags && p.tags.includes('PCBA')) || !!imeiMatch;

        return {
          id: p.id || Math.random().toString(),
          partNumber: finalPartNumber,
          description: description,
          quantity: p.quantity || 1,
          snOrImei: extractedImei,
          isPcba: isPcba
        };
      }),
      dates: {
        receivedAt: orderData.createdAt ? new Date(orderData.createdAt) : undefined,
        returnedAt: orderData.closedAt ? new Date(orderData.closedAt) : undefined,
      },
      technician: orderData.technician,
      status: 'PENDING'
    };

    return this.generateClaimUseCase.execute(rawClaim);
  }
}
