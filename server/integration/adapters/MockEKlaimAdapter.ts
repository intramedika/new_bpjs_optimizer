import { BaseAdapter } from "./BaseAdapter";
import { 
  AdapterMetadata, 
  IntegrationConfiguration, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse 
} from "../Interfaces";
import { mockSimulatorController } from "../mock/MockSimulatorController";
import { MOCK_CLAIMS, MockClaimData } from "../mock/MockDataset";

export class MockEKlaimAdapter extends BaseAdapter {
  protected metadata: AdapterMetadata = {
    adapterId: "mock-eklaim",
    name: "Mock E-Klaim INA-CBG Adapter",
    provider: "E-KLAIM (MOCK SANDBOX)",
    version: "v5.8.0-MOCK",
    environment: "MOCK",
    capabilities: ["connection", "diagnosis", "procedure", "grouping", "retrieve", "update"],
    status: "MOCK_CONNECTED",
    isMockAdapter: true
  };

  private mockStore: Map<string, MockClaimData> = new Map();

  constructor() {
    super();
    // Seed initial mock claim store
    MOCK_CLAIMS.forEach(c => this.mockStore.set(c.id, { ...c }));
  }

  validateConfiguration(config: IntegrationConfiguration): boolean {
    // Mock adapter does not require real external credentials
    return true;
  }

  async testConnection(config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();
    
    // Check failure simulation controller
    const { isFailure, mode } = mockSimulatorController.evaluateMode(this.metadata.adapterId);
    if (isFailure) {
      return this.handleSimulatedFailure("testConnection", mode, startTime);
    }

    // Real execution delay measurement
    await new Promise(r => setTimeout(r, 45));
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      status: "MOCK_CONNECTED",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "testConnection",
      message: "Mock E-Klaim Sandbox Engine is operational.",
      externalResponseCode: 200,
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true,
      simulationMode: "SUCCESS",
      source: "MOCK_SANDBOX"
    };
  }

  async execute(request: CanonicalIntegrationRequest, config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();

    // Check failure simulation controller
    const { isFailure, mode } = mockSimulatorController.evaluateMode(this.metadata.adapterId);
    if (isFailure) {
      return this.handleSimulatedFailure(request.operation, mode, startTime);
    }

    if (!this.getCapabilities().includes(request.operation)) {
      return this.buildResponse({
        success: false,
        status: "ERROR",
        operation: request.operation,
        message: `Operation '${request.operation}' is not supported by MockEKlaimAdapter.`,
        errorCode: "UNSUPPORTED_OPERATION",
        latencyMs: Date.now() - startTime
      });
    }

    switch (request.operation) {
      case "connection":
        return this.testConnection(config);

      case "diagnosis":
        return this.processDiagnosis(request.payload, startTime);

      case "procedure":
        return this.processProcedure(request.payload, startTime);

      case "grouping":
        return this.processGrouping(request.payload, startTime);

      case "retrieve":
        return this.processRetrieve(request.payload, startTime);

      case "update":
        return this.processUpdate(request.payload, startTime);

      default:
        return this.buildResponse({
          success: false,
          status: "ERROR",
          operation: request.operation,
          message: "Unsupported mock operation",
          errorCode: "UNSUPPORTED_OPERATION",
          latencyMs: Date.now() - startTime
        });
    }
  }

  private async processDiagnosis(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 30));
    const latencyMs = Date.now() - startTime;

    if (!payload || !payload.principalDiagnosisCode || !payload.patientName) {
      return {
        success: false,
        status: "ERROR",
        provider: this.metadata.provider,
        adapterId: this.metadata.adapterId,
        operation: "diagnosis",
        message: "VALIDATION_ERROR: Missing required fields (principalDiagnosisCode or patientName). Cannot invent diagnosis.",
        errorCode: "VALIDATION_ERROR",
        latencyMs,
        timestamp: new Date().toISOString(),
        isMock: true
      };
    }

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "diagnosis",
      message: `MOCK RESPONSE: Diagnosis ${payload.principalDiagnosisCode} verified in Mock Sandbox.`,
      data: {
        principalDiagnosisCode: payload.principalDiagnosisCode,
        secondaryDiagnoses: payload.secondaryDiagnoses || [],
        validationStatus: "MOCK_VALIDATED"
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true,
      simulationMode: "SUCCESS"
    };
  }

  private async processProcedure(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 25));
    const latencyMs = Date.now() - startTime;

    if (!payload || !payload.procedures || payload.procedures.length === 0) {
      return {
        success: false,
        status: "ERROR",
        provider: this.metadata.provider,
        adapterId: this.metadata.adapterId,
        operation: "procedure",
        message: "VALIDATION_ERROR: No procedures specified in request payload.",
        errorCode: "VALIDATION_ERROR",
        latencyMs,
        timestamp: new Date().toISOString(),
        isMock: true
      };
    }

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "procedure",
      message: `MOCK RESPONSE: ${payload.procedures.length} procedure codes processed in Mock Sandbox.`,
      data: {
        procedures: payload.procedures,
        validationStatus: "MOCK_VALIDATED"
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }

  private async processGrouping(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 65));
    const latencyMs = Date.now() - startTime;

    const diag = payload?.principalDiagnosisCode || "J18.9";
    const severity = payload?.severity || 2;
    const isSpecialist = payload?.procedures && payload.procedures.length > 0;

    // Deterministic Mock INA-CBG Calculation
    let mockCbgCode = "J-4-10-II";
    let mockCbgDescription = "Pneumonia / Infeksi Respiratori Sedang (SIMULATED)";
    let mockTariff = 7850000;

    if (diag.startsWith("I")) {
      mockCbgCode = severity === 3 ? "I-4-10-III" : "I-4-10-I";
      mockCbgDescription = "Infark Miokard Akut / Gangguan Sirkulasi (SIMULATED)";
      mockTariff = severity === 3 ? 14500000 : 9200000;
    } else if (diag.startsWith("E")) {
      mockCbgCode = "E-4-10-I";
      mockCbgDescription = "Diabetes Mellitus Tanpa Komplikasi (SIMULATED)";
      mockTariff = 4300000;
    }

    if (isSpecialist) {
      mockTariff += 1500000;
    }

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "grouping",
      message: "MOCK RESPONSE: Deterministic INA-CBG grouping completed.",
      source: "MOCK_GROUPER",
      simulationMode: "SIMULATION",
      data: {
        cbgCode: mockCbgCode,
        cbgDescription: mockCbgDescription,
        severity: severity === 3 ? "III (Berat)" : severity === 2 ? "II (Sedang)" : "I (Ringan)",
        tariff: mockTariff,
        tariffFormatted: `Rp ${mockTariff.toLocaleString("id-ID")}`
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }

  private async processRetrieve(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 20));
    const latencyMs = Date.now() - startTime;

    const claimId = payload?.id || "CLM-MOCK-001";
    const claim = this.mockStore.get(claimId) || MOCK_CLAIMS[0];

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "retrieve",
      message: `MOCK RESPONSE: Retrieved mock claim '${claimId}' from mock store.`,
      data: claim,
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }

  private async processUpdate(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 35));
    const latencyMs = Date.now() - startTime;

    const claimId = payload?.id || `CLM-MOCK-${Date.now()}`;
    const updatedRecord: MockClaimData = {
      id: claimId,
      sepNumber: payload.sepNumber || "MOCK-SEP-20260809-000001",
      patientName: payload.patientName || "Patient A (Synthetic Valid)",
      cardNumber: payload.cardNumber || "MOCK-ELIGIBLE-001",
      principalDiagnosisCode: payload.principalDiagnosisCode,
      principalDiagnosisName: payload.principalDiagnosisName,
      secondaryDiagnoses: payload.secondaryDiagnoses,
      procedures: payload.procedures,
      class: payload.class,
      severity: payload.severity
    };

    this.mockStore.set(claimId, updatedRecord);

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "update",
      message: `MOCK RESPONSE: Mock claim '${claimId}' updated and state persisted in mock store.`,
      data: updatedRecord,
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }

  private handleSimulatedFailure(operation: string, mode: string, startTime: number): CanonicalIntegrationResponse {
    const latencyMs = Date.now() - startTime;
    switch (mode) {
      case "TIMEOUT":
        return {
          success: false,
          status: "ERROR",
          provider: this.metadata.provider,
          adapterId: this.metadata.adapterId,
          operation,
          message: "[SIMULATED FAILURE] Operation timed out after 5000ms.",
          errorCode: "TIMEOUT",
          latencyMs: 5000,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
      case "NETWORK_ERROR":
        return {
          success: false,
          status: "ERROR",
          provider: this.metadata.provider,
          adapterId: this.metadata.adapterId,
          operation,
          message: "[SIMULATED FAILURE] Network connection refused (ECONNREFUSED).",
          errorCode: "NETWORK_ERROR",
          latencyMs,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
      case "AUTH_ERROR":
        return {
          success: false,
          status: "ERROR",
          provider: this.metadata.provider,
          adapterId: this.metadata.adapterId,
          operation,
          message: "[SIMULATED FAILURE] Invalid secret key / MAC address signature (HTTP 401).",
          errorCode: "AUTH_ERROR",
          latencyMs,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
      case "VALIDATION_ERROR":
        return {
          success: false,
          status: "ERROR",
          provider: this.metadata.provider,
          adapterId: this.metadata.adapterId,
          operation,
          message: "[SIMULATED FAILURE] Mandatory field missing in payload schema.",
          errorCode: "VALIDATION_ERROR",
          latencyMs,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
      case "OFFLINE":
        return {
          success: false,
          status: "OFFLINE",
          provider: this.metadata.provider,
          adapterId: this.metadata.adapterId,
          operation,
          message: "[SIMULATED FAILURE] External server is OFFLINE. Operation queued.",
          errorCode: "NETWORK_ERROR",
          latencyMs,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
      default:
        return {
          success: false,
          status: "ERROR",
          provider: this.metadata.provider,
          adapterId: this.metadata.adapterId,
          operation,
          message: `[SIMULATED FAILURE] Simulated error mode: ${mode}`,
          errorCode: "EXTERNAL_SERVER_ERROR",
          latencyMs,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
    }
  }
}
