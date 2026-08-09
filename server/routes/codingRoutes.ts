import { Router } from "express";
import { codingIntelligenceEngine } from "../engines/CodingIntelligenceEngine";
import { codingCandidateRepository } from "../repositories/CodingCandidateRepository";
import { grouperEngine } from "../engines/GrouperEngine";
import { aiInferenceProvider } from "../ai/AIInferenceProvider";
import { authenticateRequest, requirePermission } from "../security/SecurityMiddleware";
import { Permission } from "../security/Roles";
import { resolvePrincipalFromRequest } from "../security/SecurityContext";

const router = Router();

// GET /api/claims/:claimId/coding-candidates
router.get("/claims/:claimId/coding-candidates", authenticateRequest, requirePermission(Permission.CODING_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  try {
    let candidates = await codingCandidateRepository.findByClaimId(req.params.claimId, principal.tenantId, principal.hospitalId);
    if (candidates.length === 0) {
      candidates = await codingIntelligenceEngine.generateCandidatesForClaim(req.params.claimId, {
        tenantId: principal.tenantId,
        hospitalId: principal.hospitalId,
        groupId: principal.groupId,
        userId: principal.userId,
        role: principal.role
      });
    }
    res.json({ status: "success", count: candidates.length, candidates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/claims/:claimId/coding-candidates/generate
router.post("/claims/:claimId/coding-candidates/generate", authenticateRequest, requirePermission(Permission.CODING_UPDATE), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  try {
    const candidates = await codingIntelligenceEngine.generateCandidatesForClaim(req.params.claimId, {
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      groupId: principal.groupId,
      userId: principal.userId,
      role: principal.role
    });
    res.json({ status: "success", message: `Generated ${candidates.length} evidence-backed coding candidates.`, candidates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/coding-candidates/:id/status
router.put("/coding-candidates/:id/status", authenticateRequest, requirePermission(Permission.CODING_APPROVE), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const { status } = req.body;
  const approvedBy = principal.name || principal.email || principal.userId;

  try {
    const ok = await codingCandidateRepository.updateStatus(req.params.id, status, approvedBy);
    res.json({ status: ok ? "success" : "failed", message: `Candidate ${req.params.id} updated to ${status} by ${approvedBy}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/claims/:claimId/approved-coding
router.get("/claims/:claimId/approved-coding", authenticateRequest, requirePermission(Permission.CODING_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  try {
    const approvedSet = await codingIntelligenceEngine.getApprovedCodingSet(req.params.claimId, {
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      groupId: principal.groupId,
      userId: principal.userId,
      role: principal.role
    });
    res.json({ status: "success", approvedCodingSet: approvedSet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/claims/:claimId/grouper/what-if
router.post("/claims/:claimId/grouper/what-if", authenticateRequest, requirePermission(Permission.GROUPER_EXECUTE), async (req, res) => {
  const { principalCode, secondaryCodes, procedureCodes } = req.body;
  try {
    const simResult = await grouperEngine.simulateWhatIf(
      req.params.claimId,
      principalCode || "K74.6",
      secondaryCodes || [],
      procedureCodes || []
    );
    res.json({ status: "success", isSimulation: true, simulation: simResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/health
router.get("/ai/health", authenticateRequest, async (req, res) => {
  try {
    const health = await aiInferenceProvider.health();
    res.json({ status: "success", aiHealth: health });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
