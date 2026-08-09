import { Router } from "express";
import { claimRepository } from "../repositories/ClaimRepository";
import { Claim, Patient } from "../../src/types";
import { db } from "../db/Database";

export const importRoutes = Router();

// Endpoint to parse raw text/csv/json E-Klaim file
importRoutes.post("/api/import/e-klaim/parse", async (req, res) => {
  try {
    const { fileName, fileContent } = req.body;
    if (!fileContent || typeof fileContent !== "string") {
      return res.status(400).json({ error: "No file content provided" });
    }

    // 1. Encoding & BOM Normalization
    let content = fileContent.replace(/^\uFEFF/, "").trim();
    // 2. Line break normalization
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    let format = "TXT";
    let delimiter = "|";
    const validClaims: Claim[] = [];
    const parseErrors: Array<{ row: number; column: string; value: string; stage: string; error: string }> = [];

    // Check if JSON
    if (content.startsWith("[") || content.startsWith("{")) {
      format = "JSON";
      try {
        const json = JSON.parse(content);
        const list = Array.isArray(json) ? json : (json.claims || [json]);
        
        list.forEach((item: any, idx: number) => {
          const rowNum = idx + 1;
          if (!item.patientName && !item.patient?.name) {
            parseErrors.push({ row: rowNum, column: "patientName", value: "", stage: "VALIDATION", error: "Missing patient name" });
            return;
          }
          if (!item.sepNumber) {
            parseErrors.push({ row: rowNum, column: "sepNumber", value: "", stage: "VALIDATION", error: "Missing SEP number" });
            return;
          }

          const claimObj: Claim = buildClaimObject({
            id: item.id || `CLM-${Date.now()}-${idx}`,
            claimNumber: item.claimNumber || `K-${Date.now()}-${idx}`,
            sepNumber: item.sepNumber,
            patientId: item.patientId || item.patient?.id || `P-${Date.now()}-${idx}`,
            patientName: item.patientName || item.patient?.name || "Pasien Import",
            mrNumber: item.mrNumber || item.patient?.mrNumber || `RM-${Math.floor(Math.random()*900000+100000)}`,
            gender: (item.gender || item.patient?.gender || "L").toUpperCase() as "L" | "P",
            dob: item.dob || item.patient?.dob || "1980-01-01",
            serviceDate: item.serviceDate || new Date().toISOString().split("T")[0],
            dischargeDate: item.dischargeDate || new Date().toISOString().split("T")[0],
            principalDiagnosisCode: item.principalDiagnosisCode || item.icd10 || "J18.9",
            principalDiagnosis: item.principalDiagnosis || "PNEUMONIA SEDANG / BERAT",
            secondaryDiagnoses: Array.isArray(item.secondaryDiagnoses) ? item.secondaryDiagnoses : (item.secondaryDiagnoses ? item.secondaryDiagnoses.split(",") : []),
            procedures: Array.isArray(item.procedures) ? item.procedures : (item.procedures ? item.procedures.split(",") : []),
            cbgCode: item.cbgCode || "J-4-16-II",
            cbgDescription: item.cbgDescription || "PNEUMONIA SEDANG / BERAT",
            severity: Number(item.severity) || 2,
            tariff: Number(item.tariff) || 5420000,
            doctorName: item.doctorName || "dr. DPJP Utama, Sp.PD",
            unit: item.unit || "Rawat Inap",
            coderName: item.coderName || "System Import"
          });

          validClaims.push(claimObj);
        });

      } catch (err: any) {
        return res.status(400).json({ error: "Invalid JSON format", details: err.message });
      }
    } else {
      // CSV / TXT Parsing
      const lines = content.split("\n").filter(l => l.trim().length > 0);
      if (lines.length === 0) {
        return res.status(400).json({ error: "File is empty" });
      }

      // Auto detect delimiter
      const line1 = lines[0];
      const pipeCount = (line1.match(/\|/g) || []).length;
      const csvCount = (line1.match(/,/g) || []).length;
      const semiCount = (line1.match(/;/g) || []).length;
      const tabCount = (line1.match(/\t/g) || []).length;

      if (pipeCount >= csvCount && pipeCount >= semiCount && pipeCount >= tabCount) {
        delimiter = "|";
        format = "TXT (Pipe Delimited)";
      } else if (semiCount >= csvCount && semiCount >= tabCount) {
        delimiter = ";";
        format = "CSV (Semicolon Delimited)";
      } else if (tabCount >= csvCount) {
        delimiter = "\t";
        format = "TXT (Tab Delimited)";
      } else {
        delimiter = ",";
        format = "CSV (Comma Delimited)";
      }

      // Check header row
      let startIndex = 0;
      const firstRowLower = line1.toLowerCase();
      if (firstRowLower.includes("sep") || firstRowLower.includes("nama") || firstRowLower.includes("diagnosis") || firstRowLower.includes("tarif")) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const rowNum = i + 1;
        const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));

        if (cols.length < 3) {
          parseErrors.push({
            row: rowNum,
            column: "LINE",
            value: lines[i],
            stage: "PARSING",
            error: `Insufficient columns (found ${cols.length}, expected at least 4)`
          });
          continue;
        }

        const sepNumber = cols[0] || "";
        const claimNumber = cols[1] || `K-IMP-${Date.now()}-${i}`;
        const mrNumber = cols[2] || `RM-${100000 + i}`;
        const patientName = cols[3] || "";
        const gender = (cols[4] || "L").toUpperCase() as "L" | "P";
        const dob = cols[5] || "1980-01-01";
        const serviceDate = cols[6] || new Date().toISOString().split("T")[0];
        const dischargeDate = cols[7] || new Date().toISOString().split("T")[0];
        const diagCode = cols[8] || "J18.9";
        const diagName = cols[9] || "PNEUMONIA SEDANG / BERAT";
        const secDiagStr = cols[10] || "";
        const procStr = cols[11] || "";
        const cbgCode = cols[12] || "J-4-16-II";
        const cbgDesc = cols[13] || "PNEUMONIA SEDANG / BERAT";
        const severity = parseInt(cols[14] || "2", 10) || 2;
        const tariff = parseFloat(cols[15] || "5420000") || 5420000;
        const doctorName = cols[16] || "dr. DPJP Utama, Sp.PD";
        const unit = cols[17] || "Rawat Inap";

        if (!sepNumber) {
          parseErrors.push({ row: rowNum, column: "sepNumber (Col 1)", value: cols[0] || "", stage: "VALIDATION", error: "Missing SEP number" });
          continue;
        }
        if (!patientName) {
          parseErrors.push({ row: rowNum, column: "patientName (Col 4)", value: cols[3] || "", stage: "VALIDATION", error: "Missing patient name" });
          continue;
        }

        const claimObj = buildClaimObject({
          id: `CLM-${Date.now()}-${i}`,
          claimNumber,
          sepNumber,
          patientId: `PAT-${mrNumber}`,
          patientName,
          mrNumber,
          gender,
          dob,
          serviceDate,
          dischargeDate,
          principalDiagnosisCode: diagCode,
          principalDiagnosis: diagName,
          secondaryDiagnoses: secDiagStr ? secDiagStr.split(",").map(s => s.trim()) : [],
          procedures: procStr ? procStr.split(",").map(s => s.trim()) : [],
          cbgCode,
          cbgDescription: cbgDesc,
          severity,
          tariff,
          doctorName,
          unit,
          coderName: "System E-Klaim Import"
        });

        validClaims.push(claimObj);
      }
    }

    res.json({
      status: "success",
      fileName,
      format,
      delimiter,
      totalRows: validClaims.length + parseErrors.length,
      validCount: validClaims.length,
      invalidCount: parseErrors.length,
      claims: validClaims,
      errors: parseErrors
    });

  } catch (error: any) {
    console.error("Import parsing error:", error);
    res.status(500).json({ error: "Failed to parse import file", message: error.message });
  }
});

// Endpoint to confirm and persist parsed E-Klaim records into database
importRoutes.post("/api/import/e-klaim/confirm", async (req, res) => {
  try {
    const { claims } = req.body;
    if (!Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({ error: "No claims provided to persist" });
    }

    let importedCount = 0;
    for (const claim of claims) {
      await claimRepository.create(claim);
      importedCount++;
    }

    // Add audit trail log
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, entity, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `AUD-${Date.now()}`,
      new Date().toISOString(),
      "IMPORT_E_KLAIM",
      "Claim",
      `Successfully imported ${importedCount} claims from E-Klaim file.`
    );

    res.json({
      status: "success",
      message: `Successfully persisted ${importedCount} claims into the database.`,
      importedCount
    });

  } catch (error: any) {
    console.error("Import persistence error:", error);
    res.status(500).json({ error: "Failed to persist imported claims", message: error.message });
  }
});

function buildClaimObject(raw: {
  id: string;
  claimNumber: string;
  sepNumber: string;
  patientId: string;
  patientName: string;
  mrNumber: string;
  gender: "L" | "P";
  dob: string;
  serviceDate: string;
  dischargeDate: string;
  principalDiagnosisCode: string;
  principalDiagnosis: string;
  secondaryDiagnoses: string[];
  procedures: string[];
  cbgCode: string;
  cbgDescription: string;
  severity: number;
  tariff: number;
  doctorName: string;
  unit: string;
  coderName: string;
}): Claim {
  let score = 95;
  if (!raw.secondaryDiagnoses || raw.secondaryDiagnoses.length === 0) score -= 10;
  if (!raw.procedures || raw.procedures.length === 0) score -= 10;
  if (raw.severity === 3) score -= 5;
  score = Math.max(50, Math.min(100, score));

  let status: Claim["status"] = "Siap Diajukan";
  if (score < 75) status = "Perlu Perbaikan";
  else if (score < 90) status = "Perlu Review";

  let risk: Claim["risk"] = "LOW";
  if (score < 75 || raw.severity === 3) risk = "HIGH";
  else if (score < 90) risk = "MEDIUM";

  return {
    id: raw.id,
    claimNumber: raw.claimNumber,
    sepNumber: raw.sepNumber,
    patientId: raw.patientId,
    patient: {
      id: raw.patientId,
      name: raw.patientName,
      mrNumber: raw.mrNumber,
      gender: raw.gender,
      dob: raw.dob
    },
    serviceDate: raw.serviceDate,
    dischargeDate: raw.dischargeDate,
    principalDiagnosisCode: raw.principalDiagnosisCode,
    principalDiagnosis: raw.principalDiagnosis,
    secondaryDiagnoses: raw.secondaryDiagnoses,
    procedures: raw.procedures,
    cbgCode: raw.cbgCode,
    cbgDescription: raw.cbgDescription,
    severity: raw.severity,
    tariff: raw.tariff,
    readinessScore: score,
    risk,
    status,
    doctorName: raw.doctorName,
    unit: raw.unit,
    coderName: raw.coderName,
    dataMode: "REAL",
    sourceType: "TXT",
    sourceReference: "E-KLAIM_FILE_IMPORT"
  };
}
