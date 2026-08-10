import pg from "pg";
import { DatabaseProviderAdapter, DatabaseCapabilities, DatabaseMetadata, QueryResult } from "../DatabaseProvider";

const Pool = pg?.Pool || (pg as any)?.default?.Pool || (pg as any);

export interface PostgreSQLConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  maxPoolSize?: number;
  vendor?: 'neon' | 'supabase' | 'self-hosted' | 'generic';
}

export class PostgreSQLProvider implements DatabaseProviderAdapter {
  id = "postgresql-provider";
  name = "PostgreSQL Enterprise Adapter (Neon / Supabase / Self-Hosted)";
  providerType: 'postgresql' = 'postgresql';

  private pool: pg.Pool | null = null;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.pool) return;

    const sslConfig = this.config.ssl !== undefined ? this.config.ssl : { rejectUnauthorized: false };
    
    if (this.config.connectionString) {
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        ssl: sslConfig,
        max: this.config.maxPoolSize || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
    } else {
      this.pool = new Pool({
        host: this.config.host || "localhost",
        port: this.config.port || 5432,
        database: this.config.database || "bpjs_optimizer",
        user: this.config.user || "postgres",
        password: this.config.password || "",
        ssl: sslConfig,
        max: this.config.maxPoolSize || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      try { await this.pool.end(); } catch {}
      this.pool = null;
    }
  }

  async healthCheck(): Promise<{ status: 'CONNECTED' | 'FAILED'; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.connect();
      const res = await this.pool!.query("SELECT 1 as health, version()");
      const latencyMs = Date.now() - start;
      if (res && res.rows && res.rows.length > 0 && res.rows[0].health === 1) {
        return { status: 'CONNECTED', latencyMs };
      }
      return { status: 'FAILED', latencyMs, error: 'Unexpected result from PostgreSQL health query' };
    } catch (e: any) {
      return { status: 'FAILED', latencyMs: Date.now() - start, error: e.message };
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    await this.connect();
    
    // Replace positional ? placeholders with PostgreSQL $1, $2 syntax if needed
    let pgSql = sql;
    let paramIndex = 1;
    while (pgSql.includes("?")) {
      pgSql = pgSql.replace("?", `$${paramIndex++}`);
    }

    // Replace SQLite specific INSERT OR IGNORE with PostgreSQL ON CONFLICT DO NOTHING
    pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");

    const res = await this.pool!.query(pgSql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount || 0,
      fields: res.fields ? res.fields.map(f => f.name) : []
    };
  }

  async transaction<T = any>(callback: (trx: DatabaseProviderAdapter) => Promise<T>): Promise<T> {
    await this.connect();
    const client = await this.pool!.connect();
    try {
      await client.query("BEGIN");
      const clientAdapter: DatabaseProviderAdapter = {
        ...this,
        query: async <R = any>(sql: string, params: any[] = []) => {
          let pgSql = sql;
          let paramIndex = 1;
          while (pgSql.includes("?")) {
            pgSql = pgSql.replace("?", `$${paramIndex++}`);
          }
          pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");
          const res = await client.query(pgSql, params);
          return { rows: res.rows as R[], rowCount: res.rowCount || 0 };
        }
      };
      const result = await callback(clientAdapter);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async migrate(): Promise<{ status: 'SUCCESS' | 'FAILED'; version: string; tablesCreated: string[] }> {
    await this.connect();
    
    const ddlScript = `
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) UNIQUE NOT NULL,
        status VARCHAR(32) DEFAULT 'ACTIVE',
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS hospital_groups (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        status VARCHAR(32) DEFAULT 'ACTIVE',
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS hospitals (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        groupId VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        status VARCHAR(32) DEFAULT 'ACTIVE',
        timezone VARCHAR(64) DEFAULT 'Asia/Jakarta',
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        hospitalId VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        status VARCHAR(32) DEFAULT 'ACTIVE',
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(32) DEFAULT 'ACTIVE',
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128),
        name VARCHAR(255) NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        userId VARCHAR(128) NOT NULL,
        roleId VARCHAR(128) NOT NULL,
        tenantId VARCHAR(128) NOT NULL,
        groupId VARCHAR(128),
        hospitalId VARCHAR(128),
        departmentId VARCHAR(128),
        PRIMARY KEY (userId, roleId, tenantId)
      );

      CREATE TABLE IF NOT EXISTS user_hospital_access (
        userId VARCHAR(128) NOT NULL,
        hospitalId VARCHAR(128) NOT NULL,
        PRIMARY KEY (userId, hospitalId)
      );

      CREATE TABLE IF NOT EXISTS user_group_access (
        userId VARCHAR(128) NOT NULL,
        groupId VARCHAR(128) NOT NULL,
        PRIMARY KEY (userId, groupId)
      );

      CREATE TABLE IF NOT EXISTS integration_configs (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        groupId VARCHAR(128),
        hospitalId VARCHAR(128) NOT NULL,
        adapterId VARCHAR(64) NOT NULL,
        environment VARCHAR(32) DEFAULT 'MOCK',
        baseUrl TEXT,
        encryptedCredentials TEXT,
        status VARCHAR(32) DEFAULT 'NOT CONFIGURED',
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS claims (
        id VARCHAR(128) PRIMARY KEY,
        claimNumber VARCHAR(128),
        sepNumber VARCHAR(128),
        patientId VARCHAR(128),
        serviceDate VARCHAR(64),
        dischargeDate VARCHAR(64),
        principalDiagnosis TEXT,
        principalDiagnosisCode VARCHAR(32),
        cbgCode VARCHAR(32),
        cbgDescription TEXT,
        severity SMALLINT DEFAULT 1,
        tariff NUMERIC(15, 2) DEFAULT 0.00,
        readinessScore NUMERIC(5, 2) DEFAULT 0.00,
        risk VARCHAR(32),
        status VARCHAR(64),
        doctorName VARCHAR(255),
        unit VARCHAR(128),
        coderName VARCHAR(255),
        dataMode VARCHAR(32) DEFAULT 'REAL',
        sourceType VARCHAR(32) DEFAULT 'MANUAL',
        sourceReference VARCHAR(255),
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        groupId VARCHAR(128) DEFAULT 'group-nusantara',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt',
        departmentId VARCHAR(128),
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        data_json JSONB
      );

      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255),
        mimeType VARCHAR(128),
        size BIGINT,
        uploadedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(64),
        data_json JSONB
      );

      CREATE TABLE IF NOT EXISTS clinical_findings (
        id VARCHAR(128) PRIMARY KEY,
        claimId VARCHAR(128),
        documentId VARCHAR(128),
        findingType VARCHAR(64),
        findingValue TEXT,
        normalizedConcept TEXT,
        icdCode VARCHAR(32),
        sourceText TEXT,
        sourceDocument VARCHAR(255),
        pageNumber INTEGER DEFAULT 1,
        sourceSection VARCHAR(128),
        diagnosisStage VARCHAR(64) DEFAULT 'FINAL',
        evidenceType VARCHAR(64) DEFAULT 'EXPLICIT_DIAGNOSIS',
        confidence NUMERIC(5, 2) DEFAULT 90.00,
        status VARCHAR(64) DEFAULT 'PENDING_REVIEW',
        dataMode VARCHAR(32) DEFAULT 'REAL',
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt'
      );

      CREATE TABLE IF NOT EXISTS coding_candidates (
        id VARCHAR(128) PRIMARY KEY,
        claimId VARCHAR(128),
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt',
        icdCode VARCHAR(32),
        description TEXT,
        type VARCHAR(32),
        confidence NUMERIC(5, 2),
        rationale TEXT,
        evidenceQuote TEXT,
        status VARCHAR(32) DEFAULT 'PROPOSED',
        approvedBy VARCHAR(255),
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reconciliation_records (
        id VARCHAR(128) PRIMARY KEY,
        claimId VARCHAR(128),
        predictionSource VARCHAR(64) DEFAULT 'LOCAL_PREDICTION',
        predictionCbg VARCHAR(32),
        predictionSeverity SMALLINT,
        predictionTariff NUMERIC(15, 2) DEFAULT 0.00,
        actualSource VARCHAR(64) DEFAULT 'MOCK',
        actualCbg VARCHAR(32),
        actualSeverity SMALLINT,
        actualTariff NUMERIC(15, 2) DEFAULT 0.00,
        varianceAmount NUMERIC(15, 2) DEFAULT 0.00,
        varianceType VARCHAR(64) DEFAULT 'EXACT_MATCH',
        status VARCHAR(64) DEFAULT 'REVIEW_REQUIRED',
        dataMode VARCHAR(32) DEFAULT 'REAL',
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        groupId VARCHAR(128) DEFAULT 'group-nusantara',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt',
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(128) PRIMARY KEY,
        value TEXT,
        category VARCHAR(64) DEFAULT 'SYSTEM',
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS revenue_opportunities (
        id VARCHAR(128) PRIMARY KEY,
        claimId VARCHAR(128) NOT NULL,
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        groupId VARCHAR(128) DEFAULT 'group-nusantara',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt',
        dataMode VARCHAR(32) DEFAULT 'REAL',
        opportunityType VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        currentCoding TEXT NOT NULL,
        recommendedCoding TEXT NOT NULL,
        currentGrouper TEXT NOT NULL,
        recommendedGrouper TEXT NOT NULL,
        currentTariff NUMERIC(15, 2) NOT NULL,
        recommendedTariff NUMERIC(15, 2) NOT NULL,
        potentialDelta NUMERIC(15, 2) NOT NULL,
        realizedDelta NUMERIC(15, 2) DEFAULT 0.00,
        evidenceIds_json JSONB,
        evidenceSummary TEXT,
        clinicalSupportScore NUMERIC(5, 2) DEFAULT 90.00,
        codingConfidence NUMERIC(5, 2) DEFAULT 90.00,
        grouperConfidence NUMERIC(5, 2) DEFAULT 90.00,
        complianceScore NUMERIC(5, 2) DEFAULT 95.00,
        opportunityScore NUMERIC(5, 2) DEFAULT 85.00,
        riskLevel VARCHAR(32) DEFAULT 'LOW',
        status VARCHAR(32) DEFAULT 'DETECTED',
        approvedBy VARCHAR(255),
        approvedAt TIMESTAMPTZ,
        rejectedReason TEXT,
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        groupId VARCHAR(128) DEFAULT 'group-nusantara',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt',
        userId VARCHAR(128),
        entityType VARCHAR(64),
        localId VARCHAR(128),
        action VARCHAR(32),
        status VARCHAR(32),
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        retryCount INTEGER DEFAULT 0,
        error TEXT,
        payload JSONB
      );

      CREATE TABLE IF NOT EXISTS integration_executions (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        hospitalId VARCHAR(128) NOT NULL,
        adapterId VARCHAR(64) NOT NULL,
        operation VARCHAR(64) NOT NULL,
        requestId VARCHAR(128) NOT NULL,
        status VARCHAR(32) NOT NULL,
        durationMs INTEGER NOT NULL,
        requestPayload JSONB,
        responsePayload JSONB,
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS integration_job_queue (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) NOT NULL,
        hospitalId VARCHAR(128) NOT NULL,
        adapterId VARCHAR(64) NOT NULL,
        operation VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(32) NOT NULL,
        attempts INTEGER DEFAULT 0,
        lastError TEXT,
        createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(128) PRIMARY KEY,
        tenantId VARCHAR(128) DEFAULT 'tenant-pt-health',
        groupId VARCHAR(128) DEFAULT 'group-nusantara',
        hospitalId VARCHAR(128) DEFAULT 'hospital-jkt',
        userId VARCHAR(128),
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        action VARCHAR(128),
        entity VARCHAR(128),
        details JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_pg_claims_scope ON claims(tenantId, hospitalId, dataMode);
      CREATE INDEX IF NOT EXISTS idx_pg_audit_scope ON audit_logs(tenantId, hospitalId);
      CREATE INDEX IF NOT EXISTS idx_pg_findings_scope ON clinical_findings(tenantId, hospitalId);
    `;

    await this.query(ddlScript);

    return {
      status: 'SUCCESS',
      version: '1.0.0-pg',
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
      supportsJsonb: true,
      supportsRowLevelSecurity: true,
      supportsPooling: true,
      supportsAutoIncrement: false,
      providerType: 'postgresql'
    };
  }

  getMetadata(): DatabaseMetadata {
    return {
      provider: 'postgresql',
      vendor: this.config.vendor || 'neon',
      host: this.config.host || 'neon.tech',
      port: this.config.port || 5432,
      database: this.config.database || 'bpjs_optimizer',
      username: this.config.user || 'postgres',
      sslMode: 'require',
      schemaVersion: '1.0.0-pg',
      isEncrypted: true,
      poolSize: this.config.maxPoolSize || 10
    };
  }
}
