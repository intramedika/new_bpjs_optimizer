import { importRoutes } from "./server/routes/import";
import { statsRoutes } from "./server/routes/stats";
import { localRoutes } from "./server/routes/local";
import { healthRoutes } from "./server/routes/health";
import { integrationRoutes } from "./server/routes/integration";
import { documentRoutes } from "./server/routes/documents";
import { testCenterRoutes } from "./server/routes/testCenter";
import { demoRoutes } from "./server/routes/demoRoutes";
import { clinicalRoutes } from "./server/routes/clinicalRoutes";
import { reconciliationRoutes } from "./server/routes/reconciliationRoutes";
import { settingsRoutes } from "./server/routes/settingsRoutes";
import { adminRoutes } from "./server/routes/adminRoutes";
import { adminDatabaseRoutes } from "./server/routes/adminDatabaseRoutes";
import revenueRoutes from "./server/routes/revenueRoutes";
import codingRoutes from "./server/routes/codingRoutes";
import { documentRepository } from "./server/repositories/DocumentRepository";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { claimRepository } from "./server/repositories/ClaimRepository";
import { seedClaims } from "./server/data/seed";
import { grouperEngine } from "./server/engines/GrouperEngine";
import { validationEngine } from "./server/engines/ValidationEngine";
import { readinessEngine } from "./server/engines/ReadinessEngine";

import { initializeIntegrationHub } from "./server/integration/Init";
import { authenticateRequest } from "./server/security/SecurityMiddleware";
import { Role } from "./server/security/Roles";
import { resolvePrincipalFromRequest } from "./server/security/SecurityContext";

dotenv.config();

async function startServer() {
  console.log("[BPJS Optimizer] Application started cleanly without automatic synthetic claim seeding.");
  initializeIntegrationHub();

  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Global Authentication & Principal Scope Middleware
  app.use(authenticateRequest);

  app.use(integrationRoutes);
  app.use(healthRoutes);
  app.use(localRoutes);
  app.use(statsRoutes);
  app.use(importRoutes);
  app.use(documentRoutes);
  app.use(testCenterRoutes);
  app.use(demoRoutes);
  app.use(clinicalRoutes);
  app.use(reconciliationRoutes);
  app.use(settingsRoutes);
  app.use(adminRoutes);
  app.use(adminDatabaseRoutes);
  app.use("/api", revenueRoutes);
  app.use("/api", codingRoutes);

  app.get("/api/claims", async (req, res) => {
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);
    const dataMode = (req.query.dataMode as string) || "ALL";
    let claims = await claimRepository.findAll(dataMode, {
      tenantId: principal.tenantId,
      hospitalId: principal.role === Role.PLATFORM_ADMIN || principal.role === Role.TENANT_ADMIN ? undefined : principal.hospitalId,
      groupId: principal.groupId,
      userId: principal.userId,
      role: principal.role
    }).catch(() => []);
    
    res.json({ status: "success", claims, count: claims.length });
  });

  app.get("/api/claims/:id", async (req, res) => {
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);
    const claim = await claimRepository.findById(req.params.id, {
      tenantId: principal.tenantId,
      hospitalId: principal.role === Role.PLATFORM_ADMIN || principal.role === Role.TENANT_ADMIN ? undefined : principal.hospitalId,
      groupId: principal.groupId,
      userId: principal.userId,
      role: principal.role
    }).catch(() => null);

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.json(claim);
  });

  app.post("/api/claims/:id/grouper", async (req, res) => {
    const claim = await claimRepository.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    try {
      const prediction = await grouperEngine.predict(claim);
      res.json({ status: "success", prediction });
    } catch (error) {
      res.status(500).json({ error: "Grouper engine failed" });
    }
  });

  app.post("/api/claims/:id/analyze", async (req, res) => {
    const claim = await claimRepository.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "NOT_CONFIGURED", message: "Gemini API key is required." });


      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        As a medical coding auditor, analyze the following claim data and provide feedback on its readiness.
        
        Claim Data:
        - Diagnosis: ${claim.principalDiagnosis} (${claim.principalDiagnosisCode})
        - Secondary: ${claim.secondaryDiagnoses.join(', ')}
        - Procedures: ${claim.procedures.join(', ')}
        - CBG: ${claim.cbgCode} - ${claim.cbgDescription}
        - Severity: ${claim.severity}
        
        Please provide a short paragraph analysis, and a JSON array of specific string suggestions for improvement if any.
        Format your response as a JSON object:
        {
          "analysis": "Your detailed paragraph here...",
          "suggestions": ["Suggestion 1", "Suggestion 2"]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      if (!response.text) {
        throw new Error("No response from AI");
      }
      
      const result = JSON.parse(response.text);
      res.json({ status: "success", ...result });
      
    } catch (error) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ error: "Failed to analyze claim" });
    }
  });

  // REST API Endpoints for Claims with Data Lineage & Mode filtering
  app.get("/api/claims", async (req, res) => {
    try {
      const dataMode = (req.query.dataMode as string) || "REAL";
      const claims = await claimRepository.findAll(dataMode);
      res.json({ status: "success", count: claims.length, dataMode, claims });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await claimRepository.findById(req.params.id);
      if (!claim) return res.status(404).json({ error: "Claim not found" });
      res.json(claim);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/claims", async (req, res) => {
    try {
      const newClaim = await claimRepository.create({
        ...req.body,
        id: req.body.id || `CLM-MANUAL-${Date.now()}`,
        dataMode: req.body.dataMode || "REAL",
        sourceType: req.body.sourceType || "MANUAL",
        sourceReference: req.body.sourceReference || "MANUAL_ENTRY"
      });
      res.json({ status: "success", claim: newClaim });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/claims/:id", async (req, res) => {
    try {
      const updated = await claimRepository.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Claim not found" });
      res.json({ status: "success", claim: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/claims/:id", async (req, res) => {
    try {
      const success = await claimRepository.delete(req.params.id);
      res.json({ status: success ? "success" : "failed" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
