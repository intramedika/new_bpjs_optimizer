import { BaseAdapter } from "./BaseAdapter";
import { 
  AdapterMetadata, 
  IntegrationConfiguration, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse 
} from "../Interfaces";

export class VClaimAdapter extends BaseAdapter {
  protected metadata: AdapterMetadata = {
    adapterId: "vclaim",
    name: "BPJS Health VClaim Adapter",
    provider: "BPJS KESEHATAN",
    version: "v2.0.0",
    environment: "TEST",
    capabilities: ["connection", "SEP", "eligibility", "claim-related services"],
    status: "NOT_CONFIGURED"
  };

  validateConfiguration(config: IntegrationConfiguration): boolean {
    return Boolean(
      config && 
      config.baseUrl && 
      config.baseUrl.trim().length > 0 &&
      config.credentials?.consId &&
      config.credentials?.secretKey
    );
  }

  async testConnection(config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();
    if (!this.validateConfiguration(config)) {
      return this.buildResponse({
        success: false,
        status: "NOT_CONFIGURED",
        operation: "testConnection",
        message: "VClaim ConsID and SecretKey are NOT CONFIGURED.",
        errorCode: "NOT_CONFIGURED",
        latencyMs: 0
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${config.baseUrl}/SEP/1.1`, {
        method: "GET",
        headers: {
          "X-cons-id": config.credentials.consId,
          "user_key": config.credentials.userKey || ""
        },
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return this.buildResponse({
          success: true,
          status: "CONNECTED",
          operation: "testConnection",
          message: "VClaim Web Service connection VERIFIED.",
          externalResponseCode: response.status,
          latencyMs
        });
      } else {
        return this.buildResponse({
          success: false,
          status: "ERROR",
          operation: "testConnection",
          message: `VClaim returned HTTP ${response.status}`,
          externalResponseCode: response.status,
          errorCode: "EXTERNAL_SERVER_ERROR",
          latencyMs
        });
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return this.buildResponse({
        success: false,
        status: "ERROR",
        operation: "testConnection",
        message: `VClaim connection failed: ${err.message || 'Host unreachable'}`,
        errorCode: this.normalizeError(err),
        technicalError: err.message,
        latencyMs
      });
    }
  }

  async execute(request: CanonicalIntegrationRequest, config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();

    if (!this.validateConfiguration(config)) {
      return this.buildResponse({
        success: false,
        status: "NOT_CONFIGURED",
        operation: request.operation,
        message: "VClaim Adapter is NOT CONFIGURED.",
        errorCode: "NOT_CONFIGURED",
        latencyMs: 0
      });
    }

    if (request.operation === "connection") {
      return this.testConnection(config);
    }

    return this.buildResponse({
      success: false,
      status: "DEGRADED",
      operation: request.operation,
      message: `VClaim operation '${request.operation}' is NOT VERIFIED against target BPJS environment. Live ConsID signature validation required.`,
      errorCode: "UNSUPPORTED_OPERATION",
      latencyMs: Date.now() - startTime
    });
  }
}
