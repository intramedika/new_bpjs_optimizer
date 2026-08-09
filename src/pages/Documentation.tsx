import { useState } from "react"
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  Upload, 
  Database, 
  BrainCircuit, 
  ShieldCheck, 
  Activity, 
  Scale, 
  Settings, 
  HelpCircle, 
  Server, 
  Lock, 
  ChevronRight,
  Code,
  Layers,
  Zap,
  RefreshCw,
  TrendingUp,
  Check,
  X,
  Award,
  ArrowDownRight,
  Workflow
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { cn } from "../lib/utils"
import { Link, useParams } from "react-router-dom"

export default function Documentation() {
  const { slug } = useParams<{ slug?: string }>()
  const [activeTab, setActiveTab] = useState<string>(slug || "canonical-workflow")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const sections = [
    { id: "canonical-workflow", title: "Infografis Alur 10-Langkah Klaim", icon: Workflow, category: "Alur Utama" },
    { id: "integration-branches", title: "Infografis Cabang Integrasi (VClaim vs E-Klaim)", icon: Settings, category: "Integrasi" },
    { id: "revenue-optimizer-flow", title: "Infografis Revenue Optimizer Engine", icon: TrendingUp, category: "Optimizer" },
    { id: "quick-start", title: "Quick Start — 10 Menit Pertama", icon: Sparkles, category: "Memulai" },
    { id: "data-modes", title: "Data Modes (REAL, DEMO, TEST, MOCK)", icon: Layers, category: "Konsep Inti" },
    { id: "claim-management", title: "Claim Queue & Manajemen Data", icon: FileText, category: "Klaim" },
    { id: "smart-intake", title: "Smart Document Intake & Pemrosesan PDF", icon: FileText, category: "Intake" },
    { id: "clinical-intelligence", title: "Clinical Intelligence & Temuan Medis", icon: BrainCircuit, category: "Analisis" },
    { id: "coding-icd", title: "Koding & Kualifikasi ICD-10", icon: Code, category: "Analisis" },
    { id: "grouper-intelligence", title: "Grouper Intelligence & Prediksi CBG", icon: Activity, category: "Grouping" },
    { id: "readiness-score", title: "Claim Readiness Score", icon: CheckCircle2, category: "Grouping" },
    { id: "risk-engine", title: "Risk Engine & Pencegahan Fraud", icon: AlertTriangle, category: "Risk" },
    { id: "reconciliation", title: "Post-Grouping Reconciliation", icon: Scale, category: "Audit" },
    { id: "integration-hub", title: "Integration Hub (SIMRS, E-Klaim, VClaim)", icon: Settings, category: "Integrasi" },
    { id: "offline-edge", title: "Offline-First Architecture & Sync Queue", icon: Server, category: "Infrastruktur" },
    { id: "troubleshooting", title: "Troubleshooting & Solusi Kendala", icon: HelpCircle, category: "Bantuan" }
  ]

  const workflowSteps = [
    { step: "01", name: "KLAIM BARU", route: "/smart-intake", desc: "Upload dokumen PDF rekam medis atau buat klaim manual baru.", badge: "INTAKE", color: "border-blue-500 bg-blue-50/50 text-blue-900" },
    { step: "02", name: "CLAIM QUEUE", route: "/klaim", desc: "Daftar antrean pusat & penetapan Klaim Aktif di sistem.", badge: "QUEUE", color: "border-amber-500 bg-amber-50/50 text-amber-900" },
    { step: "03", name: "REVIEW KLINIS", route: "/analisis/clinical", desc: "AI merekomendasikan & mengonfirmasi bukti klinis medis.", badge: "CLINICAL", color: "border-purple-500 bg-purple-50/50 text-purple-900" },
    { step: "04", name: "CODING & GROUPER", route: "/analisis/grouper", desc: "Penetapan kode ICD-10/ICD-9 & Analisis Revenue Opportunity.", badge: "GROUPER", color: "border-emerald-500 bg-emerald-50/50 text-emerald-900" },
    { step: "05", name: "CLAIM READINESS", route: "/analisis/readiness", desc: "Evaluasi kelengkapan dokumen & skor kesiapan klaim (%).", badge: "READINESS", color: "border-indigo-500 bg-indigo-50/50 text-indigo-900" },
    { step: "06", name: "RISK ENGINE", route: "/analisis/risk", desc: "Deteksi anomali koding & pencegahan risiko audit (Anti-Fraud).", badge: "RISK", color: "border-red-500 bg-red-50/50 text-red-900" },
    { step: "07", name: "SIAP E-KLAIM", route: "/klaim?status=siap", desc: "Gate internal klaim yang telah lolos verifikasi kesiapan.", badge: "GATE", color: "border-teal-500 bg-teal-50/50 text-teal-900" },
    { step: "08", name: "INTEGRATION HUB", route: "/integrasi/hub", desc: "Orkestrasi terpusat adaptor SIMRS, VClaim, dan E-Klaim.", badge: "INTEGRATION", color: "border-cyan-500 bg-cyan-50/50 text-cyan-900" },
    { step: "09", name: "REKONSILIASI", route: "/analisis/rekonsiliasi", desc: "Komparasi tarif prediksi lokal vs tarif aktual E-Klaim resmi.", badge: "AUDIT", color: "border-slate-500 bg-slate-50/50 text-slate-900" },
    { step: "10", name: "REVENUE IMPACT", route: "/analisis/dashboard", desc: "Dashboard analitik dampak finansial & realisasi pendapatan.", badge: "ANALYTICS", color: "border-emerald-600 bg-emerald-100/50 text-emerald-950" }
  ]

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider">OFFICIAL USER MANUAL</Badge>
            <span className="text-slate-400 text-xs font-mono">v2.5.0 • Enterprise Edition</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">BPJS OPTIMIZER — Panduan & Dokumentasi Infografis</h1>
          <p className="text-slate-300 text-sm max-w-3xl font-medium leading-relaxed">
            Panduan bergambar & infografis resmi alur kerja operasional BPJS Optimizer. Pelajari urutan 10-Langkah Pemrosesan Klaim, cabang integrasi SIMRS/VClaim/E-Klaim, serta mesin optimalisasi pendapatan berbasis bukti klinis.
          </p>

          {/* Global Search Bar */}
          <div className="pt-2 max-w-xl relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input 
              type="text"
              placeholder="Cari dokumentasi (misal: 'alur klaim', 'VClaim', 'revenue', 'icd-10')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <Card className="border border-slate-200 lg:col-span-1 h-fit sticky top-4">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Daftar Modul Dokumentasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {filteredSections.map(s => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between",
                    activeTab === s.id 
                      ? "bg-blue-600 text-white font-bold shadow-sm" 
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Documentation Content Area */}
        <Card className="border border-slate-200 lg:col-span-3 p-6 font-mono text-xs">
          
          {/* INFOGRAFIS ALUR 10-LANGKAH KLAIM */}
          {activeTab === "canonical-workflow" && (
            <div className="space-y-6">
              <div>
                <Badge className="bg-blue-600 text-white font-bold mb-2">INFOGRAFIS OPERASIONAL</Badge>
                <h2 className="text-xl font-bold text-slate-900">Urutan Alur Pemrosesan Klaim (10 Langkah Utama)</h2>
                <p className="text-slate-600 text-xs font-sans mt-1">Alur kerja resmi Casemix Officer dalam mengolah klaim dari intake rekam medis hingga rekonsiliasi tarif akhir.</p>
              </div>

              {/* Infographic Diagram Flow */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-sans">
                {workflowSteps.map((ws, idx) => (
                  <div key={ws.step} className={cn("p-4 rounded-xl border relative space-y-2 shadow-sm", ws.color)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold font-mono bg-white/80 px-2 py-0.5 rounded border border-current">{ws.step}</span>
                        <strong className="text-xs font-bold font-mono uppercase">{ws.name}</strong>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono font-bold bg-white/80">{ws.badge}</Badge>
                    </div>
                    <p className="text-xs opacity-90 leading-relaxed">{ws.desc}</p>
                    <div className="pt-1 flex justify-between items-center text-[10px] font-mono">
                      <span className="opacity-75">Route: {ws.route}</span>
                      <Link to={ws.route} className="font-bold underline hover:opacity-100 flex items-center">
                        Buka Menu <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sequential Flow Rules Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 font-sans">
                <h4 className="font-bold uppercase text-xs text-blue-400 flex items-center gap-2">
                  <Workflow className="w-4 h-4" /> Prinsip Urutan Alur Kerja:
                </h4>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  <li><strong>Preservasi Klaim Aktif (ClaimContext):</strong> Satu klaim yang dipilih di Claim Queue akan mempertahankan identitas (<code>claimId</code>, <code>sepNumber</code>, <code>MRN</code>) sepanjang alur Langkah 01 hingga Langkah 10.</li>
                  <li><strong>Bukan Halaman Berulang:</strong> Pengguna tidak perlu kembali ke halaman Klaim Baru setelah memilih klaim. Alur berjalan maju secara alami melalui tombol navigasi <em>[Lanjut ke...]</em>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* INFOGRAFIS CABANG INTEGRASI (VCLAIM VS E-KLAIM) */}
          {activeTab === "integration-branches" && (
            <div className="space-y-6 font-sans">
              <div>
                <Badge className="bg-purple-600 text-white font-bold mb-2">INFOGRAFIS ARSITEKTUR</Badge>
                <h2 className="text-xl font-bold text-slate-900 font-mono">Arsitektur Cabang Integrasi: SIMRS vs VClaim vs E-Klaim</h2>
                <p className="text-slate-600 text-xs mt-1">VClaim dan E-Klaim bukanlah layar berurutan yang wajib diklik pengguna satu persatu, melainkan cabang sistem yang diorkestrasi terpusat oleh IntegrationHub.</p>
              </div>

              {/* Integration Tree Infographic */}
              <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-6 font-mono text-center relative overflow-hidden">
                <div className="p-3 bg-blue-600 text-white rounded-xl font-bold max-w-sm mx-auto shadow-lg uppercase text-xs tracking-wider">
                  INTEGRATION HUB (Central Orchestrator)
                </div>

                <div className="text-blue-400 font-bold">│</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-left">
                  <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-emerald-400 uppercase">1. SIMRS (HIS)</strong>
                      <Badge className="bg-emerald-950 text-emerald-300 text-[9px]">REST / FHIR</Badge>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">Sistem Informasi Rumah Sakit internal untuk mengambil data pendaftaran, rekam medis, dan tarif rumah sakit.</p>
                    <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-0.5">
                      <li>Patient Info</li>
                      <li>Encounter Data</li>
                      <li>Billing Data</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-blue-400 uppercase">2. VCLAIM (BPJS)</strong>
                      <Badge className="bg-blue-950 text-blue-300 text-[9px]">WEB SERVICE</Badge>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">Web Service BPJS Kesehatan untuk verifikasi kepepsertaan dan pembuatan Surat Elegibilitas Peserta (SEP).</p>
                    <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-0.5">
                      <li>Cek Kepesertaan</li>
                      <li>Generate SEP</li>
                      <li>Rujukan Faskes</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-purple-400 uppercase">3. E-KLAIM (INA-CBG)</strong>
                      <Badge className="bg-purple-950 text-purple-300 text-[9px]">KEMENKES WS</Badge>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">Aplikasi E-Klaim Kemenkes/INA-CBG untuk grouping koding ICD-10 & ICD-9-CM serta penetapan tarif resmi BPJS.</p>
                    <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-0.5">
                      <li>Grouping INA-CBG</li>
                      <li>Kualifikasi Severity</li>
                      <li>Finalisasi Klaim</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs font-mono space-y-1">
                <strong>Prinsip Penting:</strong> SIMRS ≠ VClaim ≠ E-Klaim. Ketiganya merupakan sistem yang berbeda. Integrasi berjalan secara latar belakang melalui `IntegrationHub` tanpa mengganggu alur visual Casemix Officer.
              </div>
            </div>
          )}

          {/* INFOGRAFIS REVENUE OPTIMIZER ENGINE */}
          {activeTab === "revenue-optimizer-flow" && (
            <div className="space-y-6 font-sans">
              <div>
                <Badge className="bg-emerald-600 text-white font-bold mb-2">INFOGRAFIS OPTIMIZER</Badge>
                <h2 className="text-xl font-bold text-slate-900 font-mono">Alur Kerja Revenue Optimizer Engine</h2>
                <p className="text-slate-600 text-xs mt-1">Sistem menganalisis bukti klinis terverifikasi untuk merekomendasikan pengkodean ICD yang valid dan mencegah kecurangan upcoding tanpa bukti.</p>
              </div>

              {/* Optimizer Process Step Infographic */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">LANGKAH 1</span>
                    <strong className="text-slate-900 text-xs block">Baseline Claim</strong>
                    <span className="text-[10px] text-slate-500 font-sans block">Evaluasi koding ICD & tarif awal (Misal: E11.9 — Rp 4.300.000).</span>
                  </div>

                  <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 block uppercase">LANGKAH 2</span>
                    <strong className="text-blue-950 text-xs block">Clinical Evidence Match</strong>
                    <span className="text-[10px] text-slate-500 font-sans block">AI mencocokkan fakta rekam medis terkonfirmasi (Ketoasidosis/Hipertensi).</span>
                  </div>

                  <div className="p-3 bg-white border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 block uppercase">LANGKAH 3</span>
                    <span className="text-xs font-bold text-purple-950 block">Compliance Gate</span>
                    <span className="text-[10px] text-slate-500 font-sans block">Prohibisi otomatis upcoding tanpa bukti klinis (Anti-Upcoding Check).</span>
                  </div>

                  <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">LANGKAH 4</span>
                    <strong className="text-emerald-950 text-xs block">Coder Review & Decision</strong>
                    <span className="text-[10px] text-slate-500 font-sans block">Coder Casemix meninjau bukti dan memilih <em>[Setujui]</em> atau <em>[Tolak]</em>.</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-900 text-white rounded-xl flex items-center justify-between gap-4 font-sans text-xs">
                  <div>
                    <strong className="font-mono text-emerald-400 text-sm block">Potensi vs Realisasi Pendapatan:</strong>
                    <p className="text-slate-300 text-xs mt-0.5">Potensi Peningkatan (Rp Delta) dihitung dari rekomendasi terbukti. Realisasi Pendapatan baru dikonfirmasi setelah hasil aktual E-Klaim diterima.</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold text-xs shrink-0 font-mono">EVIDENCE-BASED ✓</Badge>
                </div>
              </div>
            </div>
          )}

          {/* QUICK START */}
          {activeTab === "quick-start" && (
            <div className="space-y-6">
              <div>
                <Badge className="bg-blue-100 text-blue-800 font-bold mb-2">PANDUAN PENGGUNA BARU</Badge>
                <h2 className="text-xl font-bold text-slate-900">Quick Start — 10 Menit Pertama</h2>
                <p className="text-slate-600 text-xs font-sans mt-1">Panduan langkah demi langkah memulai operasional BPJS Optimizer untuk pengolahan klaim Rumah Sakit.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-sans text-xs">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Langkah Operasional Utama:</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                  <li><strong>Pahami Data Mode (REAL vs DEMO vs TEST vs MOCK):</strong> Pastikan Anda menggunakan mode yang tepat di filter bar atas. Mode REAL menyimpan data transaksi riil Rumah Sakit ke database SQLite lokal.</li>
                  <li><strong>Masukkan Data Klaim:</strong> Gunakan menu <code>/integrasi/import</code> untuk file TXT/CSV/JSON E-Klaim, atau <code>/smart-intake</code> untuk upload dokumen PDF Rekam Medis.</li>
                  <li><strong>Buka Claim Queue (/klaim):</strong> Tinjau klaim yang telah terimpor. Setiap klaim memiliki data mode dan sumber data yang jelas.</li>
                  <li><strong>Jalankan Clinical Intelligence (/analisis/clinical):</strong> Ekstrak bukti klinis medis dari rekam medis. Review hasil temuan AI (Diagnosis, Prosedur, Obat) dan klik <em>[Confirm & Apply]</em>.</li>
                  <li><strong>Tinjau Grouper Intelligence (/analisis/grouper):</strong> Lihat hasil prediksi CBG dan tarif INA-CBG lokal.</li>
                  <li><strong>Periksa Claim Readiness Score:</strong> Pastikan skor kesiapan klaim mencapai minimal 85% sebelum dikirim ke BPJS.</li>
                  <li><strong>Jalankan Reconciliation (/analisis/rekonsiliasi):</strong> Bandingkan prediksi lokal dengan hasil grouping aktual E-Klaim / Mock Grouper.</li>
                  <li><strong>Integrasikan Via Integration Hub (/integrasi/hub):</strong> Hubungkan dengan SIMRS, E-Klaim, dan VClaim BPJS.</li>
                </ol>
              </div>
            </div>
          )}

          {/* DATA MODES */}
          {activeTab === "data-modes" && (
            <div className="space-y-6 font-sans">
              <div>
                <Badge className="bg-purple-100 text-purple-800 font-bold mb-2">KONSEP INTI</Badge>
                <h2 className="text-xl font-bold text-slate-900 font-mono">Data Modes: REAL, DEMO, TEST, MOCK</h2>
                <p className="text-slate-600 text-xs mt-1">BPJS Optimizer memisahkan secara ketat 4 mode data agar data riil Rumah Sakit tidak pernah tercampur dengan data simulasi.</p>
              </div>

              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3">Data Mode</th>
                    <th className="p-3">Tujuan</th>
                    <th className="p-3">Karakteristik Data</th>
                    <th className="p-3">API Eksternal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr>
                    <td className="p-3 font-bold text-emerald-600">REAL</td>
                    <td className="p-3">Operasional Produksi RS</td>
                    <td className="p-3">Diinput / Diimpor Pengguna</td>
                    <td className="p-3">E-Klaim / VClaim Resmi</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-600">DEMO</td>
                    <td className="p-3">Demonstrasi Aplikasi</td>
                    <td className="p-3">Generasi Sintetis Manual</td>
                    <td className="p-3">Tidak Ada</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-purple-600">TEST</td>
                    <td className="p-3">Automated Acceptance Test</td>
                    <td className="p-3">Dataset Sintetis Test Center</td>
                    <td className="p-3">Terkontrol</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-blue-600">MOCK</td>
                    <td className="p-3">Simulasi Integration Sandbox</td>
                    <td className="p-3">Data Sandbox Simulasi</td>
                    <td className="p-3">Mock Adapter Engine</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TROUBLESHOOTING */}
          {activeTab === "troubleshooting" && (
            <div className="space-y-6 font-sans">
              <div>
                <Badge className="bg-red-100 text-red-800 font-bold mb-2 font-mono">SOLUSI MASALAH</Badge>
                <h2 className="text-xl font-bold text-slate-900 font-mono">Troubleshooting & Solusi Kendala</h2>
                <p className="text-slate-600 text-xs mt-1">Panduan menyelesaikan kendala teknis operasional umum di BPJS Optimizer.</p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-bold text-red-700 uppercase">1. Kenapa PDF Saya Statusnya FAILED?</h3>
                  <p className="text-slate-600 font-sans">Penyebab umum: Berkas PDF terproteksi password, file terkorupsi, atau dokumen hasil scan gambar tanpa OCR layer.</p>
                  <p className="text-slate-700 font-bold">Solusi: Buka modal dokumen, klik <em>[View Technical Error]</em>, lalu gunakan <em>[Retry Processing]</em> atau ubah mesin OCR ke GEMINI_VISION di Pengaturan.</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h3 className="font-bold text-amber-700 uppercase">2. Adapter E-Klaim / VClaim Berstatus NOT CONFIGURED</h3>
                  <p className="text-slate-600 font-sans">Ini menandakan URL endpoint atau Secret Key BPJS eksternal belum diisi pada file konfigurasi/pengaturan.</p>
                  <p className="text-slate-700 font-bold">Solusi: Gunakan menu <em>/integrasi/hub</em> untuk pengujian sandbox internal tanpa memerlukan kredensial BPJS riil.</p>
                </div>
              </div>
            </div>
          )}

          {/* OTHER TABS GENERIC VIEW */}
          {!["canonical-workflow", "integration-branches", "revenue-optimizer-flow", "quick-start", "data-modes", "troubleshooting"].includes(activeTab) && (
            <div className="space-y-4 font-sans">
              <div>
                <Badge className="bg-slate-100 text-slate-800 font-bold mb-2 font-mono">DOKUMENTASI MODUL</Badge>
                <h2 className="text-xl font-bold text-slate-900 font-mono capitalize">{sections.find(s => s.id === activeTab)?.title}</h2>
                <p className="text-slate-600 text-xs mt-1">Panduan teknis dan operasional untuk fitur ini di BPJS Optimizer.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 font-mono text-xs">
                <p className="text-slate-700">Modul ini beroperasi langsung di atas database SQLite lokal dengan integrasi REST API backend.</p>
                <div className="p-3 bg-white border border-slate-200 rounded text-slate-600 space-y-1">
                  <div><strong>Standard Workflow:</strong> Client Page ➔ REST API Endpoint ➔ Business Engine ➔ Persistence DB ➔ Response</div>
                  <div><strong>State Management:</strong> Dilengkapi Loading State, Empty State, Data State, dan Error State yang responsif.</div>
                </div>
                <div className="pt-2">
                  <Link to="/faq">
                    <Button size="sm" variant="outline" className="text-xs font-bold">
                      <HelpCircle className="w-3.5 h-3.5 mr-1 text-blue-600" /> Lihat Pertanyaan FAQ Terkait
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
