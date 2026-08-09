import { BaseAdapter } from "./BaseAdapter";
import { 
  AdapterMetadata, 
  IntegrationConfiguration, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse 
} from "../Interfaces";

export class SIMRSAdapter extends BaseAdapter {
  protected metadata: AdapterMetadata = {
    adapterId: "simrs",
    name: "SIMRS Generic Adapter",
    provider: "Hospital Information System (HIS)",
    version: "v2.1.0",
    environment: "TEST",
    capabilities: ["patient", "encounter", "claim", "document", "FHIR", "REST"],
    status: "NOT_CONFIGURED"
  };

  validateConfiguration(config: IntegrationConfiguration): boolean {
    return Boolean(config && config.baseUrl && config.baseUrl.trim().length > 0);
  }

  async testConnection(config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();
    if (!this.validateConfiguration(config)) {
      return this.buildResponse({
        success: false,
        status: "NOT_CONFIGURED",
        operation: "testConnection",
        message: "SIMRS Adapter Base URL is NOT CONFIGURED.",
        errorCode: "NOT_CONFIGURED",
        latencyMs: 0
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.credentials?.timeoutMs || 4000);

      const response = await fetch(config.baseUrl, {
        method: "GET",
        headers: config.credentials?.apiKey ? { "Authorization": config.credentials.apiKey } : {},
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return this.buildResponse({
          success: true,
          status: "CONNECTED",
          operation: "testConnection",
          message: "Successfully connected to customer SIMRS REST endpoint.",
          externalResponseCode: response.status,
          latencyMs
        });
      } else {
        return this.buildResponse({
          success: false,
          status: "ERROR",
          operation: "testConnection",
          message: `SIMRS endpoint returned HTTP ${response.status}`,
          externalResponseCode: response.status,
          errorCode: "EXTERNAL_SERVER_ERROR",
          latencyMs
        });
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorCode = this.normalizeError(err);
      return this.buildResponse({
        success: false,
        status: "ERROR",
        operation: "testConnection",
        message: `SIMRS connection failed: ${err.message || 'Host unreachable'}`,
        errorCode,
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
        message: "SIMRS Adapter is NOT CONFIGURED.",
        errorCode: "NOT_CONFIGURED",
        latencyMs: 0
      });
    }

    if (!this.getCapabilities().includes(request.operation)) {
      return this.buildResponse({
        success: false,
        status: "ERROR",
        operation: request.operation,
        message: `Operation '${request.operation}' is unsupported by SIMRS Adapter.`,
        errorCode: "UNSUPPORTED_OPERATION",
        latencyMs: 0
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), request.timeoutMs || 5000);

      const endpoint = `${config.baseUrl}/${request.operation}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.credentials?.apiKey ? { "Authorization": config.credentials.apiKey } : {})
        },
        body: JSON.stringify(request.payload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const json = await response.json().catch(() => ({}));

      return this.buildResponse({
        success: response.ok,
        status: response.ok ? "CONNECTED" : "ERROR",
        operation: request.operation,
        message: response.ok ? "SIMRS payload executed successfully." : `SIMRS payload returned ${response.status}`,
        externalResponseCode: response.status,
        data: json,
        latencyMs
      });

    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return this.buildResponse({
        success: false,
        status: "ERROR",
        operation: request.operation,
        message: `SIMRS operation failed: ${err.message}`,
        errorCode: this.normalizeError(err),
        technicalError: err.message,
        latencyMs
      });
    }
  }
}
