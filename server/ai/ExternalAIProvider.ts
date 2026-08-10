import { GoogleGenAI } from "@google/genai";
import { AIRuntimeAdapter, AIHealthStatus, ClinicalExtractionResult, ExtractionOptions } from "./AIRuntimeAdapter";

export class ExternalAIProvider implements AIRuntimeAdapter {
  providerName: "gemini" = "gemini";
  modelName: string = "gemini-2.5-flash";
  apiKey: string | null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  async healthCheck(): Promise<AIHealthStatus> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        runtime: "VERCEL",
        provider: this.providerName,
        model: this.modelName,
        endpoint: "https://generativelanguage.googleapis.com",
        status: "NOT_CONFIGURED",
        latencyMs: 0,
        details: { message: "GEMINI_API_KEY environment variable is not configured" }
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: "PING"
      });

      const latencyMs = Date.now() - start;
      const isOk = Boolean(response.text);

      return {
        runtime: "VERCEL",
        provider: this.providerName,
        model: this.modelName,
        endpoint: "https://generativelanguage.googleapis.com",
        status: isOk ? "READY" : "UNAVAILABLE",
        latencyMs
      };
    } catch (err: any) {
      return {
        runtime: "VERCEL",
        provider: this.providerName,
        model: this.modelName,
        endpoint: "https://generativelanguage.googleapis.com",
        status: "UNAVAILABLE",
        latencyMs: Date.now() - start,
        details: { error: err.message || "Failed to reach External AI Provider" }
      };
    }
  }

  async extractClinicalEvidence(documentText: string, options?: ExtractionOptions): Promise<ClinicalExtractionResult> {
    if (!this.apiKey) {
      throw new Error("External AI Provider requires GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const prompt = `
Analyze this clinical medical record document. Extract structured BPJS claim evidence.

Document Content:
${documentText.substring(0, 8000)}

Format strictly as a JSON object:
{
  "patientName": "string or null",
  "mrNumber": "string or null",
  "sepNumber": "string or null",
  "documentType": "string or null",
  "diagnoses": [
    {
      "text": "Diagnosis description",
      "code": "ICD-10 code",
      "confidence": 95,
      "page": 1,
      "sourceDocument": "Resume Medis",
      "sourceSection": "ASSESSMENT",
      "diagnosisStage": "FINAL",
      "evidenceType": "EXPLICIT_DIAGNOSIS",
      "sourceText": "Source quote"
    }
  ],
  "procedures": [
    {
      "text": "Procedure description",
      "code": "ICD-9-CM code",
      "confidence": 95,
      "page": 1,
      "sourceText": "Source quote"
    }
  ],
  "medications": [{ "text": "Medication name", "confidence": 95, "sourceText": "Quote" }],
  "laboratories": [{ "test": "Test name", "result": "Result", "confidence": 95, "sourceText": "Quote" }],
  "matchConfidence": 95
}
`;

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) {
      throw new Error("External AI returned empty response");
    }

    const parsed = JSON.parse(response.text);
    return {
      patientName: parsed.patientName || null,
      mrNumber: parsed.mrNumber || null,
      sepNumber: parsed.sepNumber || null,
      documentType: parsed.documentType || "Resume Medis",
      diagnoses: (parsed.diagnoses || []).map((d: any) => ({
        text: d.text || "",
        code: d.code || "R69",
        confidence: d.confidence || 90,
        page: d.page || 1,
        sourceDocument: d.sourceDocument || options?.documentName || "Resume Medis",
        sourceSection: d.sourceSection || "ASSESSMENT",
        diagnosisStage: d.diagnosisStage || "FINAL",
        evidenceType: d.evidenceType || "EXPLICIT_DIAGNOSIS",
        sourceText: d.sourceText || d.text || ""
      })),
      procedures: (parsed.procedures || []).map((p: any) => ({
        text: p.text || "",
        code: p.code || "89.07",
        confidence: p.confidence || 90,
        page: p.page || 1,
        sourceText: p.sourceText || p.text || ""
      })),
      medications: (parsed.medications || []).map((m: any) => ({
        text: m.text || "",
        confidence: m.confidence || 90,
        sourceText: m.sourceText || m.text || ""
      })),
      laboratories: (parsed.laboratories || []).map((l: any) => ({
        test: l.test || "",
        result: l.result || "",
        confidence: l.confidence || 90,
        sourceText: l.sourceText || l.test || ""
      })),
      matchConfidence: parsed.matchConfidence || 90,
      rawResponse: response.text
    };
  }
}
