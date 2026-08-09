import { Claim } from "../../src/types";

export interface ValidationFinding {
  claimId: string;
  ruleId: string;
  title: string;
  description: string;
  evidence: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
  status: "OPEN" | "CLOSED";
  confidence: number;
}

export class ValidationEngine {
  async validateClaim(claim: Claim): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    // Simple deterministic validation logic
    if (!claim.principalDiagnosisCode) {
      findings.push({
        claimId: claim.id,
        ruleId: "VAL_001",
        title: "Missing Principal Diagnosis Code",
        description: "The claim does not have a principal diagnosis code assigned.",
        evidence: "principalDiagnosisCode is empty",
        severity: "CRITICAL",
        recommendation: "Assign a valid ICD-10 code for the principal diagnosis.",
        status: "OPEN",
        confidence: 100
      });
    }

    if (claim.procedures.length > 0 && claim.severity > 1) {
      // Heuristic check for severity vs procedures
      findings.push({
        claimId: claim.id,
        ruleId: "VAL_002",
        title: "Severity Evidence Check",
        description: "Diagnosis secondary to increase severity needs proper documentation.",
        evidence: `Severity is ${claim.severity}, but procedure logs might not fully support it.`,
        severity: "MEDIUM",
        recommendation: "Review the procedure notes and ensure secondary diagnosis is documented.",
        status: "OPEN",
        confidence: 80
      });
    }

    if (claim.tariff > 10000000 && claim.readinessScore < 80) {
      findings.push({
        claimId: claim.id,
        ruleId: "VAL_003",
        title: "High Value Claim Readiness",
        description: "High value claim with low readiness score. High risk of pending.",
        evidence: `Tariff: ${claim.tariff}, Readiness: ${claim.readinessScore}`,
        severity: "HIGH",
        recommendation: "Perform comprehensive review before submission.",
        status: "OPEN",
        confidence: 90
      });
    }

    return findings;
  }
}

export const validationEngine = new ValidationEngine();
