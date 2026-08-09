import { Request, Response, NextFunction } from "express";

export interface OrganizationalScope {
  tenantId: string;
  groupId?: string;
  hospitalId?: string;
  userId?: string;
  role?: string;
}

export function extractOrganizationalScope(req: Request): OrganizationalScope {
  const tenantId = (req.headers["x-tenant-id"] as string) || "tenant-pt-health";
  const groupId = (req.headers["x-group-id"] as string) || "group-nusantara";
  const hospitalId = (req.headers["x-hospital-id"] as string) || "hospital-jkt";
  const userId = (req.headers["x-user-id"] as string) || "user-admin";
  const role = (req.headers["x-user-role"] as string) || "PLATFORM_ADMIN";

  return { tenantId, groupId, hospitalId, userId, role };
}

export function enforceScopeMiddleware(req: Request, res: Response, next: NextFunction) {
  const scope = extractOrganizationalScope(req);
  (req as any).scope = scope;
  next();
}

export function checkHospitalAccess(req: Request, requestedHospitalId: string): boolean {
  const scope = extractOrganizationalScope(req);
  if (scope.role === "PLATFORM_ADMIN" || scope.role === "TENANT_ADMIN" || scope.role === "GROUP_ADMIN") {
    return true;
  }
  return scope.hospitalId === requestedHospitalId;
}
