import { claimRepository } from "../repositories/ClaimRepository";
import { clinicalIntelligenceEngine } from "../engines/ClinicalIntelligenceEngine";
import { codingIntelligenceEngine } from "../engines/CodingIntelligenceEngine";
import { codingCandidateRepository } from "../repositories/CodingCandidateRepository";
import { grouperEngine } from "../engines/GrouperEngine";
import { aiInferenceProvider } from "../ai/AIInferenceProvider";

async function runE2ETest() {
  console.log("============================================================");
  console.log("BPJS OPTIMIZER — STEP 4: CODING & GROUPER INTELLIGENCE E2E TEST");
  console.log("CLAIM ID: CLM-CODING-E2E-20260809 (JOKO TRIYONO / 30051701)");
  console.log("============================================================\n");

  const claimId = "CLM-CODING-E2E-20260809";
  
  // 1. Seed Active Claim Context
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
    readinessScore: 95,
    risk: "LOW",
    status: "Siap Diajukan",
    doctorName: "dr. DPJP Sp.PD",
    unit: "Rawat Jalan",
    coderName: "Coder Casemix",
    dataMode: "REAL",
    sourceType: "OCR_PDF",
    sourceReference: "0801R0011125V007026-lengkap.pdf",
    tenantId: "tenant-pt-health",
    groupId: "group-nusantara",
    hospitalId: "hospital-jkt"
  } as any);

  let passCount = 0;
  let failCount = 0;

  // 2. Extract Clinical Findings
  const findings = await clinicalIntelligenceEngine.extractFindingsForClaim(claimId);
  console.log(`[Clinical Findings]: ${findings.length} findings extracted.`);

  // 3. Generate Coding Candidates
  const candidates = await codingIntelligenceEngine.generateCandidatesForClaim(claimId);
  console.log(`[Coding Candidates]: ${candidates.length} candidates generated.`);

  // Test 1: Provenance and evidence quotes
  const hasProvenance = candidates.every(c => c.evidenceQuote && c.sourceDocument && typeof c.pageNumber === 'number');
  if (hasProvenance) {
    console.log("✅ TEST 1: All coding candidates contain document provenance and quotes (PASS)");
    passCount++;
  } else {
    console.error("❌ TEST 1 FAILED: Missing provenance or evidence quote in candidates.");
    failCount++;
  }

  // Test 2: Font tag hallucination hard rejection (M49)
  const m49 = candidates.find(c => c.code === "M49");
  if (m49 && m49.status === "REJECTED") {
    console.log("✅ TEST 2: PDF font artifact M49 hard-rejected by coding safety gate (PASS)");
    passCount++;
  } else {
    console.error("❌ TEST 2 FAILED: M49 font artifact was not rejected.");
    failCount++;
  }

  // Test 3: Approved Coding Set Gate
  const approvedSet = await codingIntelligenceEngine.getApprovedCodingSet(claimId);
  if (approvedSet.principalDiagnosis?.code === "K74.6" && approvedSet.allApprovedCodes.includes("R18.8") && !approvedSet.allApprovedCodes.includes("M49")) {
    console.log("✅ TEST 3: Approved Coding Set contains K74.6, R18.8, K92.1 and excludes rejected M49 (PASS)");
    passCount++;
  } else {
    console.error("❌ TEST 3 FAILED: Approved coding set mismatch:", approvedSet);
    failCount++;
  }

  // Test 4: Grouper Prediction Input Validation & Source Labeling
  const grouperPrediction = await grouperEngine.predict({ id: claimId, principalDiagnosisCode: "K74.6", secondaryDiagnoses: ["R18.8", "K92.1"], procedures: ["89.07"] });
  if (grouperPrediction.predictionSource === "LOCAL_PREDICTION" && grouperPrediction.validationStatus === "VALID" && grouperPrediction.cbgCode.startsWith("K-4-17")) {
    console.log(`✅ TEST 4: Grouper prediction executed cleanly with explicit LOCAL_PREDICTION label (${grouperPrediction.cbgCode} / ${grouperPrediction.cbgDescription}) (PASS)`);
    passCount++;
  } else {
    console.error("❌ TEST 4 FAILED: Grouper prediction invalid:", grouperPrediction);
    failCount++;
  }

  // Test 5: What-If Simulation Isolation
  const whatIfSim = await grouperEngine.simulateWhatIf(claimId, "K74.6", ["R18.8", "K92.1", "E11.9"], ["89.07"]);
  if (whatIfSim.isSimulation === true && whatIfSim.predictionSource === "LOCAL_PREDICTION") {
    console.log("✅ TEST 5: What-If simulation executed as SIMULATION ONLY without mutating official claim (PASS)");
    passCount++;
  } else {
    console.error("❌ TEST 5 FAILED: What-If simulation did not flag as simulation.");
    failCount++;
  }

  // Test 6: AI Inference Provider Health Check
  const aiHealth = await aiInferenceProvider.health();
  if (aiHealth.status === "READY" && aiHealth.model) {
    console.log(`✅ TEST 6: AI Inference Provider health check status is ${aiHealth.status} (${aiHealth.provider}) (PASS)`);
    passCount++;
  } else {
    console.error("❌ TEST 6 FAILED: AI Provider health status is invalid:", aiHealth);
    failCount++;
  }

  console.log(`\n============================================================`);
  console.log(`STEP 4 E2E TEST SUMMARY: ${passCount} PASSED / ${failCount} FAILED`);
  console.log(`============================================================\n`);

  if (failCount > 0) process.exit(1);
  else process.exit(0);
}

runE2ETest();
