import { Claim } from "../../src/types";

const indonesianNames = [
  "Budi Santoso", "Siti Aminah", "Joko Widodo", "Ayu Ting Ting", "Raffi Ahmad", 
  "Iwan Fals", "Agnez Mo", "Deddy Corbuzier", "Raisa Andriana", "Raditya Dika",
  "Najwa Shihab", "Dian Sastrowardoyo", "Nicholas Saputra", "Reza Rahadian", "Luna Maya",
  "Ariel Noah", "Tulus", "Isyana Sarasvati", "Vidi Aldiano", "Maudy Ayunda",
  "Afgan Syahreza", "BCL", "Ashanty", "Anang Hermansyah", "Aurel Hermansyah",
  "Atta Halilintar", "Ria Ricis", "Boy William", "Gading Marten", "Gisella Anastasia"
];

const diagnoses = [
  { code: "J18.9", name: "Pneumonia, unspecified", cbg: "J-4-16-II", desc: "PNEUMONIA SEDANG / BERAT" },
  { code: "A01.0", name: "Typhoid fever", cbg: "A-4-13-I", desc: "PENYAKIT INFEKSI BAKTERI" },
  { code: "I21.4", name: "Non-ST elevation myocardial infarction", cbg: "I-4-10-III", desc: "INFARK MIOKARD AKUT" },
  { code: "A91", name: "Dengue haemorrhagic fever", cbg: "A-4-14-I", desc: "INFEKSI VIRUS" },
  { code: "K35.8", name: "Acute appendicitis", cbg: "K-1-10-I", desc: "PROSEDUR APENDIKS" }
];

export const seedClaims: Claim[] = indonesianNames.map((name, index) => {
  const diag = diagnoses[index % diagnoses.length];
  const severity = (index % 3) + 1;
  let score = 95 - (index % 4) * 10;
  let status: any = score >= 90 ? "Siap Diajukan" : (score >= 75 ? "Perlu Review" : "Perlu Perbaikan");
  
  if (index % 5 === 0) status = "Sudah Diajukan";
  if (index % 7 === 0) status = "Dibayar";
  
  return {
    id: `c${index + 1}`,
    claimNumber: `20260810${String(index + 1).padStart(4, '0')}`,
    sepNumber: `0001R0010826V${String(index + 1).padStart(6, '0')}`,
    patientId: `p${index + 1}`,
    patient: {
      id: `p${index + 1}`,
      name: name + " (DEMO DATA)",
      mrNumber: `RM-${String(10000 + index)}`,
      gender: index % 2 === 0 ? "L" : "P",
      dob: `198${index % 10}-0${(index % 9) + 1}-1${index % 9}`
    },
    serviceDate: "2026-08-01",
    dischargeDate: "2026-08-05",
    principalDiagnosis: diag.name,
    principalDiagnosisCode: diag.code,
    secondaryDiagnoses: index % 2 === 0 ? ["Essential hypertension"] : [],
    procedures: index % 3 === 0 ? ["Blood test", "X-Ray"] : [],
    cbgCode: diag.cbg,
    cbgDescription: diag.desc,
    severity: severity,
    tariff: 3000000 * severity + (index * 100000),
    readinessScore: score,
    risk: score >= 90 ? "LOW" : (score >= 75 ? "MEDIUM" : "HIGH"),
    status: status,
    doctorName: "dr. Umum",
    unit: "Rawat Inap",
    coderName: "Coder A"
  };
});
