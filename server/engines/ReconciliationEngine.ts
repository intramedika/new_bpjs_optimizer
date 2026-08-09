import { claimRepository } from "../repositories/ClaimRepository";
import { reconciliationRepository, ReconciliationRecord } from "../repositories/ReconciliationRepository";
import { Claim } from "../../src/types";

export class ReconciliationEngine {
  async reconcileClaim(claimId: string, actualResult?: { cbgCode?: string; severity?: number; tariff?: number; source?: string }): Promise<ReconciliationRecord> {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      throw new Error(`Claim with ID ${claimId} not found.`);
    }

    const predictionCbg = claim.cbgCode || "J-4-16-II";
    const predictionSeverity = claim.severity || 2;
    const predictionTariff = claim.tariff || 5420000;

    const actualCbg = actualResult?.cbgCode || predictionCbg;
    const actualSeverity = actualResult?.severity ?? predictionSeverity;
    const actualTariff = actualResult?.tariff ?? predictionTariff;
    const actualSource = actualResult?.source || "MOCK";

    const varianceAmount = actualTariff - predictionTariff;

    let varianceType: ReconciliationRecord["varianceType"] = "EXACT_MATCH";
    if (predictionCbg !== actualCbg) {
      varianceType = "CBG_MISMATCH";
    } else if (predictionSeverity !== actualSeverity) {
      varianceType = "SEVERITY_MISMATCH";
    } else if (varianceAmount !== 0) {
      varianceType = "TARIFF_MISMATCH";
    }

    let status: ReconciliationRecord["status"] = "RESOLVED";
    if (varianceType !== "EXACT_MATCH") {
      status = "REVIEW_REQUIRED";
    }

    const record: ReconciliationRecord = {
      id: `REC-${claim.id}-${Date.now()}`,
      claimId: claim.id,
      predictionSource: "LOCAL_PREDICTION",
      predictionCbg,
      predictionSeverity,
      predictionTariff,
      actualSource,
      actualCbg,
      actualSeverity,
      actualTariff,
      varianceAmount,
      varianceType,
      status,
      dataMode: claim.dataMode || "REAL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await reconciliationRepository.create(record);
  }

  async reconcileAllActiveClaims(dataMode: string = "REAL"): Promise<ReconciliationRecord[]> {
    const claims = await claimRepository.findAll(dataMode);
    const records: ReconciliationRecord[] = [];
    for (const c of claims) {
      const rec = await this.reconcileClaim(c.id);
      records.push(rec);
    }
    return records;
  }
}

export const reconciliationEngine = new ReconciliationEngine();
