import { securityTestRunner } from "./SecurityTestRunner";

async function run() {
  console.log("============================================================");
  console.log("BPJS OPTIMIZER — ENTERPRISE SECURITY AUTOMATED SUITE");
  console.log("============================================================\n");

  const results = await securityTestRunner.runAllTests();

  let passCount = 0;
  let failCount = 0;

  console.log("| Test ID | Attack Description | Expected | Actual | Result |");
  console.log("|---------|--------------------|----------|--------|--------|");

  for (const tc of results) {
    const status = tc.passed ? "PASS" : "FAIL";
    if (tc.passed) passCount++; else failCount++;
    console.log(`| ${tc.id} | ${tc.name} | ${tc.expectedResult} | ${tc.actualResult} | ${status} |`);
  }

  console.log(`\nTOTAL TEST CASES: ${results.length}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);

  if (failCount > 0) {
    console.error("\n❌ SECURITY SUITE FAILED");
    process.exit(1);
  } else {
    console.log("\n✅ ALL 17 SECURITY ATTACK SCENARIOS PASSED 100%");
    process.exit(0);
  }
}

run();
