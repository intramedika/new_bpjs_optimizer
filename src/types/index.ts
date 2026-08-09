export type ClaimStatus =
  | 'Analisis'
  | 'Perlu Perbaikan'
  | 'Perlu Review'
  | 'Siap Diajukan'
  | 'Sudah Diajukan'
  | 'Pending'
  | 'Dispute'
  | 'Dibayar';

export type PendingRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type DataMode = 'REAL' | 'DEMO' | 'TEST';

export type SourceType = 'PDF' | 'TXT' | 'CSV' | 'JSON' | 'MANUAL' | 'SIMRS' | 'FHIR' | 'API';

export interface Patient {
  id: string;
  name: string;
  mrNumber: string;
  gender: 'L' | 'P';
  dob: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  sepNumber: string;
  patientId: string;
  patient: Patient;
  serviceDate: string;
  dischargeDate: string;
  principalDiagnosis: string;
  principalDiagnosisCode: string;
  secondaryDiagnoses: string[];
  procedures: string[];
  cbgCode: string;
  cbgDescription: string;
  severity: number;
  tariff: number;
  readinessScore: number;
  risk: PendingRisk;
  status: ClaimStatus;
  doctorName: string;
  unit: string;
  coderName: string;
  dataMode?: DataMode;
  sourceType?: SourceType;
  sourceReference?: string;
  createdBy?: string;
  tenantId?: string;
  groupId?: string;
  hospitalId?: string;
  departmentId?: string;
}
