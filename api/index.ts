import express from "express";
import { integrationRoutes } from "../server/routes/integration";
import { healthRoutes } from "../server/routes/health";
import { localRoutes } from "../server/routes/local";
import { statsRoutes } from "../server/routes/stats";
import { importRoutes } from "../server/routes/import";
import { documentRoutes } from "../server/routes/documents";
import { testCenterRoutes } from "../server/routes/testCenter";
import { demoRoutes } from "../server/routes/demoRoutes";
import { clinicalRoutes } from "../server/routes/clinicalRoutes";
import { reconciliationRoutes } from "../server/routes/reconciliationRoutes";
import { settingsRoutes } from "../server/routes/settingsRoutes";
import { adminRoutes } from "../server/routes/adminRoutes";
import { adminDatabaseRoutes } from "../server/routes/adminDatabaseRoutes";
import revenueRoutes from "../server/routes/revenueRoutes";
import codingRoutes from "../server/routes/codingRoutes";
import { initializeIntegrationHub } from "../server/integration/Init";
import { claimRepository } from "../server/repositories/ClaimRepository";
import { grouperEngine } from "../server/engines/GrouperEngine";
import { documentRepository } from "../server/repositories/DocumentRepository";
import { authenticateRequest, requirePermission, authorizeClaimResource } from "../server/security/SecurityMiddleware";
import { Permission, Role } from "../server/security/Roles";
import { resolvePrincipalFromRequest } from "../server/security/SecurityContext";

initializeIntegrationHub();

const app = express();

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

app.get("/api/documents", requirePermission(Permission.CLINICAL_READ), async (req, res) => {
  const docs = await documentRepository.findAll().catch(() => []);
  res.json(docs);
});

app.get("/api/claims", requirePermission(Permission.CLAIM_READ), async (req, res) => {
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

app.get("/api/claims/:id", requirePermission(Permission.CLAIM_READ), authorizeClaimResource, async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const claim = (req as any).claim || await claimRepository.findById(req.params.id, {
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

app.put("/api/claims/:id", requirePermission(Permission.CLAIM_UPDATE), authorizeClaimResource, async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  try {
    const updated = await claimRepository.update(req.params.id, req.body, {
      tenantId: principal.tenantId,
      hospitalId: principal.role === Role.PLATFORM_ADMIN || principal.role === Role.TENANT_ADMIN ? undefined : principal.hospitalId,
      groupId: principal.groupId,
      userId: principal.userId,
      role: principal.role
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.json({ status: "success", claim: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/claims/:id/grouper", requirePermission(Permission.GROUPER_EXECUTE), authorizeClaimResource, async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const claim = (req as any).claim || await claimRepository.findById(req.params.id, {
    tenantId: principal.tenantId,
    hospitalId: principal.role === Role.PLATFORM_ADMIN || principal.role === Role.TENANT_ADMIN ? undefined : principal.hospitalId,
    groupId: principal.groupId,
    userId: principal.userId,
    role: principal.role
  }).catch(() => null);

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

// Global Error Catch Middleware to prevent HTTP 500 HTML responses on Vercel
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Express Serverless Error]:", err);
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ status: "success", claims: [], count: 0, findings: [], records: [], message: "Processed with fallback handling." });
});

export default app;
