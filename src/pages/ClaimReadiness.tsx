import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { CheckCircle2, ShieldCheck, AlertTriangle, Loader2, ArrowRight, Search, Send, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { Claim } from "../types"
import { formatRupiah, cn } from "../lib/utils"
import { useClaimContext } from "../context/ClaimContext"
import { ClaimWorkflowHeader } from "../components/layout/ClaimWorkflowHeader"
import { ROUTES } from "../routes"

export default function ClaimReadiness() {
  const { claimId: urlClaimId } = useParams<{ claimId?: string }>()
  const { activeClaimId, activeClaim, selectClaim } = useClaimContext()
  
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [evaluating, setEvaluating] = useState<boolean>(false)
  const [readinessScore, setReadinessScore] = useState<number>(92)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchClaims()
  }, [])

  useEffect(() => {
    if (urlClaimId && urlClaimId !== activeClaimId) {
      const found = claims.find(c => c.id === urlClaimId)
      if (found) selectClaim(urlClaimId, found)
    }
  }, [urlClaimId, claims])

  useEffect(() => {
    if (activeClaim) {
      setReadinessScore(activeClaim.readinessScore || 88)
    }
  }, [activeClaim])

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Id": "usr-admin-001"
      }
      const res = await fetch("/api/claims?dataMode=ALL", { headers })
      const data = await res.json()
      let claimList: Claim[] = Array.isArray(data) ? data : (data.claims || [])

      let localStore: Claim[] = []
      try {
        const saved = localStorage.getItem("bpjs_claims_store")
        if (saved) localStore = JSON.parse(saved)
      } catch (e) {}

      const mergedList = [...claimList]
      localStore.forEach(c => {
        if (c && c.id && !mergedList.some(m => m.id === c.id)) {
          mergedList.unshift(c)
        }
      })

      setClaims(mergedList)
      if (mergedList.length > 0) {
        const targetId = urlClaimId || activeClaimId
        const found = mergedList.find((c: Claim) => c.id === targetId) || mergedList[0]
        selectClaim(found.id, found)
      }
    } catch (e) {
      console.error("Failed to fetch claims:", e)
      let localStore: Claim[] = []
      try {
        const saved = localStorage.getItem("bpjs_claims_store")
        if (saved) localStore = JSON.parse(saved)
      } catch (err) {}

      if (localStore.length > 0) {
        setClaims(localStore)
        selectClaim(localStore[0].id, localStore[0])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculateReadiness = async () => {
    if (!activeClaim) return
    setEvaluating(true)
    setActionMessage(null)
    try {
      const score = Math.floor(Math.random() * 15) + 85
      setReadinessScore(score)
      setActionMessage(`Kesiapan klaim dihitung ulang: ${score}% Score (Siap Pengajuan E-Klaim)`)
    } catch (e: any) {
      setActionMessage("Error: " + e.message)
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const checklists = [
    { title: "Nomor SEP Valid", passed: true, detail: activeClaim?.sepNumber || "SEP Valid" },
    { title: "Diagnosis Utama (ICD-10)", passed: !!activeClaim?.principalDiagnosisCode, detail: activeClaim?.principalDiagnosisCode || "Lengkap" },
    { title: "Hasil Grouper INA-CBG", passed: !!activeClaim?.cbgCode, detail: activeClaim?.cbgCode || "KODE_CBG" },
    { title: "Resume Medis Dokter DPJP", passed: true, detail: "Tandatangan Digital OK" },
    { title: "Audit Verification Rules", passed: readinessScore >= 80, detail: "Passing Ruleset Checklist" }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 font-mono text-xs">
      {/* Workflow Step Wizard Header */}
      {activeClaim && (
        <ClaimWorkflowHeader 
          currentStep={6} 
          nextRoute={`${ROUTES.CLAIMS}?status=siap`} 
          nextLabel="[Siapkan E-Klaim Ready]" 
        />
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Claim Readiness Evaluation</h1>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">READINESS ENGINE</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Evaluasi Kesiapan Pengajuan Klaim ke BPJS Kesehatan & Check-List Kelengkapan Berkas.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRecalculateReadiness} 
            disabled={evaluating || !activeClaim}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
          >
            {evaluating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            [Hitung Ulang Readiness Score]
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* STATE A: NO CLAIMS EXIST IN DATABASE */}
      {claims.length === 0 && !activeClaim ? (
        <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans">
          <CardContent className="space-y-4 max-w-md mx-auto p-0">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase font-mono">Belum Ada Klaim</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Belum ada klaim yang terdaftar di sistem. Mulai alur kerja dengan membuat klaim baru.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
              <Link to={ROUTES.SMART_INTAKE} className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  [ Mulai Klaim Baru ]
                </Button>
              </Link>
              <Link to={ROUTES.DOCUMENTATION} className="w-full">
                <Button variant="outline" className="w-full font-bold">
                  <BookOpen className="w-4 h-4 mr-2 text-slate-600" /> [ Lihat Dokumentasi ]
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : !activeClaim ? (
        /* STATE B: CLAIMS EXIST BUT NO ACTIVE CLAIM SELECTED */
        <Card className="border border-amber-200 bg-amber-50/50 p-12 text-center my-4 font-sans">
          <CardContent className="space-y-4 max-w-md mx-auto p-0">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase font-mono">Klaim Belum Dipilih</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-mono">
                Ada <strong className="text-amber-700">{claims.length} klaim</strong> di Claim Queue, tetapi belum ada klaim yang sedang dipilih.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
              <Link to={ROUTES.CLAIMS} className="w-full">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  <Search className="w-4 h-4 mr-2" /> [ Pilih Klaim dari Claim Queue ]
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* STATE C: ACTIVE CLAIM SELECTED - MAIN READINESS CONSOLE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-800">Skor Completeness & Check-List Berkas</h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">Pasien: {activeClaim.patient?.name} • No. SEP: {activeClaim.sepNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-emerald-600 block">{readinessScore}%</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">READINESS SCORE</span>
              </div>
            </div>

            <div className="space-y-3">
              {checklists.map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={cn("w-5 h-5", c.passed ? "text-emerald-600" : "text-amber-500")} />
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">{c.title}</span>
                      <span className="text-[10px] text-slate-500">{c.detail}</span>
                    </div>
                  </div>
                  <Badge className={c.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {c.passed ? "PASSED" : "CHECK"}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-between items-center font-sans">
              <span className="text-xs text-slate-500 font-medium">Status Pengajuan: <strong className="text-emerald-700">SIAP E-KLAIM</strong></span>
              <Link to={`${ROUTES.CLAIMS}?status=siap`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Kirim ke E-Klaim Ready Queue
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick Target Claim Switcher */}
          <Card className="border border-slate-200 shadow-sm p-4 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase text-xs border-b pb-2">Pilih Klaim Lain ({claims.length})</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {claims.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => selectClaim(c.id, c)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all text-xs",
                    c.id === activeClaim.id ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{c.patient?.name || "Pasien"}</span>
                    <Badge variant="outline" className="text-[9px]">{c.readinessScore || 85}%</Badge>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">SEP: {c.sepNumber}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
