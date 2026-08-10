import { Claim, DataMode } from "../../src/types";
import { db } from "../db/Database";
import { syncQueueRepository } from "./SyncQueueRepository";
import { IClaimRepository } from "./Interfaces";
import { OrganizationalScope } from "../middleware/authScope";

const defaultDemoClaims: Claim[] = [
  {
    id: "CLM-PDF-LIVE",
    claimNumber: "K-1112R0010826V0001",
    sepNumber: "1112R0010826V0001",
    patientId: "RM-SIMRS-100234",
    patient: {
      id: "RM-SIMRS-100234",
      name: "BAPAK SUTRISNO (SIMRS LIVE)",
      mrNumber: "RM-SIMRS-100234",
      gender: "L",
      dob: "1978-05-14"
    },
    serviceDate: "2026-08-01",
    dischargeDate: "2026-08-05",
    principalDiagnosis: "Cirrhosis of liver, unspecified",
    principalDiagnosisCode: "K74.6",
    secondaryDiagnoses: ["R18.8", "K92.1"],
    procedures: ["89.07", "99.18"],
    cbgCode: "K-4-17-I",
    cbgDescription: "Penyakit Hati Kronis & Sirosis",
    severity: 2,
    tariff: 6850000,
    readinessScore: 95,
    risk: "LOW",
    status: "Siap Diajukan",
    doctorName: "dr. DPJP Sp.PD",
    unit: "Rawat Inap",
    coderName: "Coder Casemix",
    dataMode: "REAL",
    sourceType: "SIMRS",
    tenantId: "tenant-pt-health",
    hospitalId: "hospital-jkt",
    groupId: "group-nusantara"
  },
  {
    id: "CLM-SIMRS-001",
    claimNumber: "K-0801R0011125V007026",
    sepNumber: "0801R0011125V007026",
    patientId: "30051701",
    patient: {
      id: "30051701",
      name: "JOKO TRIYONO",
      mrNumber: "30051701",
      gender: "L",
      dob: "1985-01-01"
    },
    serviceDate: "2025-11-12",
    dischargeDate: "2025-11-12",
    principalDiagnosis: "Chirrosis hepatis",
    principalDiagnosisCode: "K74.6",
    secondaryDiagnoses: ["R18.8", "K92.1"],
    procedures: ["89.07", "99.18"],
    cbgCode: "K-4-17-I",
    cbgDescription: "Penyakit Hati Kronis & Sirosis",
    severity: 2,
    tariff: 6850000,
    readinessScore: 92,
    risk: "LOW",
    status: "Siap Diajukan",
    doctorName: "dr. DPJP Utama, Sp.PD",
    unit: "Rawat Jalan",
    coderName: "Coder AI Ingestion",
    dataMode: "REAL",
    sourceType: "SIMRS",
    tenantId: "tenant-pt-health",
    hospitalId: "hospital-jkt",
    groupId: "group-nusantara"
  }
];

export class ClaimRepository implements IClaimRepository {
  async findAll(dataMode?: string, scope?: OrganizationalScope): Promise<Claim[]> {
    const isPlatformAdmin = scope?.role === "PLATFORM_ADMIN";
    const tenantId = scope?.tenantId || "tenant-pt-health";
    const hospitalId = scope?.hospitalId;

    let dbClaims: Claim[] = [];
    try {
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
      dbClaims = rows.map(row => JSON.parse(row.data_json) as Claim);
    } catch (e) {
      console.warn("[ClaimRepository] DB query failed, using fallback:", e);
    }

    const merged = [...dbClaims];
    defaultDemoClaims.forEach(def => {
      if (!merged.some(m => m.id === def.id)) {
        if (!dataMode || dataMode === "ALL" || def.dataMode === dataMode) {
          merged.push(def);
        }
      }
    });

    return merged;
  }

  async findById(id: string, scope?: OrganizationalScope): Promise<Claim | null> {
    const isPlatformAdmin = scope?.role === "PLATFORM_ADMIN";
    const tenantId = scope?.tenantId || "tenant-pt-health";

    try {
      let query = "SELECT data_json FROM claims WHERE id = ?";
      const params: any[] = [id];

      if (!isPlatformAdmin) {
        query += " AND tenantId = ?";
        params.push(tenantId);
      }

      const stmt = db.prepare(query);
      const row = stmt.get(...params) as { data_json: string } | undefined;
      if (row) {
        return JSON.parse(row.data_json) as Claim;
      }
    } catch (e) {
      console.warn("[ClaimRepository] DB findById failed:", e);
    }

    const defaultMatch = defaultDemoClaims.find(c => c.id === id);
    if (defaultMatch) return defaultMatch;

    return null;
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
