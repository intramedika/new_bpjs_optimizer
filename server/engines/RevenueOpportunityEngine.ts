import { claimRepository } from "../repositories/ClaimRepository";
import { clinicalFindingRepository, ClinicalFinding } from "../repositories/ClinicalFindingRepository";
import { revenueOpportunityRepository, RevenueOpportunity, OpportunityType } from "../repositories/RevenueOpportunityRepository";
import { grouperEngine } from "./GrouperEngine";
import { readinessEngine } from "./ReadinessEngine";
import { validationEngine } from "./ValidationEngine";
import { db } from "../db/Database";

export class RevenueOpportunityEngine {
  
  /**
   * Analyze a claim for evidence-backed revenue optimization opportunities.
   * STRICT COMPLIANCE RULE: Opportunities are created ONLY if backed by clinical evidence.
   */
  async analyzeClaim(claimId: string, tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt"): Promise<RevenueOpportunity[]> {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      throw new Error(`Claim with ID '${claimId}' not found.`);
    }

    // Clean up existing unapproved opportunities for fresh analysis
    const existing = await revenueOpportunityRepository.findByClaimId(claimId, tenantId, hospitalId);
    const pendingExisting = existing.filter(o => o.status === "DETECTED" || o.status === "UNDER_REVIEW");
    for (const p of pendingExisting) {
      db.prepare(`DELETE FROM revenue_opportunities WHERE id = ?`).run(p.id);
    }

    const clinicalFindings = await clinicalFindingRepository.findByClaimId(claimId);
    const confirmedFindings = clinicalFindings.filter(f => f.status === "CONFIRMED");

    // Establish Baseline
    const currentPrincipalCode = claim.principalDiagnosisCode || "E11.9";
    const currentSecondaries = claim.secondaryDiagnoses || [];
    const currentProcedures = claim.procedures || [];
    const currentSeverity = claim.severity || 1;

    const currentGrouper = await grouperEngine.predict(claim);
    const currentTariff = currentGrouper.tariff || claim.tariff || 4300000;
    const currentCbg = currentGrouper.cbgCode || claim.cbgCode || "E-4-10-I";

    const generatedOpportunities: RevenueOpportunity[] = [];
    const now = new Date().toISOString();

    // SCENARIO A: MISSED SPECIFICITY
    // E.g., Documented ketoacidosis/komplikasi but coded as E11.9 (uncomplicated) -> E11.1 (ketoacidosis)
    const ketoEvidence = confirmedFindings.find(f => 
      f.icdCode === "E11.1" || 
      f.sourceText?.toLowerCase().includes("ketoasidosis") || 
      f.sourceText?.toLowerCase().includes("ketoacidosis") ||
      f.findingValue?.toLowerCase().includes("ketoasidosis")
    );

    if (currentPrincipalCode === "E11.9" && ketoEvidence) {
      // Simulate Grouper with recommended code E11.1
      const simClaim = {
        ...claim,
        principalDiagnosisCode: "E11.1",
        principalDiagnosis: "Type 2 diabetes mellitus with ketoacidosis",
        severity: currentSeverity === 1 ? 2 : currentSeverity
      };
      const simGrouper = await grouperEngine.predict(simClaim);
      const recommendedTariff = simGrouper.tariff || 5800000;
      const recommendedCbg = simGrouper.cbgCode || "E-4-10-II";
      const potentialDelta = recommendedTariff - currentTariff;

      if (potentialDelta > 0) {
        const opp: RevenueOpportunity = {
          id: `ROPP-${claim.id}-SPEC-${Date.now()}`,
          claimId: claim.id,
          tenantId: claim.tenantId || tenantId,
          groupId: claim.groupId || "group-nusantara",
          hospitalId: claim.hospitalId || hospitalId,
          dataMode: claim.dataMode || "REAL",
          opportunityType: "MISSED_SPECIFICITY",
          title: "Diabete Mellitus Spesifik dengan Ketoasidosis (E11.1)",
          description: "Bukti klinis mendukung diagnosis DM Tipe 2 dengan Ketoasidosis. Pengkodean sebelumnya (E11.9) belum mencakup tingkat spesifisitas klinis yang terbukti.",
          currentCoding: `Diagnosa Utama: ${currentPrincipalCode} (DM Tanpa Komplikasi)`,
          recommendedCoding: `Diagnosa Utama: E11.1 (DM dengan Ketoasidosis)`,
          currentGrouper: `${currentCbg} (Level ${currentSeverity})`,
          recommendedGrouper: `${recommendedCbg} (Level ${simClaim.severity})`,
          currentTariff,
          recommendedTariff,
          potentialDelta,
          evidenceIds: [ketoEvidence.id],
          evidenceSummary: `Bukti resume medis: "${ketoEvidence.sourceText}" (Confidence: ${ketoEvidence.confidence}%)`,
          clinicalSupportScore: ketoEvidence.confidence || 95,
          codingConfidence: 92,
          grouperConfidence: 95,
          complianceScore: 98,
          opportunityScore: Math.round(((ketoEvidence.confidence || 95) * 0.4) + (92 * 0.3) + (98 * 0.3)),
          riskLevel: "LOW",
          status: "DETECTED",
          createdAt: now,
          updatedAt: now
        };
        const created = await revenueOpportunityRepository.create(opp);
        generatedOpportunities.push(created);
      }
    }

    // SCENARIO B: MISSED SECONDARY DIAGNOSIS
    // E.g., Documented Hypertension (I10) or Heart Failure (I50.9) not in secondary coding list
    const htnEvidence = confirmedFindings.find(f => 
      (f.icdCode === "I10" || f.sourceText?.toLowerCase().includes("hipertensi") || f.findingValue?.toLowerCase().includes("hipertensi")) &&
      !currentSecondaries.includes("I10")
    );

    if (htnEvidence) {
      const recSecondaries = [...currentSecondaries, "I10"];
      const simClaim = {
        ...claim,
        secondaryDiagnoses: recSecondaries,
        severity: Math.max(currentSeverity, 2)
      };
      const simGrouper = await grouperEngine.predict(simClaim);
      const recommendedTariff = simGrouper.tariff || (currentTariff + 1200000);
      const recommendedCbg = simGrouper.cbgCode || currentCbg;
      const potentialDelta = recommendedTariff - currentTariff;

      if (potentialDelta > 0) {
        const opp: RevenueOpportunity = {
          id: `ROPP-${claim.id}-SEC-${Date.now()}`,
          claimId: claim.id,
          tenantId: claim.tenantId || tenantId,
          groupId: claim.groupId || "group-nusantara",
          hospitalId: claim.hospitalId || hospitalId,
          dataMode: claim.dataMode || "REAL",
          opportunityType: "MISSED_SECONDARY_DIAGNOSIS",
          title: "Diagnosis Sekunder Terlewat: Hipertensi Essential (I10)",
          description: "Temuan klinis mengonfirmasi riwayat/kondisi Hipertensi yang belum dimasukkan ke dalam daftar diagnosis sekunder ICD-10.",
          currentCoding: `Sekunder: [${currentSecondaries.join(", ") || "Nihil"}]`,
          recommendedCoding: `Sekunder: [${recSecondaries.join(", ")}]`,
          currentGrouper: `${currentCbg} (Level ${currentSeverity})`,
          recommendedGrouper: `${recommendedCbg} (Level ${simClaim.severity})`,
          currentTariff,
          recommendedTariff,
          potentialDelta,
          evidenceIds: [htnEvidence.id],
          evidenceSummary: `Bukti rekam medis: "${htnEvidence.sourceText}" (Confidence: ${htnEvidence.confidence}%)`,
          clinicalSupportScore: htnEvidence.confidence || 90,
          codingConfidence: 90,
          grouperConfidence: 90,
          complianceScore: 95,
          opportunityScore: Math.round(((htnEvidence.confidence || 90) * 0.4) + (90 * 0.3) + (95 * 0.3)),
          riskLevel: "LOW",
          status: "DETECTED",
          createdAt: now,
          updatedAt: now
        };
        const created = await revenueOpportunityRepository.create(opp);
        generatedOpportunities.push(created);
      }
    }

    // SCENARIO C: PROCEDURE CAPTURE
    // E.g., EKG (89.52) or Diagnostic Blood Test (90.59) in evidence but missing from procedures
    const procEvidence = confirmedFindings.find(f => 
      f.findingType === "PROCEDURE" && 
      f.icdCode && 
      !currentProcedures.includes(f.icdCode)
    );

    if (procEvidence && procEvidence.icdCode) {
      const recProcedures = [...currentProcedures, procEvidence.icdCode];
      const simClaim = {
        ...claim,
        procedures: recProcedures
      };
      const simGrouper = await grouperEngine.predict(simClaim);
      const recommendedTariff = simGrouper.tariff || (currentTariff + 1500000);
      const recommendedCbg = simGrouper.cbgCode || currentCbg;
      const potentialDelta = recommendedTariff - currentTariff;

      if (potentialDelta > 0) {
        const opp: RevenueOpportunity = {
          id: `ROPP-${claim.id}-PROC-${Date.now()}`,
          claimId: claim.id,
          tenantId: claim.tenantId || tenantId,
          groupId: claim.groupId || "group-nusantara",
          hospitalId: claim.hospitalId || hospitalId,
          dataMode: claim.dataMode || "REAL",
          opportunityType: "PROCEDURE_CAPTURE",
          title: `Tindakan Medis Terlewat: ${procEvidence.findingValue} (${procEvidence.icdCode})`,
          description: `Bukti penunjang medis mencatat tindakan ${procEvidence.findingValue} yang belum dimasukkan dalam kode ICD-9-CM.`,
          currentCoding: `Tindakan: [${currentProcedures.join(", ") || "Nihil"}]`,
          recommendedCoding: `Tindakan: [${recProcedures.join(", ")}]`,
          currentGrouper: `${currentCbg} (Level ${currentSeverity})`,
          recommendedGrouper: `${recommendedCbg} (Level ${currentSeverity})`,
          currentTariff,
          recommendedTariff,
          potentialDelta,
          evidenceIds: [procEvidence.id],
          evidenceSummary: `Bukti tindakan: "${procEvidence.sourceText}" (Confidence: ${procEvidence.confidence}%)`,
          clinicalSupportScore: procEvidence.confidence || 92,
          codingConfidence: 94,
          grouperConfidence: 92,
          complianceScore: 96,
          opportunityScore: Math.round(((procEvidence.confidence || 92) * 0.4) + (94 * 0.3) + (96 * 0.3)),
          riskLevel: "LOW",
          status: "DETECTED",
          createdAt: now,
          updatedAt: now
        };
        const created = await revenueOpportunityRepository.create(opp);
        generatedOpportunities.push(created);
      }
    }

    return generatedOpportunities;
  }

  /**
   * Approve a revenue opportunity.
   * Mutates claim entity coding in DB, recalculates Grouper prediction, Readiness, and Risk scores.
   */
  async approveOpportunity(opportunityId: string, approvedBy: string = "Coder Casemix", tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt"): Promise<{ opportunity: RevenueOpportunity; claim: any }> {
    const opp = await revenueOpportunityRepository.findById(opportunityId, tenantId, hospitalId);
    if (!opp) {
      throw new Error(`Revenue Opportunity '${opportunityId}' not found.`);
    }

    const claim = await claimRepository.findById(opp.claimId);
    if (!claim) {
      throw new Error(`Claim '${opp.claimId}' not found.`);
    }

    // Determine updated coding based on opportunity type
    let updatePayload: any = {};
    if (opp.opportunityType === "MISSED_SPECIFICITY") {
      updatePayload.principalDiagnosisCode = "E11.1";
      updatePayload.principalDiagnosis = "Type 2 diabetes mellitus with ketoacidosis";
      updatePayload.severity = Math.max(claim.severity || 1, 2);
    } else if (opp.opportunityType === "MISSED_SECONDARY_DIAGNOSIS") {
      const existingSecs = claim.secondaryDiagnoses || [];
      if (!existingSecs.includes("I10")) existingSecs.push("I10");
      updatePayload.secondaryDiagnoses = existingSecs;
      updatePayload.severity = Math.max(claim.severity || 1, 2);
    } else if (opp.opportunityType === "PROCEDURE_CAPTURE") {
      const existingProcs = claim.procedures || [];
      const match = opp.recommendedCoding.match(/\(([^)]+)\)/);
      const code = match ? match[1] : "89.52";
      if (!existingProcs.includes(code)) existingProcs.push(code);
      updatePayload.procedures = existingProcs;
    } else if (opp.opportunityType === "SEVERITY_COMORBIDITY") {
      updatePayload.severity = 2;
    }

    // Recalculate Grouper Prediction via existing Grouper Engine
    const simClaim = { ...claim, ...updatePayload };
    const newGrouper = await grouperEngine.predict(simClaim);

    updatePayload.cbgCode = newGrouper.cbgCode;
    updatePayload.cbgDescription = newGrouper.cbgDescription;
    updatePayload.tariff = newGrouper.tariff;

    // Mutate Claim Entity in Repository
    const updatedClaim = await claimRepository.update(claim.id, updatePayload);

    // Update Opportunity Status to APPROVED & APPLIED
    const updatedOpp = await revenueOpportunityRepository.updateStatus(
      opportunityId, 
      "APPROVED", 
      approvedBy, 
      undefined, 
      opp.potentialDelta,
      tenantId, 
      hospitalId
    );

    // Log Audit Trail
    db.prepare(`
      INSERT INTO audit_logs (id, tenantId, groupId, hospitalId, userId, timestamp, action, entity, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUDIT-REV-${Date.now()}`,
      tenantId,
      "group-nusantara",
      hospitalId,
      approvedBy,
      new Date().toISOString(),
      "REVENUE_OPPORTUNITY_APPROVED",
      "RevenueOpportunity",
      `Disetujui oleh ${approvedBy}: ${opp.title}. Potensi Selisih: Rp ${opp.potentialDelta.toLocaleString("id-ID")}`
    );

    return { opportunity: updatedOpp!, claim: updatedClaim! };
  }

  /**
   * Reject a revenue opportunity.
   * Preserves claim coding & tariff intact.
   */
  async rejectOpportunity(opportunityId: string, rejectedReason: string = "Ditolak oleh Coder (Pertimbangan Klinis)", rejectedBy: string = "Coder Casemix", tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt"): Promise<RevenueOpportunity> {
    const opp = await revenueOpportunityRepository.findById(opportunityId, tenantId, hospitalId);
    if (!opp) {
      throw new Error(`Revenue Opportunity '${opportunityId}' not found.`);
    }

    const updatedOpp = await revenueOpportunityRepository.updateStatus(
      opportunityId, 
      "REJECTED", 
      rejectedBy, 
      rejectedReason, 
      0,
      tenantId, 
      hospitalId
    );

    // Log Audit Trail
    db.prepare(`
      INSERT INTO audit_logs (id, tenantId, groupId, hospitalId, userId, timestamp, action, entity, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `AUDIT-REV-${Date.now()}`,
      tenantId,
      "group-nusantara",
      hospitalId,
      rejectedBy,
      new Date().toISOString(),
      "REVENUE_OPPORTUNITY_REJECTED",
      "RevenueOpportunity",
      `Ditolak oleh ${rejectedBy}: ${opp.title}. Alasan: ${rejectedReason}`
    );

    return updatedOpp!;
  }

  /**
   * Aggregate executive analytics for revenue optimization.
   */
  async getAnalytics(tenantId: string = "tenant-pt-health", hospitalId: string = "hospital-jkt", dataMode: string = "ALL"): Promise<any> {
    const allOpps = await revenueOpportunityRepository.findAll(tenantId, hospitalId, dataMode);

    const totalOpportunities = allOpps.length;
    const approvedOpps = allOpps.filter(o => o.status === "APPROVED" || o.status === "APPLIED" || o.status === "REALIZED");
    const rejectedOpps = allOpps.filter(o => o.status === "REJECTED");
    const pendingOpps = allOpps.filter(o => o.status === "DETECTED" || o.status === "UNDER_REVIEW");

    const totalPotentialDelta = allOpps.reduce((sum, o) => sum + o.potentialDelta, 0);
    const approvedPotentialDelta = approvedOpps.reduce((sum, o) => sum + o.potentialDelta, 0);
    const totalRealizedDelta = approvedOpps.reduce((sum, o) => sum + (o.realizedDelta || o.potentialDelta), 0);

    const approvalRate = totalOpportunities > 0 ? Math.round((approvedOpps.length / totalOpportunities) * 100) : 0;
    const realizationRate = approvedPotentialDelta > 0 ? Math.round((totalRealizedDelta / approvedPotentialDelta) * 100) : 100;

    return {
      totalOpportunities,
      approvedCount: approvedOpps.length,
      rejectedCount: rejectedOpps.length,
      pendingCount: pendingOpps.length,
      totalPotentialDelta,
      approvedPotentialDelta,
      totalRealizedDelta,
      approvalRate,
      realizationRate,
      opportunities: allOpps
    };
  }
}

export const revenueOpportunityEngine = new RevenueOpportunityEngine();
