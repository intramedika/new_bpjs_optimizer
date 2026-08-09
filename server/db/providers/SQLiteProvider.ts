import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DatabaseProviderAdapter, DatabaseCapabilities, DatabaseMetadata, QueryResult } from "../DatabaseProvider";

export class SQLiteProvider implements DatabaseProviderAdapter {
  id = "sqlite-provider";
  name = "SQLite Local / Edge Adapter";
  providerType: 'sqlite' = 'sqlite';

  private dbInstance: any = null;
  private dbPath: string;

  constructor(filePath?: string) {
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const dbDir = isVercel ? "/tmp/data" : path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      try { fs.mkdirSync(dbDir, { recursive: true }); } catch {}
    }
    this.dbPath = filePath || path.join(dbDir, "local_edge.db");
  }

  async connect(): Promise<void> {
    if (this.dbInstance) return;
    try {
      this.dbInstance = new Database(this.dbPath);
      try {
        this.dbInstance.pragma('journal_mode = WAL');
      } catch (e) {}
    } catch (err) {
      console.warn("[SQLiteProvider] Failed to open disk database, falling back to memory:", err);
      this.dbInstance = new Database(":memory:");
    }
  }

  async disconnect(): Promise<void> {
    if (this.dbInstance) {
      try { this.dbInstance.close(); } catch {}
      this.dbInstance = null;
    }
  }

  async healthCheck(): Promise<{ status: 'CONNECTED' | 'FAILED'; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.connect();
      const res = this.dbInstance.prepare("SELECT 1 as health").get();
      const latencyMs = Date.now() - start;
      if (res && res.health === 1) {
        return { status: 'CONNECTED', latencyMs };
      }
      return { status: 'FAILED', latencyMs, error: 'Unexpected response from SQLite health query' };
    } catch (e: any) {
      return { status: 'FAILED', latencyMs: Date.now() - start, error: e.message };
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.connect();
    const cleanSql = sql.trim();
    const isSelect = cleanSql.toUpperCase().startsWith("SELECT") || cleanSql.toUpperCase().startsWith("PRAGMA") || cleanSql.toUpperCase().startsWith("EXPLAIN");

    if (isSelect) {
      const stmt = this.dbInstance.prepare(sql);
      const rows = stmt.all(...params) as T[];
      return {
        rows,
        rowCount: rows.length
      };
    } else {
      const stmt = this.dbInstance.prepare(sql);
      const result = stmt.run(...params);
      return {
        rows: [],
        rowCount: result.changes
      };
    }
  }

  async transaction<T = any>(callback: (trx: DatabaseProviderAdapter) => Promise<T>): Promise<T> {
    await this.connect();
    this.dbInstance.exec("BEGIN IMMEDIATE");
    try {
      const result = await callback(this);
      this.dbInstance.exec("COMMIT");
      return result;
    } catch (err) {
      try { this.dbInstance.exec("ROLLBACK"); } catch {}
      throw err;
    }
  }

  async migrate(): Promise<{ status: 'SUCCESS' | 'FAILED'; version: string; tablesCreated: string[] }> {
    await this.connect();
    // Execute DDL setup
    this.dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'ACTIVE', createdAt TEXT, updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS hospital_groups (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', createdAt TEXT, updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS hospitals (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, groupId TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', timezone TEXT DEFAULT 'Asia/Jakarta', createdAt TEXT, updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, hospitalId TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', createdAt TEXT, updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'ACTIVE', createdAt TEXT, updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY, tenantId TEXT, name TEXT NOT NULL, description TEXT
      );
      CREATE TABLE IF NOT EXISTS user_roles (
        userId TEXT NOT NULL, roleId TEXT NOT NULL, tenantId TEXT NOT NULL, groupId TEXT, hospitalId TEXT, departmentId TEXT, PRIMARY KEY (userId, roleId, tenantId)
      );
      CREATE TABLE IF NOT EXISTS user_hospital_access (
        userId TEXT NOT NULL, hospitalId TEXT NOT NULL, PRIMARY KEY (userId, hospitalId)
      );
      CREATE TABLE IF NOT EXISTS user_group_access (
        userId TEXT NOT NULL, groupId TEXT NOT NULL, PRIMARY KEY (userId, groupId)
      );
      CREATE TABLE IF NOT EXISTS integration_configs (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, groupId TEXT, hospitalId TEXT NOT NULL, adapterId TEXT NOT NULL, environment TEXT DEFAULT 'MOCK', baseUrl TEXT, encryptedCredentials TEXT, status TEXT DEFAULT 'NOT CONFIGURED', updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY, claimNumber TEXT, sepNumber TEXT, patientId TEXT, serviceDate TEXT, dischargeDate TEXT, principalDiagnosis TEXT, principalDiagnosisCode TEXT, cbgCode TEXT, cbgDescription TEXT, severity INTEGER, tariff REAL, readinessScore REAL, risk TEXT, status TEXT, doctorName TEXT, unit TEXT, coderName TEXT, dataMode TEXT DEFAULT 'REAL', sourceType TEXT DEFAULT 'MANUAL', sourceReference TEXT, tenantId TEXT DEFAULT 'tenant-pt-health', groupId TEXT DEFAULT 'group-nusantara', hospitalId TEXT DEFAULT 'hospital-jkt', departmentId TEXT, createdAt TEXT, data_json TEXT
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, name TEXT, mimeType TEXT, size INTEGER, uploadedAt TEXT, status TEXT, data_json TEXT
      );
      CREATE TABLE IF NOT EXISTS clinical_findings (
        id TEXT PRIMARY KEY, claimId TEXT, documentId TEXT, findingType TEXT, findingValue TEXT, normalizedConcept TEXT, icdCode TEXT, sourceText TEXT, sourceDocument TEXT, pageNumber INTEGER DEFAULT 1, sourceSection TEXT, diagnosisStage TEXT DEFAULT 'FINAL', evidenceType TEXT DEFAULT 'EXPLICIT_DIAGNOSIS', confidence REAL DEFAULT 90, status TEXT DEFAULT 'PENDING_REVIEW', dataMode TEXT DEFAULT 'REAL', tenantId TEXT DEFAULT 'tenant-pt-health', hospitalId TEXT DEFAULT 'hospital-jkt'
      );
      CREATE TABLE IF NOT EXISTS coding_candidates (
        id TEXT PRIMARY KEY, claimId TEXT, tenantId TEXT DEFAULT 'tenant-pt-health', hospitalId TEXT DEFAULT 'hospital-jkt', icdCode TEXT, description TEXT, type TEXT, confidence REAL, rationale TEXT, evidenceQuote TEXT, status TEXT DEFAULT 'PROPOSED', approvedBy TEXT, createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS reconciliation_records (
        id TEXT PRIMARY KEY, claimId TEXT, predictionSource TEXT DEFAULT 'LOCAL_PREDICTION', predictionCbg TEXT, predictionSeverity INTEGER, predictionTariff REAL, actualSource TEXT DEFAULT 'MOCK', actualCbg TEXT, actualSeverity INTEGER, actualTariff REAL, varianceAmount REAL DEFAULT 0, varianceType TEXT DEFAULT 'EXACT_MATCH', status TEXT DEFAULT 'REVIEW_REQUIRED', dataMode TEXT DEFAULT 'REAL', tenantId TEXT DEFAULT 'tenant-pt-health', groupId TEXT DEFAULT 'group-nusantara', hospitalId TEXT DEFAULT 'hospital-jkt', createdAt TEXT, updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY, value TEXT, category TEXT DEFAULT 'SYSTEM', updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS revenue_opportunities (
        id TEXT PRIMARY KEY, claimId TEXT NOT NULL, tenantId TEXT DEFAULT 'tenant-pt-health', groupId TEXT DEFAULT 'group-nusantara', hospitalId TEXT DEFAULT 'hospital-jkt', dataMode TEXT DEFAULT 'REAL', opportunityType TEXT NOT NULL, title TEXT NOT NULL, description TEXT, currentCoding TEXT NOT NULL, recommendedCoding TEXT NOT NULL, currentGrouper TEXT NOT NULL, recommendedGrouper TEXT NOT NULL, currentTariff REAL NOT NULL, recommendedTariff REAL NOT NULL, potentialDelta REAL NOT NULL, realizedDelta REAL DEFAULT 0, evidenceIds_json TEXT, evidenceSummary TEXT, clinicalSupportScore REAL DEFAULT 90, codingConfidence REAL DEFAULT 90, grouperConfidence REAL DEFAULT 90, complianceScore REAL DEFAULT 95, opportunityScore REAL DEFAULT 85, riskLevel TEXT DEFAULT 'LOW', status TEXT DEFAULT 'DETECTED', approvedBy TEXT, approvedAt TEXT, rejectedReason TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY, tenantId TEXT DEFAULT 'tenant-pt-health', groupId TEXT DEFAULT 'group-nusantara', hospitalId TEXT DEFAULT 'hospital-jkt', userId TEXT, entityType TEXT, localId TEXT, action TEXT, status TEXT, createdAt TEXT, retryCount INTEGER, error TEXT, payload TEXT
      );
      CREATE TABLE IF NOT EXISTS integration_executions (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, hospitalId TEXT NOT NULL, adapterId TEXT NOT NULL, operation TEXT NOT NULL, requestId TEXT NOT NULL, status TEXT NOT NULL, durationMs INTEGER NOT NULL, requestPayload TEXT, responsePayload TEXT, createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS integration_job_queue (
        id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, hospitalId TEXT NOT NULL, adapterId TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER DEFAULT 0, lastError TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY, tenantId TEXT DEFAULT 'tenant-pt-health', groupId TEXT DEFAULT 'group-nusantara', hospitalId TEXT DEFAULT 'hospital-jkt', userId TEXT, timestamp TEXT, action TEXT, entity TEXT, details TEXT
      );
    `);

    return {
      status: 'SUCCESS',
      version: '1.0.0-sqlite',
      tablesCreated: [
        'tenants', 'hospital_groups', 'hospitals', 'departments', 'users', 'roles',
        'user_roles', 'user_hospital_access', 'user_group_access', 'integration_configs',
        'claims', 'documents', 'clinical_findings', 'coding_candidates', 'reconciliation_records',
        'system_settings', 'revenue_opportunities', 'sync_queue', 'integration_executions',
        'integration_job_queue', 'audit_logs'
      ]
    };
  }

  getCapabilities(): DatabaseCapabilities {
    return {
      supportsTransactions: true,
      supportsJsonb: false,
      supportsRowLevelSecurity: false,
      supportsPooling: false,
      supportsAutoIncrement: true,
      providerType: 'sqlite'
    };
  }

  getMetadata(): DatabaseMetadata {
    return {
      provider: 'sqlite',
      vendor: 'local_sqlite',
      database: this.dbPath,
      schemaVersion: '1.0.0-sqlite',
      isEncrypted: false
    };
  }
}
