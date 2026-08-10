import { useState, useEffect } from "react"
import { 
  Activity, 
  CheckCircle, 
  RefreshCcw,
  Server,
  Cloud,
  Database,
  XCircle,
  Play,
  ShieldCheck,
  Key,
  Globe,
  Clock,
  History,
  Lock,
  Layers,
  Check,
  AlertTriangle,
  FileText,
  RotateCcw,
  Sliders,
  Cpu,
  Radio
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { cn } from "../lib/utils"

const defaultAdapters = [
  {
    adapterId: "eklaim",
    name: "E-Klaim INA-CBG Adapter",
    provider: "Kementerian Kesehatan RI",
    environment: "MOCK",
    status: "MOCK_CONNECTED",
    isMockAdapter: true,
    capabilities: ["Grouping INA-CBG", "Severity Qualifier", "Tariff Calculation", "Claim Finalization"]
  },
  {
    adapterId: "vclaim",
    name: "BPJS VClaim Adapter",
    provider: "BPJS Kesehatan",
    environment: "MOCK",
    status: "MOCK_CONNECTED",
    isMockAdapter: true,
    capabilities: ["Cek Kepesertaan", "Generate SEP", "Rujukan Faskes", "Monitoring Klaim"]
  },
  {
    adapterId: "simrs",
    name: "SIMRS / HIS Connector",
    provider: "Internal Hospital System",
    environment: "MOCK",
    status: "MOCK_CONNECTED",
    isMockAdapter: true,
    capabilities: ["Patient Record Intake", "Encounter Data", "Billing Record Sync", "Medical Resume Extraction"]
  }
]

export default function Integration() {
  const [healthMap, setHealthMap] = useState<Record<string, any>>({})
  const [adapters, setAdapters] = useState<any[]>(defaultAdapters)
  const [executions, setExecutions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"adapters" | "simulator" | "logs">("adapters")
  
  // Selected adapter for testing / config modal
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>("eklaim")
  const [environmentMap, setEnvironmentMap] = useState<Record<string, "MOCK" | "TEST" | "PRODUCTION">>({
    eklaim: "MOCK",
    vclaim: "MOCK",
    simrs: "MOCK"
  })

  const [baseUrlInput, setBaseUrlInput] = useState("https://mock.sandbox.local")
  const [authKeyInput, setAuthKeyInput] = useState("MOCK_SECRET_KEY")
  const [consIdInput, setConsIdInput] = useState("MOCK_CONS_ID")

  const [testingAdapterId, setTestingAdapterId] = useState<string | null>(null)
  const [operationResults, setOperationResults] = useState<Record<string, any>>({})
  const [activeSimulationMode, setActiveSimulationMode] = useState<string>("SUCCESS")

  useEffect(() => {
    fetchHubData()
  }, [])

  const fetchHubData = async () => {
    try {
      const headers = { "X-User-Id": "usr-admin-001" }

      // 1. Fetch Registered Adapters
      const adRes = await fetch("/api/integration/adapters", { headers })
      const adData = await adRes.json()
      if (adData.adapters && adData.adapters.length > 0) {
        setAdapters(adData.adapters)
      } else {
        setAdapters(defaultAdapters)
      }

      // 2. Fetch Central Health Matrix
      const hRes = await fetch("/api/integration/health", { headers })
      const hData = await hRes.json()
      if (hData.health) setHealthMap(hData.health)

      // 3. Fetch Execution Audit Logs
      const exRes = await fetch("/api/integration/executions", { headers })
      const exData = await exRes.json()
      if (exData.executions) setExecutions(exData.executions)

    } catch (error) {
      console.error("Failed to load Integration Hub data:", error)
      setAdapters(defaultAdapters)
    }
  }

  const handleEnvChange = async (adapterId: string, newEnv: "MOCK" | "TEST" | "PRODUCTION") => {
    setEnvironmentMap(prev => ({ ...prev, [adapterId]: newEnv }))
    
    // Update server side configuration
    try {
      await fetch("/api/integration/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId,
          baseUrl: newEnv === "MOCK" ? `https://mock.${adapterId}.sandbox.local` : "https://api.hospital.go.id",
          environment: newEnv,
          credentials: newEnv === "MOCK" ? { mockKey: "MOCK_SECRET_KEY" } : {}
        })
      })
      fetchHubData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleTestConnection = async (adapterId: string) => {
    setTestingAdapterId(adapterId)
    try {
      const response = await fetch("/api/integration/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId,
          environment: environmentMap[adapterId] || "MOCK"
        })
      })

      const data = await response.json()
      setOperationResults(prev => ({ ...prev, [adapterId]: data }))
      fetchHubData()
    } catch (error: any) {
      setOperationResults(prev => ({
        ...prev,
        [adapterId]: { success: false, status: "ERROR", message: error.message || "Network error" }
      }))
    } finally {
      setTestingAdapterId(null)
    }
  }

  const handleExecuteOperation = async (adapterId: string, operation: string, payload?: any) => {
    setTestingAdapterId(`${adapterId}-${operation}`)
    try {
      const response = await fetch("/api/integration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId,
          operation,
          payload: payload || {
            principalDiagnosisCode: "J18.9",
            patientName: "Patient A (Synthetic Valid)",
            cardNumber: "MOCK-ELIGIBLE-001",
            procedures: ["89.52"],
            severity: 2
          }
        })
      })

      const data = await response.json()
      setOperationResults(prev => ({ ...prev, [`${adapterId}-${operation}`]: data }))
      fetchHubData()
    } catch (error: any) {
      setOperationResults(prev => ({
        ...prev,
        [`${adapterId}-${operation}`]: { success: false, status: "ERROR", message: error.message }
      }))
    } finally {
      setTestingAdapterId(null)
    }
  }

  const handleSetSimulationMode = async (mode: string) => {
    setActiveSimulationMode(mode)
    try {
      await fetch("/api/integration/mock/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterId: "mock-eklaim", mode })
      })
      await fetch("/api/integration/mock/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterId: "mock-vclaim", mode })
      })
      alert(`Simulation Mode diset ke: ${mode}`)
    } catch (e: any) {
      alert("Gagal menset simulation mode: " + e.message)
    }
  }

  const getStatusBadge = (status: string, env: string) => {
    if (status === "MOCK_CONNECTED" || status === "MOCK_SIMULATION" || env === "MOCK") {
      return (
        <span className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-900 px-2.5 py-1 rounded font-bold uppercase tracking-wider border border-purple-200">
          <Cpu className="w-3.5 h-3.5 text-purple-600" /> MOCK CONNECTED
        </span>
      )
    }
    switch (status) {
      case "CONNECTED":
        return <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-bold uppercase"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> CONNECTED</span>
      case "CONFIGURED":
        return <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 px-2.5 py-1 rounded font-bold uppercase"><CheckCircle className="w-3.5 h-3.5 text-blue-600" /> CONFIGURED</span>
      case "DEGRADED":
        return <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2.5 py-1 rounded font-bold uppercase"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> DEGRADED</span>
      case "ERROR":
        return <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 px-2.5 py-1 rounded font-bold uppercase"><XCircle className="w-3.5 h-3.5 text-red-600" /> ERROR</span>
      default:
        return <span className="flex items-center gap-1 text-[10px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold uppercase"><Lock className="w-3.5 h-3.5 text-slate-500" /> NOT CONFIGURED</span>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Integration Hub</h1>
            <Badge className="bg-purple-600 text-white font-bold text-[10px]">MOCK SANDBOX ACTIVE</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Central orchestration layer & controlled integration sandbox for SIMRS, E-Klaim INA-CBG & BPJS VClaim.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchHubData} className="text-xs font-bold">
            <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Refresh Status Hub
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1 w-fit">
        <button 
          onClick={() => setActiveTab("adapters")}
          className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5", activeTab === "adapters" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          <Layers className="w-4 h-4" /> Adapters & Environment ({adapters.length})
        </button>
        <button 
          onClick={() => setActiveTab("simulator")}
          className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5", activeTab === "simulator" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          <Sliders className="w-4 h-4 text-purple-400" /> Failure Simulator Control Panel
        </button>
        <button 
          onClick={() => setActiveTab("logs")}
          className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5", activeTab === "logs" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          <History className="w-4 h-4" /> Mock Transaction Console ({executions.length})
        </button>
      </div>

      {activeTab === "adapters" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {adapters.map((adapter) => {
              const env = environmentMap[adapter.adapterId] || adapter.environment || "MOCK"
              const health = healthMap[adapter.adapterId] || { status: env === "MOCK" ? "MOCK_CONNECTED" : "NOT_CONFIGURED", latencyMs: 45 }
              const result = operationResults[adapter.adapterId]

              return (
                <Card key={adapter.adapterId} className="flex flex-col border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="bg-white border-slate-200 text-[10px] font-bold font-mono text-slate-600">
                            {adapter.adapterId.toUpperCase()}
                          </Badge>
                          {adapter.isMockAdapter && (
                            <Badge className="bg-purple-100 text-purple-800 text-[9px] font-bold">MOCK ENGINE</Badge>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-slate-800">{adapter.name}</CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-0.5">{adapter.provider}</CardDescription>
                      </div>
                      {getStatusBadge(health.status, env)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Environment Selector Switcher */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Integration Environment Selector</label>
                        <select 
                          value={env}
                          onChange={(e) => handleEnvChange(adapter.adapterId, e.target.value as any)}
                          className="w-full text-xs font-bold border-slate-200 rounded-lg p-2 bg-slate-50 font-mono text-slate-800"
                        >
                          <option value="MOCK">MOCK (Controlled Sandbox)</option>
                          <option value="TEST">TEST (Staging Test Environment)</option>
                          <option value="PRODUCTION">PRODUCTION (Live Hospital Creds)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Mode</span>
                          <span className="font-bold text-purple-700 font-mono">{env === "MOCK" ? "MOCK SIMULATION" : health.status}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Latency</span>
                          <span className="font-mono font-bold text-slate-700">{health.latencyMs || 45} ms</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Capabilities Registry</span>
                        <div className="flex flex-wrap gap-1">
                          {adapter.capabilities.map((cap: string) => (
                            <span key={cap} className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Capabilities Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Test Capability Execution</span>
                        <div className="flex flex-wrap gap-1">
                          {adapter.capabilities.map((op: string) => (
                            <Button 
                              key={op}
                              size="sm" 
                              variant="outline"
                              onClick={() => handleExecuteOperation(adapter.adapterId, op)}
                              disabled={testingAdapterId === `${adapter.adapterId}-${op}`}
                              className="text-[10px] font-bold py-1 px-2 h-auto"
                            >
                              {testingAdapterId === `${adapter.adapterId}-${op}` ? <RefreshCcw className="w-2.5 h-2.5 mr-1 animate-spin" /> : <Play className="w-2.5 h-2.5 mr-1 text-purple-600" />}
                              Test {op}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {result && (
                        <div className={`p-3 rounded-lg border text-xs ${result.success ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <p className="font-bold uppercase flex items-center justify-between">
                            <span>{result.success ? 'MOCK EXECUTION SUCCESS' : 'EXECUTION ERROR'}</span>
                            <span className="font-mono text-[10px]">{result.latencyMs}ms</span>
                          </p>
                          <p className="mt-1 font-medium text-[11px]">{result.message}</p>
                          {result.data && (
                            <pre className="mt-2 text-[10px] font-mono bg-white p-2 rounded border border-purple-100 max-h-24 overflow-y-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleTestConnection(adapter.adapterId)} 
                        disabled={testingAdapterId === adapter.adapterId}
                        className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex-1"
                      >
                        {testingAdapterId === adapter.adapterId ? <RefreshCcw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                        Test Connection ({env})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === "simulator" && (
        <Card className="border border-purple-200 bg-purple-50/20">
          <CardHeader className="border-b border-purple-100">
            <CardTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-600" /> Controlled Failure Simulator Control Panel
            </CardTitle>
            <CardDescription className="text-xs text-purple-700">
              Pilih skenario simulasi error secara deterministik untuk menguji keandalan retry engine, timeout controller, dan offline job queue IntegrationHub.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => handleSetSimulationMode("SUCCESS")}
                variant={activeSimulationMode === "SUCCESS" ? "default" : "outline"}
                className={activeSimulationMode === "SUCCESS" ? "bg-emerald-600 hover:bg-emerald-700 text-xs font-bold" : "text-xs font-bold"}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> [Simulate Success]
              </Button>
              <Button 
                onClick={() => handleSetSimulationMode("VALIDATION_ERROR")}
                variant={activeSimulationMode === "VALIDATION_ERROR" ? "default" : "outline"}
                className={activeSimulationMode === "VALIDATION_ERROR" ? "bg-amber-600 text-xs font-bold" : "text-xs font-bold"}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> [Simulate Validation Error]
              </Button>
              <Button 
                onClick={() => handleSetSimulationMode("TIMEOUT")}
                variant={activeSimulationMode === "TIMEOUT" ? "default" : "outline"}
                className={activeSimulationMode === "TIMEOUT" ? "bg-amber-600 text-xs font-bold" : "text-xs font-bold"}
              >
                <Clock className="w-3.5 h-3.5 mr-1" /> [Simulate Timeout (5000ms)]
              </Button>
              <Button 
                onClick={() => handleSetSimulationMode("NETWORK_ERROR")}
                variant={activeSimulationMode === "NETWORK_ERROR" ? "default" : "outline"}
                className={activeSimulationMode === "NETWORK_ERROR" ? "bg-red-600 text-xs font-bold" : "text-xs font-bold"}
              >
                <Radio className="w-3.5 h-3.5 mr-1" /> [Simulate Network Error]
              </Button>
              <Button 
                onClick={() => handleSetSimulationMode("AUTH_ERROR")}
                variant={activeSimulationMode === "AUTH_ERROR" ? "default" : "outline"}
                className={activeSimulationMode === "AUTH_ERROR" ? "bg-red-600 text-xs font-bold" : "text-xs font-bold"}
              >
                <Lock className="w-3.5 h-3.5 mr-1" /> [Simulate Auth Error (401)]
              </Button>
              <Button 
                onClick={() => handleSetSimulationMode("OFFLINE")}
                variant={activeSimulationMode === "OFFLINE" ? "default" : "outline"}
                className={activeSimulationMode === "OFFLINE" ? "bg-slate-800 text-xs font-bold" : "text-xs font-bold"}
              >
                <Database className="w-3.5 h-3.5 mr-1" /> [Simulate External Offline]
              </Button>
            </div>

            <div className="p-4 bg-white rounded-xl border border-purple-100 text-xs space-y-2">
              <p className="font-bold text-purple-900">Mode Simulasi Aktif: <span className="font-mono text-purple-700 uppercase bg-purple-100 px-2 py-0.5 rounded">{activeSimulationMode}</span></p>
              <p className="text-slate-600">Setiap eksekusi klaim melalui IntegrationHub akan merespons sesuai skenario yang dipilih di atas tanpa merusak logika bisnis utama.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "logs" && (
        <Card className="flex-1 overflow-hidden border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
              <span>Mock Transaction Console</span>
              <span className="text-xs font-normal text-slate-500 font-mono">Total Transaksi: {executions.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Adapter</th>
                  <th className="px-4 py-3">Operasi</th>
                  <th className="px-4 py-3">Env</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400">Belum ada transaksi di Mock Transaction Console.</td>
                  </tr>
                ) : (
                  executions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{new Date(ex.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{ex.requestId}</td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">{ex.adapterId.toUpperCase()}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{ex.operation}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[9px] font-bold font-mono bg-purple-50 text-purple-700 border-purple-200">
                          {ex.environment || "MOCK"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{ex.durationMs} ms</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", ex.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                          {ex.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
