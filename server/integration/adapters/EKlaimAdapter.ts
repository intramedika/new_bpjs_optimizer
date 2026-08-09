import { BaseAdapter } from "./BaseAdapter";
import { 
  AdapterMetadata, 
  IntegrationConfiguration, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse 
} from "../Interfaces";

export class EKlaimAdapter extends BaseAdapter {
  protected metadata: AdapterMetadata = {
    adapterId: "eklaim",
    name: "E-Klaim INA-CBG Adapter",
    provider: "KEMENKES / INA-CBG",
    version: "v5.8.0",
    environment: "TEST",
    capabilities: ["connection", "diagnosis", "procedure", "grouping", "retrieve", "update"],
    status: "NOT_CONFIGURED"
  };

  validateConfiguration(config: IntegrationConfiguration): boolean {
    return Boolean(
      config && 
      config.baseUrl && 
      config.baseUrl.trim().length > 0 &&
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
        message: "E-Klaim Base URL and Secret Key are NOT CONFIGURED.",
        errorCode: "NOT_CONFIGURED",
        latencyMs: 0
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${config.baseUrl}/ws.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return this.buildResponse({
          success: true,
          status: "CONNECTED",
          operation: "testConnection",
          message: "E-Klaim API Web Service responded successfully.",
          externalResponseCode: response.status,
          latencyMs
        });
      } else {
        return this.buildResponse({
          success: false,
          status: "ERROR",
          operation: "testConnection",
          message: `E-Klaim API returned HTTP ${response.status}`,
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
        message: `E-Klaim API connection failed: ${err.message || 'Host unreachable'}`,
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
        message: "E-Klaim Adapter is NOT CONFIGURED.",
        errorCode: "NOT_CONFIGURED",
        latencyMs: 0
      });
    }

    if (request.operation === "connection") {
      return this.testConnection(config);
    }

    // For unverified E-Klaim WS methods (e.g. live grouping/diagnosis mutation)
    // where actual target host & secret key signature must be verified against official spec
    const verifiedOperations = ["connection"];
    if (!verifiedOperations.includes(request.operation)) {
      return this.buildResponse({
        success: false,
        status: "DEGRADED",
        operation: request.operation,
        message: `Operation '${request.operation}' is NOT VERIFIED against target live E-Klaim environment. Official client secret key signature required.`,
        errorCode: "UNSUPPORTED_OPERATION",
        technicalError: "NOT_VERIFIED: Endpoint signature contract requires live E-Klaim installation credentials.",
        latencyMs: Date.now() - startTime
      });
    }

    return this.buildResponse({
      success: false,
      status: "ERROR",
      operation: request.operation,
      message: "Unsupported operation.",
      errorCode: "UNSUPPORTED_OPERATION",
      latencyMs: Date.now() - startTime
    });
  }
}
