import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { 
  Code, Activity, Search, ShieldCheck, Sparkles, Loader2, ArrowRight, 
  CheckCircle2, AlertTriangle, Scale, BookOpen, FileText, ArrowLeft, Plus, Trash2, Edit3, ShieldAlert, TrendingUp, Check, X, Award
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { Claim } from "../types"
import { formatRupiah, cn } from "../lib/utils"
import { useClaimContext } from "../context/ClaimContext"
import { ClaimWorkflowHeader } from "../components/layout/ClaimWorkflowHeader"
import { ClinicalFinding } from "../../server/repositories/ClinicalFindingRepository"
import { RevenueOpportunity } from "../../server/repositories/RevenueOpportunityRepository"
import { ROUTES } from "../routes"
import { useHospitalContext } from "../context/HospitalContext"

export default function CodingGrouper() {
  const { claimId: urlClaimId } = useParams<{ claimId?: string }>()
  const { activeClaimId, activeClaim, selectClaim, refreshClaims } = useClaimContext()
  
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [clinicalFindings, setClinicalFindings] = useState<ClinicalFinding[]>([])
  const [loadingFindings, setLoadingFindings] = useState<boolean>(false)

  // Revenue Opportunity states
  const [revenueOpportunities, setRevenueOpportunities] = useState<RevenueOpportunity[]>([])
  const [analyzingRevenue, setAnalyzingRevenue] = useState<boolean>(false)
  const [processingOppId, setProcessingOppId] = useState<string | null>(null)

  // Local editing states
  const [principalIcd, setPrincipalIcd] = useState<string>("")
  const [principalDiagnosisText, setPrincipalDiagnosisText] = useState<string>("")
  const [secondaryIcds, setSecondaryIcds] = useState<string[]>([])
  const [newSecondaryCode, setNewSecondaryCode] = useState<string>("")
  const [procedures, setProcedures] = useState<string[]>([])
  const [newProcedureCode, setNewProcedureCode] = useState<string>("")
  const [selectedSeverity, setSelectedSeverity] = useState<number>(1)
  const [savingCoding, setSavingCoding] = useState<boolean>(false)

  // Grouper states
  const [grouping, setGrouping] = useState<boolean>(false)
  const [grouperResult, setGrouperResult] = useState<any>(null)
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
      setPrincipalIcd(activeClaim.principalDiagnosisCode || "")
      setPrincipalDiagnosisText(activeClaim.principalDiagnosis || "")
      setSecondaryIcds(activeClaim.secondaryDiagnoses || [])
      setProcedures(activeClaim.procedures || [])
      setSelectedSeverity(activeClaim.severity || 1)
      
      fetchClinicalFindings(activeClaim.id)
      fetchRevenueOpportunities(activeClaim.id)
    }
  }, [activeClaim])

  const { currentUser } = useHospitalContext()

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Id": currentUser?.userId || "usr-admin-001"
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
      if (activeClaim && activeClaim.id && !mergedList.some(m => m.id === activeClaim.id)) {
        mergedList.unshift(activeClaim)
      }

      setClaims(mergedList)

      const targetId = urlClaimId || activeClaimId || (mergedList.length > 0 ? mergedList[0].id : null)
      if (targetId) {
        let found = mergedList.find((c: Claim) => c.id === targetId)
        if (!found) {
          try {
            const singleRes = await fetch(`/api/claims/${targetId}`, { headers })
            if (singleRes.ok) {
              const singleData = await singleRes.json()
              if (singleData && singleData.id) {
                found = singleData
                setClaims(prev => [singleData, ...prev.filter(p => p.id !== singleData.id)])
              }
            }
          } catch (e) {
            console.warn("Failed to fetch single claim:", e)
          }
        }

        if (found) selectClaim(found.id, found)
        else if (mergedList.length > 0) selectClaim(mergedList[0].id, mergedList[0])
      } else if (mergedList.length > 0) {
        selectClaim(mergedList[0].id, mergedList[0])
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

  const fetchClinicalFindings = async (claimId: string) => {
    setLoadingFindings(true)
    try {
      const res = await fetch(`/api/clinical/findings?claimId=${claimId}`)
      const data = await res.json()
      if (data.findings) setClinicalFindings(data.findings)
    } catch (e) {
      console.error("Failed to fetch clinical findings:", e)
    } finally {
      setLoadingFindings(false)
    }
  }

  const fetchRevenueOpportunities = async (claimId: string) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/revenue-opportunities`, {
        headers: {
          "X-Tenant-Id": activeClaim?.tenantId || "tenant-pt-health",
          "X-Hospital-Id": activeClaim?.hospitalId || "hospital-jkt"
        }
      })
      const data = await res.json()
      if (data.opportunities) setRevenueOpportunities(data.opportunities)
    } catch (e) {
      console.error("Failed to fetch revenue opportunities:", e)
    }
  }

  const handleAnalyzeRevenue = async () => {
    if (!activeClaim) return
    setAnalyzingRevenue(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/claims/${activeClaim.id}/revenue-opportunities/analyze`, {
        method: "POST",
        headers: {
          "X-Tenant-Id": activeClaim.tenantId || "tenant-pt-health",
          "X-Hospital-Id": activeClaim.hospitalId || "hospital-jkt"
        }
      })
      const data = await res.json()
      if (res.ok && data.opportunities) {
        setRevenueOpportunities(data.opportunities)
        if (data.opportunities.length > 0) {
          setActionMessage(`Mesin Optimizer menemukan ${data.opportunities.length} potensi peningkatan klaim yang didukung bukti klinis!`)
        } else {
          setActionMessage("Hasil Evaluasi: Pengkodean klaim saat ini sudah optimal dan sesuai bukti klinis.")
        }
      }
    } catch (e: any) {
      setActionMessage("Gagal menganalisis potensi revenue: " + e.message)
    } finally {
      setAnalyzingRevenue(false)
    }
  }

  const handleApproveOpportunity = async (oppId: string) => {
    if (!activeClaim) return
    setProcessingOppId(oppId)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/revenue-opportunities/${oppId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": activeClaim.tenantId || "tenant-pt-health",
          "X-Hospital-Id": activeClaim.hospitalId || "hospital-jkt"
        },
        body: JSON.stringify({ approvedBy: "Coder Casemix" })
      })
      const data = await res.json()
      if (res.ok && data.claim) {
        setActionMessage("Rekomendasi Optimizer disetujui! Kode ICD & Tarif Grouper berhasil diperbarui.")
        selectClaim(activeClaim.id, data.claim)
        await refreshClaims()
        await fetchRevenueOpportunities(activeClaim.id)
      }
    } catch (e: any) {
      setActionMessage("Gagal menyetujui rekomendasi: " + e.message)
    } finally {
      setProcessingOppId(null)
    }
  }

  const handleRejectOpportunity = async (oppId: string) => {
    if (!activeClaim) return
    setProcessingOppId(oppId)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/revenue-opportunities/${oppId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": activeClaim.tenantId || "tenant-pt-health",
          "X-Hospital-Id": activeClaim.hospitalId || "hospital-jkt"
        },
        body: JSON.stringify({ reason: "Pertimbangan klinis Coder Casemix", rejectedBy: "Coder Casemix" })
      })
      const data = await res.json()
      if (res.ok) {
        setActionMessage("Rekomendasi Optimizer ditolak. Kode klaim awal dipertahankan.")
        await fetchRevenueOpportunities(activeClaim.id)
      }
    } catch (e: any) {
      setActionMessage("Gagal menolak rekomendasi: " + e.message)
    } finally {
      setProcessingOppId(null)
    }
  }

  const handleSaveCoding = async () => {
    if (!activeClaim) return
    setSavingCoding(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/claims/${activeClaim.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principalDiagnosisCode: principalIcd,
          principalDiagnosis: principalDiagnosisText,
          secondaryDiagnoses: secondaryIcds,
          procedures: procedures,
          severity: selectedSeverity
        })
      })
      const data = await res.json()
      if (res.ok) {
        setActionMessage("Perubahan kode ICD & Severity berhasil disimpan ke database.")
        selectClaim(activeClaim.id, data.claim)
        await refreshClaims()
      }
    } catch (e: any) {
      setActionMessage("Gagal menyimpan coding: " + e.message)
    } finally {
      setSavingCoding(false)
    }
  }

  const handleAddSecondary = () => {
    if (!newSecondaryCode.trim()) return
    const code = newSecondaryCode.trim().toUpperCase()
    if (!secondaryIcds.includes(code)) {
      setSecondaryIcds([...secondaryIcds, code])
    }
    setNewSecondaryCode("")
  }

  const handleRemoveSecondary = (code: string) => {
    setSecondaryIcds(secondaryIcds.filter(c => c !== code))
  }

  const handleAddProcedure = () => {
    if (!newProcedureCode.trim()) return
    const code = newProcedureCode.trim()
    if (!procedures.includes(code)) {
      setProcedures([...procedures, code])
    }
    setNewProcedureCode("")
  }

  const handleRemoveProcedure = (code: string) => {
    setProcedures(procedures.filter(c => c !== code))
  }

  const handleRunGrouper = async () => {
    if (!activeClaim) return
    setGrouping(true)
    setActionMessage(null)
    try {
      await handleSaveCoding()

      let result: any = null
      let isMock = true

      try {
        const res = await fetch("/api/integration/execute", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-User-Id": currentUser?.userId || "usr-admin-001"
          },
          body: JSON.stringify({
            adapterId: "mock-eklaim",
            operation: "grouping",
            tenantId: activeClaim.tenantId || "tenant-pt-health",
            hospitalId: activeClaim.hospitalId || "hospital-jkt",
            payload: {
              claimId: activeClaim.id,
              principalDiagnosisCode: principalIcd || activeClaim.principalDiagnosisCode,
              secondaryDiagnoses: secondaryIcds,
              procedures: procedures,
              severity: selectedSeverity
            }
          })
        })

        if (res.ok) {
          const text = await res.text()
          try {
            const parsed = JSON.parse(text)
            if (parsed && parsed.data) {
              result = parsed.data
              isMock = Boolean(parsed.isMock)
            }
          } catch (jsonErr) {}
        }
      } catch (netErr) {
        console.warn("Network call failed, executing local Grouper engine:", netErr)
      }

      // Local Fallback Grouper Rule Calculation if server response fails or is non-JSON
      if (!result) {
        const diagCode = (principalIcd || activeClaim.principalDiagnosisCode || "K74.6").toUpperCase()
        let cbgCode = "K-4-17-I"
        let cbgDescription = "Penyakit Hati Kronis & Sirosis"
        let baseTariff = 6850000

        if (diagCode.startsWith("E11")) {
          cbgCode = "E-4-10-I"
          cbgDescription = "Diabetes Mellitus Tipe 2"
          baseTariff = 5400000
        } else if (diagCode.startsWith("J18")) {
          cbgCode = "J-4-16-I"
          cbgDescription = "Infeksi Saluran Napas / Pneumonia"
          baseTariff = 7200000
        } else if (diagCode.startsWith("I10") || diagCode.startsWith("I50")) {
          cbgCode = "I-4-11-I"
          cbgDescription = "Gagal Jantung & Hipertensi Utama"
          baseTariff = 8100000
        }

        const severityMultiplier = selectedSeverity === 3 ? 1.85 : selectedSeverity === 2 ? 1.30 : 1.0
        const calculatedTariff = Math.round(baseTariff * severityMultiplier)

        result = {
          cbgCode,
          cbgDescription,
          severity: selectedSeverity,
          tariff: calculatedTariff,
          tariffFormatted: formatRupiah(calculatedTariff)
        }
      }

      const updatedGrouper = {
        cbgCode: result.cbgCode,
        cbgDescription: result.cbgDescription,
        severity: result.severity,
        tariff: result.tariff,
        tariffFormatted: result.tariffFormatted || formatRupiah(result.tariff),
        source: isMock ? "LOCAL_PREDICTION" : "OFFICIAL_EKLAIM"
      }

      setGrouperResult(updatedGrouper)

      const updatedClaim = {
        ...activeClaim,
        cbgCode: result.cbgCode,
        cbgDescription: result.cbgDescription,
        tariff: result.tariff,
        severity: selectedSeverity,
        principalDiagnosisCode: principalIcd || activeClaim.principalDiagnosisCode,
        principalDiagnosis: principalDiagnosisText || activeClaim.principalDiagnosis,
        secondaryDiagnoses: secondaryIcds,
        procedures: procedures
      }

      selectClaim(activeClaim.id, updatedClaim)

      try {
        await fetch(`/api/claims/${activeClaim.id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "X-User-Id": currentUser?.userId || "usr-admin-001"
          },
          body: JSON.stringify(updatedClaim)
        })
      } catch (e) {}

      setActionMessage(`Simulasi Grouper Berhasil: Kode ${result.cbgCode} (${result.cbgDescription}) — ${formatRupiah(result.tariff)}`)
      await refreshClaims()
    } catch (e: any) {
      setActionMessage("Error Grouper: " + (e.message || "Simulasi Grouper gagal"))
    } finally {
      setGrouping(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const confirmedFindings = clinicalFindings.filter(f => f.status === "CONFIRMED")
  const isClinicalReviewComplete = confirmedFindings.length > 0 || (activeClaim?.principalDiagnosisCode && activeClaim.principalDiagnosisCode.length > 0)
  const isCodingValid = Boolean(principalIcd && principalIcd.trim().length > 0)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 font-mono text-xs">
      {/* Workflow Step Wizard Header */}
      {activeClaim && (
        <ClaimWorkflowHeader 
          currentStep={3} 
          nextRoute={ROUTES.REVENUE_OPTIMIZER} 
          nextLabel="[ Optimasi Klaim Revenue → ]" 
        />
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Coding & Grouper Intelligence</h1>
            <Badge className="bg-purple-600 text-white font-bold text-[10px]">INA-CBG ENGINE</Badge>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">REVENUE OPTIMIZER ACTIVE</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Penetapan Kode ICD-10 & ICD-9-CM, Simulasi Prediksi INA-CBG, Severity Level, & Optimalisasi Klaim Berbasis Bukti Klinis.</p>
        </div>

        {activeClaim && (
          <div className="flex items-center gap-2">
            <Link to={`/analisis/clinical/${activeClaim.id}`}>
              <Button variant="outline" size="sm" className="font-bold text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> [ Kembali ke Review Klinis ]
              </Button>
            </Link>
            <Button 
              onClick={handleRunGrouper} 
              disabled={grouping || !isClinicalReviewComplete || !isCodingValid}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm"
            >
              {grouping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
              [Jalankan Grouper Analysis]
            </Button>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* STATE A: NO CLAIMS EXIST IN DATABASE */}
      {claims.length === 0 && !activeClaim ? (
        <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans">
          <CardContent className="space-y-4 max-w-md mx-auto p-0">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Code className="w-8 h-8" />
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
              <Link to={ROUTES.IMPORT} className="w-full">
                <Button variant="outline" className="w-full font-bold">
                  <BookOpen className="w-4 h-4 mr-2 text-slate-600" /> [ Buka Import Data ]
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
                Ada <strong className="text-amber-700">{claims.length} klaim</strong> di Claim Queue, tetapi belum ada klaim yang sedang dipilih untuk modul Coding & Grouper.
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
      ) : !isClinicalReviewComplete ? (
        /* STATE C: CLAIM SELECTED BUT CLINICAL REVIEW NOT COMPLETE */
        <Card className="border border-orange-200 bg-orange-50/50 p-12 text-center my-4 font-sans">
          <CardContent className="space-y-4 max-w-md mx-auto p-0">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase font-mono">Review Klinis Belum Selesai</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-mono">
                Klaim <strong>{activeClaim.sepNumber}</strong> ({activeClaim.patient?.name}) belum memiliki temuan klinis yang dikonfirmasi. Coding dan Grouper belum dapat dilanjutkan.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
              <Link to={`/analisis/clinical/${activeClaim.id}`} className="w-full">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold">
                  <ArrowLeft className="w-4 h-4 mr-2" /> [ Kembali ke Review Klinis ]
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* STATE D: MAIN OPERATIONAL CODING & GROUPER WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Coding & Grouper Workspace (Left 2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Claim Header Context Bar */}
            <Card className="border border-slate-200 shadow-sm p-4 bg-slate-900 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">KLAIM AKTIF:</span>
                    <strong className="text-sm font-bold text-white font-mono">{activeClaim.patient?.name}</strong>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    No. SEP: <span className="text-emerald-400 font-bold">{activeClaim.sepNumber}</span> • MRN: {activeClaim.patientId} • Unit: {activeClaim.unit || "Rawat Inap"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white text-[10px] font-bold">{activeClaim.dataMode || "REAL"}</Badge>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/50 text-[10px] font-bold">
                    {activeClaim.status || "DRAFT"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* REVENUE OPPORTUNITY & WHAT-IF SCENARIOS ENGINE PANEL */}
            <Card className="border border-emerald-300 bg-emerald-50/40 shadow-sm">
              <CardHeader className="border-b border-emerald-200 pb-3 flex flex-row items-center justify-between bg-emerald-100/50">
                <div>
                  <CardTitle className="text-xs font-bold uppercase text-emerald-950 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    <span>Revenue Opportunity & What-If Scenarios</span>
                  </CardTitle>
                  <CardDescription className="text-[11px] text-emerald-800 font-sans mt-0.5">
                    Mesin AI Menganalisis Bukti Klinis Terverifikasi untuk Mendeteksi Potensi Klaim yang Didukung Aturan BPJS.
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleAnalyzeRevenue} 
                  disabled={analyzingRevenue}
                  size="sm" 
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm font-mono"
                >
                  {analyzingRevenue ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  [ Analisis Optimalisasi ]
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {revenueOpportunities.length === 0 ? (
                  <div className="p-4 bg-white border border-emerald-200 rounded-xl text-center space-y-2">
                    <Award className="w-8 h-8 text-emerald-600 mx-auto opacity-70" />
                    <p className="text-xs font-bold text-slate-800 uppercase font-mono">Belum Ada Rekomendasi Terdeteksi</p>
                    <p className="text-[11px] text-slate-500 font-sans">Klik tombol <strong>[ Analisis Optimalisasi ]</strong> untuk mengevaluasi kesesuaian bukti klinis dengan tarif INA-CBG.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {revenueOpportunities.map(opp => (
                      <div key={opp.id} className="p-4 bg-white border border-emerald-300 rounded-xl space-y-3 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-emerald-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-700 text-white text-[9px] font-bold uppercase">{opp.opportunityType}</Badge>
                              <strong className="text-xs font-bold text-slate-900 uppercase font-mono">{opp.title}</strong>
                            </div>
                            <p className="text-[11px] text-slate-600 font-sans mt-1">{opp.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Potensi Peningkatan</span>
                            <strong className="text-emerald-700 text-sm font-mono">+ {formatRupiah(opp.potentialDelta)}</strong>
                          </div>
                        </div>

                        {/* Baseline vs Scenario Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Pengkodean Saat Ini (Baseline)</span>
                            <p className="text-slate-700 font-bold">{opp.currentCoding}</p>
                            <span className="text-[10px] text-slate-500 block">Grouper: {opp.currentGrouper} • Tarif: {formatRupiah(opp.currentTariff)}</span>
                          </div>

                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase">Rekomendasi AI (Evidence Supported)</span>
                            <p className="text-emerald-950 font-bold">{opp.recommendedCoding}</p>
                            <span className="text-[10px] text-emerald-800 block">Grouper: {opp.recommendedGrouper} • Tarif: {formatRupiah(opp.recommendedTariff)}</span>
                          </div>
                        </div>

                        {/* Evidence & Compliance Verification Badges */}
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                          <div>
                            <span className="font-bold text-slate-700 block">Dukungan Bukti Klinis:</span>
                            <span className="text-slate-600 italic">{opp.evidenceSummary}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 font-bold">
                              SCORE: {opp.opportunityScore}/100
                            </Badge>
                            <Badge className="bg-emerald-600 text-white font-bold">
                              RISK: {opp.riskLevel}
                            </Badge>
                            <Badge variant="outline" className={cn(
                              "font-bold",
                              opp.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                              opp.status === "REJECTED" ? "bg-red-100 text-red-800 border-red-300" : "bg-purple-100 text-purple-800"
                            )}>
                              {opp.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Coder Approval Decision Buttons */}
                        {opp.status === "DETECTED" || opp.status === "UNDER_REVIEW" ? (
                          <div className="pt-1 flex items-center justify-end gap-2 font-sans">
                            <Button 
                              onClick={() => handleRejectOpportunity(opp.id)}
                              disabled={processingOppId === opp.id}
                              variant="outline" 
                              size="sm" 
                              className="text-red-700 border-red-200 hover:bg-red-50 text-xs font-bold font-mono"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> [ TOLAK REKOMENDASI ]
                            </Button>
                            <Button 
                              onClick={() => handleApproveOpportunity(opp.id)}
                              disabled={processingOppId === opp.id}
                              size="sm" 
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold font-mono"
                            >
                              {processingOppId === opp.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                              [ SETUJUI & TERAPKAN KODE ]
                            </Button>
                          </div>
                        ) : opp.status === "APPROVED" ? (
                          <div className="p-2 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-900 font-bold text-center text-[11px]">
                            ✓ Rekomendasi telah disetujui oleh Coder ({opp.approvedBy}) dan diterapkan ke klaim aktif.
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium text-center text-[11px]">
                            ✕ Rekomendasi ditolak oleh Coder. Kode klaim awal tetap dipertahankan.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confirmed Clinical Findings Panel */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-xs font-bold uppercase text-slate-800 flex items-center justify-between">
                  <span>1. Temuan Klinis Terkonfirmasi ({confirmedFindings.length} Items)</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[9px]">CLINICAL REVIEW ✓</Badge>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500 font-sans">Hasil ekstraksi bukti klinis dari resume medis & dokumen pasien.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {confirmedFindings.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
                    Temuan klinis disinkronkan langsung dari data klaim utama.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {confirmedFindings.map(f => (
                      <div key={f.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white text-[9px] font-bold">{f.findingType}</Badge>
                            <span className="font-bold text-slate-900 text-xs">{f.findingValue}</span>
                            {f.icdCode && <span className="text-blue-600 font-bold text-xs">[{f.icdCode}]</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1 italic">"{f.sourceText}"</span>
                        </div>
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 text-[9px] font-bold">
                          {f.confidence}% Confidence
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ICD-10 & ICD-9-CM Coding Panel */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase text-slate-800">2. Penetapan Kode ICD-10 & ICD-9-CM</CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 font-sans">Verifikasi dan sesuaikan kode diagnosis utama, sekunder, dan tindakan medis.</CardDescription>
                </div>
                <Button onClick={handleSaveCoding} disabled={savingCoding} size="sm" className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-mono">
                  {savingCoding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
                  Simpan Kode
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                
                {/* Principal Diagnosis ICD-10 */}
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-blue-900 uppercase">Diagnosis Utama (Principal ICD-10)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input 
                      type="text" 
                      value={principalIcd} 
                      onChange={e => setPrincipalIcd(e.target.value.toUpperCase())}
                      placeholder="Kode ICD-10 (e.g. E11.1)" 
                      className="p-2 border border-blue-300 rounded-lg text-xs font-bold font-mono bg-white uppercase focus:outline-none focus:border-blue-600"
                    />
                    <input 
                      type="text" 
                      value={principalDiagnosisText} 
                      onChange={e => setPrincipalDiagnosisText(e.target.value)}
                      placeholder="Deskripsi Diagnosis (e.g. Type 2 DM with ketoacidosis)" 
                      className="sm:col-span-2 p-2 border border-blue-300 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Secondary Diagnoses List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase">Diagnosis Sekunder ({secondaryIcds.length})</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        value={newSecondaryCode}
                        onChange={e => setNewSecondaryCode(e.target.value)}
                        placeholder="Tambah Kode (e.g. I10)"
                        className="p-1.5 border border-slate-300 rounded-lg text-xs uppercase w-32 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <Button onClick={handleAddSecondary} size="sm" className="bg-blue-600 text-white text-xs font-bold">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {secondaryIcds.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Belum ada diagnosis sekunder.</span>
                    ) : (
                      secondaryIcds.map(code => (
                        <div key={code}>
                          <Badge variant="outline" className="bg-slate-50 p-2 font-mono text-xs flex items-center gap-2 border-slate-300">
                            <strong className="text-slate-900">{code}</strong>
                            <button onClick={() => handleRemoveSecondary(code)} className="text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Procedure Codes List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase">Tindakan Medis (ICD-9-CM) ({procedures.length})</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        value={newProcedureCode}
                        onChange={e => setNewProcedureCode(e.target.value)}
                        placeholder="Tambah Kode (e.g. 89.52)"
                        className="p-1.5 border border-slate-300 rounded-lg text-xs uppercase w-32 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <Button onClick={handleAddProcedure} size="sm" className="bg-purple-600 text-white text-xs font-bold">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {procedures.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Belum ada tindakan medis ICD-9-CM.</span>
                    ) : (
                      procedures.map(code => (
                        <div key={code}>
                          <Badge variant="outline" className="bg-purple-50 p-2 font-mono text-xs flex items-center gap-2 border-purple-200 text-purple-900">
                            <strong className="text-purple-700">{code}</strong>
                            <button onClick={() => handleRemoveProcedure(code)} className="text-purple-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Severity Level Selection Panel */}
            <Card className="border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase">3. Severity Level INA-CBG</span>
                <Badge className="bg-purple-700 text-white font-bold text-[10px]">LEVEL {selectedSeverity}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedSeverity(lvl)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all cursor-pointer font-mono",
                      selectedSeverity === lvl 
                        ? "bg-purple-600 border-purple-700 text-white font-bold shadow-sm" 
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
                    )}
                  >
                    <span className="text-sm block font-bold">Level {lvl}</span>
                    <span className="text-[10px] block opacity-80 mt-0.5">
                      {lvl === 1 ? "Ringan (Severity I)" : lvl === 2 ? "Sedang (Severity II)" : "Berat (Severity III)"}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

          </div>

          {/* Right Column: Validation, Grouper Output, & Navigation */}
          <div className="space-y-6">

            {/* Validation Checklist Panel */}
            <Card className="border border-slate-200 shadow-sm p-4 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase text-xs border-b pb-2">Validasi Sebelum Grouper</h4>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Diagnosis Utama (ICD-10):</span>
                  {isCodingValid ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OK ({principalIcd})</span>
                  ) : (
                    <span className="text-red-600 font-bold">Missing</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Review Klinis:</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Severity Selected:</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Level {selectedSeverity}</span>
                </div>
              </div>

              {!isCodingValid && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-bold">
                  Principal ICD-10 belum ditentukan. Tentukan kode ICD-10 untuk menjalankan Grouper.
                </div>
              )}
            </Card>

            {/* Grouper Result Panel */}
            <Card className="border border-purple-200 bg-purple-50/50 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                <span className="font-bold text-purple-900 uppercase text-xs">Hasil Grouper INA-CBG</span>
                <Badge className={cn(
                  "text-[9px] font-bold",
                  grouperResult?.source === "OFFICIAL_EKLAIM" ? "bg-emerald-600 text-white" : "bg-purple-600 text-white"
                )}>
                  {grouperResult?.source || "LOCAL_PREDICTION"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-purple-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Kode CBG</span>
                  <strong className="text-purple-800 text-lg block">{grouperResult?.cbgCode || activeClaim.cbgCode || "KODE_CBG"}</strong>
                  <span className="text-[11px] text-slate-600 block mt-1">
                    {grouperResult?.cbgDescription || activeClaim.cbgDescription || "Deskripsi Grouper INA-CBG"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Severity</span>
                    <strong className="text-purple-700 text-sm">Level {selectedSeverity}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Estimasi Tarif</span>
                    <strong className="text-emerald-700 text-sm">{formatRupiah(grouperResult?.tariff || activeClaim.tariff || 0)}</strong>
                  </div>
                </div>

                <div className="p-2 bg-purple-100/60 rounded-lg text-[10px] text-purple-900 font-medium text-center">
                  {grouperResult?.source === "OFFICIAL_EKLAIM" 
                    ? "✓ Official E-Klaim Result dari Web Service Kemenkes"
                    : "ℹ Prediksi Lokal — bukan hasil resmi E-Klaim"}
                </div>
              </div>

              <Button 
                onClick={handleRunGrouper} 
                disabled={grouping || !isCodingValid}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 shadow-sm"
              >
                {grouping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                [Jalankan Grouper Analysis]
              </Button>
            </Card>

            {/* Workflow Progression Navigation Button */}
            <Card className="border border-slate-200 shadow-sm p-4 space-y-3 font-sans">
              <Link to={`/analisis/readiness/${activeClaim.id}`} className="w-full block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5">
                  Lanjut ke Claim Readiness <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/klaim" className="w-full block text-center">
                <span className="text-xs text-slate-500 hover:text-slate-700 font-medium">[ Kembali ke Claim Queue ]</span>
              </Link>
            </Card>

            {/* Quick Target Claim Switcher */}
            <Card className="border border-slate-200 shadow-sm p-4 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase text-xs border-b pb-2">Pilih Klaim Lain ({claims.length})</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {claims.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => selectClaim(c.id, c)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all text-xs",
                      c.id === activeClaim.id ? "bg-purple-50 border-purple-300 font-bold text-purple-900" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{c.patient?.name || "Pasien"}</span>
                      <Badge variant="outline" className="text-[9px]">{c.dataMode || "REAL"}</Badge>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">SEP: {c.sepNumber}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      )}
    </div>
  )
}
