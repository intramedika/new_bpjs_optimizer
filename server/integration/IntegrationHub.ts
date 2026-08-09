import { 
  IIntegrationHub, 
  CanonicalIntegrationRequest, 
  CanonicalIntegrationResponse, 
  IntegrationConfiguration, 
  IntegrationStatus,
  IntegrationErrorCode
} from "./Interfaces";
import { integrationRegistry } from "./IntegrationRegistry";
import { integrationConfigRepository } from "./repositories/IntegrationConfigRepository";
import { integrationExecutionRepository } from "./repositories/IntegrationExecutionRepository";
import { integrationJobQueueRepository } from "./repositories/IntegrationJobQueueRepository";
import crypto from "crypto";

export class IntegrationHub implements IIntegrationHub {
  private idempotencyCache: Map<string, CanonicalIntegrationResponse> = new Map();

  async saveConfiguration(config: Omit<IntegrationConfiguration, "id" | "createdAt" | "updatedAt" | "status">): Promise<IntegrationConfiguration> {
    const defaultStatus: IntegrationStatus = config.environment === "MOCK" ? "MOCK_CONNECTED" : (config.baseUrl ? "CONFIGURED" : "NOT_CONFIGURED");
    const saved = await integrationConfigRepository.save({
      ...config,
      status: defaultStatus
    });
    console.log(`[IntegrationHub] Saved config for adapter: ${saved.adapterId} (${saved.environment})`);
    return saved;
  }

  async getConfiguration(adapterId: string, tenantId: string, hospitalId: string): Promise<IntegrationConfiguration | null> {
    return integrationConfigRepository.findByAdapter(adapterId, tenantId, hospitalId);
  }

  async testConnection(adapterId: string, tenantId: string, hospitalId: string): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();
    let targetAdapterId = adapterId;

    // Load config to check environment
    let config = await integrationConfigRepository.findByAdapter(adapterId, tenantId, hospitalId);
    
    // Auto-map mock environment if requested or configured
    if ((config && config.environment === "MOCK") || adapterId.startsWith("mock-")) {
      if (adapterId === "eklaim") targetAdapterId = "mock-eklaim";
      if (adapterId === "vclaim") targetAdapterId = "mock-vclaim";
    }

    const adapter = integrationRegistry.getAdapter(targetAdapterId);
    if (!adapter) {
      return this.buildHubError(adapterId, "testConnection", "UNSUPPORTED_OPERATION", `Adapter '${targetAdapterId}' is not registered.`, 0);
    }

    // Production safety check
    if (config?.environment === "PRODUCTION" && adapter.getMetadata().isMockAdapter) {
      return this.buildHubError(adapterId, "testConnection", "UNSUPPORTED_OPERATION", "Mock adapters are strictly prohibited in PRODUCTION mode.", 0);
    }

    // Create fallback mock config if not stored
    if (!config && targetAdapterId.startsWith("mock-")) {
      config = {
        id: `ICFG-MOCK-${targetAdapterId}`,
        tenantId,
        hospitalId,
        adapterId: targetAdapterId,
        environment: "MOCK",
        baseUrl: "https://mock.sandbox.local",
        credentials: { mockSecret: "MOCK_SECRET_KEY" },
        status: "MOCK_CONNECTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    if (!config || !adapter.validateConfiguration(config)) {
      return this.buildHubError(adapterId, "testConnection", "NOT_CONFIGURED", `Adapter '${adapterId}' credentials or Base URL NOT CONFIGURED for tenant '${tenantId}'.`, 0);
    }

    const response = await adapter.testConnection(config);
    const durationMs = Date.now() - startTime;

    // Update persistent health status
    await integrationConfigRepository.save({
      ...config,
      status: response.status
    });

    // Record execution audit
    await integrationExecutionRepository.record({
      requestId: `REQ-PING-${Date.now()}`,
      tenantId,
      hospitalId,
      adapterId: targetAdapterId,
      operation: "testConnection",
      status: response.success ? "SUCCESS" : "FAILED",
      durationMs,
      responseCode: response.externalResponseCode,
      errorCode: response.errorCode,
      isMock: Boolean(response.isMock),
      environment: config.environment
    });

    return response;
  }

  async getHealth(tenantId: string, hospitalId: string): Promise<Record<string, { status: IntegrationStatus; latencyMs: number; error?: string; environment?: string }>> {
    const healthMap: Record<string, { status: IntegrationStatus; latencyMs: number; error?: string; environment?: string }> = {};
    const adapters = integrationRegistry.listAdapters();

    for (const meta of adapters) {
      const config = await integrationConfigRepository.findByAdapter(meta.adapterId, tenantId, hospitalId);
      const adapter = integrationRegistry.getAdapter(meta.adapterId);
      
      if (!adapter) continue;

      if (meta.isMockAdapter) {
        const health = await adapter.getHealth(config || undefined);
        healthMap[meta.adapterId] = { ...health, environment: "MOCK" };
      } else if (!config || !adapter.validateConfiguration(config)) {
        healthMap[meta.adapterId] = { status: "NOT_CONFIGURED", latencyMs: 0, environment: config?.environment || "TEST" };
      } else {
        const health = await adapter.getHealth(config);
        healthMap[meta.adapterId] = { ...health, environment: config.environment };
      }
    }

    return healthMap;
  }

  async execute(request: CanonicalIntegrationRequest): Promise<CanonicalIntegrationResponse> {
    const startTime = Date.now();
    const requestId = request.requestId || `REQ-${Date.now()}-${Math.floor(Math.random()*1000)}`;

    // 1. Multi-tenant Validation
    if (!request.tenantId || !request.hospitalId) {
      return this.buildHubError(request.adapterId, request.operation, "VALIDATION_ERROR", "Tenant ID and Hospital ID are required.", 0);
    }

    // 2. Idempotency Check for mutations
    const requestHash = request.requestHash || this.computeRequestHash(request);
    if (this.idempotencyCache.has(requestHash)) {
      console.log(`[IntegrationHub] Idempotent cache hit for hash: ${requestHash}`);
      const cached = this.idempotencyCache.get(requestHash)!;
      return {
        ...cached,
        message: `DUPLICATE_PREVENTED: Returning cached response from request ${cached.externalRequestId || requestId}`
      };
    }

    // 3. Resolve Environment & Adapter Mapping
    let targetAdapterId = request.adapterId;
    let config = await integrationConfigRepository.findByAdapter(request.adapterId, request.tenantId, request.hospitalId);

    if ((config && config.environment === "MOCK") || request.adapterId.startsWith("mock-")) {
      if (request.adapterId === "eklaim") targetAdapterId = "mock-eklaim";
      if (request.adapterId === "vclaim") targetAdapterId = "mock-vclaim";
    }

    const adapter = integrationRegistry.getAdapter(targetAdapterId);
    if (!adapter) {
      return this.buildHubError(request.adapterId, request.operation, "UNSUPPORTED_OPERATION", `Adapter '${targetAdapterId}' not found.`, 0);
    }

    // Production Safety Enforcement (Section 30)
    if (config?.environment === "PRODUCTION" && adapter.getMetadata().isMockAdapter) {
      return this.buildHubError(request.adapterId, request.operation, "UNSUPPORTED_OPERATION", "Mock adapters are strictly prohibited in PRODUCTION mode.", 0);
    }

    if (!adapter.getCapabilities().includes(request.operation)) {
      return this.buildHubError(request.adapterId, request.operation, "UNSUPPORTED_OPERATION", `Operation '${request.operation}' is not supported by adapter '${targetAdapterId}'.`, 0);
    }

    // Default mock config fallback if not configured
    if (!config && targetAdapterId.startsWith("mock-")) {
      config = {
        id: `ICFG-MOCK-${targetAdapterId}`,
        tenantId: request.tenantId,
        hospitalId: request.hospitalId,
        adapterId: targetAdapterId,
        environment: "MOCK",
        baseUrl: "https://mock.sandbox.local",
        credentials: { mockSecret: "MOCK_SECRET_KEY" },
        status: "MOCK_CONNECTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // 4. Validate Configuration
    if (!config || !adapter.validateConfiguration(config)) {
      // Offline fallback / Queueing when integration not configured or offline
      await integrationJobQueueRepository.enqueue({
        tenantId: request.tenantId,
        hospitalId: request.hospitalId,
        adapterId: request.adapterId,
        operation: request.operation,
        entityType: "Claim",
        entityId: request.payload?.id || requestId,
        maxAttempts: 3,
        payload: request.payload,
        lastError: "Adapter NOT CONFIGURED or OFFLINE. Queued in Offline Sync Queue."
      });

      return this.buildHubError(request.adapterId, request.operation, "NOT_CONFIGURED", `Adapter '${request.adapterId}' is NOT CONFIGURED. Operation queued in Offline Sync Queue.`, 0, "WAITING_FOR_CONNECTION");
    }

    // 5. Retry Loop for Transient Errors
    let response: CanonicalIntegrationResponse | null = null;
    let attempts = 0;
    const maxRetries = 2;

    while (attempts <= maxRetries) {
      attempts++;
      try {
        response = await adapter.execute(request, config);
        
        // Retry transient errors only (NETWORK_ERROR, TIMEOUT, 5xx, RATE_LIMIT)
        if (!response.success && this.isTransientError(response.errorCode)) {
          if (attempts <= maxRetries) {
            console.log(`[IntegrationHub] Retrying transient error (${response.errorCode}), attempt ${attempts}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, 200 * attempts));
            continue;
          }
        }
        break;
      } catch (err: any) {
        const errorCode = adapter.normalizeError(err);
        if (attempts <= maxRetries && this.isTransientError(errorCode)) {
          await new Promise(r => setTimeout(r, 200 * attempts));
          continue;
        }

        response = this.buildHubError(request.adapterId, request.operation, errorCode, err.message, Date.now() - startTime);
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    const finalResponse = response || this.buildHubError(request.adapterId, request.operation, "UNKNOWN_ERROR", "No response returned from adapter.", durationMs);

    // 6. Cache Idempotency for mutations
    if (finalResponse.success) {
      this.idempotencyCache.set(requestHash, {
        ...finalResponse,
        externalRequestId: requestId
      });
    }

    // 7. Audit & Execution Logging (with isMock & environment flags)
    await integrationExecutionRepository.record({
      requestId,
      tenantId: request.tenantId,
      hospitalId: request.hospitalId,
      adapterId: targetAdapterId,
      operation: request.operation,
      status: finalResponse.success ? "SUCCESS" : "FAILED",
      durationMs,
      responseCode: finalResponse.externalResponseCode,
      errorCode: finalResponse.errorCode,
      isMock: Boolean(finalResponse.isMock || targetAdapterId.startsWith("mock-")),
      environment: config.environment
    });

    return finalResponse;
  }

  private isTransientError(errorCode?: IntegrationErrorCode): boolean {
    return errorCode === "NETWORK_ERROR" || errorCode === "TIMEOUT" || errorCode === "EXTERNAL_SERVER_ERROR" || errorCode === "RATE_LIMIT";
  }

  private computeRequestHash(request: CanonicalIntegrationRequest): string {
    const raw = `${request.tenantId}:${request.hospitalId}:${request.adapterId}:${request.operation}:${JSON.stringify(request.payload)}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  private buildHubError(
    adapterId: string, 
    operation: string, 
    errorCode: IntegrationErrorCode, 
    message: string, 
    latencyMs: number, 
    status: IntegrationStatus = "ERROR"
  ): CanonicalIntegrationResponse {
    return {
      success: false,
      status,
      provider: adapterId.toUpperCase(),
      adapterId,
      operation,
      message,
      errorCode,
      technicalError: message,
      latencyMs,
      timestamp: new Date().toISOString()
    };
  }
}

export const integrationHub = new IntegrationHub();
