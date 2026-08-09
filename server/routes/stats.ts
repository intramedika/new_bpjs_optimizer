import { Router } from "express";
import { claimRepository } from "../repositories/ClaimRepository";
import { syncQueueRepository } from "../repositories/SyncQueueRepository";

export const statsRoutes = Router();

statsRoutes.get("/api/stats", async (req, res) => {
  try {
    const dataMode = (req.query.dataMode as string) || "REAL";
    const claims = await claimRepository.findAll(dataMode);
    const queue = await syncQueueRepository.findAll();
    
    res.json({
      activeMode: dataMode,
      totalClaims: claims.length,
      readyClaims: claims.filter(c => c.status === "Siap Diajukan").length,
      pendingClaims: claims.filter(c => c.status === "Pending" || c.status === "Perlu Review" || c.status === "Perlu Perbaikan").length,
      submittedClaims: claims.filter(c => c.status === "Sudah Diajukan" || c.status === "Dibayar").length,
      disputeClaims: claims.filter(c => c.status === "Dispute").length,
      offlineQueue: queue.length,
      totalTariff: claims.reduce((acc, c) => acc + (c.tariff || 0), 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
