import { claimRepository } from "../repositories/ClaimRepository";
import { seedClaims } from "../data/seed";
import { Claim } from "../../src/types";

export class DemoController {
  async generateDemoDataset(): Promise<{ count: number; claims: Claim[] }> {
    const generated: Claim[] = [];
    for (const rawClaim of seedClaims) {
      const demoClaim: Claim = {
        ...rawClaim,
        id: `CLM-DEMO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        dataMode: "DEMO",
        sourceType: "JSON",
        sourceReference: "DEMO_DATASET_GENERATOR",
        createdBy: "Demo Data Center"
      };
      const created = await claimRepository.create(demoClaim);
      generated.push(created);
    }

    console.log(`[DemoController] Explicitly generated ${generated.length} DEMO claims.`);
    return { count: generated.length, claims: generated };
  }

  async clearDemoDataset(): Promise<{ deletedCount: number }> {
    const deletedCount = await claimRepository.deleteByDataMode("DEMO");
    console.log(`[DemoController] Cleared ${deletedCount} DEMO claims. REAL data remains untouched.`);
    return { deletedCount };
  }

  async clearTestDataset(): Promise<{ deletedCount: number }> {
    const deletedCount = await claimRepository.deleteByDataMode("TEST");
    console.log(`[DemoController] Cleared ${deletedCount} TEST claims. REAL data remains untouched.`);
    return { deletedCount };
  }
}

export const demoController = new DemoController();
