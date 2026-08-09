import { Claim } from "../../src/types";
import { validationEngine } from "./ValidationEngine";

export class ReadinessEngine {
  async calculateReadiness(claim: Claim): Promise<{ score: number, status: string }> {
    const findings = await validationEngine.validateClaim(claim);
    
    let score = 100;

    for (const finding of findings) {
      if (finding.severity === "CRITICAL") score -= 30;
      else if (finding.severity === "HIGH") score -= 20;
      else if (finding.severity === "MEDIUM") score -= 10;
      else if (finding.severity === "LOW") score -= 5;
    }

    if (claim.procedures.length === 0) score -= 10;
    if (claim.secondaryDiagnoses.length === 0) score -= 5;

    score = Math.max(0, score);

    let status = "Siap Diajukan";
    if (score < 75) status = "Perlu Perbaikan";
    else if (score < 90) status = "Perlu Review";

    return { score, status };
  }
}

export const readinessEngine = new ReadinessEngine();
