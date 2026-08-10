import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ShieldAlert, AlertTriangle, CheckCircle2, Loader2, Search, ShieldCheck, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { Claim } from "../types"
import { formatRupiah, cn } from "../lib/utils"
import { useClaimContext } from "../context/ClaimContext"
import { ClaimWorkflowHeader } from "../components/layout/ClaimWorkflowHeader"
import { ROUTES } from "../routes"

export default function RiskEngine() {
  const { claimId: urlClaimId } = useParams<{ claimId?: string }>()
  const { activeClaimId, activeClaim, selectClaim } = useClaimContext()
  
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchClaims()
  }, [])

  useEffect(() => {
    if (urlClaimId && urlClaimId !== activeClaimId) {
      const found = claims.find(c => c.id === urlClaimId)
      if (found) selectClaim(urlClaimId, found)
    }
  }, [urlClaimId, claims])

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/claims?dataMode=ALL", {
        headers: { "X-User-Id": "usr-admin-001" }
      })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const riskFactors = [
    { title: "Kesesuaian Kode Diagnosis (ICD-10)", risk: "LOW", detail: "Sesuai petunjuk teknis BPJS" },
    { title: "Length of Stay (LOS) vs Severity", risk: "LOW", detail: "LOS 3 hari konsisten dengan Severity Level 1" },
    { title: "Potensi Dispute Audit", risk: "LOW", detail: "Resiko dispute rendah" }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 font-mono text-xs">
      {/* Workflow Step Wizard Header */}
      {activeClaim && (
        <ClaimWorkflowHeader 
          currentStep={6} 
          nextRoute={ROUTES.READINESS} 
          nextLabel="[Lihat Claim Readiness]" 
        />
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Risk Engine & Fraud Prevention</h1>
            <Badge className="bg-red-600 text-white font-bold text-[10px]">RISK ANALYTICS</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Deteksi Risiko Audit BPJS Kesehatan, Anomali Koding, & Pencegahan Dispute Klaim.</p>
        </div>
      </div>

      {/* STATE A: NO CLAIMS EXIST IN DATABASE */}
      {claims.length === 0 && !activeClaim ? (
        <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans">
          <CardContent className="space-y-4 max-w-md mx-auto p-0">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
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
        /* STATE C: ACTIVE CLAIM SELECTED - MAIN RISK ENGINE CONSOLE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-800">Analisis Risiko Audit Klaim</h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">Pasien: {activeClaim.patient?.name} • No. SEP: {activeClaim.sepNumber}</p>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-[10px]">LOW RISK</Badge>
            </div>

            <div className="space-y-3">
              {riskFactors.map((r, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">{r.title}</span>
                    <span className="text-[10px] text-slate-500">{r.detail}</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 font-bold">{r.risk}</Badge>
                </div>
              ))}
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
                    c.id === activeClaim.id ? "bg-red-50 border-red-300 font-bold text-red-900" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{c.patient?.name || "Pasien"}</span>
                    <Badge variant="outline" className="text-[9px]">LOW RISK</Badge>
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
