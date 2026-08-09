import { claimRepository } from "../repositories/ClaimRepository";
import { documentRepository } from "../repositories/DocumentRepository";
import { db } from "../db/Database";

export async function runIntakeClaimHandoffTest() {
  console.log("=== STARTING INTAKE -> CLAIM QUEUE HANDOFF E2E AUDIT ===");

  // 1. Simulate Document Intake Extraction for 0801R0011125V007026-lengkap.pdf
  const docId = `DOC-TEST-${Date.now()}`;
  const filename = "0801R0011125V007026-lengkap.pdf";
  
  const goldenExtraction = {
    patientName: "JOKO TRIYONO",
    mrNumber: "30051701",
    sepNumber: "0801R0011125V007026",
    documentType: "Resume Medis & SEP Rawat Jalan",
    diagnoses: [
      { text: "Chirrosis hepatis", code: "K74.6", confidence: 95, page: 4, sourceText: "DIAGNOSIS : Chirrosis hepatis" },
      { text: "Ascites", code: "R18.8", confidence: 94, page: 4, sourceText: "DIAGNOSIS : Ascites" },
      { text: "Melena", code: "K92.1", confidence: 94, page: 4, sourceText: "DIAGNOSIS : Melena" }
    ],
    procedures: [
      { text: "Pemeriksaan Dokter Spesialis IPD", code: "89.07", confidence: 92, page: 4, sourceText: "Konsultasi IPD" }
    ]
  };

  const docRecord: any = {
    id: docId,
    name: filename,
    mimeType: "application/pdf",
    size: 240891,
    uploadedAt: new Date().toISOString(),
    status: "CONFIRMED",
    extraction: goldenExtraction,
    hash: `sha256-${Date.now()}`
  };

  await documentRepository.create(docRecord);
  console.log("✔ STEP 1-4: Document Intake Created Record:", docId);

  // 2. Simulate Automatic Claim Creation during Ingestion Handoff
  const claimId = `CLM-AUDIT-${Date.now()}`;
  const tenantId = "tenant-pt-health";
  const hospitalId = "hospital-jkt";
  const groupId = "group-nusantara";
  const dataMode = "REAL";

  const newClaim: any = {
    id: claimId,
    claimNumber: `K-${goldenExtraction.sepNumber}`,
    sepNumber: goldenExtraction.sepNumber,
    patientId: goldenExtraction.mrNumber,
    patient: {
      id: goldenExtraction.mrNumber,
      name: goldenExtraction.patientName,
      mrNumber: goldenExtraction.mrNumber,
      gender: "L",
      dob: "1985-01-01"
    },
    serviceDate: "2025-11-12",
    dischargeDate: "2025-11-12",
    principalDiagnosis: goldenExtraction.diagnoses[0].text,
    principalDiagnosisCode: goldenExtraction.diagnoses[0].code,
    secondaryDiagnoses: ["R18.8", "K92.1"],
    procedures: ["89.07"],
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
    dataMode,
    sourceType: "PDF",
    sourceReference: docId,
    tenantId,
    hospitalId,
    groupId
  };

  const created = await claimRepository.create(newClaim);
  console.log("✔ STEP 5-6: Claim Created & Persisted with ID:", created.id);

  // 3. Query Database directly to verify persistence
  const persisted = await claimRepository.findById(claimId, { tenantId, hospitalId, groupId, userId: "usr-admin-001", role: "PLATFORM_ADMIN" });
  if (!persisted) {
    throw new Error(`FAIL: Claim ID ${claimId} not found in database!`);
  }
  console.log("✔ STEP 7: Database Direct Query Verified Claim:", persisted.patient?.name, persisted.sepNumber);

  // 4. Query Claim Queue Retrieval with scope filtering
  const queueClaims = await claimRepository.findAll(dataMode, { tenantId, hospitalId, groupId, userId: "usr-admin-001", role: "PLATFORM_ADMIN" });
  const foundInQueue = queueClaims.find(c => c.id === claimId);
  if (!foundInQueue) {
    throw new Error(`FAIL: Claim ID ${claimId} missing from Claim Queue query!`);
  }
  console.log("✔ STEP 8-9: Claim Queue Query Verified Visibility of Claim ID:", foundInQueue.id);

  // 5. Negative Test — Scope Isolation Check
  const isolatedClaims = await claimRepository.findAll(dataMode, { tenantId: "tenant-other-hospital", hospitalId: "hospital-isolated", groupId: "group-other", userId: "usr-casemix-002", role: "CASEMIX_OFFICER" });
  const leakedInOtherScope = isolatedClaims.find(c => c.id === claimId);
  if (leakedInOtherScope) {
    throw new Error(`FAIL: Tenant Isolation Breach! Claim ${claimId} leaked to unauthorized tenant-other-hospital!`);
  }
  console.log("✔ STEP 10: Scope Isolation Negative Test Passed (0 claims leaked to unauthorized scope).");

  console.log("=== INTAKE -> CLAIM QUEUE HANDOFF E2E AUDIT PASSED 100% ===");
  return {
    success: true,
    claimId,
    patientName: goldenExtraction.patientName,
    sepNumber: goldenExtraction.sepNumber,
    mrNumber: goldenExtraction.mrNumber,
    tenantId,
    hospitalId,
    dataMode
  };
}

if (require.main === module) {
  runIntakeClaimHandoffTest()
    .then(r => console.log("Test execution result:", r))
    .catch(e => { console.error("Test execution failed:", e); process.exit(1); });
}
