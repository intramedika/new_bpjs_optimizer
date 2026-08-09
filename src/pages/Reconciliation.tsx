import { useState, useEffect } from "react"
import { Activity, Search, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, Loader2, ArrowRight, Database, FileText, BarChart3, Scale } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { formatRupiah, cn } from "../lib/utils"
import { Claim, DataMode } from "../types"
import { ReconciliationRecord } from "../../server/repositories/ReconciliationRepository"
import { Link } from "react-router-dom"

export default function Reconciliation() {
  const [records, setRecords] = useState<ReconciliationRecord[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [selectedClaimId, setSelectedClaimId] = useState<string>("")
  const [activeDataMode, setActiveDataMode] = useState<DataMode | "ALL">("REAL")
  const [loading, setLoading] = useState<boolean>(true)
  const [reconciling, setReconciling] = useState<boolean>(false)
  const [stats, setStats] = useState<any>(null)
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null)

  useEffect(() => {
    fetchReconciliationData(activeDataMode)
    fetchClaims()
  }, [activeDataMode])

  const fetchClaims = async () => {
    try {
      const res = await fetch("/api/claims?dataMode=ALL")
      const data = await res.json()
      if (data.claims && data.claims.length > 0) {
        setClaims(data.claims)
        setSelectedClaimId(data.claims[0].id)
      }
    } catch (e) {
      console.error("Failed to fetch claims:", e)
    }
  }

  const fetchReconciliationData = async (mode: string) => {
    setLoading(true)
    try {
      const rRes = await fetch(`/api/reconciliation?dataMode=${mode}`)
      const rData = await rRes.json()
      if (rData.records) setRecords(rData.records)

      const sRes = await fetch(`/api/reconciliation/stats?dataMode=${mode}`)
      const sData = await sRes.json()
      setStats(sData)
    } catch (e) {
      console.error("Failed to fetch reconciliation data:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleRunReconciliation = async (targetId?: string) => {
    setReconciling(true)
    try {
      const bodyPayload = targetId ? { claimId: targetId } : { dataMode: activeDataMode }
      const res = await fetch("/api/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      })
      const data = await res.json()
      if (res.ok) {
        await fetchReconciliationData(activeDataMode)
      }
    } catch (e: any) {
      alert("Gagal menjalankan rekonsiliasi: " + e.message)
    } finally {
      setReconciling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const totalCompared = stats?.totalCompared || records.length
  const matchCount = stats?.matchCount || records.filter(r => r.varianceType === "EXACT_MATCH").length
  const mismatchCount = stats?.mismatchCount || records.filter(r => r.varianceType !== "EXACT_MATCH").length
  const totalVariance = stats?.totalVariance || records.reduce((acc, r) => acc + (r.varianceAmount || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Post-Grouping Reconciliation</h1>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">VARIANCE ENGINE</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Analisis perbedaan (variance) antara Prediksi Lokal vs Hasil Aktual E-Klaim / Mock Grouper.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => handleRunReconciliation()}
            disabled={reconciling}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
          >
            {reconciling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Scale className="w-4 h-4 mr-2" />}
            [Run Reconciliation for Active Claims]
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase ml-2">Data Mode Filter:</span>
          <div className="flex gap-1">
            {(["REAL", "DEMO", "TEST", "ALL"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveDataMode(mode)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
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

        {claims.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 uppercase">Rekonsiliasi Klaim Spesifik:</span>
            <select 
              value={selectedClaimId}
              onChange={(e) => setSelectedClaimId(e.target.value)}
              className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5"
            >
              {claims.map(c => (
                <option key={c.id} value={c.id}>{c.id} ({c.sepNumber})</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => handleRunReconciliation(selectedClaimId)} className="text-xs font-bold">
              [Reconcile Single Claim]
            </Button>
          </div>
        )}
      </div>

      {/* Reconciliation Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Reconciled</span>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCompared}</h3>
          <span className="text-xs text-slate-500">Klaim dibandingkan</span>
        </Card>

        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Exact Match</span>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{matchCount}</h3>
          <span className="text-xs text-emerald-700 font-medium">Prediksi = Actual</span>
        </Card>

        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Variance / Mismatch</span>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{mismatchCount}</h3>
          <span className="text-xs text-amber-700 font-medium">Perbedaan CBG / Severity</span>
        </Card>

        <Card className="border border-slate-200 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Tarif Variance</span>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">{formatRupiah(totalVariance)}</h3>
          <span className="text-xs text-slate-500">Selisih nominal klaim</span>
        </Card>
      </div>

      {/* Reconciliation Dashboard Table / Actionable Empty State */}
      {records.length === 0 ? (
        <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans">
          <CardContent className="space-y-4 max-w-md mx-auto p-0">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase font-mono">Belum Ada Hasil E-Klaim Untuk Dibandingkan</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Modul rekonsiliasi akan membandingkan Prediksi Tarif Lokal vs Hasil Resmi E-Klaim. Jalankan mesin rekonsiliasi atau uji coba di Mock Sandbox.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
              <Button onClick={() => handleRunReconciliation()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <Scale className="w-4 h-4 mr-2" /> [Jalankan Mesin Rekonsiliasi Klaim Aktif]
              </Button>
              <Link to="/integrasi/mock" className="w-full">
                <Button variant="outline" className="w-full font-bold">
                  <Activity className="w-4 h-4 mr-2 text-amber-600" /> [Uji Coba Mock Grouper di Integration Sandbox]
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase text-slate-800">Daftar Rekonsiliasi Klaim ({records.length} Records)</CardTitle>
            <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-700">PERSISTED IN SQLITE DB</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Claim ID</th>
                  <th className="px-4 py-3">Prediksi Local</th>
                  <th className="px-4 py-3">Hasil Actual / Mock</th>
                  <th className="px-4 py-3">Variance Nominal</th>
                  <th className="px-4 py-3">Tipe Variance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Inspeksi Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">{r.claimId}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-700 block">{r.predictionCbg} (L{r.predictionSeverity})</span>
                      <span className="text-[10px] text-slate-500">{formatRupiah(r.predictionTariff)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-blue-600 block">{r.actualCbg} (L{r.actualSeverity})</span>
                      <span className="text-[10px] text-slate-500">{formatRupiah(r.actualTariff)}</span>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span className={r.varianceAmount === 0 ? "text-slate-600" : r.varianceAmount > 0 ? "text-emerald-600" : "text-red-600"}>
                        {r.varianceAmount > 0 ? `+${formatRupiah(r.varianceAmount)}` : formatRupiah(r.varianceAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold uppercase",
                        r.varianceType === "EXACT_MATCH" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        r.varianceType === "CBG_MISMATCH" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {r.varianceType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        r.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedRecord(r)} className="text-blue-600 font-bold hover:underline">
                        Bandingkan Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Detail Comparison Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 font-mono text-xs max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase text-slate-900">Perbandingan Rekonsiliasi ({selectedRecord.claimId})</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-500 hover:text-slate-800 font-bold">✕ Close</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block uppercase text-[10px]">PREDIKSI LOKAL</span>
                <div><span className="text-slate-500">Source:</span> {selectedRecord.predictionSource}</div>
                <div><span className="text-slate-500">CBG Code:</span> <strong className="text-slate-800">{selectedRecord.predictionCbg}</strong></div>
                <div><span className="text-slate-500">Severity:</span> Level {selectedRecord.predictionSeverity}</div>
                <div><span className="text-slate-500">Tarif:</span> <strong className="text-emerald-700">{formatRupiah(selectedRecord.predictionTariff)}</strong></div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <span className="font-bold text-blue-900 block uppercase text-[10px]">HASIL ACTUALLY / MOCK GROUPER</span>
                <div><span className="text-slate-500">Source:</span> {selectedRecord.actualSource}</div>
                <div><span className="text-slate-500">CBG Code:</span> <strong className="text-blue-700">{selectedRecord.actualCbg}</strong></div>
                <div><span className="text-slate-500">Severity:</span> Level {selectedRecord.actualSeverity}</div>
                <div><span className="text-slate-500">Tarif:</span> <strong className="text-blue-700">{formatRupiah(selectedRecord.actualTariff)}</strong></div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <p className="font-bold text-[11px] uppercase">Analisis Perbedaan (Variance):</p>
              <p className="text-[11px]">Tipe: <strong>{selectedRecord.varianceType}</strong></p>
              <p className="text-[11px]">Selisih Nominal: <strong>{formatRupiah(selectedRecord.varianceAmount)}</strong></p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
