import { AIRuntimeAdapter, AIHealthStatus, ClinicalExtractionResult, ExtractionOptions, AIRuntimeMode } from "./AIRuntimeAdapter";

export class OllamaAdapter implements AIRuntimeAdapter {
  providerName: "ollama" = "ollama";
  modelName: string;
  baseUrl: string;
  runtime: AIRuntimeMode;

  constructor(runtime: AIRuntimeMode = "LOCAL") {
    this.runtime = runtime;
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.modelName = process.env.OLLAMA_MODEL || "Llama-3-8B-Q4";
  }

  async healthCheck(): Promise<AIHealthStatus> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          runtime: this.runtime,
          provider: this.providerName,
          model: this.modelName,
          endpoint: this.baseUrl,
          status: "UNAVAILABLE",
          latencyMs,
          details: { error: `HTTP ${response.status}` }
        };
      }

      const data: any = await response.json().catch(() => ({}));
      const models = Array.isArray(data.models) ? data.models.map((m: any) => m.name || m.model) : [];
      
      const isModelFound = models.some((m: string) => 
        m.toLowerCase().includes(this.modelName.toLowerCase()) || 
        this.modelName.toLowerCase().includes(m.toLowerCase())
      );

      return {
        runtime: this.runtime,
        provider: this.providerName,
        model: this.modelName,
        endpoint: this.baseUrl,
        status: isModelFound ? "READY" : "UNAVAILABLE",
        latencyMs,
        details: { installedModels: models, targetFound: isModelFound }
      };
    } catch (err: any) {
      return {
        runtime: this.runtime,
        provider: this.providerName,
        model: this.modelName,
        endpoint: this.baseUrl,
        status: "UNAVAILABLE",
        latencyMs: Date.now() - start,
        details: { error: err.message || "Failed to connect to Ollama service" }
      };
    }
  }

  async extractClinicalEvidence(documentText: string, options?: ExtractionOptions): Promise<ClinicalExtractionResult> {
    const cleanText = this.sanitizeInputText(documentText);
    const prompt = `
You are an expert Indonesian BPJS Medical Coding AI Assistant.
Analyze the following clinical medical record document and extract structured medical information.

[DOCUMENT CONTENT START]
${cleanText.substring(0, 8000)}
[DOCUMENT CONTENT END]

Return ONLY a JSON object formatted strictly with the following schema:
{
  "patientName": "string or null",
  "mrNumber": "string or null",
  "sepNumber": "string or null",
  "documentType": "string or null",
  "diagnoses": [
    {
      "text": "Diagnosis description",
      "code": "ICD-10 code (e.g. K74.6, R18.8)",
      "confidence": 90,
      "page": 1,
      "sourceDocument": "Resume Medis",
      "sourceSection": "ASSESSMENT",
      "diagnosisStage": "FINAL",
      "evidenceType": "EXPLICIT_DIAGNOSIS",
      "sourceText": "Exact quote from document"
    }
  ],
  "procedures": [
    {
      "text": "Procedure description",
      "code": "ICD-9-CM code (e.g. 89.07)",
      "confidence": 90,
      "page": 1,
      "sourceText": "Exact quote from document"
    }
  ],
  "medications": [
    { "text": "Medication name", "confidence": 90, "sourceText": "Quote" }
  ],
  "laboratories": [
    { "test": "Lab test name", "result": "Lab result", "confidence": 90, "sourceText": "Quote" }
  ],
  "matchConfidence": 95
}
`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName.includes(":") ? this.modelName : "llama3",
          prompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama inference HTTP ${response.status}`);
      }

      const resData: any = await response.json();
      const rawText = resData.response || "";
      const parsed = JSON.parse(rawText);
      return this.validateAndNormalizeResult(parsed, options);
    } catch (err: any) {
      console.warn("[OllamaAdapter] Ollama inference fallback:", err.message);
      throw err;
    }
  }

  private sanitizeInputText(text: string): string {
    if (!text) return "";
    return text
      .replace(/%PDF-\d\.\d[\s\S]*?stream/gi, "")
      .replace(/endstream[\s\S]*?endobj/gi, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private validateAndNormalizeResult(parsed: any, options?: ExtractionOptions): ClinicalExtractionResult {
    const docName = options?.documentName || "Resume Medis";
    return {
      patientName: parsed.patientName || null,
      mrNumber: parsed.mrNumber || null,
      sepNumber: parsed.sepNumber || null,
      documentType: parsed.documentType || "Resume Medis",
      diagnoses: (parsed.diagnoses || []).map((d: any, idx: number) => ({
        text: d.text || "Unspecified Diagnosis",
        code: d.code || "R69",
        confidence: typeof d.confidence === "number" ? d.confidence : 90,
        page: typeof d.page === "number" ? d.page : 1,
        sourceDocument: d.sourceDocument || docName,
        sourceSection: d.sourceSection || "ASSESSMENT",
        diagnosisStage: (d.diagnosisStage === "WORKING" || d.diagnosisStage === "PRELIMINARY") ? d.diagnosisStage : "FINAL",
        evidenceType: d.evidenceType || "EXPLICIT_DIAGNOSIS",
        sourceText: d.sourceText || d.text || ""
      })),
      procedures: (parsed.procedures || []).map((p: any) => ({
        text: p.text || "Unspecified Procedure",
        code: p.code || "89.07",
        confidence: typeof p.confidence === "number" ? p.confidence : 90,
        page: typeof p.page === "number" ? p.page : 1,
        sourceText: p.sourceText || p.text || ""
      })),
      medications: (parsed.medications || []).map((m: any) => ({
        text: m.text || "",
        confidence: typeof m.confidence === "number" ? m.confidence : 90,
        sourceText: m.sourceText || m.text || ""
      })),
      laboratories: (parsed.laboratories || []).map((l: any) => ({
        test: l.test || "",
        result: l.result || "",
        confidence: typeof l.confidence === "number" ? l.confidence : 90,
        sourceText: l.sourceText || l.test || ""
      })),
      matchConfidence: typeof parsed.matchConfidence === "number" ? parsed.matchConfidence : 90,
      rawResponse: JSON.stringify(parsed)
    };
  }
}
