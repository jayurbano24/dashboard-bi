export interface ClaimService {
  id: string;
  name: string;
  code: string;
}

export interface ClaimPart {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  snOrImei?: string;
  isPcba?: boolean;
}

export interface ClaimDates {
  receivedAt?: Date;
  repairedAt?: Date;
  returnedAt?: Date;
}

export interface Claim {
  claimId: string;
  orderId: string;
  manufacturer: string;
  brand: string;
  model: string;
  imei: string;
  serial: string;
  warranty: string;
  diagnosis: string; // Original diagnosis
  manufacturerDiagnosisCode?: string; // Translated code
  serviceType?: string;
  processingMethod?: string;
  returnType?: string;
  services: ClaimService[];
  parts: ClaimPart[];
  dates: ClaimDates;
  technician: string;
  status: 'PENDING' | 'EXPORTED' | 'REJECTED' | 'ERROR';
  validationErrors?: string[];
}
