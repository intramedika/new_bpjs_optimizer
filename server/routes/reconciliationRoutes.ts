import { Router } from "express";
import { reconciliationRepository } from "../repositories/ReconciliationRepository";
import { reconciliationEngine } from "../engines/ReconciliationEngine";

export const reconciliationRoutes = Router();

// Get reconciliation records
reconciliationRoutes.get("/api/reconciliation", async (req, res) => {
  try {
    const dataMode = (req.query.dataMode as string) || "REAL";
    const claimId = req.query.claimId as string;

    if (claimId) {
      const record = await reconciliationRepository.findByClaimId(claimId);
      res.json({ status: "success", record });
    } else {
      const records = await reconciliationRepository.findAll(dataMode);
      res.json({ status: "success", count: records.length, records });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run reconciliation for a claim or all claims
reconciliationRoutes.post("/api/reconciliation/run", async (req, res) => {
  try {
    const { claimId, dataMode, actualResult } = req.body;

    if (claimId) {
      const record = await reconciliationEngine.reconcileClaim(claimId, actualResult);
      res.json({ status: "success", message: "Claim reconciled successfully.", record });
    } else {
      const records = await reconciliationEngine.reconcileAllActiveClaims(dataMode || "REAL");
      res.json({ status: "success", message: `Reconciled ${records.length} claims.`, count: records.length, records });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get reconciliation statistics
reconciliationRoutes.get("/api/reconciliation/stats", async (req, res) => {
  try {
    const dataMode = (req.query.dataMode as string) || "REAL";
    const records = await reconciliationRepository.findAll(dataMode);

    const matchCount = records.filter(r => r.varianceType === "EXACT_MATCH").length;
    const mismatchCount = records.filter(r => r.varianceType !== "EXACT_MATCH").length;
    const totalVariance = records.reduce((acc, r) => acc + (r.varianceAmount || 0), 0);

    res.json({
      status: "success",
      dataMode,
      totalCompared: records.length,
      matchCount,
      mismatchCount,
      totalVariance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
