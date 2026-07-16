import { Claim } from '../../domain/entities/Claim';
import { IManufacturerAdapter } from '../../domain/interfaces/IManufacturerAdapter';

export class XiaomiAdapter implements IManufacturerAdapter {
  manufacturerId = 'XIAOMI';

  async transform(claim: Claim): Promise<any> {
    // Transforms the generic Claim entity to Xiaomi's specific Excel/JSON structure
    const result: any = {
      "Service No.": claim.claimId,
      "IMEI": claim.imei,
      "SN": claim.serial,
      "Model": claim.model,
      "Warranty Status": claim.warranty === 'IW' ? 'In Warranty' : 'Out of Warranty',
      "Symptom Code": claim.manufacturerDiagnosisCode, // Mapped code
      "Symptom Description": claim.diagnosis, // Original
      "Service Type": claim.serviceType,
      "Processing Method": claim.processingMethod,
      "Return Type": claim.returnType,
      "Created Date": claim.dates.receivedAt?.toISOString(),
      "Completed Date": claim.dates.returnedAt?.toISOString(),
      "Technician": claim.technician
    };

    // Map parts dynamically up to the number of parts
    claim.parts.forEach((p, index) => {
      const i = index + 1;
      result[`old_PN${i}`] = p.partNumber;
      result[`new_PN${i}`] = p.partNumber;
      
      if (p.isPcba) {
        // As requested: old is the device original IMEI, new is the PCBA part's IMEI
        result[`old_SN${i}_Or_IMEI${i}`] = claim.imei;
        result[`new_SN${i}_Or_IMEI${i}`] = p.snOrImei || '';
      } else {
        result[`old_SN${i}_Or_IMEI${i}`] = '';
        result[`new_SN${i}_Or_IMEI${i}`] = '';
      }
    });

    return result;
  }
}
