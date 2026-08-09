import { db } from "../db/Database";

export interface ClinicalFinding {
  id: string;
  claimId: string;
  documentId?: string;
  findingType: "DIAGNOSIS" | "PROCEDURE" | "MEDICATION" | "SYMPTOM" | "LABORATORY";
  findingValue: string;
  normalizedConcept?: string;
  icdCode?: string;
  sourceText?: string;
  sourceDocument?: string;
  pageNumber?: number;
  sourceSection?: string;
  diagnosisStage?: "INITIAL" | "WORKING" | "FINAL" | "SUPPORTING";
  evidenceType?: "EXPLICIT_DIAGNOSIS" | "SOAP_ASSESSMENT" | "CLINICAL_NOTE" | "SEP_INITIAL" | "LAB_RESULT";
  confidence?: number;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
  dataMode?: string;
  createdAt: string;
  updatedAt: string;
}

export class ClinicalFindingRepository {
  constructor() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS clinical_findings (
          id TEXT PRIMARY KEY,
          claimId TEXT NOT NULL,
          documentId TEXT,
          findingType TEXT NOT NULL,
          findingValue TEXT NOT NULL,
          normalizedConcept TEXT,
          icdCode TEXT,
          sourceText TEXT,
          sourceDocument TEXT,
          pageNumber INTEGER DEFAULT 1,
          sourceSection TEXT,
          diagnosisStage TEXT DEFAULT 'FINAL',
          evidenceType TEXT DEFAULT 'EXPLICIT_DIAGNOSIS',
          confidence INTEGER DEFAULT 90,
          status TEXT DEFAULT 'PENDING_REVIEW',
          dataMode TEXT DEFAULT 'REAL',
          createdAt TEXT,
          updatedAt TEXT
        );
      `);
    } catch (e) {
      console.warn("clinical_findings table init:", e);
    }
  }

  async findByClaimId(claimId: string): Promise<ClinicalFinding[]> {
    try {
      const stmt = db.prepare("SELECT * FROM clinical_findings WHERE claimId = ? ORDER BY rowid DESC");
      return stmt.all(claimId) as ClinicalFinding[];
    } catch {
      return [];
    }
  }

  async findAll(dataMode?: string): Promise<ClinicalFinding[]> {
    try {
      if (!dataMode || dataMode === "ALL") {
        const stmt = db.prepare("SELECT * FROM clinical_findings ORDER BY rowid DESC");
        return stmt.all() as ClinicalFinding[];
      } else {
        const stmt = db.prepare("SELECT * FROM clinical_findings WHERE dataMode = ? ORDER BY rowid DESC");
        return stmt.all(dataMode) as ClinicalFinding[];
      }
    } catch {
      return [];
    }
  }

  async create(finding: ClinicalFinding): Promise<ClinicalFinding> {
    const now = new Date().toISOString();
    const fullFinding: ClinicalFinding = {
      ...finding,
      createdAt: finding.createdAt || now,
      updatedAt: now
    };

    try {
      const stmt = db.prepare(`
        INSERT INTO clinical_findings (
          id, claimId, documentId, findingType, findingValue, normalizedConcept, icdCode,
          sourceText, sourceDocument, pageNumber, sourceSection, diagnosisStage, evidenceType,
          confidence, status, dataMode, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          findingValue = excluded.findingValue,
          normalizedConcept = excluded.normalizedConcept,
          sourceText = excluded.sourceText,
          updatedAt = excluded.updatedAt
      `);

      stmt.run(
        fullFinding.id,
        fullFinding.claimId,
        fullFinding.documentId || "",
        fullFinding.findingType,
        fullFinding.findingValue,
        fullFinding.normalizedConcept || fullFinding.findingValue,
        fullFinding.icdCode || "",
        fullFinding.sourceText || "",
        fullFinding.sourceDocument || "Resume Medis Rawat Jalan",
        fullFinding.pageNumber || 1,
        fullFinding.sourceSection || "ASSESSMENT",
        fullFinding.diagnosisStage || "FINAL",
        fullFinding.evidenceType || "EXPLICIT_DIAGNOSIS",
        fullFinding.confidence || 90,
        fullFinding.status || "PENDING_REVIEW",
        fullFinding.dataMode || "REAL",
        fullFinding.createdAt,
        fullFinding.updatedAt
      );
    } catch (e) {
      console.warn("ClinicalFindingRepository create error:", e);
    }

    return fullFinding;
  }

  async updateStatus(id: string, status: "CONFIRMED" | "REJECTED"): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      const stmt = db.prepare("UPDATE clinical_findings SET status = ?, updatedAt = ? WHERE id = ?");
      const result = stmt.run(status, now, id);
      return result.changes > 0;
    } catch {
      return false;
    }
  }

  async deleteByClaimId(claimId: string): Promise<number> {
    try {
      const stmt = db.prepare("DELETE FROM clinical_findings WHERE claimId = ?");
      const result = stmt.run(claimId);
      return result.changes;
    } catch {
      return 0;
    }
  }
}

export const clinicalFindingRepository = new ClinicalFindingRepository();
