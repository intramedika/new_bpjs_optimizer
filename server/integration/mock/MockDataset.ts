export interface MockPatient {
  id: string;
  cardNumber: string;
  name: string;
  nik: string;
  isEligible: boolean;
  statusMessage: string;
}

export interface MockClaimData {
  id: string;
  sepNumber: string;
  patientName: string;
  cardNumber: string;
  principalDiagnosisCode?: string;
  principalDiagnosisName?: string;
  secondaryDiagnoses?: string[];
  procedures?: string[];
  class?: number;
  severity?: number;
}

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: "PAT-001",
    cardNumber: "MOCK-ELIGIBLE-001",
    name: "Patient A (Synthetic Valid)",
    nik: "3171000000000001",
    isEligible: true,
    statusMessage: "Peserta Aktif BPJS Kesehatan (Synthetic Mock)"
  },
  {
    id: "PAT-002",
    cardNumber: "MOCK-ELIGIBLE-002",
    name: "Patient B (Synthetic Missing Code)",
    nik: "3171000000000002",
    isEligible: true,
    statusMessage: "Peserta Aktif BPJS Kesehatan (Synthetic Mock)"
  },
  {
    id: "PAT-003",
    cardNumber: "MOCK-INELIGIBLE-001",
    name: "Patient C (Synthetic Ineligible)",
    nik: "3171000000000003",
    isEligible: false,
    statusMessage: "Status Kepesertaan Tidak Aktif / Tunggakan Iuran (Synthetic Mock)"
  }
];

export const MOCK_CLAIMS: MockClaimData[] = [
  {
    id: "CLM-MOCK-001",
    sepNumber: "MOCK-SEP-20260809-000001",
    patientName: "Patient A (Synthetic Valid)",
    cardNumber: "MOCK-ELIGIBLE-001",
    principalDiagnosisCode: "J18.9",
    principalDiagnosisName: "Pneumonia, unspecified",
    secondaryDiagnoses: ["E11.9", "I10"],
    procedures: ["89.52", "96.71"],
    class: 1,
    severity: 2
  },
  {
    id: "CLM-MOCK-002",
    sepNumber: "MOCK-SEP-20260809-000002",
    patientName: "Patient B (Synthetic Missing Code)",
    cardNumber: "MOCK-ELIGIBLE-002",
    secondaryDiagnoses: ["E11.9"],
    procedures: ["89.52"],
    class: 2,
    severity: 1
  },
  {
    id: "CLM-MOCK-003",
    sepNumber: "MOCK-SEP-20260809-000003",
    patientName: "Patient C (Synthetic Ineligible)",
    cardNumber: "MOCK-INELIGIBLE-001",
    principalDiagnosisCode: "I21.9",
    principalDiagnosisName: "Acute myocardial infarction, unspecified",
    class: 1,
    severity: 3
  }
];
