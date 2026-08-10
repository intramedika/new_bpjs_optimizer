import { Router } from "express";
import { databaseProviderManager } from "../db/DatabaseProviderManager";

export const healthRoutes = Router();

healthRoutes.get(["/api/health/status", "/health/status"], async (req, res) => {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const requestId = `req-health-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  let dbCheck: { status: string; latencyMs: number; error?: string } = { status: "FAILED", latencyMs: 0 };
  try {
    const adapter = databaseProviderManager.getAdapter();
    dbCheck = await adapter.healthCheck();
  } catch (err: any) {
    dbCheck = { status: "FAILED", latencyMs: 0, error: err.message };
  }

  const isHealthy = dbCheck.status === "CONNECTED";
  const statusCode = isHealthy ? 200 : 503;

  res.setHeader("Content-Type", "application/json");
  return res.status(statusCode).json({
    success: isHealthy,
    status: isHealthy ? "healthy" : "degraded",
    runtime: isVercel ? "vercel" : "local_node",
    database: {
      provider: databaseProviderManager.getAdapter().providerType === "postgresql" ? "neon" : "sqlite",
      status: isHealthy ? "connected" : "unavailable",
      latencyMs: dbCheck.latencyMs
    },
    version: "1.0.0",
    requestId
  });
});
