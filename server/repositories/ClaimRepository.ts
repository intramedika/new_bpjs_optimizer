import { Claim, DataMode } from "../../src/types";
import { db } from "../db/Database";
import { syncQueueRepository } from "./SyncQueueRepository";
import { IClaimRepository } from "./Interfaces";
import { OrganizationalScope } from "../middleware/authScope";

export class ClaimRepository implements IClaimRepository {
  async findAll(dataMode?: string, scope?: OrganizationalScope): Promise<Claim[]> {
    const isPlatformAdmin = scope?.role === "PLATFORM_ADMIN";
    const tenantId = scope?.tenantId || "tenant-pt-health";
    const hospitalId = scope?.hospitalId;

    let query = "SELECT data_json FROM claims WHERE 1=1";
    const params: any[] = [];

    if (!isPlatformAdmin) {
      query += " AND tenantId = ?";
      params.push(tenantId);

      if (hospitalId) {
        query += " AND hospitalId = ?";
        params.push(hospitalId);
      }
    }

    if (dataMode && dataMode !== "ALL") {
      query += " AND dataMode = ?";
      params.push(dataMode);
    }

    query += " ORDER BY rowid DESC";

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as { data_json: string }[];
    return rows.map(row => JSON.parse(row.data_json) as Claim);
  }

  async findById(id: string, scope?: OrganizationalScope): Promise<Claim | null> {
    const isPlatformAdmin = scope?.role === "PLATFORM_ADMIN";
    const tenantId = scope?.tenantId || "tenant-pt-health";

    let query = "SELECT data_json FROM claims WHERE id = ?";
    const params: any[] = [id];

    if (!isPlatformAdmin) {
      query += " AND tenantId = ?";
      params.push(tenantId);
    }

    const stmt = db.prepare(query);
    const row = stmt.get(...params) as { data_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.data_json) as Claim;
  }

  async create(claim: Claim, scope?: OrganizationalScope): Promise<Claim> {
    const tenantId = scope?.tenantId || "tenant-pt-health";
    const groupId = scope?.groupId || "group-nusantara";
    const hospitalId = scope?.hospitalId || "hospital-jkt";

    const fullClaim: Claim = {
      ...claim,
      tenantId: scope?.tenantId || claim.tenantId || "tenant-pt-health",
      groupId: scope?.groupId || claim.groupId || "group-nusantara",
      hospitalId: scope?.hospitalId || claim.hospitalId || "hospital-jkt",
      dataMode: claim.dataMode || "REAL",
      sourceType: claim.sourceType || "MANUAL",
      sourceReference: claim.sourceReference || claim.id
    };

    const stmt = db.prepare(`
      INSERT INTO claims (
        id, claimNumber, sepNumber, patientId, serviceDate, dischargeDate,
        principalDiagnosis, principalDiagnosisCode, cbgCode, cbgDescription,
        severity, tariff, readinessScore, risk, status, doctorName, unit, coderName,
        dataMode, sourceType, sourceReference, tenantId, groupId, hospitalId, createdAt, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        dataMode = excluded.dataMode,
        sourceType = excluded.sourceType,
        sourceReference = excluded.sourceReference,
        tenantId = excluded.tenantId,
        groupId = excluded.groupId,
        hospitalId = excluded.hospitalId,
        data_json = excluded.data_json
    `);
    
    stmt.run(
      fullClaim.id, fullClaim.claimNumber, fullClaim.sepNumber, fullClaim.patientId, fullClaim.serviceDate, fullClaim.dischargeDate,
      fullClaim.principalDiagnosis, fullClaim.principalDiagnosisCode, fullClaim.cbgCode, fullClaim.cbgDescription,
      fullClaim.severity, fullClaim.tariff, fullClaim.readinessScore, fullClaim.risk, fullClaim.status, fullClaim.doctorName, fullClaim.unit, fullClaim.coderName,
      fullClaim.dataMode, fullClaim.sourceType, fullClaim.sourceReference, tenantId, groupId, hospitalId, new Date().toISOString(),
      JSON.stringify(fullClaim)
    );
    
    await syncQueueRepository.create({
      entityType: "Claim",
      localId: fullClaim.id,
      action: "CREATE",
      payload: fullClaim
    });
    
    return fullClaim;
  }

  async update(id: string, claimData: Partial<Claim>, scope?: OrganizationalScope): Promise<Claim | null> {
    const existing = await this.findById(id, scope);
    if (!existing) return null;
    
    const updated = { ...existing, ...claimData };
    
    const stmt = db.prepare(`
      UPDATE claims SET
        claimNumber = ?, sepNumber = ?, patientId = ?, serviceDate = ?, dischargeDate = ?,
        principalDiagnosis = ?, principalDiagnosisCode = ?, cbgCode = ?, cbgDescription = ?,
        severity = ?, tariff = ?, readinessScore = ?, risk = ?, status = ?, doctorName = ?, unit = ?, coderName = ?,
        dataMode = ?, sourceType = ?, sourceReference = ?, data_json = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.claimNumber, updated.sepNumber, updated.patientId, updated.serviceDate, updated.dischargeDate,
      updated.principalDiagnosis, updated.principalDiagnosisCode, updated.cbgCode, updated.cbgDescription,
      updated.severity, updated.tariff, updated.readinessScore, updated.risk, updated.status, updated.doctorName, updated.unit, updated.coderName,
      updated.dataMode || "REAL", updated.sourceType || "MANUAL", updated.sourceReference || id,
      JSON.stringify(updated),
      id
    );

    return updated;
  }

  async delete(id: string, scope?: OrganizationalScope): Promise<boolean> {
    const tenantId = scope?.tenantId || "tenant-pt-health";
    const stmt = db.prepare("DELETE FROM claims WHERE id = ? AND (tenantId = ? OR tenantId = 'tenant-pt-health')");
    const result = stmt.run(id, tenantId);
    return result.changes > 0;
  }

  async deleteByDataMode(dataMode: DataMode, scope?: OrganizationalScope): Promise<number> {
    const tenantId = scope?.tenantId || "tenant-pt-health";
    const stmt = db.prepare("DELETE FROM claims WHERE dataMode = ? AND (tenantId = ? OR tenantId = 'tenant-pt-health')");
    const result = stmt.run(dataMode, tenantId);
    return result.changes;
  }
}

export const claimRepository = new ClaimRepository();
