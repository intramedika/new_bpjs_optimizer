import { db } from "../../db/Database";
import { IntegrationConfiguration, IIntegrationConfigurationRepository } from "../Interfaces";

export class IntegrationConfigRepository implements IIntegrationConfigurationRepository {
  constructor() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS integration_configs (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        hospitalId TEXT NOT NULL,
        adapterId TEXT NOT NULL,
        environment TEXT NOT NULL,
        baseUrl TEXT NOT NULL,
        credentials_json TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(tenantId, hospitalId, adapterId)
      );
    `);
  }

  async findByAdapter(adapterId: string, tenantId: string, hospitalId: string): Promise<IntegrationConfiguration | null> {
    const stmt = db.prepare(`
      SELECT * FROM integration_configs 
      WHERE adapterId = ? AND tenantId = ? AND hospitalId = ?
    `);
    const row = stmt.get(adapterId, tenantId, hospitalId) as any;
    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      hospitalId: row.hospitalId,
      adapterId: row.adapterId,
      environment: row.environment,
      baseUrl: row.baseUrl,
      credentials: JSON.parse(row.credentials_json || "{}"),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async save(config: Omit<IntegrationConfiguration, "id" | "createdAt" | "updatedAt" | "status"> & { status?: IntegrationConfiguration["status"] }): Promise<IntegrationConfiguration> {
    const now = new Date().toISOString();
    const existing = await this.findByAdapter(config.adapterId, config.tenantId, config.hospitalId);

    const fullConfig: IntegrationConfiguration = {
      id: existing ? existing.id : `ICFG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      tenantId: config.tenantId,
      hospitalId: config.hospitalId,
      adapterId: config.adapterId,
      environment: config.environment || "TEST",
      baseUrl: config.baseUrl,
      credentials: config.credentials || {},
      status: config.status || (config.baseUrl ? "CONFIGURED" : "NOT_CONFIGURED"),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    const stmt = db.prepare(`
      INSERT INTO integration_configs (id, tenantId, hospitalId, adapterId, environment, baseUrl, credentials_json, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenantId, hospitalId, adapterId) DO UPDATE SET
        environment = excluded.environment,
        baseUrl = excluded.baseUrl,
        credentials_json = excluded.credentials_json,
        status = excluded.status,
        updatedAt = excluded.updatedAt
    `);

    stmt.run(
      fullConfig.id,
      fullConfig.tenantId,
      fullConfig.hospitalId,
      fullConfig.adapterId,
      fullConfig.environment,
      fullConfig.baseUrl,
      JSON.stringify(fullConfig.credentials),
      fullConfig.status,
      fullConfig.createdAt,
      fullConfig.updatedAt
    );

    return fullConfig;
  }

  async listAll(tenantId: string, hospitalId: string): Promise<IntegrationConfiguration[]> {
    const stmt = db.prepare(`
      SELECT * FROM integration_configs 
      WHERE tenantId = ? AND hospitalId = ?
    `);
    const rows = stmt.all(tenantId, hospitalId) as any[];
    return rows.map(row => ({
      id: row.id,
      tenantId: row.tenantId,
      hospitalId: row.hospitalId,
      adapterId: row.adapterId,
      environment: row.environment,
      baseUrl: row.baseUrl,
      credentials: JSON.parse(row.credentials_json || "{}"),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }
}

export const integrationConfigRepository = new IntegrationConfigRepository();
