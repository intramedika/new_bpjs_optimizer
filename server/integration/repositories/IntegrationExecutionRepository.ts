import { db } from "../../db/Database";
import { IntegrationExecution, IIntegrationExecutionRepository } from "../Interfaces";

export class IntegrationExecutionRepository implements IIntegrationExecutionRepository {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS integration_executions (
        id TEXT PRIMARY KEY,
        requestId TEXT NOT NULL,
        tenantId TEXT NOT NULL,
        hospitalId TEXT NOT NULL,
        adapterId TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL,
        durationMs INTEGER NOT NULL,
        responseCode TEXT,
        errorCode TEXT,
        createdAt TEXT NOT NULL
      );
    `);
  }

  async record(execution: Omit<IntegrationExecution, "id" | "createdAt">): Promise<IntegrationExecution> {
    const fullLog: IntegrationExecution = {
      ...execution,
      id: `IEX-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      createdAt: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO integration_executions (id, requestId, tenantId, hospitalId, adapterId, operation, status, durationMs, responseCode, errorCode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullLog.id,
      fullLog.requestId,
      fullLog.tenantId,
      fullLog.hospitalId,
      fullLog.adapterId,
      fullLog.operation,
      fullLog.status,
      fullLog.durationMs,
      fullLog.responseCode ? String(fullLog.responseCode) : null,
      fullLog.errorCode || null,
      fullLog.createdAt
    );

    return fullLog;
  }

  async findRecent(tenantId: string, hospitalId: string, limit = 50): Promise<IntegrationExecution[]> {
    const stmt = db.prepare(`
      SELECT * FROM integration_executions 
      WHERE tenantId = ? AND hospitalId = ?
      ORDER BY createdAt DESC LIMIT ?
    `);
    const rows = stmt.all(tenantId, hospitalId, limit) as any[];
    return rows;
  }
}

export const integrationExecutionRepository = new IntegrationExecutionRepository();
