import { Router } from "express";
import { documentRepository } from "../repositories/DocumentRepository";

export const healthRoutes = Router();

healthRoutes.get("/api/health/status", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Test if we can read DB
  let dbStatus = "NOT CONFIGURED";
  try {
    const test = await documentRepository.findAll();
    dbStatus = "REAL";
  } catch (err) {
    dbStatus = "FAILED";
  }

  res.json({
    database: dbStatus,
    ocrProvider: apiKey ? "REAL" : "NOT CONFIGURED",
    aiProvider: apiKey ? "REAL" : "NOT CONFIGURED",
    simrsConnector: "CONFIGURED", // User can test it, but it relies on input URL for now
    eKlaim: "NOT CONFIGURED",
    vClaim: "NOT CONFIGURED",
    diva: "NOT CONFIGURED"
  });
});
