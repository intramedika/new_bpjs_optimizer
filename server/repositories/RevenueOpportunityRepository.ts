import { db } from "../db/Database";

export type OpportunityStatus = 
  | "DETECTED"
  | "UNDER_REVIEW"
  | "SUPPORTED"
  | "REJECTED"
  | "APPROVED"
  | "APPLIED"
  | "SUBMITTED"
  | "REALIZED"
  | "EXPIRED"
  | "BLOCKED";

export type OpportunityType = 
  | "MISSED_SPECIFICITY"
  | "MISSED_SECONDARY_DIAGNOSIS"
  | "PROCEDURE_CAPTURE"
  | "SEVERITY_COMORBIDITY"
  | "DOCUMENTATION_GAP";

export interface RevenueOpportunity {
  id: string;
  claimId: string;
  tenantId: string;
  groupId?: string;
  hospitalId: string;
  dataMode: "REAL" | "TEST" | "DEMO" | "MOCK";
  opportunityType: OpportunityType;
  title: string;
  description: string;
  currentCoding: string; // e.g. "E11.9"
  recommendedCoding: string; // e.g. "E11.1"
  currentGrouper: string; // e.g. "E-4-10-I"
  recommendedGrouper: string; // e.g. "E-4-10-II"
  currentTariff: number;
  recommendedTariff: number;
  potentialDelta: number;
  realizedDelta?: number;
  evidenceIds: string[];
  evidenceSummary: string;
  clinicalSupportScore: number; // 0 - 100
  codingConfidence: number; // 0 - 100
  grouperConfidence: number; // 0 - 100
  complianceScore: number; // 0 - 100
  opportunityScore: number; // 0 - 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  status: OpportunityStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export class RevenueOpportunityRepository {
  async findByClaimId(claimId: string, tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt"): Promise<RevenueOpportunity[]> {
    const stmt = db.prepare(`
      SELECT * FROM revenue_opportunities 
      WHERE claimId = ? AND tenantId = ? AND hospitalId = ?
      ORDER BY opportunityScore DESC
    `);
    const rows = stmt.all(claimId, tenantId, hospitalId) as any[];
    return rows.map(r => this.mapRowToOpportunity(r));
  }

  async findById(id: string, tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt"): Promise<RevenueOpportunity | null> {
    const stmt = db.prepare(`
      SELECT * FROM revenue_opportunities 
      WHERE id = ? AND tenantId = ? AND hospitalId = ?
    `);
    const row = stmt.get(id, tenantId, hospitalId) as any;
    if (!row) return null;
    return this.mapRowToOpportunity(row);
  }

  async findAll(tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt", dataMode: string = "ALL"): Promise<RevenueOpportunity[]> {
    let sql = `SELECT * FROM revenue_opportunities WHERE tenantId = ? AND hospitalId = ?`;
    const params: any[] = [tenantId, hospitalId];

    if (dataMode !== "ALL") {
      sql += ` AND dataMode = ?`;
      params.push(dataMode);
    }

    sql += ` ORDER BY createdAt DESC`;
    const rows = db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapRowToOpportunity(r));
  }

  async create(opp: RevenueOpportunity): Promise<RevenueOpportunity> {
    const stmt = db.prepare(`
      INSERT INTO revenue_opportunities (
        id, claimId, tenantId, groupId, hospitalId, dataMode,
        opportunityType, title, description, currentCoding, recommendedCoding,
        currentGrouper, recommendedGrouper, currentTariff, recommendedTariff,
        potentialDelta, realizedDelta, evidenceIds_json, evidenceSummary,
        clinicalSupportScore, codingConfidence, grouperConfidence, complianceScore,
        opportunityScore, riskLevel, status, approvedBy, approvedAt, rejectedReason,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    stmt.run(
      opp.id,
      opp.claimId,
      opp.tenantId || "tenant-pt-health",
      opp.groupId || "group-nusantara",
      opp.hospitalId || "hospital-jkt",
      opp.dataMode || "REAL",
      opp.opportunityType,
      opp.title,
      opp.description,
      opp.currentCoding,
      opp.recommendedCoding,
      opp.currentGrouper,
      opp.recommendedGrouper,
      opp.currentTariff,
      opp.recommendedTariff,
      opp.potentialDelta,
      opp.realizedDelta || 0,
      JSON.stringify(opp.evidenceIds || []),
      opp.evidenceSummary,
      opp.clinicalSupportScore,
      opp.codingConfidence,
      opp.grouperConfidence,
      opp.complianceScore,
      opp.opportunityScore,
      opp.riskLevel,
      opp.status,
      opp.approvedBy || null,
      opp.approvedAt || null,
      opp.rejectedReason || null,
      opp.createdAt,
      opp.updatedAt
    );

    return opp;
  }

  async updateStatus(
    id: string, 
    status: OpportunityStatus, 
    approvedBy?: string, 
    rejectedReason?: string,
    realizedDelta?: number,
    tenantId: string = "tenant-pt-health", 
    hospitalId: string = "hospital-jkt"
  ): Promise<RevenueOpportunity | null> {
    const now = new Date().toISOString();
    const existing = await this.findById(id, tenantId, hospitalId);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE revenue_opportunities 
      SET status = ?, approvedBy = ?, approvedAt = ?, rejectedReason = ?, realizedDelta = COALESCE(?, realizedDelta), updatedAt = ?
      WHERE id = ? AND tenantId = ? AND hospitalId = ?
    `);

    stmt.run(
      status,
      approvedBy || existing.approvedBy || null,
      approvedBy ? now : (existing.approvedAt || null),
      rejectedReason || existing.rejectedReason || null,
      realizedDelta ?? existing.realizedDelta ?? 0,
      now,
      id,
      tenantId,
      hospitalId
    );

    return this.findById(id, tenantId, hospitalId);
  }

  async deleteForClaim(claimId: string): Promise<void> {
    const stmt = db.prepare(`DELETE FROM revenue_opportunities WHERE claimId = ?`);
    stmt.run(claimId);
  }

  private mapRowToOpportunity(r: any): RevenueOpportunity {
    let evidenceIds: string[] = [];
    try {
      evidenceIds = r.evidenceIds_json ? JSON.parse(r.evidenceIds_json) : [];
    } catch (e) {}

    return {
      id: r.id,
      claimId: r.claimId,
      tenantId: r.tenantId,
      groupId: r.groupId,
      hospitalId: r.hospitalId,
      dataMode: r.dataMode || "REAL",
      opportunityType: r.opportunityType,
      title: r.title,
      description: r.description,
      currentCoding: r.currentCoding,
      recommendedCoding: r.recommendedCoding,
      currentGrouper: r.currentGrouper,
      recommendedGrouper: r.recommendedGrouper,
      currentTariff: r.currentTariff,
      recommendedTariff: r.recommendedTariff,
      potentialDelta: r.potentialDelta,
      realizedDelta: r.realizedDelta,
      evidenceIds,
      evidenceSummary: r.evidenceSummary,
      clinicalSupportScore: r.clinicalSupportScore,
      codingConfidence: r.codingConfidence,
      grouperConfidence: r.grouperConfidence,
      complianceScore: r.complianceScore,
      opportunityScore: r.opportunityScore,
      riskLevel: r.riskLevel,
      status: r.status,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      rejectedReason: r.rejectedReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}

export const revenueOpportunityRepository = new RevenueOpportunityRepository();
