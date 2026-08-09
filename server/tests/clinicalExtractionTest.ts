import { clinicalIntelligenceEngine } from "../engines/ClinicalIntelligenceEngine";
import { claimRepository } from "../repositories/ClaimRepository";

async function runTest() {
  console.log("============================================================");
  console.log("BPJS OPTIMIZER — CLINICAL EVIDENCE EXTRACTION REGRESSION TEST");
  console.log("DOCUMENT: 0801R0011125V007026-lengkap.pdf (JOKO TRIYONO)");
  console.log("============================================================\n");

  const claimId = "CLM-E2E-20260809-948123";
  await claimRepository.create({
    id: claimId,
    claimNumber: "K-0801R0011125V007026",
    sepNumber: "0801R0011125V007026",
    patientId: "PAT-30051701",
    patient: {
      id: "PAT-30051701",
      name: "JOKO TRIYONO",
      mrNumber: "30051701",
      gender: "L",
      dob: "1975-06-15"
    },
    serviceDate: "2025-11-12",
    dischargeDate: "2025-11-12",
    principalDiagnosis: "Chirrosis hepatis + ascites + melena",
    principalDiagnosisCode: "K74.6",
    secondaryDiagnoses: ["R18.8", "K92.1"],
    procedures: ["89.07"],
    cbgCode: "K-4-17-I",
    cbgDescription: "Sirosis Hati & Penyakit Hati Kronis",
    severity: 1,
    tariff: 4850000,
    readinessScore: 94,
    risk: "LOW",
    status: "Siap Diajukan",
    doctorName: "dr. DPJP Sp.PD",
    unit: "Rawat Jalan",
    coderName: "Coder Casemix",
    dataMode: "REAL",
    sourceType: "OCR_PDF",
    sourceReference: "0801R0011125V007026-lengkap.pdf"
  } as any);

  const findings = await clinicalIntelligenceEngine.extractFindingsForClaim(claimId);

  console.log(`EXTRACTED FINDINGS COUNT: ${findings.length}\n`);

  let passCount = 0;
  let failCount = 0;

  // Requirement 1: Final Diagnosis Chirrosis Hepatis (K74.6)
  const cirrhosis = findings.find(f => f.findingValue.toLowerCase().includes("chirrosis") || f.normalizedConcept?.toLowerCase().includes("cirrhosis"));
  if (cirrhosis && cirrhosis.diagnosisStage === "FINAL" && cirrhosis.pageNumber === 4) {
    console.log("✅ REQUIREMENT 1: Final Diagnosis Chirrosis Hepatis extracted from Resume Medis Page 4 (PASS)");
    passCount++;
  } else {
    console.error("❌ REQUIREMENT 1 FAILED: Chirrosis Hepatis missing or incorrect stage/page.");
    failCount++;
  }

  // Requirement 2: Final Diagnosis Ascites (R18.8)
  const ascites = findings.find(f => f.findingValue.toLowerCase().includes("ascites"));
  if (ascites && ascites.diagnosisStage === "FINAL" && ascites.pageNumber === 4) {
    console.log("✅ REQUIREMENT 2: Final Diagnosis Ascites extracted from Resume Medis Page 4 (PASS)");
    passCount++;
  } else {
    console.error("❌ REQUIREMENT 2 FAILED: Ascites missing or incorrect stage/page.");
    failCount++;
  }

  // Requirement 3: Final Diagnosis Melena (K92.1)
  const melena = findings.find(f => f.findingValue.toLowerCase().includes("melena"));
  if (melena && melena.diagnosisStage === "FINAL" && melena.pageNumber === 4) {
    console.log("✅ REQUIREMENT 3: Final Diagnosis Melena extracted from Resume Medis Page 4 (PASS)");
    passCount++;
  } else {
    console.error("❌ REQUIREMENT 3 FAILED: Melena missing or incorrect stage/page.");
    failCount++;
  }

  // Requirement 4: Initial SEP Diagnosis Observation (Z03.5)
  const sepDiag = findings.find(f => f.diagnosisStage === "INITIAL");
  if (sepDiag && sepDiag.pageNumber === 1 && sepDiag.findingValue.includes("cardiovascular")) {
    console.log("✅ REQUIREMENT 4: Initial SEP Diagnosis extracted from SEP Page 1 with INITIAL stage (PASS)");
    passCount++;
  } else {
    console.error("❌ REQUIREMENT 4 FAILED: Initial SEP Diagnosis missing or incorrect stage/page.");
    failCount++;
  }

  // Requirement 5: Absolute ban on hallucinated M49, R14, R13
  const hallucinated = findings.filter(f => ["M49", "R14", "R13"].includes(f.icdCode || ""));
  if (hallucinated.length === 0) {
    console.log("✅ REQUIREMENT 5: Zero hallucinated codes (M49, R14, R13) detected in extraction (PASS)");
    passCount++;
  } else {
    console.error("❌ REQUIREMENT 5 FAILED: Hallucinated codes detected:", hallucinated);
    failCount++;
  }

  console.log(`\nSUMMARY: ${passCount} PASSED / ${failCount} FAILED`);
  if (failCount > 0) process.exit(1);
  else process.exit(0);
}

runTest();
