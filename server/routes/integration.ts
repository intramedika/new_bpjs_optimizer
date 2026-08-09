import { Router } from "express";
import { integrationHub } from "../integration/IntegrationHub";
import { integrationRegistry } from "../integration/IntegrationRegistry";
import { integrationExecutionRepository } from "../integration/repositories/IntegrationExecutionRepository";
import { integrationJobQueueRepository } from "../integration/repositories/IntegrationJobQueueRepository";
import { mockSimulatorController, SimulationMode } from "../integration/mock/MockSimulatorController";
import { claimRepository } from "../repositories/ClaimRepository";
import { authenticateRequest, requirePermission } from "../security/SecurityMiddleware";
import { Permission } from "../security/Roles";
import { resolvePrincipalFromRequest } from "../security/SecurityContext";

export const integrationRoutes = Router();

// List registered adapters & capability registry
integrationRoutes.get("/api/integration/adapters", authenticateRequest, requirePermission(Permission.INTEGRATION_READ), (req, res) => {
  const adapters = integrationRegistry.listAdapters();
  res.json({
    status: "success",
    count: adapters.length,
    adapters
  });
});

// Central Health Matrix via IntegrationHub
integrationRoutes.get("/api/integration/health", authenticateRequest, requirePermission(Permission.INTEGRATION_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const health = await integrationHub.getHealth(principal.tenantId, principal.hospitalId);
  res.json({
    status: "success",
    tenantId: principal.tenantId,
    hospitalId: principal.hospitalId,
    health
  });
});

// Save Tenant-Isolated Configuration
integrationRoutes.post("/api/integration/config", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), async (req, res) => {
  try {
    const { adapterId, baseUrl, credentials, environment } = req.body;
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);

    if (!adapterId || !baseUrl) {
      return res.status(400).json({ error: "adapterId and baseUrl are required." });
    }

    const saved = await integrationHub.saveConfiguration({
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      adapterId,
      baseUrl,
      credentials: credentials || {},
      environment: environment || "MOCK"
    });

    res.json({ status: "success", configuration: saved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route Connection Test through IntegrationHub
integrationRoutes.post("/api/integration/test", authenticateRequest, requirePermission(Permission.INTEGRATION_EXECUTE), async (req, res) => {
  try {
    const { adapterId, baseUrl, credentials, environment } = req.body;
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);

    if (!adapterId) {
      return res.status(400).json({ error: "adapterId is required." });
    }

    if (baseUrl) {
      await integrationHub.saveConfiguration({
        tenantId: principal.tenantId,
        hospitalId: principal.hospitalId,
        adapterId,
        baseUrl,
        credentials: credentials || {},
        environment: environment || "MOCK"
      });
    }

    const result = await integrationHub.testConnection(adapterId, principal.tenantId, principal.hospitalId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute Canonical Operation through IntegrationHub
integrationRoutes.post("/api/integration/execute", authenticateRequest, requirePermission(Permission.INTEGRATION_EXECUTE), async (req, res) => {
  try {
    const { adapterId, operation, payload, requestId, timeoutMs } = req.body;
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);

    if (!adapterId || !operation) {
      return res.status(400).json({ error: "adapterId and operation are required." });
    }

    const response = await integrationHub.execute({
      adapterId,
      operation,
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      requestId,
      payload,
      timeoutMs
    });

    res.status(response.success ? 200 : 400).json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mock Failure Simulator Control Route
integrationRoutes.post("/api/integration/mock/simulate", authenticateRequest, requirePermission(Permission.SYSTEM_CONFIGURE), (req, res) => {
  const { adapterId, mode } = req.body;
  if (!adapterId || !mode) {
    return res.status(400).json({ error: "adapterId and mode are required." });
  }

  mockSimulatorController.setSimulationMode(adapterId, mode as SimulationMode);
  res.json({
    status: "success",
    adapterId,
    activeMode: mode,
    message: `Mock simulation mode set to ${mode}`
  });
});

// Replay Mock Execution
integrationRoutes.post("/api/integration/mock/replay", authenticateRequest, requirePermission(Permission.INTEGRATION_EXECUTE), async (req, res) => {
  const { adapterId, operation, payload } = req.body;
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);

  if (!adapterId || !operation) {
    return res.status(400).json({ error: "adapterId and operation are required for replay." });
  }

  const response = await integrationHub.execute({
    adapterId,
    operation,
    tenantId: principal.tenantId,
    hospitalId: principal.hospitalId,
    requestId: `REPLAY-${Date.now()}`,
    payload: payload || {}
  });

  res.json({ status: "success", replayedResponse: response });
});

// Query Execution Audit Logs
integrationRoutes.get("/api/integration/executions", authenticateRequest, requirePermission(Permission.AUDIT_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const executions = await integrationExecutionRepository.findRecent(principal.tenantId, principal.hospitalId, 50);
  res.json({ status: "success", count: executions.length, executions });
});

// Query Offline & Async Job Queue
integrationRoutes.get("/api/integration/jobs", authenticateRequest, requirePermission(Permission.INTEGRATION_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const jobs = await integrationJobQueueRepository.listPending(principal.tenantId, principal.hospitalId);
  res.json({ status: "success", count: jobs.length, jobs });
});

// Explicit Synthetic Test Claim Creator
integrationRoutes.post("/api/test-claim/create", authenticateRequest, requirePermission(Permission.CLAIM_CREATE), async (req, res) => {
  try {
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);
    const timestamp = Date.now();
    const testClaim = await claimRepository.create({
      id: `TEST-CLAIM-${timestamp}`,
      claimNumber: `K-TEST-${timestamp}`,
      sepNumber: `MOCK-SEP-${timestamp}`,
      patientId: `PAT-TEST-${timestamp}`,
      patient: {
        id: `PAT-TEST-${timestamp}`,
        name: "SYNTHETIC PATIENT A",
        mrNumber: `RM-TEST-${timestamp.toString().slice(-6)}`,
        gender: "L",
        dob: "1988-05-12"
      },
      serviceDate: new Date().toISOString().split("T")[0],
      dischargeDate: new Date().toISOString().split("T")[0],
      principalDiagnosis: "Pneumonia, unspecified",
      principalDiagnosisCode: "J18.9",
      secondaryDiagnoses: ["E11.9"],
      procedures: ["89.52"],
      cbgCode: "J-4-16-II",
      cbgDescription: "Pneumonia Sedang/Berat",
      severity: 2,
      tariff: 5420000,
      readinessScore: 92,
      risk: "LOW",
      status: "Siap Diajukan",
      doctorName: "dr. Synthetic DPJP, Sp.PD",
      unit: "Rawat Inap",
      coderName: "Synthetic Test Coder",
      dataMode: "TEST",
      sourceType: "MANUAL_TEST",
      sourceReference: "MOCK_SANDBOX_CREATOR"
    } as any, {
      tenantId: principal.tenantId,
      groupId: principal.groupId,
      hospitalId: principal.hospitalId,
      userId: principal.userId,
      role: principal.role
    });

    res.json({ status: "success", message: "Synthetic test claim successfully created.", claim: testClaim });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
