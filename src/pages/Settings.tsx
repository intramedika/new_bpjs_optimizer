import { useState, useEffect } from "react"
import { 
  Settings as SettingsIcon, 
  Database, 
  BrainCircuit, 
  HardDrive, 
  ShieldCheck, 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  Key, 
  Lock, 
  Server, 
  Eye, 
  EyeOff,
  Sliders,
  Check
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { cn } from "../lib/utils"

export default function Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  
  // Modals state
  const [showDbModal, setShowDbModal] = useState<boolean>(false)
  const [showAiModal, setShowAiModal] = useState<boolean>(false)
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false)
  const [showStorageModal, setShowStorageModal] = useState<boolean>(false)

  // Form states
  const [dbForm, setDbForm] = useState({
    provider: "LOCAL_SQLITE",
    host: "localhost",
    port: "5432",
    dbName: "bpjs_optimizer_db",
    username: "postgres",
    password: ""
  })

  const [aiForm, setAiForm] = useState({
    provider: "AUTO",
    apiKey: "",
    model: "gemini-2.5-flash",
    temperature: "0.2"
  })

  const [ocrEngine, setOcrEngine] = useState("LOCAL")
  const [storageProvider, setStorageProvider] = useState("LOCAL_EDGE")

  // Testing & Saving states
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings")
      const data = await res.json()
      if (data.status === "success") {
        setSettings(data)
        if (data.database) {
          setDbForm(prev => ({
            ...prev,
            provider: data.database.provider || "LOCAL_SQLITE",
            host: data.database.host || "localhost",
            port: data.database.port || "5432",
            dbName: data.database.database || "bpjs_optimizer_db",
            username: data.database.username || "postgres"
          }))
        }
        if (data.ai) {
          setAiForm(prev => ({
            ...prev,
            provider: data.ai.provider || "AUTO",
            model: data.ai.geminiModel || "gemini-2.5-flash",
            temperature: data.ai.temperature?.toString() || "0.2"
          }))
        }
        if (data.ocr) setOcrEngine(data.ocr.engine || "LOCAL")
        if (data.storage) setStorageProvider(data.storage.provider || "LOCAL_EDGE")
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e)
    } finally {
      setLoading(false)
    }
  }

  // Database Connection Test
  const handleTestDatabase = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbForm)
      })
      const data = await res.json()
      setTestResult({ status: data.status, message: data.message })
    } catch (e: any) {
      setTestResult({ status: "CONNECTION_FAILED", message: e.message })
    } finally {
      setIsTesting(false)
    }
  }

  // Database Configuration Save
  const handleSaveDatabase = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings/database/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbForm)
      })
      const data = await res.json()
      if (res.ok) {
        setActionSuccess(data.message)
        setShowDbModal(false)
        await fetchSettings()
      }
    } catch (e: any) {
      alert("Gagal menyimpan konfigurasi database: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // AI Connection Test
  const handleTestAi = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiForm)
      })
      const data = await res.json()
      setTestResult({ status: data.status, message: data.message })
    } catch (e: any) {
      setTestResult({ status: "CONNECTION_FAILED", message: e.message })
    } finally {
      setIsTesting(false)
    }
  }

  // AI Configuration Save
  const handleSaveAi = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiForm)
      })
      const data = await res.json()
      if (res.ok) {
        setActionSuccess(data.message)
        setShowAiModal(false)
        await fetchSettings()
      }
    } catch (e: any) {
      alert("Gagal menyimpan konfigurasi AI: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Save OCR & Storage
  const handleSaveOcr = async (engine: string) => {
    try {
      const res = await fetch("/api/settings/ocr/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine })
      })
      if (res.ok) {
        setOcrEngine(engine)
        setShowOcrModal(false)
        await fetchSettings()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveStorage = async (provider: string) => {
    try {
      const res = await fetch("/api/settings/storage/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider })
      })
      if (res.ok) {
        setStorageProvider(provider)
        setShowStorageModal(false)
        await fetchSettings()
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Pengaturan & Konfigurasi Sistem</h1>
            <Badge className="bg-slate-800 text-white font-bold text-[10px]">CONFIG CENTER</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Manajemen database, penyedia AI, mesin OCR, dan keamanan sistem BPJS Optimizer.</p>
        </div>

        <Button onClick={fetchSettings} variant="outline" size="sm" className="text-xs font-bold">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Status
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
      )}

      {/* Main Configurations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DATABASE CARD */}
        <Card className="border border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Database className="w-5 h-5 text-blue-600" /> Database Provider
              </CardTitle>
              <Badge className={cn("font-mono text-[10px] font-bold", settings?.database?.status === "CONNECTED" ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
                {settings?.database?.status || "CONNECTED"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">Penyimpanan persistent untuk klaim, findings, & log audit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
              <div><span className="text-slate-400">Provider Aktif:</span> <strong className="text-slate-800">{settings?.database?.provider}</strong></div>
              <div><span className="text-slate-400">Environment:</span> <strong className="text-emerald-700">{settings?.database?.environment}</strong></div>
              <div><span className="text-slate-400">Database:</span> <span className="text-slate-700">{settings?.database?.database}</span></div>
            </div>

            <Button 
              onClick={() => { setShowDbModal(true); setTestResult(null); }}
              variant="outline" 
              className="w-full text-xs font-bold border-blue-200 text-blue-900 bg-blue-50/50 hover:bg-blue-100"
            >
              [Configure External DB]
            </Button>
          </CardContent>
        </Card>

        {/* AI ENGINE CARD */}
        <Card className="border border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <BrainCircuit className="w-5 h-5 text-purple-600" /> AI Intelligence Engine
              </CardTitle>
              <Badge className={cn("font-mono text-[10px] font-bold", settings?.ai?.geminiConfigured ? "bg-purple-600 text-white" : "bg-amber-500 text-white")}>
                {settings?.ai?.geminiStatus || "NOT CONFIGURED"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">Penyedia LLM untuk ekstraksi klinis & pembacaan PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
              <div><span className="text-slate-400">Local Model:</span> <span className="text-slate-800 font-bold">{settings?.ai?.localModel}</span></div>
              <div><span className="text-slate-400">Gemini Key:</span> <strong className={settings?.ai?.geminiConfigured ? "text-emerald-600" : "text-amber-600"}>{settings?.ai?.geminiConfigured ? "CONFIGURED (Encrypted)" : "NOT CONFIGURED"}</strong></div>
              <div><span className="text-slate-400">Active Mode:</span> <strong className="text-purple-700">{settings?.ai?.provider}</strong></div>
            </div>

            <Button 
              onClick={() => { setShowAiModal(true); setTestResult(null); }}
              variant="outline" 
              className="w-full text-xs font-bold border-purple-200 text-purple-900 bg-purple-50/50 hover:bg-purple-100"
            >
              [Configure Gemini API Key]
            </Button>
          </CardContent>
        </Card>

        {/* OCR ENGINE CARD */}
        <Card className="border border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Scan className="w-5 h-5 text-emerald-600" /> OCR Engine
              </CardTitle>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">READY</Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">Mesin pemindai teks dari dokumen PDF rekam medis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
              <div><span className="text-slate-400">Engine Aktif:</span> <strong className="text-slate-800">{ocrEngine}</strong></div>
              <div><span className="text-slate-400">Local Status:</span> <span className="text-emerald-600 font-bold">READY</span></div>
            </div>

            <Button 
              onClick={() => setShowOcrModal(true)}
              variant="outline" 
              className="w-full text-xs font-bold"
            >
              [Configure OCR Engine]
            </Button>
          </CardContent>
        </Card>

        {/* STORAGE PROVIDER CARD */}
        <Card className="border border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <HardDrive className="w-5 h-5 text-indigo-600" /> Storage Provider
              </CardTitle>
              <Badge className="bg-indigo-600 text-white font-mono text-[10px] font-bold">READY</Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">Penyimpanan berkas fisik PDF dan arsip E-Klaim.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
              <div><span className="text-slate-400">Storage Provider:</span> <strong className="text-slate-800">{storageProvider}</strong></div>
              <div><span className="text-slate-400">Access Mode:</span> <span className="text-slate-700">READ / WRITE</span></div>
            </div>

            <Button 
              onClick={() => setShowStorageModal(true)}
              variant="outline" 
              className="w-full text-xs font-bold"
            >
              [Configure Storage]
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SECURITY AUDIT CARD */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Audit Keamanan & Proteksi Kredensial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs font-mono">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="font-bold text-emerald-800 block mb-1">Server-Side Secret Management</span>
              <p className="text-emerald-900 text-[11px]">Seluruh password database & API key disimpan aman di server. Tidak ada ekskposure di client-side bundle.</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="font-bold text-emerald-800 block mb-1">Zero Plaintext Exposure</span>
              <p className="text-emerald-900 text-[11px]">Key & password yang tersimpan tidak dikembalikan sebagai plaintext ke browser frontend.</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="font-bold text-emerald-800 block mb-1">Production Isolation</span>
              <p className="text-emerald-900 text-[11px]">Mock adapter dilarang dieksekusi secara otomatis saat environment diset ke PRODUCTION.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: DATABASE CONFIGURATION MODAL */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" /> Database Provider Configuration
              </h3>
              <button onClick={() => setShowDbModal(false)} className="text-slate-500 hover:text-slate-800 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Database Provider</label>
                <select 
                  value={dbForm.provider} 
                  onChange={(e) => setDbForm({ ...dbForm, provider: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                >
                  <option value="LOCAL_SQLITE">Local Edge SQLite (Default)</option>
                  <option value="POSTGRESQL">PostgreSQL External Database</option>
                  <option value="ORACLE_26AI">Oracle 26ai Enterprise Database</option>
                </select>
              </div>

              {dbForm.provider !== "LOCAL_SQLITE" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Host</label>
                      <input 
                        type="text" 
                        value={dbForm.host} 
                        onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs" 
                        placeholder="postgres.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Port</label>
                      <input 
                        type="text" 
                        value={dbForm.port} 
                        onChange={(e) => setDbForm({ ...dbForm, port: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs" 
                        placeholder="5432"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Database Name</label>
                    <input 
                      type="text" 
                      value={dbForm.dbName} 
                      onChange={(e) => setDbForm({ ...dbForm, dbName: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded text-xs" 
                      placeholder="bpjs_optimizer_db"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Username</label>
                      <input 
                        type="text" 
                        value={dbForm.username} 
                        onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs" 
                        placeholder="db_user"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Password</label>
                      <input 
                        type="password" 
                        value={dbForm.password} 
                        onChange={(e) => setDbForm({ ...dbForm, password: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded text-xs" 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </>
              )}

              {testResult && (
                <div className={cn("p-3 rounded text-xs font-bold border", testResult.status === "CONNECTED" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900")}>
                  {testResult.status === "CONNECTED" ? "✓ " : "✕ "}{testResult.message}
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button 
                  onClick={handleTestDatabase} 
                  disabled={isTesting}
                  variant="outline" 
                  className="text-xs font-bold"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} [Test Connection]
                </Button>
                <Button 
                  onClick={handleSaveDatabase} 
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} [Save Configuration]
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 2: AI ENGINE CONFIGURATION MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-600" /> AI Engine Configuration
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-500 hover:text-slate-800 font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Provider Mode</label>
                <select 
                  value={aiForm.provider} 
                  onChange={(e) => setAiForm({ ...aiForm, provider: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                >
                  <option value="AUTO">AUTO (Local AI with Gemini Fallback)</option>
                  <option value="GEMINI">GEMINI ONLY</option>
                  <option value="LOCAL">LOCAL ONLY (Edge Llama-3)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Google Gemini API Key</label>
                <input 
                  type="password" 
                  value={aiForm.apiKey} 
                  onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs font-mono" 
                  placeholder="AIzaSy..."
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Disimpan secara aman di server side.</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Model Target</label>
                  <select 
                    value={aiForm.model} 
                    onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded text-xs"
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Temperature</label>
                  <input 
                    type="text" 
                    value={aiForm.temperature} 
                    onChange={(e) => setAiForm({ ...aiForm, temperature: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                    placeholder="0.2"
                  />
                </div>
              </div>

              {testResult && (
                <div className={cn("p-3 rounded text-xs font-bold border", testResult.status === "CONNECTED" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900")}>
                  {testResult.status === "CONNECTED" ? "✓ " : "✕ "}{testResult.message}
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button 
                  onClick={handleTestAi} 
                  disabled={isTesting}
                  variant="outline" 
                  className="text-xs font-bold"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} [Test Gemini Connection]
                </Button>
                <Button 
                  onClick={handleSaveAi} 
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} [Save Configuration]
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 3: OCR ENGINE MODAL */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-slate-200 shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase text-slate-900">OCR Engine Selection</h3>
              <button onClick={() => setShowOcrModal(false)} className="text-slate-500 hover:text-slate-800 font-bold">✕</button>
            </div>
            <div className="space-y-2">
              {["LOCAL", "GEMINI_VISION", "EXTERNAL"].map((eng) => (
                <button
                  key={eng}
                  onClick={() => handleSaveOcr(eng)}
                  className={cn("w-full p-3 rounded-lg border text-left font-bold transition-all flex items-center justify-between", ocrEngine === eng ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 hover:bg-slate-50 text-slate-700")}
                >
                  <span>{eng}</span>
                  {ocrEngine === eng && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 4: STORAGE PROVIDER MODAL */}
      {showStorageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-slate-200 shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase text-slate-900">Storage Provider Selection</h3>
              <button onClick={() => setShowStorageModal(false)} className="text-slate-500 hover:text-slate-800 font-bold">✕</button>
            </div>
            <div className="space-y-2">
              {["LOCAL_EDGE", "OBJECT_STORAGE"].map((prov) => (
                <button
                  key={prov}
                  onClick={() => handleSaveStorage(prov)}
                  className={cn("w-full p-3 rounded-lg border text-left font-bold transition-all flex items-center justify-between", storageProvider === prov ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-slate-200 hover:bg-slate-50 text-slate-700")}
                >
                  <span>{prov}</span>
                  {storageProvider === prov && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
