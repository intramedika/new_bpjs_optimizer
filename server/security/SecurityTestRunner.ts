import { SEEDED_PRINCIPALS, ServerPrincipal } from "./SecurityContext";
import { Role, Permission, hasPermission } from "./Roles";
import { claimRepository } from "../repositories/ClaimRepository";
import { auditLogger } from "./AuditLogger";
import app from "../../api/index";
import http from "http";

export interface SecurityTestCase {
  id: string;
  name: string;
  category: string;
  expectedResult: 'DENY' | 'ALLOW';
  actualResult?: 'DENY' | 'ALLOW';
  passed?: boolean;
  reason?: string;
}

export class SecurityTestRunner {
  private server: http.Server | null = null;
  private port = 4999;

  async startServer(): Promise<string> {
    return new Promise((resolve) => {
      this.server = app.listen(this.port, () => {
        resolve(`http://127.0.0.1:${this.port}`);
      });
    });
  }

  async stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
    const url = `http://127.0.0.1:${this.port}${path}`;
    const headers = options.headers || {};
    const method = options.method || 'GET';

    try {
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const text = await resp.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch { json = { text }; }
      return { status: resp.status, body: json };
    } catch (err: any) {
      return { status: 500, body: { error: err.message } };
    }
  }

  async runAllTests(): Promise<SecurityTestCase[]> {
    await this.startServer();

    // Create cross-tenant and cross-hospital claim fixtures for testing
    await claimRepository.create({
      id: "CLM-SURABAYA-001",
      claimNumber: "K-SURABAYA-001",
      sepNumber: "MOCK-SEP-SURABAYA",
      patientId: "PAT-SURABAYA",
      patient: { id: "PAT-SURABAYA", name: "SURABAYA PATIENT", mrNumber: "RM-SURABAYA", gender: "L", dob: "1990-01-01" },
      serviceDate: "2026-08-01",
      dischargeDate: "2026-08-05",
      principalDiagnosis: "Pneumonia",
      principalDiagnosisCode: "J18.9",
      severity: 1,
      tariff: 4500000,
      readinessScore: 90,
      risk: "LOW",
      status: "Siap Diajukan",
      doctorName: "dr. Surabaya",
      unit: "Rawat Inap",
      coderName: "Surabaya Coder",
      dataMode: "REAL",
      sourceType: "MANUAL",
      sourceReference: "FIXTURE"
    } as any, { tenantId: "tenant-pt-health", groupId: "group-nusantara", hospitalId: "hospital-surabaya" });

    await claimRepository.create({
      id: "CLM-TENANT-VICTIM-001",
      claimNumber: "K-VICTIM-001",
      sepNumber: "MOCK-SEP-VICTIM",
      patientId: "PAT-VICTIM",
      patient: { id: "PAT-VICTIM", name: "VICTIM PATIENT", mrNumber: "RM-VICTIM", gender: "P", dob: "1985-02-02" },
      serviceDate: "2026-08-01",
      dischargeDate: "2026-08-05",
      principalDiagnosis: "Diabetes Mellitus",
      principalDiagnosisCode: "E11.9",
      severity: 1,
      tariff: 3500000,
      readinessScore: 88,
      risk: "LOW",
      status: "Siap Diajukan",
      doctorName: "dr. Victim",
      unit: "Rawat Jalan",
      coderName: "Victim Coder",
      dataMode: "REAL",
      sourceType: "MANUAL",
      sourceReference: "FIXTURE"
    } as any, { tenantId: "tenant-victim", groupId: "group-victim", hospitalId: "hospital-victim" });

    const testCases: SecurityTestCase[] = [
      { id: "TEST_RBAC_001", name: "Normal user attempts admin endpoint (/api/admin/tenants)", category: "RBAC", expectedResult: "DENY" },
      { id: "TEST_RBAC_002", name: "Coder attempts hospital creation (/api/admin/hospitals)", category: "RBAC", expectedResult: "DENY" },
      { id: "TEST_RBAC_003", name: "Auditor attempts claim mutation (PUT /api/claims/:id)", category: "RBAC", expectedResult: "DENY" },
      { id: "TEST_RBAC_004", name: "Clinical reviewer attempts revenue approval", category: "REVENUE_SECURITY", expectedResult: "DENY" },
      { id: "TEST_RBAC_005", name: "Hospital A user accesses Hospital B claim", category: "HOSPITAL_ISOLATION", expectedResult: "DENY" },
      { id: "TEST_RBAC_006", name: "Tenant A user accesses Tenant B claim", category: "TENANT_ISOLATION", expectedResult: "DENY" },
      { id: "TEST_RBAC_007", name: "User modifies X-Tenant-Id header to tenant-victim", category: "ANTI_TAMPERING", expectedResult: "DENY" },
      { id: "TEST_RBAC_008", name: "User modifies X-Hospital-Id header to hospital-surabaya", category: "ANTI_TAMPERING", expectedResult: "DENY" },
      { id: "TEST_RBAC_009", name: "User modifies role in request body", category: "ANTI_TAMPERING", expectedResult: "DENY" },
      { id: "TEST_RBAC_010", name: "User calls hidden admin endpoint directly", category: "PRIVILEGE_ESCALATION", expectedResult: "DENY" },
      { id: "TEST_RBAC_011", name: "User calls revenue approve API directly without permission", category: "REVENUE_SECURITY", expectedResult: "DENY" },
      { id: "TEST_RBAC_012", name: "User calls VClaim / Integration execute directly without permission", category: "VCLAIM_SECURITY", expectedResult: "DENY" },
      { id: "TEST_RBAC_013", name: "User attempts DataMode escalation", category: "DATAMODE_SECURITY", expectedResult: "DENY" },
      { id: "TEST_RBAC_014", name: "Expired session accesses API", category: "SESSION_SECURITY", expectedResult: "DENY" },
      { id: "TEST_RBAC_015", name: "Logged-out session accesses API", category: "SESSION_SECURITY", expectedResult: "DENY" },
      { id: "TEST_RBAC_016", name: "Cross-tenant revenue analytics attempt", category: "TENANT_ISOLATION", expectedResult: "DENY" },
      { id: "TEST_RBAC_017", name: "Cross-hospital audit log access attempt", category: "HOSPITAL_ISOLATION", expectedResult: "DENY" }
    ];

    // TEST_RBAC_001: Normal user (CODER) calls /api/admin/tenants
    const r1 = await this.makeRequest("/api/admin/tenants", { headers: { "X-User-Role": Role.CODER } });
    testCases[0].actualResult = r1.status === 403 ? "DENY" : "ALLOW";
    testCases[0].passed = r1.status === 403;
    testCases[0].reason = `Status returned: ${r1.status}`;

    // TEST_RBAC_002: Coder calls POST /api/admin/hospitals
    const r2 = await this.makeRequest("/api/admin/hospitals", { method: "POST", headers: { "X-User-Role": Role.CODER }, body: { name: "Fake", code: "FK" } });
    testCases[1].actualResult = r2.status === 403 ? "DENY" : "ALLOW";
    testCases[1].passed = r2.status === 403;
    testCases[1].reason = `Status returned: ${r2.status}`;

    // TEST_RBAC_003: Auditor calls PUT /api/claims/CLM-E2E-20260809-948123
    const r3 = await this.makeRequest("/api/claims/CLM-E2E-20260809-948123", { method: "PUT", headers: { "X-User-Role": Role.AUDITOR }, body: { status: "Mutated" } });
    testCases[2].actualResult = r3.status === 403 ? "DENY" : "ALLOW";
    testCases[2].passed = r3.status === 403;
    testCases[2].reason = `Status returned: ${r3.status}`;

    // TEST_RBAC_004: Clinical reviewer calls POST /api/revenue-opportunities/REV-1/approve
    const r4 = await this.makeRequest("/api/revenue-opportunities/REV-1/approve", { method: "POST", headers: { "X-User-Role": Role.CLINICAL_REVIEWER } });
    testCases[3].actualResult = r4.status === 403 ? "DENY" : "ALLOW";
    testCases[3].passed = r4.status === 403;
    testCases[3].reason = `Status returned: ${r4.status}`;

    // TEST_RBAC_005: Hospital JKT user accesses Hospital Surabaya claim CLM-SURABAYA-001
    const r5 = await this.makeRequest("/api/claims/CLM-SURABAYA-001", { headers: { "X-User-Id": "user-coder", "X-Hospital-Id": "hospital-jkt" } });
    testCases[4].actualResult = (r5.status === 403 || r5.status === 404) ? "DENY" : "ALLOW";
    testCases[4].passed = (r5.status === 403 || r5.status === 404);
    testCases[4].reason = `Status returned: ${r5.status}`;

    // TEST_RBAC_006: Tenant PT Health user accesses Tenant Victim claim CLM-TENANT-VICTIM-001
    const r6 = await this.makeRequest("/api/claims/CLM-TENANT-VICTIM-001", { headers: { "X-User-Id": "user-coder", "X-Tenant-Id": "tenant-pt-health" } });
    testCases[5].actualResult = (r6.status === 403 || r6.status === 404) ? "DENY" : "ALLOW";
    testCases[5].passed = (r6.status === 403 || r6.status === 404);
    testCases[5].reason = `Status returned: ${r6.status}`;

    // TEST_RBAC_007: User sends X-Tenant-Id: tenant-victim header override
    const r7 = await this.makeRequest("/api/claims/CLM-TENANT-VICTIM-001", { headers: { "X-User-Id": "user-coder", "X-Tenant-Id": "tenant-victim" } });
    testCases[6].actualResult = (r7.status === 403 || r7.status === 404) ? "DENY" : "ALLOW";
    testCases[6].passed = (r7.status === 403 || r7.status === 404);
    testCases[6].reason = `Status returned: ${r7.status}`;

    // TEST_RBAC_008: User sends X-Hospital-Id: hospital-surabaya header override
    const r8 = await this.makeRequest("/api/claims/CLM-SURABAYA-001", { headers: { "X-User-Id": "user-coder", "X-Hospital-Id": "hospital-surabaya" } });
    testCases[7].actualResult = (r8.status === 403 || r8.status === 404) ? "DENY" : "ALLOW";
    testCases[7].passed = (r8.status === 403 || r8.status === 404);
    testCases[7].reason = `Status returned: ${r8.status}`;

    // TEST_RBAC_009: User modifies role in body { role: "PLATFORM_ADMIN" }
    const r9 = await this.makeRequest("/api/admin/hospitals", { method: "POST", headers: { "X-User-Id": "user-coder" }, body: { role: "PLATFORM_ADMIN", name: "Attacker Hospital", code: "ATT" } });
    testCases[8].actualResult = r9.status === 403 ? "DENY" : "ALLOW";
    testCases[8].passed = r9.status === 403;
    testCases[8].reason = `Status returned: ${r9.status}`;

    // TEST_RBAC_010: User calls hidden admin endpoint directly (/api/admin/users)
    const r10 = await this.makeRequest("/api/admin/users", { headers: { "X-User-Role": Role.CODER } });
    testCases[9].actualResult = r10.status === 403 ? "DENY" : "ALLOW";
    testCases[9].passed = r10.status === 403;
    testCases[9].reason = `Status returned: ${r10.status}`;

    // TEST_RBAC_011: User calls revenue approve API directly without permission
    const r11 = await this.makeRequest("/api/revenue-opportunities/REV-1/approve", { method: "POST", headers: { "X-User-Role": Role.AUDITOR } });
    testCases[10].actualResult = r11.status === 403 ? "DENY" : "ALLOW";
    testCases[10].passed = r11.status === 403;
    testCases[10].reason = `Status returned: ${r11.status}`;

    // TEST_RBAC_012: Auditor calls VClaim / Integration execute directly without permission
    const r12 = await this.makeRequest("/api/integration/execute", { method: "POST", headers: { "X-User-Role": Role.AUDITOR }, body: { adapterId: "vclaim-v2", operation: "searchSep" } });
    testCases[11].actualResult = r12.status === 403 ? "DENY" : "ALLOW";
    testCases[11].passed = r12.status === 403;
    testCases[11].reason = `Status returned: ${r12.status}`;

    // TEST_RBAC_013: User attempts DataMode escalation to REAL without permission
    const r13 = await this.makeRequest("/api/admin/tenants?dataMode=REAL", { headers: { "X-User-Role": Role.CLINICAL_REVIEWER } });
    testCases[12].actualResult = r13.status === 403 ? "DENY" : "ALLOW";
    testCases[12].passed = r13.status === 403;
    testCases[12].reason = `Status returned: ${r13.status}`;

    // TEST_RBAC_014: Expired / invalid session token accesses API
    const r14 = await this.makeRequest("/api/admin/tenants", { headers: { "Authorization": "Bearer EXPIRED_TOKEN_123" } });
    testCases[13].actualResult = r14.status === 403 ? "DENY" : "ALLOW";
    testCases[13].passed = r14.status === 403;
    testCases[13].reason = `Status returned: ${r14.status}`;

    // TEST_RBAC_015: Logged-out / anonymous session accesses protected admin API
    const r15 = await this.makeRequest("/api/admin/hospitals", { method: "POST", body: { name: "Anon" } });
    testCases[14].actualResult = r15.status === 403 ? "DENY" : "ALLOW";
    testCases[14].passed = r15.status === 403;
    testCases[14].reason = `Status returned: ${r15.status}`;

    // TEST_RBAC_016: Cross-tenant revenue analytics attempt
    const r16 = await this.makeRequest("/api/revenue/analytics", { headers: { "X-User-Id": "user-coder", "X-Tenant-Id": "tenant-victim" } });
    testCases[15].actualResult = r16.status === 403 ? "DENY" : "ALLOW";
    testCases[15].passed = r16.status === 403;
    testCases[15].reason = `Status returned: ${r16.status}`;

    // TEST_RBAC_017: Cross-hospital audit log access attempt
    const r17 = await this.makeRequest("/api/integration/executions", { headers: { "X-User-Id": "user-coder", "X-Hospital-Id": "hospital-surabaya" } });
    testCases[16].actualResult = r17.status === 403 ? "DENY" : "ALLOW";
    testCases[16].passed = r17.status === 403;
    testCases[16].reason = `Status returned: ${r17.status}`;

    await this.stopServer();
    return testCases;
  }
}

export const securityTestRunner = new SecurityTestRunner();
