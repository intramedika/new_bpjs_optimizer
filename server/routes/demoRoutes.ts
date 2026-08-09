import { Router } from "express";
import { demoController } from "../controllers/DemoController";

export const demoRoutes = Router();

// Explicit Demo Data Generation
demoRoutes.post("/api/demo/generate", async (req, res) => {
  try {
    const result = await demoController.generateDemoDataset();
    res.json({
      status: "success",
      message: `Berhasil membuat ${result.count} data klaim sintetis bertag DEMO.`,
      count: result.count,
      claims: result.claims
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear Demo Dataset Only (REAL data unaffected)
demoRoutes.delete("/api/demo/clear", async (req, res) => {
  try {
    const result = await demoController.clearDemoDataset();
    res.json({
      status: "success",
      message: `Berhasil menghapus ${result.deletedCount} data klaim DEMO. Data REAL aman.`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear Test Dataset Only (REAL data unaffected)
demoRoutes.delete("/api/test/clear", async (req, res) => {
  try {
    const result = await demoController.clearTestDataset();
    res.json({
      status: "success",
      message: `Berhasil menghapus ${result.deletedCount} data klaim TEST. Data REAL aman.`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
