import { Router } from "express";
import { databaseConfigRepository } from "../db/DatabaseConfigRepository";
import { databaseProviderManager } from "../db/DatabaseProviderManager";
import { SecretManager } from "../db/SecretManager";
import { authenticateRequest, requirePermission } from "../security/SecurityMiddleware";
import { Permission } from "../security/Roles";
import { resolvePrincipalFromRequest } from "../security/SecurityContext";

export const adminDatabaseRoutes = Router();

// GET /api/admin/database/config - Masked Metadata
adminDatabaseRoutes.get("/api/admin/database/config", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), (req, res) => {
  const active = databaseConfigRepository.getMaskedActiveConfig();
  const draft = databaseConfigRepository.getDraftConfig();
  
  res.json({
    status: "success",
    active,
    draft: draft ? {
      id: draft.id,
      provider: draft.provider,
      vendor: draft.vendor,
      environment: draft.environment,
      host: draft.host,
      port: draft.port,
      database: draft.database,
      username: draft.username,
      sslMode: draft.sslMode,
      maxPoolSize: draft.maxPoolSize,
      status: draft.status,
      updatedAt: draft.updatedAt,
      updatedBy: draft.updatedBy
    } : null
  });
});

// GET /api/admin/database/health - Database Health API
adminDatabaseRoutes.get("/api/admin/database/health", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  const metadata = databaseProviderManager.getMetadata();
  const capabilities = databaseProviderManager.getCapabilities();
  const health = await databaseProviderManager.getAdapter().healthCheck();
  const schema = await databaseProviderManager.validateSchema();

  res.json({
    status: health.status === "CONNECTED" ? "connected" : "failed",
    provider: metadata.provider,
    vendor: metadata.vendor,
    environment: process.env.VERCEL_ENV?.toUpperCase() || (process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT"),
    latencyMs: health.latencyMs,
    schemaStatus: schema.status.toLowerCase(),
    poolStatus: capabilities.supportsPooling ? "healthy" : "n/a",
    metadata: {
      database: metadata.database,
      host: metadata.host || "local",
      port: metadata.port || (metadata.provider === "postgresql" ? 5432 : undefined),
      schemaVersion: metadata.schemaVersion,
      isEncrypted: true
    },
    capabilities
  });
});

// POST /api/admin/database/test - Test Connection with SSRF Protection
adminDatabaseRoutes.post("/api/admin/database/test", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  const { provider, vendor, connectionString, host, port, database, username, password } = req.body;

  if (!provider) {
    return res.status(400).json({ error: "provider is required." });
  }

  const ssrf = SecretManager.validateSSRF(host || "", connectionString);
  if (!ssrf.safe) {
    return res.status(400).json({ status: "FAILED", error: ssrf.reason });
  }

  const result = await databaseProviderManager.testConnection({
    provider,
    vendor,
    connectionString,
    host,
    port: port ? Number(port) : undefined,
    database,
    username,
    password
  });

  res.json({
    status: result.status,
    latencyMs: result.latencyMs,
    error: result.error ? result.error : undefined,
    message: result.status === "CONNECTED" ? "Test Connection Successful! Provider is reachable." : `Test Connection Failed: ${result.error}`
  });
});

// POST /api/admin/database/validate - Validate Schema Tables & Indexes
adminDatabaseRoutes.post("/api/admin/database/validate", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  const validation = await databaseProviderManager.validateSchema();
  res.json({
    status: "success",
    validation
  });
});

// POST /api/admin/database/migrate - Run PostgreSQL / SQLite DDL Migrations
adminDatabaseRoutes.post("/api/admin/database/migrate", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  try {
    const migration = await databaseProviderManager.migrate();
    res.json({
      status: "success",
      migration
    });
  } catch (err: any) {
    res.status(500).json({ error: `Migration failed: ${err.message}` });
  }
});

// POST /api/admin/database/draft - Save Draft Database Config
adminDatabaseRoutes.post("/api/admin/database/draft", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const { provider, vendor, environment, host, port, database, username, password, connectionString, sslMode, maxPoolSize } = req.body;

  const draft = databaseConfigRepository.saveDraftConfig({
    provider,
    vendor,
    environment,
    host,
    port: port ? Number(port) : undefined,
    database,
    username,
    sslMode,
    maxPoolSize: maxPoolSize ? Number(maxPoolSize) : 10,
    updatedBy: principal.userId
  }, password, connectionString);

  res.json({
    status: "success",
    message: "Draft configuration saved. Test connection and validate schema before activation.",
    draftId: draft.id
  });
});

// POST /api/admin/database/activate - Zero-Downtime Activation with Auto-Rollback
adminDatabaseRoutes.post("/api/admin/database/activate", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  const draft = databaseConfigRepository.getDraftConfig();
  if (!draft) {
    return res.status(400).json({ error: "No draft database configuration found to activate." });
  }

  const result = await databaseProviderManager.activateNewProvider(draft);
  if (result.success) {
    databaseConfigRepository.activateDraftConfig();
    res.json({
      status: "success",
      message: result.message
    });
  } else {
    res.status(500).json({
      status: "failed",
      error: result.message
    });
  }
});

// POST /api/admin/database/rotate-credentials - Safely Rotate DB Passwords
adminDatabaseRoutes.post("/api/admin/database/rotate-credentials", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  const { newPassword, newConnectionString } = req.body;
  if (!newPassword && !newConnectionString) {
    return res.status(400).json({ error: "newPassword or newConnectionString is required." });
  }

  const active = databaseConfigRepository.getActiveConfig();
  const testRes = await databaseProviderManager.testConnection({
    provider: active.provider,
    vendor: active.vendor,
    host: active.host,
    port: active.port,
    database: active.database,
    username: active.username,
    password: newPassword,
    connectionString: newConnectionString
  });

  if (testRes.status !== "CONNECTED") {
    return res.status(400).json({ status: "failed", error: `Credential rotation test failed: ${testRes.error}` });
  }

  databaseConfigRepository.saveDraftConfig({
    ...active
  }, newPassword, newConnectionString);
  
  const draft = databaseConfigRepository.getDraftConfig()!;
  await databaseProviderManager.activateNewProvider(draft);
  databaseConfigRepository.activateDraftConfig();

  res.json({
    status: "success",
    message: "Database credentials rotated and verified successfully."
  });
});
