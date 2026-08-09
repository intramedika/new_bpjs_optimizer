import { db } from "../db/Database";

export interface CodingCandidate {
  id: string;
  claimId: string;
  findingId?: string;
  codeSystem: "ICD-10" | "ICD-9-CM";
  code: string;
  description: string;
  isPrincipal: boolean;
  diagnosisStage: "INITIAL" | "WORKING" | "FINAL" | "SUPPORTING";
  evidenceQuote: string;
  sourceDocument: string;
  pageNumber: number;
  sourceSection: string;
  confidence: number;
  rationale: string;
  status: "CANDIDATE" | "APPROVED" | "REJECTED" | "CONFLICT" | "NEEDS_REVIEW";
  approvedBy?: string;
  dataMode?: string;
  tenantId?: string;
  groupId?: string;
  hospitalId?: string;
  createdAt: string;
  updatedAt: string;
}

export class CodingCandidateRepository {
  constructor() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS coding_candidates (
          id TEXT PRIMARY KEY,
          claimId TEXT NOT NULL,
          findingId TEXT,
          codeSystem TEXT NOT NULL,
          code TEXT NOT NULL,
          description TEXT NOT NULL,
          isPrincipal INTEGER DEFAULT 0,
          diagnosisStage TEXT DEFAULT 'FINAL',
          evidenceQuote TEXT NOT NULL,
          sourceDocument TEXT NOT NULL,
          pageNumber INTEGER DEFAULT 1,
          sourceSection TEXT NOT NULL,
          confidence REAL DEFAULT 90,
          rationale TEXT,
          status TEXT DEFAULT 'CANDIDATE',
          approvedBy TEXT,
          dataMode TEXT DEFAULT 'REAL',
          tenantId TEXT DEFAULT 'tenant-pt-health',
          groupId TEXT DEFAULT 'group-nusantara',
          hospitalId TEXT DEFAULT 'hospital-jkt',
          createdAt TEXT,
          updatedAt TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_coding_cand_claim ON coding_candidates(claimId, status);
      `);
    } catch (e) {
      console.warn("[CodingCandidateRepository] init error:", e);
    }
  }

  async findByClaimId(claimId: string, tenantId?: string, hospitalId?: string): Promise<CodingCandidate[]> {
    try {
      let query = "SELECT * FROM coding_candidates WHERE claimId = ?";
      const params: any[] = [claimId];

      if (tenantId) {
        query += " AND (tenantId = ? OR tenantId = 'tenant-pt-health')";
        params.push(tenantId);
      }
      if (hospitalId) {
        query += " AND (hospitalId = ? OR hospitalId = 'hospital-jkt')";
        params.push(hospitalId);
      }

      query += " ORDER BY isPrincipal DESC, codeSystem ASC, rowid ASC";

      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as any[];
      return rows.map(r => ({
        ...r,
        isPrincipal: Boolean(r.isPrincipal)
      }));
    } catch {
      return [];
    }
  }

  async create(candidate: CodingCandidate): Promise<CodingCandidate> {
    const now = new Date().toISOString();
    const fullCandidate: CodingCandidate = {
      ...candidate,
      createdAt: candidate.createdAt || now,
      updatedAt: now
    };

    try {
      const stmt = db.prepare(`
        INSERT INTO coding_candidates (
          id, claimId, findingId, codeSystem, code, description, isPrincipal,
          diagnosisStage, evidenceQuote, sourceDocument, pageNumber, sourceSection,
          confidence, rationale, status, approvedBy, dataMode, tenantId, groupId, hospitalId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          approvedBy = excluded.approvedBy,
          isPrincipal = excluded.isPrincipal,
          description = excluded.description,
          updatedAt = excluded.updatedAt
      `);

      stmt.run(
        fullCandidate.id,
        fullCandidate.claimId,
        fullCandidate.findingId || "",
        fullCandidate.codeSystem,
        fullCandidate.code,
        fullCandidate.description,
        fullCandidate.isPrincipal ? 1 : 0,
        fullCandidate.diagnosisStage || "FINAL",
        fullCandidate.evidenceQuote || "",
        fullCandidate.sourceDocument || "Resume Medis",
        fullCandidate.pageNumber || 1,
        fullCandidate.sourceSection || "ASSESSMENT",
        fullCandidate.confidence || 90,
        fullCandidate.rationale || "",
        fullCandidate.status || "CANDIDATE",
        fullCandidate.approvedBy || null,
        fullCandidate.dataMode || "REAL",
        fullCandidate.tenantId || "tenant-pt-health",
        fullCandidate.groupId || "group-nusantara",
        fullCandidate.hospitalId || "hospital-jkt",
        fullCandidate.createdAt,
        fullCandidate.updatedAt
      );
    } catch (e) {
      console.warn("[CodingCandidateRepository] create error:", e);
    }

    return fullCandidate;
  }

  async updateStatus(id: string, status: CodingCandidate['status'], approvedBy?: string): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      const stmt = db.prepare("UPDATE coding_candidates SET status = ?, approvedBy = ?, updatedAt = ? WHERE id = ?");
      const result = stmt.run(status, approvedBy || null, now, id);
      return result.changes > 0;
    } catch {
      return false;
    }
  }

  async deleteByClaimId(claimId: string): Promise<number> {
    try {
      const stmt = db.prepare("DELETE FROM coding_candidates WHERE claimId = ?");
      const result = stmt.run(claimId);
      return result.changes;
    } catch {
      return 0;
    }
  }
}

export const codingCandidateRepository = new CodingCandidateRepository();
