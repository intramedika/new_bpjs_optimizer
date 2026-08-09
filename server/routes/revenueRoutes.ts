import { Router } from "express";
import { revenueOpportunityEngine } from "../engines/RevenueOpportunityEngine";
import { revenueOpportunityRepository } from "../repositories/RevenueOpportunityRepository";
import { requirePermission, authenticateRequest } from "../security/SecurityMiddleware";
import { Permission } from "../security/Roles";
import { resolvePrincipalFromRequest } from "../security/SecurityContext";
import { auditLogger } from "../security/AuditLogger";

const router = Router();

// GET /api/claims/:claimId/revenue-opportunities
router.get("/claims/:claimId/revenue-opportunities", authenticateRequest, requirePermission(Permission.REVENUE_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  try {
    const opps = await revenueOpportunityRepository.findByClaimId(req.params.claimId, principal.tenantId, principal.hospitalId);
    res.json({ status: "success", opportunities: opps, count: opps.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/claims/:claimId/revenue-opportunities/analyze
router.post("/claims/:claimId/revenue-opportunities/analyze", authenticateRequest, requirePermission(Permission.REVENUE_ANALYZE), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  try {
    const opps = await revenueOpportunityEngine.analyzeClaim(req.params.claimId, principal.tenantId, principal.hospitalId);
    
    auditLogger.log({
      actorUserId: principal.userId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      action: 'REVENUE_ANALYZE_EXECTUED',
      resourceType: 'CLAIM',
      resourceId: req.params.claimId,
      result: 'SUCCESS'
    });

    res.json({ status: "success", opportunities: opps, count: opps.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/revenue-opportunities/:id/approve
router.post("/revenue-opportunities/:id/approve", authenticateRequest, requirePermission(Permission.REVENUE_APPROVE), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  // Derive actor from trusted authenticated server principal (Anti-Tampering)
  const approvedBy = principal.name || principal.email || principal.userId;
  
  try {
    const result = await revenueOpportunityEngine.approveOpportunity(req.params.id, approvedBy, principal.tenantId, principal.hospitalId);
    
    auditLogger.log({
      actorUserId: principal.userId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      action: 'REVENUE_OPPORTUNITY_APPROVED',
      resourceType: 'REVENUE_OPPORTUNITY',
      resourceId: req.params.id,
      result: 'SUCCESS',
      reason: `Approved by ${approvedBy}`
    });

    res.json({ status: "success", opportunity: result.opportunity, claim: result.claim });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/revenue-opportunities/:id/reject
router.post("/revenue-opportunities/:id/reject", authenticateRequest, requirePermission(Permission.REVENUE_REJECT), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const rejectedReason = req.body.reason || "Pertimbangan klinis coder";
  const rejectedBy = principal.name || principal.email || principal.userId;
  
  try {
    const opp = await revenueOpportunityEngine.rejectOpportunity(req.params.id, rejectedReason, rejectedBy, principal.tenantId, principal.hospitalId);
    
    auditLogger.log({
      actorUserId: principal.userId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      action: 'REVENUE_OPPORTUNITY_REJECTED',
      resourceType: 'REVENUE_OPPORTUNITY',
      resourceId: req.params.id,
      result: 'SUCCESS',
      reason: rejectedReason
    });

    res.json({ status: "success", opportunity: opp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/revenue/analytics
router.get("/revenue/analytics", authenticateRequest, requirePermission(Permission.REVENUE_READ), async (req, res) => {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const dataMode = (req.query.dataMode as string) || "ALL";
  try {
    const analytics = await revenueOpportunityEngine.getAnalytics(principal.tenantId, principal.hospitalId, dataMode);
    res.json({ status: "success", analytics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
