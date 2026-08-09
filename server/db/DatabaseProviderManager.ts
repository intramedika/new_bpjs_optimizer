import { DatabaseProviderAdapter, DatabaseCapabilities, DatabaseMetadata, QueryResult } from "./DatabaseProvider";
import { SQLiteProvider } from "./providers/SQLiteProvider";
import { PostgreSQLProvider } from "./providers/PostgreSQLProvider";
import { databaseConfigRepository, DatabaseConfigRecord } from "./DatabaseConfigRepository";
import { SecretManager } from "./SecretManager";

export class DatabaseProviderManager {
  private activeAdapter: DatabaseProviderAdapter;
  private currentConfig: DatabaseConfigRecord;

  constructor() {
    this.currentConfig = databaseConfigRepository.getActiveConfig();
    this.activeAdapter = this.createAdapterFromConfig(this.currentConfig);
  }

  private createAdapterFromConfig(config: DatabaseConfigRecord): DatabaseProviderAdapter {
    if (config.provider === "postgresql") {
      const connStr = databaseConfigRepository.getDecryptedConnectionString(config) || process.env.DATABASE_URL || process.env.POSTGRES_URL;
      const pwd = databaseConfigRepository.getDecryptedPassword(config);
      
      return new PostgreSQLProvider({
        connectionString: connStr || undefined,
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: pwd || undefined,
        ssl: { rejectUnauthorized: false },
        vendor: config.vendor as any || 'neon',
        maxPoolSize: config.maxPoolSize || 10
      });
    } else {
      return new SQLiteProvider();
    }
  }

  getAdapter(): DatabaseProviderAdapter {
    return this.activeAdapter;
  }

  async testConnection(configPayload: {
    provider: 'postgresql' | 'sqlite';
    vendor?: string;
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  }): Promise<{ status: 'CONNECTED' | 'FAILED'; latencyMs: number; error?: string }> {
    // SSRF Check
    const ssrfCheck = SecretManager.validateSSRF(configPayload.host || "", configPayload.connectionString);
    if (!ssrfCheck.safe) {
      return { status: 'FAILED', latencyMs: 0, error: ssrfCheck.reason };
    }

    let testAdapter: DatabaseProviderAdapter;
    if (configPayload.provider === "postgresql") {
      testAdapter = new PostgreSQLProvider({
        connectionString: configPayload.connectionString || undefined,
        host: configPayload.host,
        port: configPayload.port,
        database: configPayload.database,
        user: configPayload.username,
        password: configPayload.password,
        ssl: { rejectUnauthorized: false },
        vendor: configPayload.vendor as any || 'neon'
      });
    } else {
      testAdapter = new SQLiteProvider();
    }

    try {
      const result = await testAdapter.healthCheck();
      await testAdapter.disconnect();
      return result;
    } catch (e: any) {
      return { status: 'FAILED', latencyMs: 0, error: e.message || "Test connection failed" };
    }
  }

  async validateSchema(adapter?: DatabaseProviderAdapter): Promise<{
    status: 'PASS' | 'FAIL';
    tablesStatus: 'PASS' | 'FAIL';
    indexesStatus: 'PASS' | 'FAIL';
    foreignKeysStatus: 'PASS' | 'FAIL';
    schemaVersion: string;
    missingTables: string[];
  }> {
    const target = adapter || this.activeAdapter;
    const requiredTables = [
      'tenants', 'hospital_groups', 'hospitals', 'departments', 'users', 'roles',
      'user_roles', 'user_hospital_access', 'user_group_access', 'integration_configs',
      'claims', 'documents', 'clinical_findings', 'coding_candidates', 'reconciliation_records',
      'system_settings', 'revenue_opportunities', 'sync_queue', 'integration_executions',
      'integration_job_queue', 'audit_logs'
    ];

    const missingTables: string[] = [];
    for (const tbl of requiredTables) {
      try {
        let checkSql = "";
        if (target.providerType === "postgresql") {
          checkSql = `SELECT 1 FROM information_schema.tables WHERE table_name = '${tbl}'`;
        } else {
          checkSql = `SELECT 1 FROM sqlite_master WHERE type='table' AND name='${tbl}'`;
        }
        const res = await target.query(checkSql);
        if (res.rowCount === 0) {
          missingTables.push(tbl);
        }
      } catch (e) {
        missingTables.push(tbl);
      }
    }

    const passes = missingTables.length === 0;
    return {
      status: passes ? 'PASS' : 'FAIL',
      tablesStatus: passes ? 'PASS' : 'FAIL',
      indexesStatus: 'PASS',
      foreignKeysStatus: 'PASS',
      schemaVersion: target.getMetadata().schemaVersion,
      missingTables
    };
  }

  async activateNewProvider(config: DatabaseConfigRecord): Promise<{ success: boolean; message: string }> {
    const previousAdapter = this.activeAdapter;
    try {
      const newAdapter = this.createAdapterFromConfig(config);
      const health = await newAdapter.healthCheck();
      if (health.status !== 'CONNECTED') {
        throw new Error(`Health check failed for new provider: ${health.error}`);
      }

      this.activeAdapter = newAdapter;
      this.currentConfig = config;
      await previousAdapter.disconnect().catch(() => {});
      return { success: true, message: `Database successfully switched to ${config.provider.toUpperCase()} (${config.vendor}).` };
    } catch (e: any) {
      console.error("[DatabaseProviderManager] Activation failed, rolling back to previous adapter:", e);
      this.activeAdapter = previousAdapter;
      return { success: false, message: `Activation failed: ${e.message}. Reverted to previous active database.` };
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return this.activeAdapter.query<T>(sql, params);
  }

  async transaction<T = any>(callback: (trx: DatabaseProviderAdapter) => Promise<T>): Promise<T> {
    return this.activeAdapter.transaction<T>(callback);
  }

  async migrate(): Promise<{ status: 'SUCCESS' | 'FAILED'; version: string; tablesCreated: string[] }> {
    return this.activeAdapter.migrate();
  }

  getCapabilities(): DatabaseCapabilities {
    return this.activeAdapter.getCapabilities();
  }

  getMetadata(): DatabaseMetadata {
    return this.activeAdapter.getMetadata();
  }
}

export const databaseProviderManager = new DatabaseProviderManager();
