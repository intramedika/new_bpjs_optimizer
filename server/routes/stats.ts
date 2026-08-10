import { Router } from "express";
import { claimRepository } from "../repositories/ClaimRepository";
import { syncQueueRepository } from "../repositories/SyncQueueRepository";

export const statsRoutes = Router();

statsRoutes.get(["/api/stats", "/stats"], async (req, res) => {
  try {
    const dataMode = (req.query.dataMode as string) || "ALL";
    const claims = await claimRepository.findAll(dataMode).catch(() => []);
    const queue = await syncQueueRepository.findAll().catch(() => []);
    
    let totalTariff = 0;
    claims.forEach(c => {
      totalTariff += (c.tariff || 0);
    });

    return res.json({
      success: true,
      activeMode: dataMode,
      totalClaims: claims.length,
      readyClaims: claims.filter(c => c.status === "Siap Diajukan").length,
      pendingClaims: claims.filter(c => c.status === "Pending" || c.status === "Perlu Review" || c.status === "Perlu Perbaikan").length,
      submittedClaims: claims.filter(c => c.status === "Sudah Diajukan" || c.status === "Dibayar").length,
      disputeClaims: claims.filter(c => c.status === "Dispute").length,
      offlineQueue: queue.length,
      totalTariff
    });
  } catch (error: any) {
    console.error("[Stats API Error]:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "STATS_ERROR",
        message: "Failed to calculate operational stats",
        requestId: `req-stats-${Date.now()}`
      }
    });
  }
});
