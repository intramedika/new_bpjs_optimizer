export type AIRuntimeMode = "LOCAL" | "VPS" | "AI_SERVER" | "VERCEL";
export type AIProviderType = "ollama" | "gemini" | "external" | "local_fallback";
export type AIModelStatus = "READY" | "LOADING" | "UNAVAILABLE" | "NOT_CONFIGURED";

export interface AIHealthStatus {
  runtime: AIRuntimeMode;
  provider: AIProviderType;
  model: string;
  endpoint: string;
  status: AIModelStatus;
  latencyMs: number;
  details?: any;
}

export interface ExtractionOptions {
  documentName?: string;
  mimeType?: string;
  hash?: string;
  structure?: string;
  pageContext?: number;
  sectionContext?: string;
}

export interface DiagnosisEvidence {
  text: string;
  code: string;
  confidence: number;
  page: number;
  sourceDocument: string;
  sourceSection: string;
  diagnosisStage: "FINAL" | "WORKING" | "PRELIMINARY";
  evidenceType: string;
  sourceText: string;
}

export interface ProcedureEvidence {
  text: string;
  code: string;
  confidence: number;
  page: number;
  sourceText: string;
}

export interface MedicationEvidence {
  text: string;
  confidence: number;
  sourceText: string;
}

export interface LabEvidence {
  test: string;
  result: string;
  confidence: number;
  sourceText: string;
}

export interface ClinicalExtractionResult {
  patientName: string | null;
  mrNumber: string | null;
  sepNumber: string | null;
  documentType: string | null;
  diagnoses: DiagnosisEvidence[];
  procedures: ProcedureEvidence[];
  medications: MedicationEvidence[];
  laboratories: LabEvidence[];
  matchConfidence: number;
  rawResponse?: string;
}

export interface AIRuntimeAdapter {
  providerName: AIProviderType;
  modelName: string;
  healthCheck(): Promise<AIHealthStatus>;
  extractClinicalEvidence(documentText: string, options?: ExtractionOptions): Promise<ClinicalExtractionResult>;
}
