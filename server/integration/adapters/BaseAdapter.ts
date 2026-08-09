import { 
  IIntegrationAdapter, 
  AdapterMetadata, 
  IntegrationConfiguration, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse, 
  IntegrationStatus, 
  IntegrationErrorCode 
} from "../Interfaces";

export abstract class BaseAdapter implements IIntegrationAdapter {
  protected abstract metadata: AdapterMetadata;

  getMetadata(): AdapterMetadata {
    return this.metadata;
  }

  getCapabilities(): string[] {
    return this.metadata.capabilities;
  }

  abstract validateConfiguration(config: IntegrationConfiguration): boolean;
  abstract testConnection(config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse>;
  abstract execute(request: CanonicalIntegrationRequest, config: IntegrationConfiguration): Promise<CanonicalIntegrationResponse>;

  async getHealth(config?: IntegrationConfiguration): Promise<{ status: IntegrationStatus; latencyMs: number; error?: string }> {
    if (!config || !this.validateConfiguration(config)) {
      return { status: "NOT_CONFIGURED", latencyMs: 0 };
    }
    const startTime = Date.now();
    try {
      const res = await this.testConnection(config);
      return {
        status: res.status,
        latencyMs: Date.now() - startTime,
        error: res.technicalError
      };
    } catch (err: any) {
      return {
        status: "ERROR",
        latencyMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  normalizeError(error: any): IntegrationErrorCode {
    if (!error) return "UNKNOWN_ERROR";
    const msg = String(error.message || error).toLowerCase();

    if (msg.includes("abort") || msg.includes("timeout")) return "TIMEOUT";
    if (msg.includes("econnrefused") || msg.includes("fetch failed") || msg.includes("network")) return "NETWORK_ERROR";
    if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) return "AUTH_ERROR";
    if (msg.includes("429") || msg.includes("rate limit")) return "RATE_LIMIT";
    if (msg.includes("500") || msg.includes("502") || msg.includes("503")) return "EXTERNAL_SERVER_ERROR";
    if (msg.includes("not configured")) return "NOT_CONFIGURED";
    if (msg.includes("not supported")) return "UNSUPPORTED_OPERATION";

    return "UNKNOWN_ERROR";
  }

  protected buildResponse<T>(params: {
    success: boolean;
    status: IntegrationStatus;
    operation: string;
    message: string;
    externalRequestId?: string;
    externalResponseCode?: string | number;
    errorCode?: IntegrationErrorCode;
    technicalError?: string;
    data?: T;
    latencyMs: number;
  }): CanonicalIntegrationResponse<T> {
    return {
      success: params.success,
      status: params.status,
      provider: this.metadata.provider,
      adapterId: this.metadata.adapterId,
      operation: params.operation,
      externalRequestId: params.externalRequestId,
      externalResponseCode: params.externalResponseCode,
      message: params.message,
      errorCode: params.errorCode,
      technicalError: params.technicalError,
      data: params.data,
      latencyMs: params.latencyMs,
      timestamp: new Date().toISOString()
    };
  }
}
