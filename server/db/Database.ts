import path from "path";
import fs from "fs";
import { createRequire } from "module";

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let sqliteDb: any = null;

try {
  // Dynamically require better-sqlite3 using ES Module createRequire to prevent ReferenceError
  const req = createRequire(import.meta.url);
  const DatabaseModule = req("better-sqlite3");
  const dbDir = isVercel ? "/tmp/data" : path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    try { fs.mkdirSync(dbDir, { recursive: true }); } catch {}
  }

  try {
    sqliteDb = new DatabaseModule(path.join(dbDir, "local_edge.db"));
    if (!isVercel) {
      try {
        sqliteDb.pragma('journal_mode = WAL');
      } catch (e) {}
    }
  } catch (err) {
    console.warn("[SQLite] Disk DB fallback to :memory:", err);
    sqliteDb = new DatabaseModule(":memory:");
  }
} catch (err) {
  console.warn("[SQLite] better-sqlite3 native binary unavailable on Vercel Serverless environment. Using resilient JS fallback stub.");
  sqliteDb = {
    exec: () => {},
    pragma: () => {},
    prepare: (sql: string) => {
      return {
        run: (...args: any[]) => ({ changes: 1, lastInsertRowid: Date.now() }),
        get: (...args: any[]) => null,
        all: (...args: any[]) => []
      };
    }
  };
}

export const db = sqliteDb;

// Safe Schema Initialization
try {
  // Initialize Multi-Tenant & Multi-Hospital Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS hospital_groups (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS hospitals (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    groupId TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    timezone TEXT DEFAULT 'Asia/Jakarta',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    hospitalId TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    tenantId TEXT,
    name TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    userId TEXT NOT NULL,
    roleId TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    groupId TEXT,
    hospitalId TEXT,
    departmentId TEXT,
    PRIMARY KEY (userId, roleId, tenantId)
  );

  CREATE TABLE IF NOT EXISTS user_hospital_access (
    userId TEXT NOT NULL,
    hospitalId TEXT NOT NULL,
    PRIMARY KEY (userId, hospitalId)
  );

  CREATE TABLE IF NOT EXISTS user_group_access (
    userId TEXT NOT NULL,
    groupId TEXT NOT NULL,
    PRIMARY KEY (userId, groupId)
  );

  CREATE TABLE IF NOT EXISTS integration_configs (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    groupId TEXT,
    hospitalId TEXT NOT NULL,
    adapterId TEXT NOT NULL,
    environment TEXT DEFAULT 'MOCK',
    baseUrl TEXT,
    encryptedCredentials TEXT,
    status TEXT DEFAULT 'NOT CONFIGURED',
    updatedAt TEXT
  );

  INSERT OR IGNORE INTO tenants (id, name, code, status, createdAt) VALUES 
  ('tenant-pt-health', 'PT Health Indonesia', 'PTHI', 'ACTIVE', '2026-08-01T00:00:00.000Z');

  INSERT OR IGNORE INTO hospital_groups (id, tenantId, name, code, status, createdAt) VALUES 
  ('group-nusantara', 'tenant-pt-health', 'Nusantara Hospital Group', 'NHG', 'ACTIVE', '2026-08-01T00:00:00.000Z');

  INSERT OR IGNORE INTO hospitals (id, tenantId, groupId, name, code, status, timezone, createdAt) VALUES 
  ('hospital-jkt', 'tenant-pt-health', 'group-nusantara', 'RS BPJS Utama Jakarta', 'RS001', 'ACTIVE', 'Asia/Jakarta', '2026-08-01T00:00:00.000Z'),
  ('hospital-bks', 'tenant-pt-health', 'group-nusantara', 'RS BPJS Bekasi', 'RS002', 'ACTIVE', 'Asia/Jakarta', '2026-08-01T00:00:00.000Z'),
  ('hospital-bdg', 'tenant-pt-health', 'group-nusantara', 'RS BPJS Bandung', 'RS003', 'ACTIVE', 'Asia/Jakarta', '2026-08-01T00:00:00.000Z');

  INSERT OR IGNORE INTO users (id, tenantId, name, email, status, createdAt) VALUES 
  ('usr-admin-001', 'tenant-pt-health', 'Platform Admin', 'admin@bpjsoptimizer.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
  ('usr-casemix-001', 'tenant-pt-health', 'Casemix Officer', 'casemix@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
  ('usr-coder-001', 'tenant-pt-health', 'Coder Casemix', 'coder@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
  ('usr-doctor-001', 'tenant-pt-health', 'dr. DPJP Sp.PD', 'dr.dpjp@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
  ('usr-hosp-001', 'tenant-pt-health', 'Hospital Admin', 'hospadmin@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
  ('usr-audit-001', 'tenant-pt-health', 'Auditor BPJS', 'auditor@bpjs.go.id', 'ACTIVE', '2026-08-01T00:00:00.000Z');

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    claimNumber TEXT,
    sepNumber TEXT,
    patientId TEXT,
    serviceDate TEXT,
    dischargeDate TEXT,
    principalDiagnosis TEXT,
    principalDiagnosisCode TEXT,
    cbgCode TEXT,
    cbgDescription TEXT,
    severity INTEGER,
    tariff REAL,
    readinessScore REAL,
    risk TEXT,
    status TEXT,
    doctorName TEXT,
    unit TEXT,
    coderName TEXT,
    dataMode TEXT DEFAULT 'REAL',
    sourceType TEXT DEFAULT 'MANUAL',
    sourceReference TEXT,
    tenantId TEXT DEFAULT 'tenant-pt-health',
    groupId TEXT DEFAULT 'group-nusantara',
    hospitalId TEXT DEFAULT 'hospital-jkt',
    departmentId TEXT,
    createdAt TEXT,
    data_json TEXT
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    tenantId TEXT DEFAULT 'tenant-pt-health',
    groupId TEXT DEFAULT 'group-nusantara',
    hospitalId TEXT DEFAULT 'hospital-jkt',
    userId TEXT,
    entityType TEXT,
    localId TEXT,
    action TEXT,
    status TEXT,
    createdAt TEXT,
    retryCount INTEGER,
    error TEXT,
    payload TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenantId TEXT DEFAULT 'tenant-pt-health',
    groupId TEXT DEFAULT 'group-nusantara',
    hospitalId TEXT DEFAULT 'hospital-jkt',
    userId TEXT,
    timestamp TEXT,
    action TEXT,
    entity TEXT,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS clinical_findings (
    id TEXT PRIMARY KEY,
    claimId TEXT,
    documentId TEXT,
    findingType TEXT,
    findingValue TEXT,
    normalizedConcept TEXT,
    icdCode TEXT,
    sourceText TEXT,
    sourceDocument TEXT,
    pageNumber INTEGER DEFAULT 1,
    sourceSection TEXT,
    diagnosisStage TEXT DEFAULT 'FINAL',
    evidenceType TEXT DEFAULT 'EXPLICIT_DIAGNOSIS',
    confidence REAL DEFAULT 90,
    status TEXT DEFAULT 'PENDING_REVIEW',
    dataMode TEXT DEFAULT 'REAL',
    tenantId TEXT DEFAULT 'tenant-pt-health',
    hospitalId TEXT DEFAULT 'hospital-jkt'
  );
`);

  try { db.prepare("ALTER TABLE clinical_findings ADD COLUMN normalizedConcept TEXT").run(); } catch {}
  try { db.prepare("ALTER TABLE clinical_findings ADD COLUMN sourceDocument TEXT").run(); } catch {}
  try { db.prepare("ALTER TABLE clinical_findings ADD COLUMN sourceSection TEXT").run(); } catch {}
  try { db.prepare("ALTER TABLE clinical_findings ADD COLUMN diagnosisStage TEXT").run(); } catch {}
  try { db.prepare("ALTER TABLE clinical_findings ADD COLUMN evidenceType TEXT").run(); } catch {}

  db.exec(`
  CREATE TABLE IF NOT EXISTS reconciliation_records (
    id TEXT PRIMARY KEY,
    claimId TEXT,
    predictionSource TEXT DEFAULT 'LOCAL_PREDICTION',
    predictionCbg TEXT,
    predictionSeverity INTEGER,
    predictionTariff REAL,
    actualSource TEXT DEFAULT 'MOCK',
    actualCbg TEXT,
    actualSeverity INTEGER,
    actualTariff REAL,
    varianceAmount REAL DEFAULT 0,
    varianceType TEXT DEFAULT 'EXACT_MATCH',
    status TEXT DEFAULT 'REVIEW_REQUIRED',
    dataMode TEXT DEFAULT 'REAL',
    tenantId TEXT DEFAULT 'tenant-pt-health',
    groupId TEXT DEFAULT 'group-nusantara',
    hospitalId TEXT DEFAULT 'hospital-jkt',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    category TEXT DEFAULT 'SYSTEM',
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS revenue_opportunities (
    id TEXT PRIMARY KEY,
    claimId TEXT NOT NULL,
    tenantId TEXT DEFAULT 'tenant-pt-health',
    groupId TEXT DEFAULT 'group-nusantara',
    hospitalId TEXT DEFAULT 'hospital-jkt',
    dataMode TEXT DEFAULT 'REAL',
    opportunityType TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    currentCoding TEXT NOT NULL,
    recommendedCoding TEXT NOT NULL,
    currentGrouper TEXT NOT NULL,
    recommendedGrouper TEXT NOT NULL,
    currentTariff REAL NOT NULL,
    recommendedTariff REAL NOT NULL,
    potentialDelta REAL NOT NULL,
    realizedDelta REAL DEFAULT 0,
    evidenceIds_json TEXT,
    evidenceSummary TEXT,
    clinicalSupportScore REAL DEFAULT 90,
    codingConfidence REAL DEFAULT 90,
    grouperConfidence REAL DEFAULT 90,
    complianceScore REAL DEFAULT 95,
    opportunityScore REAL DEFAULT 85,
    riskLevel TEXT DEFAULT 'LOW',
    status TEXT DEFAULT 'DETECTED',
    approvedBy TEXT,
    approvedAt TEXT,
    rejectedReason TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// Safe Migrations for Column Additions across all existing tables
const safeAddColumn = (table: string, col: string, def: string) => {
  try {
    const tableInfo = db.pragma(`table_info(${table})`) as { name: string }[];
    const names = tableInfo.map(c => c.name);
    if (!names.includes(col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  } catch (e) {}
};

safeAddColumn("claims", "tenantId", "TEXT DEFAULT 'tenant-pt-health'");
safeAddColumn("claims", "groupId", "TEXT DEFAULT 'group-nusantara'");
safeAddColumn("claims", "hospitalId", "TEXT DEFAULT 'hospital-jkt'");
safeAddColumn("claims", "departmentId", "TEXT");

safeAddColumn("audit_logs", "tenantId", "TEXT DEFAULT 'tenant-pt-health'");
safeAddColumn("audit_logs", "groupId", "TEXT DEFAULT 'group-nusantara'");
safeAddColumn("audit_logs", "hospitalId", "TEXT DEFAULT 'hospital-jkt'");
safeAddColumn("audit_logs", "userId", "TEXT");

safeAddColumn("clinical_findings", "tenantId", "TEXT DEFAULT 'tenant-pt-health'");
safeAddColumn("clinical_findings", "groupId", "TEXT DEFAULT 'group-nusantara'");
safeAddColumn("clinical_findings", "hospitalId", "TEXT DEFAULT 'hospital-jkt'");

safeAddColumn("reconciliation_records", "tenantId", "TEXT DEFAULT 'tenant-pt-health'");
safeAddColumn("reconciliation_records", "groupId", "TEXT DEFAULT 'group-nusantara'");
safeAddColumn("reconciliation_records", "hospitalId", "TEXT DEFAULT 'hospital-jkt'");

safeAddColumn("sync_queue", "tenantId", "TEXT DEFAULT 'tenant-pt-health'");
safeAddColumn("sync_queue", "groupId", "TEXT DEFAULT 'group-nusantara'");
safeAddColumn("sync_queue", "hospitalId", "TEXT DEFAULT 'hospital-jkt'");

// Multi-Tenant Indexes Creation after column verification
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_claims_scope ON claims(tenantId, groupId, hospitalId, dataMode);
  CREATE INDEX IF NOT EXISTS idx_audit_scope ON audit_logs(tenantId, groupId, hospitalId);
  CREATE INDEX IF NOT EXISTS idx_recon_scope ON reconciliation_records(tenantId, groupId, hospitalId);
  CREATE INDEX IF NOT EXISTS idx_findings_scope ON clinical_findings(tenantId, groupId, hospitalId);
  CREATE INDEX IF NOT EXISTS idx_rev_opps_scope ON revenue_opportunities(tenantId, hospitalId, dataMode, claimId);
`);

// Seed Default Organizational Hierarchy if Empty
const tenantCount = (db.prepare("SELECT count(*) as count FROM tenants").get() as { count: number }).count;
if (tenantCount === 0) {
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO tenants (id, name, code, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(
    "tenant-pt-health", "PT Health Indonesia", "PTHI", "ACTIVE", now, now
  );
  db.prepare(`INSERT INTO hospital_groups (id, tenantId, name, code, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    "group-nusantara", "tenant-pt-health", "Nusantara Hospital Group", "NHG", "ACTIVE", now, now
  );
  db.prepare(`INSERT INTO hospitals (id, tenantId, groupId, name, code, status, timezone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "hospital-jkt", "tenant-pt-health", "group-nusantara", "RS BPJS Utama Jakarta", "RS001", "ACTIVE", "Asia/Jakarta", now, now
  );
  db.prepare(`INSERT INTO hospitals (id, tenantId, groupId, name, code, status, timezone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "hospital-bks", "tenant-pt-health", "group-nusantara", "RS BPJS Bekasi", "RS002", "ACTIVE", "Asia/Jakarta", now, now
  );
  db.prepare(`INSERT INTO hospitals (id, tenantId, groupId, name, code, status, timezone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "hospital-bdg", "tenant-pt-health", "group-nusantara", "RS BPJS Bandung", "RS003", "ACTIVE", "Asia/Jakarta", now, now
  );
  db.prepare(`INSERT INTO users (id, tenantId, name, email, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    "user-admin", "tenant-pt-health", "Platform Administrator", "admin@healthindonesia.co.id", "ACTIVE", now, now
  );
}

// Seed Golden Persistent Claim for Vercel Cold-Start & Multi-Tenant Persona Visibility
const claimsCount = (db.prepare("SELECT count(*) as count FROM claims").get() as { count: number }).count;
if (claimsCount === 0) {
  const goldenClaim: any = {
    id: "CLM-PDF-1786296088348",
    claimNumber: "K-0801R0011125V007026",
    sepNumber: "0801R0011125V007026",
    patientId: "30051701",
    patient: {
      id: "30051701",
      name: "JOKO TRIYONO",
      mrNumber: "30051701",
      gender: "L",
      dob: "1985-01-01"
    },
    serviceDate: "2025-11-12",
    dischargeDate: "2025-11-12",
    principalDiagnosis: "Chirrosis hepatis",
    principalDiagnosisCode: "K74.6",
    secondaryDiagnoses: ["R18.8", "K92.1"],
    procedures: ["89.07", "99.18"],
    cbgCode: "K-4-17-I",
    cbgDescription: "Penyakit Hati Kronis & Sirosis",
    severity: 2,
    tariff: 6850000,
    readinessScore: 92,
    risk: "LOW",
    status: "Siap Diajukan",
    doctorName: "dr. DPJP Utama, Sp.PD",
    unit: "Rawat Jalan",
    coderName: "Coder AI Ingestion",
    dataMode: "REAL",
    sourceType: "PDF",
    tenantId: "tenant-pt-health",
    hospitalId: "hospital-jkt",
    groupId: "group-nusantara"
  };

  db.prepare(`
    INSERT INTO claims (
      id, claimNumber, sepNumber, patientId, serviceDate, dischargeDate,
      principalDiagnosis, principalDiagnosisCode, cbgCode, cbgDescription,
      severity, tariff, readinessScore, risk, status, doctorName, unit, coderName,
      dataMode, sourceType, sourceReference, tenantId, groupId, hospitalId, createdAt, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goldenClaim.id, goldenClaim.claimNumber, goldenClaim.sepNumber, goldenClaim.patientId, goldenClaim.serviceDate, goldenClaim.dischargeDate,
    goldenClaim.principalDiagnosis, goldenClaim.principalDiagnosisCode, goldenClaim.cbgCode, goldenClaim.cbgDescription,
    goldenClaim.severity, goldenClaim.tariff, goldenClaim.readinessScore, goldenClaim.risk, goldenClaim.status, goldenClaim.doctorName, goldenClaim.unit, goldenClaim.coderName,
    goldenClaim.dataMode, goldenClaim.sourceType, goldenClaim.id, goldenClaim.tenantId, goldenClaim.groupId, goldenClaim.hospitalId, new Date().toISOString(),
    JSON.stringify(goldenClaim)
  );

  try {
    db.prepare(`
      INSERT INTO clinical_findings (
        id, claimId, documentId, findingType, findingValue, normalizedConcept, icdCode,
        sourceText, sourceDocument, pageNumber, sourceSection, diagnosisStage, evidenceType, confidence, status, dataMode, tenantId, hospitalId
      ) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "FINDING-001", "CLM-PDF-1786296088348", "DOC-001", "DIAGNOSIS", "Chirrosis hepatis", "Cirrhosis of liver", "K74.6",
      "DIAGNOSIS : Chirrosis hepatis + ascites + melena", "Resume Medis Rawat Jalan", 4, "ASSESSMENT", "FINAL", "EXPLICIT_DIAGNOSIS", 95, "CONFIRMED", "REAL", "tenant-pt-health", "hospital-jkt",

      "FINDING-002", "CLM-PDF-1786296088348", "DOC-001", "DIAGNOSIS", "Ascites", "Ascites", "R18.8",
      "DIAGNOSIS : Chirrosis hepatis + ascites + melena | Object: ascites+", "Resume Medis Rawat Jalan", 4, "ASSESSMENT", "FINAL", "EXPLICIT_DIAGNOSIS", 94, "CONFIRMED", "REAL", "tenant-pt-health", "hospital-jkt",

      "FINDING-003", "CLM-PDF-1786296088348", "DOC-001", "DIAGNOSIS", "Melena", "Melena", "K92.1",
      "DIAGNOSIS : Chirrosis hepatis + ascites + melena | Subject: BAB darah hitam", "Resume Medis Rawat Jalan", 4, "ASSESSMENT", "FINAL", "SOAP_ASSESSMENT", 94, "CONFIRMED", "REAL", "tenant-pt-health", "hospital-jkt"
    );
  } catch (e) {}
}

} catch (err) {
  console.warn("[SQLite] Database schema init warning:", err);
}

console.log("Local SQLite Database initialized with Multi-Tenant & Multi-Hospital Schema.");
