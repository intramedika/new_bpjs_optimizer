import { useState } from "react"
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  FileText, 
  Upload, 
  BrainCircuit, 
  ShieldCheck, 
  Activity, 
  Settings, 
  Server, 
  Lock,
  ArrowRight,
  Workflow,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { cn } from "../lib/utils"
import { Link } from "react-router-dom"

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeCategory, setActiveCategory] = useState<string>("ALL")
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true, 4: true })

  const faqList = [
    {
      id: 0,
      category: "Workflow",
      question: "Bagaimana urutan alur kerja resmi (10 Langkah Utama) di BPJS Optimizer?",
      answer: "Alur kerja operasional Casemix Officer secara berurutan adalah:\n1. KLAIM BARU (/smart-intake)\n2. CLAIM QUEUE (/klaim)\n3. REVIEW KLINIS (/analisis/clinical/:claimId)\n4. CODING & GROUPER (/analisis/grouper/:claimId)\n5. REVENUE OPTIMIZER (/analisis/revenue-optimizer/:claimId)\n6. CLAIM READINESS (/analisis/readiness/:claimId)\n7. RISK ENGINE (/analisis/risk/:claimId)\n8. KLAIM SIAP E-KLAIM (/klaim?status=siap)\n9. INTEGRATION HUB (/integrasi)\n10. POST-GROUPING RECONCILIATION (/klaim/reconciliation)\n11. REVENUE IMPACT DASHBOARD (/analisis/revenue-impact)",
      infographic: "WORKFLOW_PIPELINE"
    },
    {
      id: 1,
      category: "Revenue Optimizer",
      question: "Di mana letak fitur BPJS Optimizer yang menghasilkan pendapatan (revenue) lebih baik dibanding cara biasa?",
      answer: "Fitur utama pengoptimasi pendapatan terletak di modul:\n• ⚡ Revenue Optimizer (/analisis/revenue-optimizer)\n• Opportunity Queue (/analisis/revenue-opportunity)\n• Revenue Impact Dashboard (/analisis/revenue-impact)\n\nDibandingkan cara manual yang sering mengalami under-coding (diagnosis sekunder/komplikasi terlewat oleh Coder), engine ini mengekstrak bukti medis resume secara otomatis, mensimulasikan What-If Grouper INA-CBG resmi, dan menyajikan potensi kenaikan klaim sah berbasis bukti klinis tanpa upcoding.",
      infographic: "REVENUE_OPTIMIZER_EXECUTIVE"
    },
    {
      id: 2,
      category: "Admin & Database",
      question: "Bagaimana cara menghapus semua transaksi atau dokumen yang sudah terlanjur masuk di Admin Console?",
      answer: "Untuk membersihkan data transaksi atau dokumen intake:\n1. Buka Admin Console (/admin) atau Database Console (/admin/database).\n2. Pada kartu 'E. DATA PURGE & SYSTEM RESET CONSOLE', tekan tombol [ HAPUS SEMUA DATA TRANSAKSI & DOKUMEN ].\n3. Konfirmasi dialog peringatan.\n\nSistem akan menghapus seluruh data klaim, berkas intake PDF, temuan klinis, kandidat koding, serta reset localStorage browser secara aman.",
      infographic: "DATA_PURGE_RESET"
    },
    {
      id: 3,
      category: "Integration",
      question: "Apakah VClaim dan E-Klaim merupakan layar berurutan yang harus diklik pengguna?",
      answer: "Tidak. VClaim dan E-Klaim adalah CABANG INTEGRASI eksternal yang diorkestrasi secara terpusat di latar belakang oleh IntegrationHub. VClaim menangani kepesertaan & SEP BPJS Kesehatan, sedangkan E-Klaim menangani grouping INA-CBG Kemenkes. Pengguna tidak perlu berpindah layar manual di antara keduanya.",
      infographic: "INTEGRATION_BRANCHES"
    },
    {
      id: 4,
      category: "Revenue Optimizer",
      question: "Bagaimana prinsip kerja Revenue Optimizer Engine di BPJS Optimizer?",
      answer: "Revenue Optimizer beroperasi berdasarkan BUKTI KLINIS TERKONTROL (Evidence-Based). AI menganalisis rekam medis untuk menemukan potensi pengkodean spesifik (seperti E11.1 untuk DM dengan Ketoasidosis) yang didukung bukti klinis. Aplikasi melarang keras upcoding palsu tanpa bukti klinis, dan perubahan kode WAJIB mendapat persetujuan (Approve/Reject) dari Coder Casemix.",
      infographic: "REVENUE_OPTIMIZER"
    },
    {
      id: 5,
      category: "Getting Started",
      question: "Apa perbedaan Data Mode REAL, DEMO, TEST, dan MOCK?",
      answer: "REAL = Data operasional riil RS yang diinput/diimpor pengguna.\nDEMO = Data sampel demonstrasi untuk uji fitur visual.\nTEST = Dataset sintetis yang digunakan oleh System Test Center.\nMOCK = Environment simulasi sandbox untuk integrasi E-Klaim & VClaim tanpa memerlukan kredensial BPJS produksi."
    },
    {
      id: 6,
      category: "Claims",
      question: "Mengapa Claim Queue (/klaim) saya berjumlah 0 klaim pada mode REAL?",
      answer: "Saat pertama kali diinstall, database mode REAL dalam kondisi kosong (0 claims). Ini adalah perilaku resmi aplikasi untuk menjamin tidak ada data palsu yang tercampur dengan data produksi RS. Anda dapat mengimpor file E-Klaim atau mengupload PDF untuk mengisi klaim REAL."
    },
    {
      id: 7,
      category: "Documents",
      question: "Bagaimana cara upload berkas PDF Rekam Medis?",
      answer: "Buka menu Smart Document Intake (/smart-intake). Anda dapat men-drag & drop berkas PDF tunggal, banyak file sekaligus, folder, maupun arsip ZIP. Sistem akan melakukan deduplikasi SHA-256 otomatis."
    },
    {
      id: 8,
      category: "Documents",
      question: "Mengapa dokumen PDF saya berstatus FAILED?",
      answer: "Status FAILED terjadi jika berkas PDF terproteksi password, file terkorupsi, atau dokumen hasil scan gambar tanpa text layer. Klik dokumen yang gagal, baca pesan error teknis yang tampil, lalu tekan tombol [Retry Processing] atau ubah mesin OCR di Pengaturan."
    },
    {
      id: 9,
      category: "Clinical AI",
      question: "Apakah hasil ekstraksi AI otomatis menjadi keputusan koding final?",
      answer: "Tidak. Ekstraksi AI berfungsi sebagai asisten pembaca bukti klinis. Setiap temuan (Diagnosis, Prosedur, Obat) memiliki skor confidence dan evidence text dari rekam medis yang wajib ditinjau dan dikonfirmasi oleh verifikator/coder via tombol [Confirm & Apply]."
    },
    {
      id: 10,
      category: "Grouper",
      question: "Apa perbedaan Local Prediction vs Official E-Klaim Result?",
      answer: "Local Prediction = Hasil estimasi prediksi INA-CBG internal oleh BPJS Optimizer.\nOfficial E-Klaim Result = Hasil resmi yang dikembalikan oleh Web Service E-Klaim Kemenkes ketika terhubung dengan kredensial resmi RS."
    },
    {
      id: 11,
      category: "Integration",
      question: "Apa arti status NOT CONFIGURED pada adapter integrasi?",
      answer: "NOT CONFIGURED berarti URL endpoint atau credential key resmi belum dimasukkan pada file konfigurasi environment. Transaksi akan secara otomatis masuk ke antrean Offline Sync Queue dengan status WAITING_FOR_CONNECTION tanpa membatalkan alur kerja."
    },
    {
      id: 12,
      category: "Offline",
      question: "Apakah BPJS Optimizer bisa beroperasi secara offline?",
      answer: "Ya. Pemrosesan lokal, ekstraksi rekam medis, validasi ruleset, dan penyimpanan SQLite dapat berjalan sepenuhnya offline di Edge RS. Transaksi yang memerlukan BPJS eksternal akan secara otomatis masuk ke Offline Queue."
    }
  ]

  const categories = ["ALL", "Workflow", "Revenue Optimizer", "Admin & Database", "Integration", "Getting Started", "Claims", "Documents", "Clinical AI", "Grouper", "Offline"]

  const filteredFaq = faqList.filter(item => {
    const matchesCategory = activeCategory === "ALL" || item.category === activeCategory
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleItem = (id: number) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-8 rounded-2xl shadow-xl text-center relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
          <Badge className="bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider font-mono">FREQUENTLY ASKED QUESTIONS</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">BPJS OPTIMIZER — Pusat Bantuan & Infografis FAQ</h1>
          <p className="text-slate-300 text-sm font-medium">
            Jawaban resmi & diagram infografis 10-Langkah Alur Klaim, Pemrosesan PDF, AI Klinis, Revenue Optimizer, Purge Data, dan Integrasi SIMRS/VClaim/E-Klaim.
          </p>

          {/* Instant Search Bar */}
          <div className="pt-2 relative font-mono">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input 
              type="text"
              placeholder="Ketik kata kunci (misal: 'hapus data', 'revenue', 'pdf gagal', 'vclaim', 'offline')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5 justify-center font-mono">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeCategory === cat ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion FAQ Items with Embedded Visual Infographics */}
      <div className="space-y-3 font-mono text-xs">
        {filteredFaq.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 border border-slate-200 font-sans">
            <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold font-mono">Tidak ada pertanyaan yang sesuai dengan kata kunci '{searchQuery}'.</p>
          </Card>
        ) : (
          filteredFaq.map(item => {
            const isOpen = !!openItems[item.id]
            return (
              <Card key={item.id} className="border border-slate-200 overflow-hidden transition-all shadow-sm rounded-xl">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-4 text-left font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-700 shrink-0 font-mono font-bold">
                      {item.category}
                    </Badge>
                    <span className="text-sm font-sans">{item.question}</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 font-sans text-xs text-slate-700 leading-relaxed space-y-4">
                    <div className="whitespace-pre-line">{item.answer}</div>

                    {/* INFOGRAPHIC: EXECUTIVE REVENUE OPTIMIZER */}
                    {item.infographic === "REVENUE_OPTIMIZER_EXECUTIVE" && (
                      <div className="p-4 bg-slate-950 text-emerald-300 rounded-xl space-y-3 font-mono border border-emerald-900 mt-3">
                        <div className="flex items-center justify-between border-b border-emerald-900 pb-2">
                          <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Infografis Fitur Peningkatan Revenue Klaim:
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[9px]">COMPLIANCE OPTIMIZER</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          <div className="p-2.5 bg-slate-900 rounded border border-emerald-800 space-y-1">
                            <strong className="text-emerald-400 block font-bold">1. Single Claim Optimizer</strong>
                            <span className="text-slate-300 block font-sans">Simulasi What-If Grouper INA-CBG resmi pada tiap klaim aktif (/analisis/revenue-optimizer).</span>
                          </div>
                          <div className="p-2.5 bg-slate-900 rounded border border-emerald-800 space-y-1">
                            <strong className="text-emerald-400 block font-bold">2. Opportunity Queue</strong>
                            <span className="text-slate-300 block font-sans">Daftar klaim terurut berdasarkan nilai potensi selisih sah & skor bukti (/analisis/revenue-opportunity).</span>
                          </div>
                          <div className="p-2.5 bg-slate-900 rounded border border-emerald-800 space-y-1">
                            <strong className="text-emerald-400 block font-bold">3. Revenue Impact Dashboard</strong>
                            <span className="text-slate-300 block font-sans">Eksekutif analitik realisasi klaim disetujui vs potensi selisih (/analisis/revenue-impact).</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INFOGRAPHIC: DATA PURGE & RESET */}
                    {item.infographic === "DATA_PURGE_RESET" && (
                      <div className="p-4 bg-red-950 text-red-100 rounded-xl space-y-3 font-mono border border-red-900 mt-3">
                        <div className="flex items-center justify-between border-b border-red-900 pb-2">
                          <span className="text-xs font-bold uppercase text-red-300 flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" /> Infografis Alur Purge & Reset Data:
                          </span>
                          <Badge className="bg-red-600 text-white text-[9px]">DANGER ZONE</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-center">
                          <div className="p-2 bg-red-900/60 rounded border border-red-800">
                            <strong className="text-red-300 block">1. Admin Console</strong>
                            <span className="text-[9px] text-red-200/70 block">/admin atau /admin/database</span>
                          </div>
                          <div className="p-2 bg-red-900/60 rounded border border-red-800">
                            <strong className="text-red-300 block">2. Trigger Purge</strong>
                            <span className="text-[9px] text-red-200/70 block">[ HAPUS SEMUA DATA ]</span>
                          </div>
                          <div className="p-2 bg-red-900/60 rounded border border-red-800">
                            <strong className="text-red-300 block">3. DB & LocalStorage Clean</strong>
                            <span className="text-[9px] text-red-200/70 block">PostgreSQL / SQLite Clean</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INFOGRAPHIC: WORKFLOW PIPELINE CARD */}
                    {item.infographic === "WORKFLOW_PIPELINE" && (
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono border border-slate-800 mt-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2">
                            <Workflow className="w-4 h-4" /> Infografis Diagram Alur 10 Langkah:
                          </span>
                          <Badge className="bg-blue-600 text-white text-[9px]">CANONICAL WORKFLOW</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                          <div className="p-2 bg-slate-800 rounded border border-blue-500/40 text-center">
                            <span className="text-blue-400 font-bold block">01. INTAKE</span>
                            <span className="text-[9px] text-slate-400 block">PDF / Import</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-amber-500/40 text-center">
                            <span className="text-amber-400 font-bold block">02. QUEUE</span>
                            <span className="text-[9px] text-slate-400 block">Claim Context</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-purple-500/40 text-center">
                            <span className="text-purple-400 font-bold block">03. CLINICAL</span>
                            <span className="text-[9px] text-slate-400 block">AI Findings</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-emerald-500/40 text-center">
                            <span className="text-emerald-400 font-bold block">04. GROUPER</span>
                            <span className="text-[9px] text-slate-400 block">ICD-10 & CBG</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-emerald-400/40 text-center">
                            <span className="text-emerald-300 font-bold block">05. OPTIMIZER</span>
                            <span className="text-[9px] text-slate-400 block">Revenue Engine</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-indigo-500/40 text-center">
                            <span className="text-indigo-400 font-bold block">06. READINESS</span>
                            <span className="text-[9px] text-slate-400 block">Score Kelengkapan</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-red-500/40 text-center">
                            <span className="text-red-400 font-bold block">07. RISK</span>
                            <span className="text-[9px] text-slate-400 block">Anti-Fraud</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-teal-500/40 text-center">
                            <span className="text-teal-400 font-bold block">08. SIAP KLAIM</span>
                            <span className="text-[9px] text-slate-400 block">Internal Gate</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-cyan-500/40 text-center">
                            <span className="text-cyan-400 font-bold block">09. INTEGRASI</span>
                            <span className="text-[9px] text-slate-400 block">Hub Orchestrator</span>
                          </div>
                          <div className="p-2 bg-slate-800 rounded border border-slate-500/40 text-center">
                            <span className="text-slate-300 font-bold block">10. REKONSILIASI</span>
                            <span className="text-[9px] text-slate-400 block">Prediksi vs E-Klaim</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INFOGRAPHIC: INTEGRATION BRANCHES CARD */}
                    {item.infographic === "INTEGRATION_BRANCHES" && (
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono border border-slate-800 mt-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold uppercase text-purple-400 flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Infografis Arsitektur IntegrationHub:
                          </span>
                          <Badge className="bg-purple-600 text-white text-[9px]">ASYNC ORCHESTRATION</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          <div className="p-2.5 bg-slate-800 rounded border border-emerald-500/40 space-y-1">
                            <strong className="text-emerald-400 block font-bold">1. SIMRS (HIS)</strong>
                            <span className="text-slate-300 block font-sans">Ambil data pendaftaran & rekam medis internal RS.</span>
                          </div>
                          <div className="p-2.5 bg-slate-800 rounded border border-blue-500/40 space-y-1">
                            <strong className="text-blue-400 block font-bold">2. VCLAIM (BPJS)</strong>
                            <span className="text-slate-300 block font-sans">Cek kepesertaan & terbitkan Surat Elegibilitas (SEP).</span>
                          </div>
                          <div className="p-2.5 bg-slate-800 rounded border border-purple-500/40 space-y-1">
                            <strong className="text-purple-400 block font-bold">3. E-KLAIM (INA-CBG)</strong>
                            <span className="text-slate-300 block font-sans">Grouping resmi Kemenkes & penetapan tarif BPJS.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INFOGRAPHIC: REVENUE OPTIMIZER CARD */}
                    {item.infographic === "REVENUE_OPTIMIZER" && (
                      <div className="p-4 bg-emerald-950 text-emerald-100 rounded-xl space-y-3 font-mono border border-emerald-800 mt-3">
                        <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                          <span className="text-xs font-bold uppercase text-emerald-300 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Infografis Alur Revenue Optimizer:
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[9px]">COMPLIANCE GATE ACTIVE</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px] text-center">
                          <div className="p-2 bg-emerald-900/60 rounded border border-emerald-700">
                            <strong className="text-emerald-300 block">1. Baseline ICD</strong>
                            <span className="text-[9px] text-emerald-200/70 block">E11.9 (Rp 4.3M)</span>
                          </div>
                          <div className="p-2 bg-emerald-900/60 rounded border border-emerald-700">
                            <strong className="text-emerald-300 block">2. Evidence Match</strong>
                            <span className="text-[9px] text-emerald-200/70 block">Ketoasidosis (95%)</span>
                          </div>
                          <div className="p-2 bg-emerald-900/60 rounded border border-emerald-700">
                            <strong className="text-emerald-300 block">3. Anti-Upcoding Gate</strong>
                            <span className="text-[9px] text-emerald-200/70 block">Risk: LOW</span>
                          </div>
                          <div className="p-2 bg-emerald-900/60 rounded border border-emerald-700">
                            <strong className="text-emerald-300 block">4. Coder Approval</strong>
                            <span className="text-[9px] text-emerald-200/70 block">Approve/Reject</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Bottom Link to Full Documentation */}
      <Card className="border border-slate-200 bg-slate-50 p-6 text-center rounded-xl">
        <CardContent className="space-y-3 p-0">
          <h3 className="text-sm font-bold uppercase text-slate-800 font-mono">Butuh Panduan Bergambar Infografis Lebih Detail?</h3>
          <p className="text-xs text-slate-500 font-sans">Buka Documentation Center untuk melihat diagram infografis alur kerja operasional klaim dan cabang integrasi.</p>
          <Link to="/dokumentasi">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs mt-2">
              Buka Infografis Dokumentasi <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
