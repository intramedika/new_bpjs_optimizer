import { BaseAdapter } from "./BaseAdapter";
import { 
  AdapterMetadata, 
  IntegrationConfiguration, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse 
} from "../Interfaces";
import { mockSimulatorController } from "../mock/MockSimulatorController";
import { MOCK_PATIENTS } from "../mock/MockDataset";
import crypto from "crypto";

export class MockVClaimAdapter extends BaseAdapter {
  protected metadata: AdapterMetadata = {
    adapterId: "mock-vclaim",
    name: "Mock BPJS Health VClaim Adapter",
    provider: "BPJS VCLAIM (MOCK SANDBOX)",
    version: "v2.0.0-MOCK",
    environment: "MOCK",
    capabilities: ["connection", "SEP", "eligibility", "claim-related services"],
    status: "MOCK_CONNECTED",
    isMockAdapter: true
  };

  validateConfiguration(config: IntegrationConfiguration): boolean {
    // Mock adapter uses mock credential placeholders
    return true;
  }

  async testConnection(config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();

    const { isFailure, mode } = mockSimulatorController.evaluateMode(this.metadata.adapterId);
    if (isFailure) {
      return this.handleSimulatedFailure("testConnection", mode, startTime);
    }

    // Simulated HMAC-SHA256 signature calculation lifecycle for realistic testing
    const mockConsId = config.credentials?.consId || "MOCK_CONS_ID";
    const mockSecret = config.credentials?.secretKey || "MOCK_SECRET_KEY";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto.createHmac("sha256", mockSecret).update(`${mockConsId}&${timestamp}`).digest("base64");

    await new Promise(r => setTimeout(r, 40));
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      status: "MOCK_CONNECTED",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "testConnection",
      message: "Mock BPJS VClaim Sandbox Web Service is MOCK CONNECTED.",
      externalResponseCode: 200,
      data: {
        mockConsId,
        simulatedTimestamp: timestamp,
        simulatedSignature: signature
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true,
      simulationMode: "SUCCESS"
    };
  }

  async execute(request: CanonicalIntegrationRequest, config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();

    const { isFailure, mode } = mockSimulatorController.evaluateMode(this.metadata.adapterId);
    if (isFailure) {
      return this.handleSimulatedFailure(request.operation, mode, startTime);
    }

    if (!this.getCapabilities().includes(request.operation)) {
      return this.buildResponse({
        success: false,
        status: "ERROR",
        operation: request.operation,
        message: `Operation '${request.operation}' is not supported by MockVClaimAdapter.`,
        errorCode: "UNSUPPORTED_OPERATION",
        latencyMs: Date.now() - startTime
      });
    }

    switch (request.operation) {
      case "connection":
        return this.testConnection(config);

      case "eligibility":
        return this.processEligibility(request.payload, startTime);

      case "SEP":
        return this.processSEP(request.payload, startTime);

      case "claim-related services":
        return this.processClaimServices(request.payload, startTime);

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

  private async processEligibility(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 35));
    const latencyMs = Date.now() - startTime;

    const cardNumber = payload?.cardNumber || "MOCK-ELIGIBLE-001";
    const patient = MOCK_PATIENTS.find(p => p.cardNumber === cardNumber) || MOCK_PATIENTS[0];

    return {
      success: patient.isEligible,
      status: patient.isEligible ? "MOCK_SIMULATION" : "ERROR",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "eligibility",
      message: `MOCK RESPONSE: ${patient.statusMessage}`,
      data: {
        cardNumber: patient.cardNumber,
        patientName: patient.name,
        nik: patient.nik,
        isEligible: patient.isEligible,
        statusPeserta: patient.isEligible ? "AKTIF" : "NEGAF"
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }

  private async processSEP(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 50));
    const latencyMs = Date.now() - startTime;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seq = Math.floor(Math.random() * 900000 + 100001);
    const mockSepNumber = `MOCK-SEP-${dateStr}-${seq}`;

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "SEP",
      message: `MOCK RESPONSE: Generated mock Surat Elegibilitas Peserta (${mockSepNumber}).`,
      data: {
        noSep: mockSepNumber,
        tglSep: new Date().toISOString().slice(0, 10),
        noKartu: payload?.cardNumber || "MOCK-ELIGIBLE-001",
        nama: payload?.patientName || "Patient A (Synthetic Valid)",
        poli: payload?.polyclinic || "Penyakit Dalam",
        faskesRujukan: payload?.facility || "RSUD Kota Demo"
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }

  private async processClaimServices(payload: any, startTime: number): Promise<CanonicalIntegrationResponse> {
    await new Promise(r => setTimeout(r, 45));
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      status: "MOCK_SIMULATION",
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: "claim-related services",
      message: "MOCK RESPONSE: Processed VClaim claim-related service enquiry.",
      data: {
        statusKlaim: "PROSES_VERIFIKASI_MOCK",
        penjamin: "BPJS KESEHATAN"
      },
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
          message: "[SIMULATED FAILURE] VClaim API request timed out.",
          errorCode: "TIMEOUT",
          latencyMs: 5000,
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
          message: "[SIMULATED FAILURE] ConsID / SecretKey HMAC signature mismatch.",
          errorCode: "AUTH_ERROR",
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
          message: `[SIMULATED FAILURE] Mode: ${mode}`,
          errorCode: "EXTERNAL_SERVER_ERROR",
          latencyMs,
          timestamp: new Date().toISOString(),
          isMock: true,
          simulationMode: mode
        };
    }
  }
}
