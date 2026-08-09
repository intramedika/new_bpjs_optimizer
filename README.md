# 🏥 BPJS OPTIMIZER — AI Claim Intelligence & Enterprise Integration Platform

An enterprise healthcare claim intelligence platform designed for Indonesian hospital networks (RS), Casemix teams, and BPJS Health claim optimization.

## 🚀 Key Features

- **Smart Document Intake**: Automated PDF medical resume intake & OCR ingestion.
- **Clinical Intelligence**: Evidence-backed entity extraction (Diagnoses & Procedures).
- **Coding & Grouper Intelligence**: ICD-10 & ICD-9-CM validation, INA-CBG severity prediction, and tariff estimation.
- **Claim Readiness & Risk Engine**: Dynamic readiness scoring and compliance risk evaluation.
- **Pluggable Database Architecture**: Multi-provider support (Neon PostgreSQL, Supabase, Self-Hosted PostgreSQL, SQLite Edge) with AES-256-GCM secret encryption.
- **Integration Hub**: Scoped integration adapters for SIMRS, E-Klaim INA-CBG, and BPJS VClaim.

## 🛠️ Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start application:
   ```bash
   npm start
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
