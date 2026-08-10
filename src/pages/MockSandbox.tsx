import { useState, useEffect } from "react"
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Activity, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Plus, 
  WifiOff, 
  RefreshCw, 
  Database, 
  Sliders, 
  Terminal, 
  ChevronRight, 
  Copy,
  Server,
  Layers,
  ArrowRight,
  Shield,
  FileText
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { cn, formatRupiah } from "../lib/utils"
import { Claim } from "../types"

export interface ExecutionLogItem {
  executionId: string;
  requestId: string;
  tenantId: string;
  hospitalId: string;
  adapterId: string;
  operation: string;
  environment: string;
  isMock: boolean;
  status: string;
  statusCode: number;
  durationMs: number;
  requestPayload: any;
  responsePayload: any;
  errorMessage?: string;
  createdAt: string;
}

export default function MockSandbox() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [selectedClaimId, setSelectedClaimId] = useState<string>("")
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  
  const [environment, setEnvironment] = useState<string>("MOCK")
  const [simulatorMode, setSimulatorMode] = useState<string>("SUCCESS")
  const [isOffline, setIsOffline] = useState<boolean>(false)
  const [isExecuting, setIsExecuting] = useState<boolean>(false)
  
  const [executions, setExecutions] = useState<ExecutionLogItem[]>([])
  const [selectedExecution, setSelectedExecution] = useState<ExecutionLogItem | null>(null)
  
  const [activeTab, setActiveTab] = useState<"diagram" | "adapters" | "workflow" | "console">("workflow")
  const [nodeDetails, setNodeDetails] = useState<{ title: string; content: any } | null>(null)

  // Workflow steps progress state
  const [workflowSteps, setWorkflowSteps] = useState([
    { id: "claim", name: "Claim Selection", status: "IDLE" },
    { id: "hub", name: "Integration Hub Routing", status: "IDLE" },
    { id: "diagnosis", name: "Diagnosis Submission", status: "IDLE" },
    { id: "procedure", name: "Procedure Submission", status: "IDLE" },
    { id: "grouper", name: "INA-CBG Grouping Engine", status: "IDLE" },
    { id: "eklaim_res", name: "Mock E-Klaim Response", status: "IDLE" },
    { id: "vclaim_sep", name: "VClaim SEP Verification", status: "IDLE" },
    { id: "bpjs_res", name: "Mock BPJS Response Engine", status: "IDLE" },
    { id: "recon", name: "Claim Reconciliation", status: "IDLE" }
  ])

  useEffect(() => {
    fetchClaims()
    fetchExecutions()
  }, [])

  const fetchClaims = async () => {
    try {
      const res = await fetch("/api/claims?dataMode=ALL")
      const data = await res.json()
      if (data.claims && data.claims.length > 0) {
        setClaims(data.claims)
        setSelectedClaimId(data.claims[0].id)
        setSelectedClaim(data.claims[0])
      } else {
        // Auto-create a synthetic claim so Mock Sandbox is ready out of the box
        await createAndSetSyntheticClaim()
      }
    } catch (e) {
      console.error("Failed to fetch claims:", e)
    }
  }

  const createAndSetSyntheticClaim = async (): Promise<Claim> => {
    try {
      const res = await fetch("/api/test-claim/create", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "usr-admin-001"
        }
      })
      const data = await res.json()
      if (res.ok && data.claim) {
        setClaims(prev => [data.claim, ...prev])
        setSelectedClaimId(data.claim.id)
        setSelectedClaim(data.claim)
        return data.claim
      }
    } catch (e) {
      console.error("Failed to auto-create synthetic claim via API:", e)
    }

    // Always fallback to a guaranteed in-memory test claim object
    const timestamp = Date.now();
    const fallbackClaim: Claim = {
      id: `TEST-CLAIM-${timestamp}`,
      claimNumber: `K-TEST-${timestamp}`,
      sepNumber: `MOCK-SEP-${timestamp}`,
      patientId: `PAT-TEST-${timestamp}`,
      patient: {
        id: `PAT-TEST-${timestamp}`,
        name: "SYNTHETIC PATIENT A",
        mrNumber: `RM-TEST-${timestamp.toString().slice(-6)}`,
        gender: "L",
        dob: "1988-05-12"
      },
      serviceDate: new Date().toISOString().split("T")[0],
      dischargeDate: new Date().toISOString().split("T")[0],
      principalDiagnosis: "Pneumonia, unspecified",
      principalDiagnosisCode: "J18.9",
      secondaryDiagnoses: ["E11.9"],
      procedures: ["89.52"],
      cbgCode: "J-4-16-II",
      cbgDescription: "Pneumonia Sedang/Berat",
      severity: 2,
      tariff: 5420000,
      readinessScore: 92,
      risk: "LOW",
      status: "Siap Diajukan",
      doctorName: "dr. Synthetic DPJP, Sp.PD",
      unit: "Rawat Inap",
      coderName: "Synthetic Test Coder",
      dataMode: "TEST",
      sourceType: "MANUAL",
      hospitalId: "hospital-jkt",
      tenantId: "tenant-pt-health"
    };

    setClaims(prev => [fallbackClaim, ...prev])
    setSelectedClaimId(fallbackClaim.id)
    setSelectedClaim(fallbackClaim)
    return fallbackClaim
  }

  const fetchExecutions = async () => {
    try {
      const res = await fetch("/api/integration/executions", {
        headers: { "X-User-Id": "usr-admin-001" }
      })
      const data = await res.json()
      if (data.executions) {
        setExecutions(data.executions)
      }
    } catch (e) {
      console.error("Failed to fetch execution logs:", e)
    }
  }

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaimId(claimId)
    const found = claims.find(c => c.id === claimId) || null
    setSelectedClaim(found)
  }

  const handleCreateSyntheticClaim = async () => {
    const claim = await createAndSetSyntheticClaim()
    if (claim) {
      alert("Synthetic Test Claim berhasil dibuat: " + claim.id)
    }
  }

  const setSimulatorFailureMode = async (mode: string) => {
    setSimulatorMode(mode)
    try {
      await fetch("/api/integration/mock/simulate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": "usr-admin-001" 
        },
        body: JSON.stringify({ mode })
      })
    } catch (e) {
      console.error("Failed to set simulator mode:", e)
    }
  }

  const handleExecuteOperation = async (adapterId: string, operation: string, customPayload?: any) => {
    setIsExecuting(true)
    try {
      const reqPayload = customPayload || {
        claimId: selectedClaim?.id || "NO-CLAIM",
        sepNumber: selectedClaim?.sepNumber || "MOCK-SEP-001",
        principalDiagnosisCode: selectedClaim?.principalDiagnosisCode || "J18.9",
        procedures: selectedClaim?.procedures || ["89.52"],
        dataMode: selectedClaim?.dataMode || "TEST"
      }

      const res = await fetch("/api/integration/execute", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": "usr-admin-001" 
        },
        body: JSON.stringify({
          adapterId,
          operation,
          payload: reqPayload
        })
      })

      const data = await res.json()
      await fetchExecutions()
      return data
    } catch (e: any) {
      console.error("Execution error:", e)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleRunFullWorkflow = async () => {
    let activeTarget = selectedClaim;
    if (!activeTarget) {
      activeTarget = await createAndSetSyntheticClaim();
    }

    if (!activeTarget) {
      alert("Gagal menginisialisasi klaim untuk pengujian workflow.");
      return;
    }

    setIsExecuting(true)
    const resetSteps = workflowSteps.map(s => ({ ...s, status: "PROCESSING" }))
    setWorkflowSteps(resetSteps)

    const updateStep = (id: string, status: "SUCCESS" | "FAIL") => {
      setWorkflowSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    }

    try {
      // Step 1: Claim Selection
      updateStep("claim", "SUCCESS")
      await new Promise(r => setTimeout(r, 200))

      // Step 2: Hub Routing
      updateStep("hub", "SUCCESS")
      await new Promise(r => setTimeout(r, 200))

      // Step 3: Diagnosis
      await handleExecuteOperation("mock-eklaim", "diagnosis", {
        claimId: activeTarget.id,
        sepNumber: activeTarget.sepNumber,
        principalDiagnosisCode: activeTarget.principalDiagnosisCode
      })
      updateStep("diagnosis", "SUCCESS")

      // Step 4: Procedure
      await handleExecuteOperation("mock-eklaim", "procedure", {
        claimId: activeTarget.id,
        procedures: activeTarget.procedures
      })
      updateStep("procedure", "SUCCESS")

      // Step 5: Grouping
      const groupRes = await handleExecuteOperation("mock-eklaim", "grouping", {
        claimId: activeTarget.id,
        principalDiagnosisCode: activeTarget.principalDiagnosisCode,
        procedures: activeTarget.procedures,
        severity: activeTarget.severity
      })
      updateStep("grouper", "SUCCESS")
      updateStep("eklaim_res", "SUCCESS")

      // Step 6: VClaim SEP & BPJS Response
      await handleExecuteOperation("mock-vclaim", "SEP", {
        claimId: activeTarget.id,
        cardNo: "1234567890"
      })
      updateStep("vclaim_sep", "SUCCESS")
      updateStep("bpjs_res", "SUCCESS")

      // Step 7: Reconciliation
      updateStep("recon", "SUCCESS")

      await fetchExecutions()
    } catch (e) {
      console.error("Workflow error:", e)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleIdempotencyTest = async () => {
    if (!selectedClaim) return
    setIsExecuting(true)
    try {
      const payload = {
        adapterId: "mock-eklaim",
        operation: "diagnosis",
        payload: { claimId: selectedClaim.id, code: selectedClaim.principalDiagnosisCode }
      }
      
      const res1 = await fetch("/api/integration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data1 = await res1.json()

      const res2 = await fetch("/api/integration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data2 = await res2.json()

      await fetchExecutions()

      alert(`Req 1 Status: ${data1.canonicalResponse?.status}\nReq 2 Message: ${data2.canonicalResponse?.message || "DUPLICATE_PREVENTED"}`)
    } catch (e: any) {
      alert("Idempotency test error: " + e.message)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Branding Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">BPJS Optimizer</h1>
            <Badge className="bg-amber-500 text-white font-bold text-[10px]">MOCK / SIMULATION</Badge>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">MOCK CONNECTED</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Integration Hub — Mock Integration Sandbox Console</p>
        </div>

        {/* Environment & Quick Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <span className="font-bold text-slate-500 px-2 uppercase text-[10px]">Env:</span>
            <button 
              onClick={() => setEnvironment("MOCK")} 
              className={cn("px-2.5 py-1 font-bold rounded text-xs", environment === "MOCK" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              MOCK
            </button>
            <button 
              onClick={() => setEnvironment("TEST")} 
              className={cn("px-2.5 py-1 font-bold rounded text-xs", environment === "TEST" ? "bg-purple-600 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              TEST
            </button>
            <button 
              onClick={() => alert("Perhatian: Lingkungan PRODUCTION melarang penggunaan mock adapter. Diperlukan kredensial resmi BPJS.")} 
              className="px-2.5 py-1 font-bold rounded text-xs text-slate-400 hover:bg-slate-100"
            >
              PRODUCTION
            </button>
          </div>

          <Button onClick={handleCreateSyntheticClaim} size="sm" variant="outline" className="text-xs font-bold border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100">
            <Plus className="w-3.5 h-3.5 mr-1 text-purple-600" /> [Create Synthetic Test Claim]
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-bold">
            Mock environment active. No actual request is sent to BPJS Health or E-Klaim production endpoints.
          </span>
        </div>
        <span className="font-mono text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold uppercase">
          MODE: SIMULATION
        </span>
      </div>

      {/* Claim Selector Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <FileText className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Target Claim:</span>
          <select 
            value={selectedClaimId} 
            onChange={(e) => handleSelectClaim(e.target.value)}
            className="w-full md:w-96 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
          >
            {claims.map(c => (
              <option key={c.id} value={c.id}>
                [{c.dataMode || "REAL"}] {c.id} — {c.patient?.name} ({c.sepNumber})
              </option>
            ))}
          </select>
        </div>

        {selectedClaim && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <Badge variant="outline" className="bg-slate-100 font-bold text-slate-700">
              ICD-10: {selectedClaim.principalDiagnosisCode}
            </Badge>
            <Badge variant="outline" className="bg-slate-100 font-bold text-slate-700">
              CBG: {selectedClaim.cbgCode || "J-4-16-II"}
            </Badge>
            <Badge className="bg-emerald-600 text-white font-bold">
              {formatRupiah(selectedClaim.tariff || 5420000)}
            </Badge>
          </div>
        )}
      </div>

      {/* Controlled Error Simulator Bar */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" /> Controlled Response Simulator
          </span>
          <span className="text-[10px] font-mono text-slate-400">Active Scenario: <strong className="text-amber-400">{simulatorMode}</strong></span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { mode: "SUCCESS", label: "Success", color: "bg-emerald-600" },
            { mode: "VALIDATION_ERROR", label: "Validation Error", color: "bg-amber-600" },
            { mode: "AUTH_ERROR", label: "Auth Error", color: "bg-red-600" },
            { mode: "TIMEOUT", label: "Timeout (5s)", color: "bg-purple-600" },
            { mode: "NETWORK_ERROR", label: "Network Error", color: "bg-indigo-600" },
            { mode: "RATE_LIMIT", label: "Rate Limit (429)", color: "bg-pink-600" },
            { mode: "SERVER_ERROR", label: "Server Error (500)", color: "bg-rose-700" }
          ].map(item => (
            <button
              key={item.mode}
              onClick={() => setSimulatorFailureMode(item.mode)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-bold transition-all",
                simulatorMode === item.mode ? `${item.color} text-white shadow-md font-extrabold` : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
            >
              {item.label}
            </button>
          ))}
          <button 
            onClick={() => setIsOffline(!isOffline)} 
            className={cn("px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1", isOffline ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")}
          >
            <WifiOff className="w-3 h-3" /> {isOffline ? "[Offline Simulated]" : "[Simulate Offline]"}
          </button>
          <button 
            onClick={handleIdempotencyTest} 
            className="px-2.5 py-1 rounded text-xs font-bold bg-slate-800 text-blue-400 hover:bg-slate-700"
          >
            [Run Same Request Twice]
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
        <button 
          onClick={() => setActiveTab("workflow")}
          className={cn("pb-2 border-b-2 transition-colors uppercase tracking-wider", activeTab === "workflow" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          End-to-End Workflow Console
        </button>
        <button 
          onClick={() => setActiveTab("diagram")}
          className={cn("pb-2 border-b-2 transition-colors uppercase tracking-wider", activeTab === "diagram" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          Interactive Architecture Diagram
        </button>
        <button 
          onClick={() => setActiveTab("adapters")}
          className={cn("pb-2 border-b-2 transition-colors uppercase tracking-wider", activeTab === "adapters" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          Adapter Capabilities Console
        </button>
        <button 
          onClick={() => setActiveTab("console")}
          className={cn("pb-2 border-b-2 transition-colors uppercase tracking-wider", activeTab === "console" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          Mock Transaction Audit Log ({executions.length})
        </button>
      </div>

      {/* TAB 1: END-TO-END WORKFLOW CONSOLE */}
      {activeTab === "workflow" && (
        <div className="space-y-6">
          <Card className="border border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">End-to-End Mock Claim Pipeline Execution</CardTitle>
                <CardDescription className="text-xs text-slate-500">Eksekusi klaim terpilih secara berurutan melalui IntegrationHub dan Mock Adapters.</CardDescription>
              </div>
              <Button 
                onClick={handleRunFullWorkflow} 
                disabled={isExecuting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                [Run Full Mock Claim Workflow]
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-2 text-center font-mono">
                {workflowSteps.map((step, idx) => (
                  <div key={step.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step 0{idx + 1}</div>
                    <div className="text-xs font-bold text-slate-800">{step.name}</div>
                    <div>
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase",
                        step.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800" :
                        step.status === "PROCESSING" ? "bg-amber-100 text-amber-800 animate-pulse" :
                        step.status === "FAIL" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-600"
                      )}>
                        {step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Result Banner */}
          <Card className="border border-emerald-200 bg-emerald-50/40 p-6 text-xs text-emerald-950 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="font-bold uppercase text-sm">SIMULATED INA-CBG & BPJS VCLAIM RESULT</span>
              </div>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 font-mono font-bold">
                MOCK_GROUPER
              </Badge>
            </div>

            <div className="grid md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-emerald-200 font-mono">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">CBG Code</span>
                <p className="text-sm font-bold text-slate-800">J-4-16-II</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi CBG</span>
                <p className="text-sm font-bold text-slate-800">PNEUMONIA SEDANG/BERAT</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Severity Level</span>
                <p className="text-sm font-bold text-amber-600">Level 2 (Sedang)</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Simulated Tariff</span>
                <p className="text-sm font-bold text-emerald-700">Rp 5.420.000</p>
              </div>
            </div>

            <p className="text-[11px] font-bold text-amber-800 italic">
              ⚠ NOT AN OFFICIAL INA-CBG RESULT. Hasil merupakan simulasi dari Mock INA-CBG Grouper Engine untuk pengujian integrasi.
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: INTERACTIVE ARCHITECTURE DIAGRAM */}
      {activeTab === "diagram" && (
        <Card className="border border-slate-200 p-8 text-center space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-800 uppercase">Interactive Mock Integration Architecture</h3>
            <p className="text-xs text-slate-500 mt-1">Klik node komponen di bawah untuk memeriksa status runtime dan detail konfigurasi adapter.</p>
          </div>

          <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto font-mono">
            {/* Top Node */}
            <button 
              onClick={() => setNodeDetails({ title: "BPJS OPTIMIZER BUSINESS LOGIC", content: { role: "Caller", status: "READY", dataMode: selectedClaim?.dataMode || "TEST" } })}
              className="p-4 bg-slate-900 text-white rounded-xl shadow-md w-72 hover:ring-2 hover:ring-blue-500 transition-all"
            >
              <div className="text-xs font-bold uppercase">BPJS OPTIMIZER LOGIC</div>
              <div className="text-[10px] text-slate-400 mt-1">Target Claim: {selectedClaim?.id || "None"}</div>
            </button>

            <ChevronRight className="w-6 h-6 text-slate-400 rotate-90" />

            {/* Hub Node */}
            <button 
              onClick={() => setNodeDetails({ title: "INTEGRATION HUB", content: { role: "Central Orchestrator", status: "READY", retryEngine: "ACTIVE (Max 2)", idempotencyHash: "SHA-256" } })}
              className="p-4 bg-blue-600 text-white rounded-xl shadow-md w-80 hover:ring-2 hover:ring-blue-400 transition-all"
            >
              <div className="text-xs font-bold uppercase">INTEGRATION HUB</div>
              <div className="text-[10px] text-blue-100 mt-1">Orchestration • Retry • Idempotency • Audit</div>
            </button>

            <div className="grid grid-cols-3 gap-6 w-full pt-2">
              {/* SIMRS Node */}
              <button 
                onClick={() => setNodeDetails({ title: "SIMRS ADAPTER", content: { adapterId: "simrs", environment: "MOCK", capabilities: ["Patient", "Encounter", "REST", "FHIR"] } })}
                className="p-4 bg-white border border-slate-300 rounded-xl shadow-sm hover:border-blue-500 transition-all text-left space-y-1"
              >
                <div className="text-xs font-bold text-slate-800">SIMRS ADAPTER</div>
                <Badge className="bg-slate-200 text-slate-700 text-[9px]">MOCK READY</Badge>
              </button>

              {/* Mock E-Klaim Node */}
              <button 
                onClick={() => setNodeDetails({ title: "MOCK E-KLAIM ADAPTER", content: { adapterId: "mock-eklaim", environment: "MOCK", target: "Mock INA-CBG Grouper Engine" } })}
                className="p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-sm hover:border-amber-500 transition-all text-left space-y-1"
              >
                <div className="text-xs font-bold text-amber-900">MOCK E-KLAIM</div>
                <Badge className="bg-amber-500 text-white text-[9px]">MOCK READY</Badge>
              </button>

              {/* Mock VClaim Node */}
              <button 
                onClick={() => setNodeDetails({ title: "MOCK VCLAIM ADAPTER", content: { adapterId: "mock-vclaim", environment: "MOCK", target: "Mock BPJS Response Engine" } })}
                className="p-4 bg-purple-50 border border-purple-300 rounded-xl shadow-sm hover:border-purple-500 transition-all text-left space-y-1"
              >
                <div className="text-xs font-bold text-purple-900">MOCK VCLAIM</div>
                <Badge className="bg-purple-600 text-white text-[9px]">MOCK READY</Badge>
              </button>
            </div>
          </div>

          {nodeDetails && (
            <Card className="border border-blue-200 bg-blue-50/50 p-4 text-left max-w-xl mx-auto text-xs font-mono">
              <div className="font-bold text-blue-900 uppercase mb-2">{nodeDetails.title}</div>
              <pre className="p-2 bg-slate-900 text-emerald-400 rounded overflow-x-auto text-[11px]">
                {JSON.stringify(nodeDetails.content, null, 2)}
              </pre>
            </Card>
          )}
        </Card>
      )}

      {/* TAB 3: ADAPTER CAPABILITIES CONSOLE */}
      {activeTab === "adapters" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mock E-Klaim Card */}
          <Card className="border border-amber-200">
            <CardHeader className="border-b border-amber-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-amber-900">MOCK E-KLAIM ADAPTER</CardTitle>
                <Badge className="bg-amber-500 text-white text-[10px]">MOCK READY</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-500">Mendukung koneksi, submit diagnosis, tindakan, grouping INA-CBG, retrieve & update klaim.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => handleExecuteOperation("mock-eklaim", "connection")} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
                  [Test Connection]
                </Button>
                <Button size="sm" onClick={() => handleExecuteOperation("mock-eklaim", "diagnosis")} variant="outline" className="text-xs font-bold">
                  [Test Diagnosis]
                </Button>
                <Button size="sm" onClick={() => handleExecuteOperation("mock-eklaim", "procedure")} variant="outline" className="text-xs font-bold">
                  [Test Procedure]
                </Button>
                <Button size="sm" onClick={() => handleExecuteOperation("mock-eklaim", "grouping")} variant="outline" className="text-xs font-bold">
                  [Test Grouping]
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mock VClaim Card */}
          <Card className="border border-purple-200">
            <CardHeader className="border-b border-purple-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-purple-900">MOCK VCLAIM ADAPTER</CardTitle>
                <Badge className="bg-purple-600 text-white text-[10px]">MOCK READY</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-500">Mendukung verifikasi kepesertaan, pembuatan SEP, dan simulasi HMAC signature.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => handleExecuteOperation("mock-vclaim", "connection")} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
                  [Test Connection]
                </Button>
                <Button size="sm" onClick={() => handleExecuteOperation("mock-vclaim", "eligibility")} variant="outline" className="text-xs font-bold">
                  [Test Eligibility]
                </Button>
                <Button size="sm" onClick={() => handleExecuteOperation("mock-vclaim", "SEP")} variant="outline" className="text-xs font-bold">
                  [Test SEP]
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: MOCK TRANSACTION AUDIT LOG */}
      {activeTab === "console" && (
        <Card className="border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-bold uppercase text-slate-800">Mock Transaction Audit Log (SQLite DB)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Adapter</th>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Env</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Inspeksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {executions.map((ex) => (
                  <tr key={ex.executionId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{new Date(ex.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{ex.requestId}</td>
                    <td className="px-4 py-3 text-slate-800">{ex.adapterId}</td>
                    <td className="px-4 py-3 text-blue-600 font-bold">{ex.operation}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 font-bold">
                        {ex.environment}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", ex.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ex.durationMs} ms</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedExecution(ex)} className="text-blue-600 font-bold hover:underline">
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Inspector Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 font-mono text-xs max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase text-slate-900">Request Inspector ({selectedExecution.requestId})</h3>
              <button onClick={() => setSelectedExecution(null)} className="text-slate-500 hover:text-slate-800 font-bold">✕ Close</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div><span className="font-bold text-slate-500">Adapter:</span> {selectedExecution.adapterId}</div>
              <div><span className="font-bold text-slate-500">Operation:</span> {selectedExecution.operation}</div>
              <div><span className="font-bold text-slate-500">Environment:</span> {selectedExecution.environment}</div>
              <div><span className="font-bold text-slate-500">Latency:</span> {selectedExecution.durationMs} ms</div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">Request Payload:</span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded overflow-x-auto text-[11px]">
                {JSON.stringify(selectedExecution.requestPayload, null, 2)}
              </pre>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">Response Payload:</span>
              <pre className="p-3 bg-slate-900 text-blue-400 rounded overflow-x-auto text-[11px]">
                {JSON.stringify(selectedExecution.responsePayload, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
