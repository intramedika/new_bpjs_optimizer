import { db } from "../../db/Database";
import { IntegrationJob } from "../Interfaces";

export class IntegrationJobQueueRepository {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS integration_jobs (
        jobId TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        hospitalId TEXT NOT NULL,
        adapterId TEXT NOT NULL,
        operation TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        maxAttempts INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        startedAt TEXT,
        completedAt TEXT,
        lastError TEXT
      );
    `);
  }

  async enqueue(job: Omit<IntegrationJob, "jobId" | "createdAt" | "status" | "attempt">): Promise<IntegrationJob> {
    const fullJob: IntegrationJob = {
      ...job,
      jobId: `IJOB-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      createdAt: new Date().toISOString(),
      status: "QUEUED",
      attempt: 0,
      maxAttempts: job.maxAttempts || 3
    };

    const stmt = db.prepare(`
      INSERT INTO integration_jobs (jobId, tenantId, hospitalId, adapterId, operation, entityType, entityId, status, attempt, maxAttempts, payload_json, createdAt, lastError)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullJob.jobId,
      fullJob.tenantId,
      fullJob.hospitalId,
      fullJob.adapterId,
      fullJob.operation,
      fullJob.entityType,
      fullJob.entityId,
      fullJob.status,
      fullJob.attempt,
      fullJob.maxAttempts,
      JSON.stringify(fullJob.payload || {}),
      fullJob.createdAt,
      fullJob.lastError || null
    );

    return fullJob;
  }

  async listPending(tenantId: string, hospitalId: string): Promise<IntegrationJob[]> {
    const stmt = db.prepare(`
      SELECT * FROM integration_jobs 
      WHERE tenantId = ? AND hospitalId = ? AND status IN ('QUEUED', 'RETRYING', 'WAITING_FOR_CONNECTION')
      ORDER BY createdAt ASC
    `);
    const rows = stmt.all(tenantId, hospitalId) as any[];
    return rows.map(r => ({
      ...r,
      payload: JSON.parse(r.payload_json || "{}")
    }));
  }

  async updateStatus(jobId: string, status: IntegrationJob["status"], error?: string): Promise<void> {
    const now = new Date().toISOString();
    let stmt;
    if (status === "SUCCESS" || status === "FAILED" || status === "CANCELLED") {
      stmt = db.prepare(`
        UPDATE integration_jobs 
        SET status = ?, completedAt = ?, lastError = ? 
        WHERE jobId = ?
      `);
      stmt.run(status, now, error || null, jobId);
    } else {
      stmt = db.prepare(`
        UPDATE integration_jobs 
        SET status = ?, startedAt = ?, lastError = ? 
        WHERE jobId = ?
      `);
      stmt.run(status, now, error || null, jobId);
    }
  }
}

export const integrationJobQueueRepository = new IntegrationJobQueueRepository();
