import { useState, useEffect } from "react"
import { 
  Upload, 
  FilePlus, 
  Search, 
  Send, 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  Activity, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight,
  Database,
  Building2,
  FileText
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { formatRupiah, cn } from "../lib/utils"
import { Link } from "react-router-dom"
import { ROUTES } from "../routes"
import { Claim, DataMode } from "../types"
import { useHospitalContext } from "../context/HospitalContext"

export default function Dashboard() {
  const { activeTenant, activeGroup, activeHospital } = useHospitalContext()
  const [claims, setClaims] = useState<Claim[]>([])
  const [activeDataMode, setActiveDataMode] = useState<DataMode | "ALL">("REAL")
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchDashboardData(activeDataMode)

    const handleHospitalChange = () => fetchDashboardData(activeDataMode)
    window.addEventListener("hospital-changed", handleHospitalChange)
    return () => window.removeEventListener("hospital-changed", handleHospitalChange)
  }, [activeDataMode])

  const fetchDashboardData = async (mode: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/claims?dataMode=${mode}`)
      const data = await res.json()
      if (data.claims) setClaims(data.claims)
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e)
    } finally {
      setLoading(false)
    }
  }

  const totalKlaim = claims.length
  const readyKlaim = claims.filter(c => c.status === "siap" || (c.readinessScore || 0) >= 85).length
  const avgReadiness = totalKlaim > 0 ? (claims.reduce((acc, c) => acc + (c.readinessScore || 0), 0) / totalKlaim).toFixed(1) : "0"

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Context & Data Mode Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">Casemix Operational Dashboard</h1>
            <Badge className="bg-slate-900 text-white font-bold text-[10px] uppercase">
              {activeHospital.name}
            </Badge>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1 font-mono">
            {activeTenant.name} • {activeGroup.name} • Scope: Isolated Hospital Context
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Data Mode:</span>
          <div className="flex gap-1">
            {(["REAL", "DEMO", "TEST", "ALL"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveDataMode(mode)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-colors font-mono",
                  activeDataMode === mode 
                    ? (mode === "REAL" ? "bg-emerald-600 text-white" : mode === "DEMO" ? "bg-amber-600 text-white" : mode === "TEST" ? "bg-purple-600 text-white" : "bg-slate-900 text-white")
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HERO SECTION: APA YANG INGIN ANDA LAKUKAN? */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white p-8 rounded-2xl shadow-xl space-y-6">
        <div>
          <Badge className="bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider mb-2">PILIH ALUR KERJA</Badge>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Apa yang ingin Anda lakukan hari ini?</h2>
          <p className="text-slate-300 text-xs md:text-sm font-medium mt-1">Pilih tugas utama Casemix Officer untuk memulai alur pengolahan klaim Rumah Sakit.</p>
        </div>

        {/* 4 PRIMARY OPERATIONAL CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={ROUTES.SMART_INTAKE} className="group">
            <Card className="h-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all p-5 space-y-3 cursor-pointer text-white">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm group-hover:text-blue-300 transition-colors">1. Upload Rekam Medis</h3>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">Unggah berkas PDF rekam medis untuk ekstraksi OCR & temuan klinis AI.</p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                Mulai Upload <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Card>
          </Link>

          <Link to={ROUTES.IMPORT} className="group">
            <Card className="h-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all p-5 space-y-3 cursor-pointer text-white">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
                <FilePlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm group-hover:text-emerald-300 transition-colors">2. Import Data Klaim</h3>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">Impor berkas E-Klaim format TXT, CSV, atau JSON ke database.</p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                Impor Berkas <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Card>
          </Link>

          <Link to={ROUTES.CLAIMS} className="group">
            <Card className="h-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all p-5 space-y-3 cursor-pointer text-white">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-bold">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm group-hover:text-purple-300 transition-colors">3. Cari & Review Klaim</h3>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">Cari pasien, No. SEP, dan jalankan analisis kesiapan klaim.</p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                Buka Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Card>
          </Link>

          <Link to={`${ROUTES.CLAIMS}?status=siap`} className="group">
            <Card className="h-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-all p-5 space-y-3 cursor-pointer text-white">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-bold">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm group-hover:text-amber-300 transition-colors">4. Klaim Siap E-Klaim</h3>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed">Tinjau klaim dengan skor readiness tinggi yang siap diajukan.</p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                Lihat Klaim Siap <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* METRICS SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Klaim ({activeDataMode})</span>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalKlaim}</h3>
          <span className="text-[11px] text-slate-500">Tercatat di SQLite</span>
        </Card>

        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Klaim Siap E-Klaim</span>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{readyKlaim}</h3>
          <span className="text-[11px] text-emerald-700 font-bold">Score ≥ 85%</span>
        </Card>

        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Rata-Rata Readiness</span>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">{avgReadiness}%</h3>
          <span className="text-[11px] text-slate-500">Completeness metric</span>
        </Card>

        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Context</span>
          <h3 className="text-sm font-bold text-slate-800 mt-1 truncate">{activeHospital.code}</h3>
          <span className="text-[11px] text-purple-700 font-bold truncate block">{activeHospital.name}</span>
        </Card>
      </div>

      {/* SECONDARY ASSISTANCE QUICK LINKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
        <Link to={ROUTES.DOCUMENTATION}>
          <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Documentation Center</h4>
                <p className="text-slate-500 text-xs mt-0.5">Panduan lengkap operasional dari import klaim hingga rekonsiliasi.</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </Link>

        <Link to={ROUTES.FAQ}>
          <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-purple-300 transition-all flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Pusat Bantuan & FAQ</h4>
                <p className="text-slate-500 text-xs mt-0.5">Jawaban pertanyaan seputar PDF gagal, VClaim, dan mode offline.</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </Link>
      </div>
    </div>
  )
}
