import { Request, Response, NextFunction } from "express";
import { Permission, hasPermission, Role } from "./Roles";
import { ServerPrincipal, resolvePrincipalFromRequest } from "./SecurityContext";
import { auditLogger } from "./AuditLogger";
import { claimRepository } from "../repositories/ClaimRepository";

export interface AuthenticatedRequest extends Request {
  principal: ServerPrincipal;
}

export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const principal = resolvePrincipalFromRequest(req);
  (req as any).principal = principal;
  (req as any).user = principal;

  // Anti-Tampering Check: Validate client headers against principal
  const requestedTenant = req.headers["x-tenant-id"] as string;
  const requestedHospital = req.headers["x-hospital-id"] as string;

  if (requestedTenant && requestedTenant !== principal.tenantId && principal.role !== Role.PLATFORM_ADMIN) {
    auditLogger.log({
      actorUserId: principal.userId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      action: 'CROSS_TENANT_ACCESS_ATTEMPT',
      resourceType: 'TENANT',
      resourceId: requestedTenant,
      result: 'DENY',
      reason: `User ${principal.userId} attempted cross-tenant access to ${requestedTenant}`
    });
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access Denied: Cross-tenant access is prohibited.",
        requestId: `req-auth-${Date.now()}`
      }
    });
  }

  if (requestedHospital && requestedHospital !== principal.hospitalId && 
      principal.role !== Role.PLATFORM_ADMIN && principal.role !== Role.TENANT_ADMIN) {
    auditLogger.log({
      actorUserId: principal.userId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      hospitalId: principal.hospitalId,
      action: 'CROSS_HOSPITAL_ACCESS_ATTEMPT',
      resourceType: 'HOSPITAL',
      resourceId: requestedHospital,
      result: 'DENY',
      reason: `User ${principal.userId} attempted cross-hospital access to ${requestedHospital}`
    });
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access Denied: Cross-hospital access is prohibited.",
        requestId: `req-auth-${Date.now()}`
      }
    });
  }

  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const principal = (req as any).principal || resolvePrincipalFromRequest(req);

    if (!principal) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          requestId: `req-auth-${Date.now()}`
        }
      });
    }

    if (!hasPermission(principal.role, permission)) {
      auditLogger.log({
        actorUserId: principal?.userId || 'anonymous',
        actorRole: principal?.role || 'UNKNOWN',
        tenantId: principal?.tenantId || 'unknown',
        hospitalId: principal?.hospitalId || 'unknown',
        action: `PERMISSION_DENIED_${permission}`,
        resourceType: 'API_ENDPOINT',
        resourceId: req.originalUrl,
        result: 'DENY',
        reason: `Role ${principal?.role} lacks required permission ${permission}`
      });

      return res.status(403).json({ 
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Role ${principal?.role} is not authorized to perform action requiring ${permission}.`,
          requestId: `req-auth-${Date.now()}`
        }
      });
    }

    next();
  };
}

export async function authorizeClaimResource(req: Request, res: Response, next: NextFunction) {
  const principal = (req as any).principal || resolvePrincipalFromRequest(req);
  const claimId = req.params.claimId || req.params.id || req.query.claimId as string || req.body.claimId;

  if (!claimId) {
    return next();
  }

  try {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: "Claim Not Found" });
    }

    // Tenant Isolation Check
    if (claim.tenantId && claim.tenantId !== principal.tenantId && principal.role !== Role.PLATFORM_ADMIN) {
      auditLogger.log({
        actorUserId: principal.userId,
        actorRole: principal.role,
        tenantId: principal.tenantId,
        hospitalId: principal.hospitalId,
        action: 'IDOR_CROSS_TENANT_CLAIM_DENIED',
        resourceType: 'CLAIM',
        resourceId: claimId,
        result: 'DENY',
        reason: `Claim ${claimId} belongs to tenant ${claim.tenantId}, user belongs to ${principal.tenantId}`
      });
      return res.status(403).json({ error: "Forbidden: Access to claim outside user tenant is denied." });
    }

    // Hospital Isolation Check
    if (claim.hospitalId && claim.hospitalId !== principal.hospitalId && 
        principal.role !== Role.PLATFORM_ADMIN && principal.role !== Role.TENANT_ADMIN) {
      auditLogger.log({
        actorUserId: principal.userId,
        actorRole: principal.role,
        tenantId: principal.tenantId,
        hospitalId: principal.hospitalId,
        action: 'IDOR_CROSS_HOSPITAL_CLAIM_DENIED',
        resourceType: 'CLAIM',
        resourceId: claimId,
        result: 'DENY',
        reason: `Claim ${claimId} belongs to hospital ${claim.hospitalId}, user belongs to ${principal.hospitalId}`
      });
      return res.status(403).json({ error: "Forbidden: Access to claim outside user hospital is denied." });
    }

    (req as any).claim = claim;
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
