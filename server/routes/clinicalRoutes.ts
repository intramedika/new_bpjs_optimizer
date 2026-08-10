import { Router } from "express";
import { clinicalFindingRepository } from "../repositories/ClinicalFindingRepository";
import { clinicalIntelligenceEngine } from "../engines/ClinicalIntelligenceEngine";

export const clinicalRoutes = Router();

// Get clinical findings for a claim or all findings by dataMode
clinicalRoutes.get("/api/clinical/findings", async (req, res) => {
  try {
    const claimId = req.query.claimId as string;
    const dataMode = (req.query.dataMode as string) || "REAL";

    if (claimId) {
      const findings = await clinicalFindingRepository.findByClaimId(claimId);
      res.json({ status: "success", count: findings.length, findings });
    } else {
      const findings = await clinicalFindingRepository.findAll(dataMode);
      res.json({ status: "success", count: findings.length, findings });
    }
  } catch (error: any) {
    res.status(200).json({ status: "success", count: 0, findings: [] });
  }
});

// Run clinical extraction for a claim
clinicalRoutes.post("/api/clinical/extract", async (req, res) => {
  try {
    const { claimId } = req.body;
    if (!claimId) {
      return res.status(400).json({ error: "claimId is required" });
    }

    const findings = await clinicalIntelligenceEngine.extractFindingsForClaim(claimId);
    res.json({ status: "success", message: `Extracted ${findings.length} clinical findings.`, findings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm or reject a clinical finding
clinicalRoutes.put("/api/clinical/findings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, claimId, icdCode } = req.body;

    if (status === "CONFIRMED" && claimId) {
      const updatedClaim = await clinicalIntelligenceEngine.confirmFindingAndUpdateClaim(id, claimId, icdCode || "");
      res.json({ status: "success", message: "Finding confirmed and claim updated.", claim: updatedClaim });
    } else {
      const ok = await clinicalFindingRepository.updateStatus(id, status);
      res.json({ status: ok ? "success" : "failed" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
