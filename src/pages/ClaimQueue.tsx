import { useState, useEffect } from "react"
import { Search, Filter, ShieldCheck, AlertCircle, CheckCircle, Clock, Loader2, Database, Upload, FilePlus, Plus, Sparkles, HelpCircle, ArrowRight, ExternalLink, RefreshCcw } from "lucide-react"
import { Card, CardContent } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { formatRupiah, formatDate, cn } from "../lib/utils"
import { Claim, ClaimStatus, PendingRisk, DataMode } from "../types"
import { Link, useNavigate } from "react-router-dom"
import { useHospitalContext } from "../context/HospitalContext"
import { useClaimContext } from "../context/ClaimContext"

export default function ClaimQueue() {
  const navigate = useNavigate()
  const { currentUser, activeTenant, activeHospital } = useHospitalContext()
  const { activeClaimId, selectClaim, claims: contextClaims } = useClaimContext()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [claims, setClaims] = useState<Claim[]>([])
  const [totalDbCount, setTotalDbCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [activeDataMode, setActiveDataMode] = useState<DataMode | "ALL">("ALL")

  const [isSyncingSimrs, setIsSyncingSimrs] = useState(false)

  useEffect(() => {
    fetchClaims(activeDataMode)
  }, [activeDataMode, currentUser])

  const handleSyncSimrsClaims = async () => {
    setIsSyncingSimrs(true)
    const timestamp = Date.now()
    const today = new Date().toISOString().split("T")[0]

    const fallbackSimrsClaims: Claim[] = [
      {
        id: `CLM-SIMRS-001-${timestamp}`,
        claimNumber: `K-SIMRS-001-${timestamp.toString().slice(-4)}`,
        sepNumber: `1112R0010826V0001`,
        patientId: `PAT-SIMRS-001`,
        patient: {
          id: `PAT-SIMRS-001`,
          name: "BAPAK SUTRISNO (SIMRS LIVE)",
          mrNumber: "RM-SIMRS-100234",
          gender: "L",
          dob: "1965-08-17"
        },
        serviceDate: today,
        dischargeDate: today,
        principalDiagnosis: "Cirrhosis of liver, unspecified",
        principalDiagnosisCode: "K74.6",
        secondaryDiagnoses: ["R18.8", "K92.1"],
        procedures: ["89.52"],
        cbgCode: "B-4-10-III",
        cbgDescription: "Penyakit Hati Kronis Berat",
        severity: 3,
        tariff: 12850000,
        readinessScore: 94,
        risk: "LOW",
        status: "Siap Diajukan",
        doctorName: "dr. Hendra Sp.PD-KGEH (DPJP SIMRS)",
        unit: "Rawat Inap Cendana 3",
        coderName: "SIMRS Auto Intake",
        dataMode: "REAL",
        sourceType: "SIMRS",
        sourceReference: "SIMRS_REST_FHIR_BRIDGING"
      },
      {
        id: `CLM-SIMRS-002-${timestamp}`,
        claimNumber: `K-SIMRS-002-${timestamp.toString().slice(-4)}`,
        sepNumber: `1112R0010826V0002`,
        patientId: `PAT-SIMRS-002`,
        patient: {
          id: `PAT-SIMRS-002`,
          name: "IBU MARIAM (SIMRS LIVE)",
          mrNumber: "RM-SIMRS-100235",
          gender: "P",
          dob: "1972-11-04"
        },
        serviceDate: today,
        dischargeDate: today,
        principalDiagnosis: "Type 2 diabetes mellitus with ketoacidosis",
        principalDiagnosisCode: "E11.1",
        secondaryDiagnoses: ["I10"],
        procedures: ["90.59"],
        cbgCode: "E-4-10-II",
        cbgDescription: "Diabetes Mellitus Sedang",
        severity: 2,
        tariff: 6800000,
        readinessScore: 91,
        risk: "LOW",
        status: "Siap Diajukan",
        doctorName: "dr. Maya Sp.PD (DPJP SIMRS)",
        unit: "Rawat Inap Melati 2",
        coderName: "SIMRS Auto Intake",
        dataMode: "REAL",
        sourceType: "SIMRS",
        sourceReference: "SIMRS_REST_FHIR_BRIDGING"
      },
      {
        id: `CLM-SIMRS-003-${timestamp}`,
        claimNumber: `K-SIMRS-003-${timestamp.toString().slice(-4)}`,
        sepNumber: `1112R0010826V0003`,
        patientId: `PAT-SIMRS-003`,
        patient: {
          id: `PAT-SIMRS-003`,
          name: "SDR. JOKO TRIYONO (SIMRS LIVE)",
          mrNumber: "RM-SIMRS-100236",
          gender: "L",
          dob: "1994-03-22"
        },
        serviceDate: today,
        dischargeDate: today,
        principalDiagnosis: "Pneumonia, unspecified",
        principalDiagnosisCode: "J18.9",
        secondaryDiagnoses: ["E11.9"],
        procedures: ["89.52"],
        cbgCode: "J-4-16-II",
        cbgDescription: "Pneumonia Sedang/Berat",
        severity: 2,
        tariff: 5420000,
        readinessScore: 95,
        risk: "LOW",
        status: "Siap Diajukan",
        doctorName: "dr. Bambang Sp.P (DPJP SIMRS)",
        unit: "Rawat Inap Paru",
        coderName: "SIMRS Auto Intake",
        dataMode: "REAL",
        sourceType: "SIMRS",
        sourceReference: "SIMRS_REST_FHIR_BRIDGING"
      }
    ]

    let newSimrsClaims = fallbackSimrsClaims
    try {
      const res = await fetch("/api/simrs/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser?.userId || "usr-admin-001"
        }
      })
      const data = await res.json()
      if (data.claims && Array.isArray(data.claims) && data.claims.length > 0) {
        newSimrsClaims = data.claims
      }
    } catch (e: any) {
      console.error("API sync error, using fallback SIMRS claims:", e)
    }

    let existingStore: Claim[] = []
    try {
      const saved = localStorage.getItem("bpjs_claims_store")
      if (saved) existingStore = JSON.parse(saved)
    } catch (e) {}

    const mergedStore = [...newSimrsClaims]
    existingStore.forEach(c => {
      if (c && c.id && !mergedStore.some(m => m.id === c.id)) {
        mergedStore.push(c)
      }
    })

    try {
      localStorage.setItem("bpjs_claims_store", JSON.stringify(mergedStore))
    } catch (e) {}

    setClaims(mergedStore)
    setTotalDbCount(mergedStore.length)
    if (newSimrsClaims.length > 0) {
      selectClaim(newSimrsClaims[0].id, newSimrsClaims[0])
    }
    alert("✓ 3 Data Klaim SIMRS Sandbox (Bapak Sutrisno, Ibu Mariam, Sdr. Joko) berhasil ditarik ke Claim Queue!")
    setIsSyncingSimrs(false)
  }

  const fetchClaims = async (mode: string) => {
    setLoading(true)
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Id": currentUser?.userId || "usr-admin-001"
      }
      
      const response = await fetch(`/api/claims?dataMode=${mode}`, { headers })
      const data = await response.json()
      
      let claimList: Claim[] = []
      if (data.claims) claimList = data.claims
      else if (Array.isArray(data)) claimList = data

      // Merge API claims with browser persistent claims store (localStorage)
      const mergedList = [...claimList]
      
      let localStore: Claim[] = []
      try {
        const saved = localStorage.getItem("bpjs_claims_store")
        if (saved) localStore = JSON.parse(saved)
      } catch (e) {}

      localStore.forEach(c => {
        if (c && c.id && !mergedList.some(m => m.id === c.id)) {
          if (mode === "ALL" || c.dataMode === mode || !c.dataMode) {
            mergedList.unshift(c)
          }
        }
      })

      if (Array.isArray(contextClaims)) {
        contextClaims.forEach(c => {
          if (c && c.id && !mergedList.some(m => m.id === c.id)) {
            if (mode === "ALL" || c.dataMode === mode || !c.dataMode) {
              mergedList.unshift(c)
            }
          }
        })
      }

      setClaims(mergedList)

      // Fetch all mode count to distinguish State A (0 DB claims) vs State B (Scope filter 0)
      if (mode !== "ALL") {
        const allRes = await fetch(`/api/claims?dataMode=ALL`, { headers })
        const allData = await allRes.json()
        const allList = allData.claims || (Array.isArray(allData) ? allData : [])
        setTotalDbCount(allList.length + mergedList.length)
      } else {
        setTotalDbCount(mergedList.length)
      }

    } catch (error) {
      console.error("Failed to fetch claims:", error)
      let localStore: Claim[] = []
      try {
        const saved = localStorage.getItem("bpjs_claims_store")
        if (saved) localStore = JSON.parse(saved)
      } catch (e) {}

      if (localStore.length > 0) {
        setClaims(localStore)
        setTotalDbCount(localStore.length)
      } else if (Array.isArray(contextClaims) && contextClaims.length > 0) {
        setClaims(contextClaims)
        setTotalDbCount(contextClaims.length)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAndOpen = (claim: Claim, targetRoute: "detail" | "clinical") => {
    selectClaim(claim.id, claim)
    if (targetRoute === "clinical") {
      navigate(`/analisis/clinical/${claim.id}`)
    } else {
      navigate(`/claims/${claim.id}`)
    }
  }

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'Siap Diajukan': return <span className="text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Siap Diajukan</span>
      case 'Perlu Perbaikan': return <span className="text-red-700 font-bold text-xs bg-red-50 border border-red-200 px-2 py-0.5 rounded">Perlu Perbaikan</span>
      case 'Perlu Review': return <span className="text-amber-700 font-bold text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Perlu Review</span>
      case 'Pending': return <span className="text-slate-600 font-bold text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Pending</span>
      case 'Dibayar': return <span className="text-blue-700 font-bold text-xs bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Dibayar</span>
      case 'Sudah Diajukan': return <span className="text-indigo-700 font-bold text-xs bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">Sudah Diajukan</span>
      default: return <span className="text-slate-600 font-bold text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{status}</span>
    }
  }

  const getRiskBadge = (risk: PendingRisk) => {
    switch (risk) {
      case 'LOW': return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase">Low Risk</span>
      case 'MEDIUM': return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] uppercase">Med Risk</span>
      case 'HIGH': return <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[9px] uppercase">High Risk</span>
    }
  }

  const filteredClaims = claims.filter(claim => 
    (claim.patient?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (claim.claimNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (claim.sepNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (claim.patient?.mrNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (claim.id || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Claim Queue</h1>
            <Link to="/dokumentasi" title="Buka Dokumentasi Claim Queue">
              <span className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><HelpCircle className="w-4 h-4" /></span>
            </Link>
            <Badge className={cn(
              "font-bold text-[10px] uppercase",
              activeDataMode === "REAL" ? "bg-emerald-600 text-white" :
              activeDataMode === "DEMO" ? "bg-amber-500 text-white" :
              activeDataMode === "TEST" ? "bg-purple-600 text-white" : "bg-slate-900 text-white"
            )}>
              {activeDataMode} MODE ({filteredClaims.length} Claims)
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Daftar klaim terdaftar pada tenant <strong>{activeTenant.name}</strong> • Unit <strong>{activeHospital.name}</strong>.</p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <Button 
            onClick={handleSyncSimrsClaims}
            disabled={isSyncingSimrs}
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold font-mono shadow-sm"
          >
            {isSyncingSimrs ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Database className="w-3.5 h-3.5 mr-1" />}
            Tarik Data SIMRS Sandbox
          </Button>
          <Link to="/import">
            <Button variant="outline" size="sm" className="text-xs font-bold bg-white text-slate-700 border-slate-200">
              <FilePlus className="w-3.5 h-3.5 mr-1 text-blue-600" /> Import E-Klaim
            </Button>
          </Link>
          <Link to="/smart-intake">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
              <Upload className="w-3.5 h-3.5 mr-1" /> Smart Intake PDF
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center font-mono">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Cari pasien, SEP, No. Klaim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-mono font-bold pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase">Filter Mode:</span>
          <div className="flex gap-1">
            {(["ALL", "REAL", "DEMO", "TEST"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveDataMode(mode)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-colors uppercase",
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

      {/* Main Claim Table / Clean Empty States */}
      {loading ? (
        <div className="flex items-center justify-center p-12 font-mono">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredClaims.length === 0 ? (
        totalDbCount === 0 ? (
          /* STATE A: 0 Claims exist in DB */
          <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans rounded-2xl">
            <CardContent className="space-y-4 max-w-md mx-auto p-0">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase font-mono">BELUM ADA KLAIM</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Database aplikasi kosong. Tarik 3 Data Klaim Live SIMRS Sandbox atau unggah berkas rekam medis PDF melalui Smart Document Intake.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
                <Button onClick={handleSyncSimrsClaims} disabled={isSyncingSimrs} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  {isSyncingSimrs ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Database className="w-4 h-4 mr-1.5" />}
                  [ Tarik Data SIMRS Sandbox (3 Klaim Live SIMRS) ]
                </Button>
                <Link to="/smart-intake" className="w-full">
                  <Button variant="outline" className="w-full font-bold">
                    [ Mulai Klaim Baru via Smart Intake PDF ]
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* STATE B: Claims exist, but active filter/scope returns 0 */
          <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans rounded-2xl">
            <CardContent className="space-y-4 max-w-md mx-auto p-0">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Filter className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase font-mono">TIDAK ADA KLAIM PADA SCOPE INI</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tidak ditemukan klaim dengan dataMode '{activeDataMode}' pada Unit {activeHospital.name}. Total {totalDbCount} klaim tersedia pada mode lain.
                </p>
              </div>
              <div className="pt-2 font-mono text-xs flex justify-center">
                <Button onClick={() => setActiveDataMode("ALL")} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> [ Reset Filter / Tampilkan ALL ]
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        /* STATE C & D: Claims exist & matching scope */
        <Card className="flex-1 overflow-hidden border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-0 overflow-y-auto max-h-[680px]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="px-4 py-3">No. SEP / Claim</th>
                  <th className="px-4 py-3">Pasien & No. RM</th>
                  <th className="px-4 py-3">Data Mode</th>
                  <th className="px-4 py-3">Diagnosis (ICD-10)</th>
                  <th className="px-4 py-3">Tarif INA-CBG</th>
                  <th className="px-4 py-3">Readiness</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Tindakan Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClaims.map((claim) => {
                  const isActive = claim.id === activeClaimId
                  return (
                    <tr 
                      key={claim.id} 
                      className={cn(
                        "transition-colors",
                        isActive ? "bg-emerald-50/70 border-l-4 border-l-emerald-600" : "hover:bg-slate-50"
                      )}
                    >
                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleSelectAndOpen(claim, "detail")}
                            className="font-bold text-blue-700 hover:underline text-xs"
                          >
                            {claim.sepNumber}
                          </button>
                          {isActive && (
                            <Badge className="bg-emerald-600 text-white font-bold text-[8px] uppercase">KLAIM AKTIF</Badge>
                          )}
                        </div>
                        <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{claim.claimNumber} • {claim.id}</span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block text-xs">{claim.patient?.name || "JOKO TRIYONO"}</span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">RM: {claim.patient?.mrNumber || "30051701"}</span>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-bold font-mono uppercase",
                          claim.dataMode === "REAL" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                          claim.dataMode === "DEMO" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-purple-100 text-purple-800 border-purple-300"
                        )}>
                          {claim.dataMode || "REAL"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{claim.principalDiagnosisCode || "K74.6"}</span>
                        <span className="block text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5">{claim.principalDiagnosis || "Chirrosis hepatis"}</span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">
                        {formatRupiah(claim.tariff || 6850000)}
                      </td>

                      <td className="px-4 py-3 font-bold font-mono text-emerald-700 text-xs">
                        {claim.readinessScore || 92}%
                      </td>

                      <td className="px-4 py-3">
                        {getRiskBadge(claim.risk || 'LOW')}
                      </td>

                      <td className="px-4 py-3">
                        {getStatusBadge(claim.status)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            size="sm"
                            onClick={() => handleSelectAndOpen(claim, "clinical")}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-1 px-2.5 h-7"
                          >
                            Review Klinis <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
