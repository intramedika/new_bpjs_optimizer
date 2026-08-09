import { Claim } from "../../src/types";

export type IntegrationEnvironment = "MOCK" | "TEST" | "PRODUCTION";

export type IntegrationStatus = 
  | "NOT_CONFIGURED" 
  | "CONFIGURED" 
  | "TESTING" 
  | "CONNECTED" 
  | "DEGRADED" 
  | "ERROR" 
  | "OFFLINE"
  | "WAITING_FOR_CONNECTION"
  | "MOCK_CONNECTED"
  | "MOCK_SIMULATION";

export type IntegrationErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "AUTH_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT"
  | "EXTERNAL_SERVER_ERROR"
  | "INVALID_RESPONSE"
  | "NOT_CONFIGURED"
  | "UNSUPPORTED_OPERATION"
  | "UNKNOWN_ERROR";

export interface AdapterMetadata {
  adapterId: string;
  name: string;
  provider: string;
  version: string;
  environment: IntegrationEnvironment;
  capabilities: string[];
  status: IntegrationStatus;
  isMockAdapter?: boolean;
}

export interface IntegrationConfiguration {
  id: string;
  tenantId: string;
  hospitalId: string;
  adapterId: string;
  environment: IntegrationEnvironment;
  baseUrl: string;
  credentials: Record<string, any>; // Stored server-side only
  status: IntegrationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalIntegrationRequest {
  adapterId: string;
  operation: string;
  tenantId: string;
  hospitalId: string;
  requestId?: string;
  requestHash?: string;
  payload: any;
  timeoutMs?: number;
}

export interface CanonicalIntegrationResponse<T = any> {
  success: boolean;
  status: IntegrationStatus;
  provider: string;
  adapterId: string;
  operation: string;
  externalRequestId?: string;
  externalResponseCode?: string | number;
  message: string;
  errorCode?: IntegrationErrorCode;
  technicalError?: string;
  data?: T;
  rawResponseReference?: string;
  latencyMs: number;
  timestamp: string;
  isMock?: boolean;
  simulationMode?: string;
  source?: string;
}

export interface IntegrationExecution {
  id: string;
  requestId: string;
  tenantId: string;
  hospitalId: string;
  adapterId: string;
  operation: string;
  status: "SUCCESS" | "FAILED" | "RETRYING" | "QUEUED";
  durationMs: number;
  responseCode?: string | number;
  errorCode?: string;
  createdAt: string;
  isMock?: boolean;
  environment?: IntegrationEnvironment;
}

export interface IntegrationJob {
  jobId: string;
  tenantId: string;
  hospitalId: string;
  adapterId: string;
  operation: string;
  entityType: string;
  entityId: string;
  status: "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED" | "RETRYING" | "CANCELLED" | "WAITING_FOR_CONNECTION";
  attempt: number;
  maxAttempts: number;
  payload: any;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
}

export interface IIntegrationAdapter {
  getMetadata(): AdapterMetadata;
  getCapabilities(): string[];
  validateConfiguration(config: IntegrationConfiguration): boolean;
  testConnection(config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse>;
  execute(request: CanonicalIntegrationRequest, config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse>;
  getHealth(config?: IntegrationConfiguration): Promise<{ status: IntegrationStatus; latencyMs: number; error?: string }>;
  normalizeError(error: any): IntegrationErrorCode;
}

export interface IIntegrationRegistry {
  register(adapter: IIntegrationAdapter): void;
  getAdapter(adapterId: string): IIntegrationAdapter | null;
  listAdapters(): AdapterMetadata[];
  getAvailableCapabilities(adapterId: string): string[];
  isConfigured(adapterId: string, tenantId: string, hospitalId: string): Promise<boolean>;
}

export interface IIntegrationConfigurationRepository {
  findByAdapter(adapterId: string, tenantId: string, hospitalId: string): Promise<IntegrationConfiguration | null>;
  save(config: Omit<IntegrationConfiguration, "id" | "createdAt" | "updatedAt" | "status"> & { status?: IntegrationConfiguration["status"] }): Promise<IntegrationConfiguration>;
  listAll(tenantId: string, hospitalId: string): Promise<IntegrationConfiguration[]>;
}

export interface IIntegrationExecutionRepository {
  record(execution: Omit<IntegrationExecution, "id" | "createdAt">): Promise<IntegrationExecution>;
  findRecent(tenantId: string, hospitalId: string, limit?: number): Promise<IntegrationExecution[]>;
}

export interface IIntegrationHub {
  execute(request: CanonicalIntegrationRequest): Promise<CanonicalIntegrationResponse>;
  testConnection(adapterId: string, tenantId: string, hospitalId: string): Promise<CanonicalIntegrationResponse>;
  getHealth(tenantId: string, hospitalId: string): Promise<Record<string, { status: IntegrationStatus; latencyMs: number; error?: string }>>;
  saveConfiguration(config: Omit<IntegrationConfiguration, "id" | "createdAt" | "updatedAt" | "status">): Promise<IntegrationConfiguration>;
  getConfiguration(adapterId: string, tenantId: string, hospitalId: string): Promise<IntegrationConfiguration | null>;
}
