import { useState, useEffect } from "react"
import { Server, Activity, Settings, CheckCircle, AlertTriangle, Loader2, Play, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"

export default function SimrsIntegration() {
  const [status, setStatus] = useState("NOT_CONFIGURED")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/integration/health")
      const data = await res.json()
      if (data.health && data.health.simrs) {
        setStatus(data.health.simrs.status)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/integration/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId: "simrs",
          baseUrl,
          credentials: { apiKey }
        })
      })

      const data = await res.json()
      setTestResult(data)
      if (data.status) setStatus(data.status)
    } catch (err: any) {
      setTestResult({ success: false, status: "ERROR", message: err.message })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      const res = await fetch("/api/integration/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId: "simrs",
          baseUrl,
          credentials: { apiKey }
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert("Konfigurasi SIMRS Adapter berhasil disimpan ke IntegrationHub.")
        fetchHealth()
      }
    } catch (e: any) {
      alert("Gagal menyimpan konfigurasi: " + e.message)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">SIMRS Adapter Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Konfigurasi koneksi ke sistem informasi manajemen rumah sakit (REST / FHIR).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              Status SIMRS Adapter (Orchestrated by IntegrationHub)
            </div>
            <Badge variant="outline" className="font-bold text-xs">
              {status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Status Adapter: <span className="font-mono text-blue-700">{status}</span></p>
              <p className="text-xs text-slate-500">Routing: UI → ClaimService → IntegrationHub → SIMRSAdapter → Hospital SIMRS</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">SIMRS Endpoint Base URL</label>
                <input 
                  type="text" 
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs font-mono border rounded-lg" 
                  placeholder="https://api.simrs.local" 
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">API Secret Key / Token</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full mt-1 p-2.5 text-xs font-mono border rounded-lg" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <p className="font-bold uppercase">{testResult.success ? 'TEST SUCCESS' : 'TEST FAILED'}</p>
                <p className="mt-1 font-medium">{testResult.message}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSaveConfig} className="bg-slate-900 text-white text-xs font-bold">
                <Check className="w-4 h-4 mr-1.5" /> Simpan Konfigurasi
              </Button>
              <Button onClick={handleTestConnection} disabled={isTesting} variant="outline" className="text-xs font-bold">
                {isTesting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                Uji Koneksi via IntegrationHub
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
