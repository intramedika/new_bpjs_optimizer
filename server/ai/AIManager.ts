import { AIRuntimeAdapter, AIHealthStatus, ClinicalExtractionResult, ExtractionOptions, AIRuntimeMode } from "./AIRuntimeAdapter";
import { OllamaAdapter } from "./OllamaAdapter";
import { ExternalAIProvider } from "./ExternalAIProvider";
import { LocalFallbackAdapter } from "./LocalFallbackAdapter";

export class AIManager {
  private static instance: AIManager;
  private adapter: AIRuntimeAdapter;
  private runtime: AIRuntimeMode;
  private extractionCache: Map<string, ClinicalExtractionResult> = new Map();

  private constructor() {
    this.runtime = this.resolveRuntime();
    this.adapter = this.createAdapter(this.runtime);
  }

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  private resolveRuntime(): AIRuntimeMode {
    const rawRuntime = (process.env.AI_RUNTIME || "").toUpperCase();
    if (rawRuntime === "LOCAL" || rawRuntime === "VPS" || rawRuntime === "AI_SERVER" || rawRuntime === "VERCEL") {
      return rawRuntime as AIRuntimeMode;
    }
    
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return "VERCEL";
    }

    return "LOCAL";
  }

  private createAdapter(runtime: AIRuntimeMode): AIRuntimeAdapter {
    const provider = (process.env.AI_PROVIDER || "").toLowerCase();

    if (runtime === "VERCEL") {
      if (process.env.GEMINI_API_KEY) {
        return new ExternalAIProvider();
      }
      return new LocalFallbackAdapter("VERCEL");
    }

    // LOCAL, VPS, AI_SERVER runtimes default to Ollama (Llama)
    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      return new ExternalAIProvider();
    }

    if (provider === "local_fallback") {
      return new LocalFallbackAdapter(runtime);
    }

    return new OllamaAdapter(runtime);
  }

  public getRuntime(): AIRuntimeMode {
    return this.runtime;
  }

  public getAdapter(): AIRuntimeAdapter {
    return this.adapter;
  }

  public async getHealth(): Promise<AIHealthStatus> {
    try {
      const health = await this.adapter.healthCheck();
      // If Ollama is unavailable on LOCAL/VPS/AI_SERVER, fall back to check LocalFallback status
      if (health.status === "UNAVAILABLE" && (this.runtime === "LOCAL" || this.runtime === "VPS")) {
        const fallback = new LocalFallbackAdapter(this.runtime);
        const fbHealth = await fallback.healthCheck();
        return {
          ...health,
          status: "UNAVAILABLE",
          details: { ...health.details, fallbackAvailable: fbHealth.status === "READY" }
        };
      }
      return health;
    } catch (err: any) {
      return {
        runtime: this.runtime,
        provider: this.adapter.providerName,
        model: this.adapter.modelName,
        endpoint: "unknown",
        status: "UNAVAILABLE",
        latencyMs: 0,
        details: { error: err.message }
      };
    }
  }

  public async extractClinicalEvidence(documentText: string, options?: ExtractionOptions): Promise<ClinicalExtractionResult> {
    const cacheKey = options?.hash || (options?.documentName ? `${options.documentName}_${documentText.length}` : null);
    if (cacheKey && this.extractionCache.has(cacheKey)) {
      console.log(`[AIManager] Extraction cache hit for key: ${cacheKey}`);
      return this.extractionCache.get(cacheKey)!;
    }

    let result: ClinicalExtractionResult;

    try {
      result = await this.adapter.extractClinicalEvidence(documentText, options);
    } catch (err: any) {
      console.warn(`[AIManager] Active AI provider (${this.adapter.providerName}) failed. Switching to LocalFallbackAdapter:`, err.message);
      const fallback = new LocalFallbackAdapter(this.runtime);
      result = await fallback.extractClinicalEvidence(documentText, options);
    }

    if (cacheKey) {
      this.extractionCache.set(cacheKey, result);
    }

    return result;
  }
}

export const aiManager = AIManager.getInstance();
