import { Router } from "express";
import { aiManager } from "../ai/AIManager";

export const aiRoutes = Router();

aiRoutes.get("/api/ai/health", async (req, res) => {
  try {
    const health = await aiManager.getHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      runtime: aiManager.getRuntime(),
      provider: "unknown",
      model: "unknown",
      endpoint: "unknown",
      status: "UNAVAILABLE",
      latencyMs: 0,
      error: error.message
    });
  }
});

aiRoutes.get("/api/ai/models", async (req, res) => {
  try {
    const health = await aiManager.getHealth();
    res.json({
      activeRuntime: health.runtime,
      activeProvider: health.provider,
      activeModel: health.model,
      endpoint: health.endpoint,
      status: health.status,
      supportedRuntimes: ["LOCAL", "VPS", "AI_SERVER", "VERCEL"],
      availableProviders: ["ollama", "gemini", "local_fallback"],
      details: health.details
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

aiRoutes.post("/api/ai/extract", async (req, res) => {
  try {
    const { text, filename, mimeType, hash } = req.body || {};
    if (!text && !filename) {
      return res.status(400).json({ error: "Document text or filename required" });
    }

    const result = await aiManager.extractClinicalEvidence(text || "", {
      documentName: filename,
      mimeType,
      hash
    });

    res.json({
      status: "success",
      runtime: aiManager.getRuntime(),
      extraction: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
