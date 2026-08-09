import { db } from "../db/Database";

export interface ReconciliationRecord {
  id: string;
  claimId: string;
  predictionSource: string;
  predictionCbg: string;
  predictionSeverity: number;
  predictionTariff: number;
  actualSource: string;
  actualCbg: string;
  actualSeverity: number;
  actualTariff: number;
  varianceAmount: number;
  varianceType: "EXACT_MATCH" | "CBG_MISMATCH" | "SEVERITY_MISMATCH" | "TARIFF_MISMATCH" | "MISSING_GROUPER_RESULT";
  status: "RESOLVED" | "UNRESOLVED" | "REVIEW_REQUIRED";
  dataMode?: string;
  createdAt: string;
  updatedAt: string;
}

export class ReconciliationRepository {
  async findByClaimId(claimId: string): Promise<ReconciliationRecord | null> {
    const stmt = db.prepare("SELECT * FROM reconciliation_records WHERE claimId = ? ORDER BY rowid DESC LIMIT 1");
    const row = stmt.get(claimId) as ReconciliationRecord | undefined;
    return row || null;
  }

  async findAll(dataMode?: string): Promise<ReconciliationRecord[]> {
    if (!dataMode || dataMode === "ALL") {
      const stmt = db.prepare("SELECT * FROM reconciliation_records ORDER BY rowid DESC");
      return stmt.all() as ReconciliationRecord[];
    } else {
      const stmt = db.prepare("SELECT * FROM reconciliation_records WHERE dataMode = ? ORDER BY rowid DESC");
      return stmt.all(dataMode) as ReconciliationRecord[];
    }
  }

  async create(record: ReconciliationRecord): Promise<ReconciliationRecord> {
    const stmt = db.prepare(`
      INSERT INTO reconciliation_records (
        id, claimId, predictionSource, predictionCbg, predictionSeverity, predictionTariff,
        actualSource, actualCbg, actualSeverity, actualTariff, varianceAmount,
        varianceType, status, dataMode, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        actualCbg = excluded.actualCbg,
        actualSeverity = excluded.actualSeverity,
        actualTariff = excluded.actualTariff,
        varianceAmount = excluded.varianceAmount,
        varianceType = excluded.varianceType,
        status = excluded.status,
        updatedAt = excluded.updatedAt
    `);

    const now = new Date().toISOString();
    const fullRecord = {
      ...record,
      createdAt: record.createdAt || now,
      updatedAt: now
    };

    stmt.run(
      fullRecord.id,
      fullRecord.claimId,
      fullRecord.predictionSource || "LOCAL_PREDICTION",
      fullRecord.predictionCbg || "J-4-16-II",
      fullRecord.predictionSeverity || 2,
      fullRecord.predictionTariff || 0,
      fullRecord.actualSource || "MOCK",
      fullRecord.actualCbg || "J-4-16-II",
      fullRecord.actualSeverity || 2,
      fullRecord.actualTariff || 0,
      fullRecord.varianceAmount || 0,
      fullRecord.varianceType || "EXACT_MATCH",
      fullRecord.status || "REVIEW_REQUIRED",
      fullRecord.dataMode || "REAL",
      fullRecord.createdAt,
      fullRecord.updatedAt
    );

    return fullRecord;
  }

  async updateStatus(id: string, status: "RESOLVED" | "UNRESOLVED" | "REVIEW_REQUIRED"): Promise<boolean> {
    const now = new Date().toISOString();
    const stmt = db.prepare("UPDATE reconciliation_records SET status = ?, updatedAt = ? WHERE id = ?");
    const result = stmt.run(status, now, id);
    return result.changes > 0;
  }

  async deleteByDataMode(dataMode: string): Promise<number> {
    const stmt = db.prepare("DELETE FROM reconciliation_records WHERE dataMode = ?");
    const result = stmt.run(dataMode);
    return result.changes;
  }
}

export const reconciliationRepository = new ReconciliationRepository();
