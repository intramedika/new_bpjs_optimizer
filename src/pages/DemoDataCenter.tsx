import { useState } from "react"
import { Sparkles, Trash2, Database, ShieldCheck, AlertCircle, Loader2, CheckCircle2, Layers, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { Link } from "react-router-dom"

export default function DemoDataCenter() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const handleGenerateDemo = async () => {
    setLoadingAction("generate")
    setActionMessage(null)
    try {
      const res = await fetch("/api/demo/generate", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setActionMessage(data.message)
      } else {
        setActionMessage("Error: " + (data.error || "Gagal generate demo data"))
      }
    } catch (e: any) {
      setActionMessage("Error: " + e.message)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleClearDemo = async () => {
    if (!confirm("Konfirmasi: Hapus seluruh data klaim bertag DEMO? Data REAL aman.")) return;
    setLoadingAction("clear-demo")
    setActionMessage(null)
    try {
      const res = await fetch("/api/demo/clear", { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setActionMessage(data.message)
      }
    } catch (e: any) {
      setActionMessage("Error: " + e.message)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleClearTest = async () => {
    if (!confirm("Konfirmasi: Hapus seluruh data klaim bertag TEST? Data REAL aman.")) return;
    setLoadingAction("clear-test")
    setActionMessage(null)
    try {
      const res = await fetch("/api/test/clear", { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setActionMessage(data.message)
      }
    } catch (e: any) {
      setActionMessage("Error: " + e.message)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Demo & Test Data Center</h1>
            <Badge className="bg-amber-500 text-white font-bold text-[10px]">DATA ISOLATION</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Pusat pengelolaan dataset sintetis untuk demonstrasi dan pengujian tanpa mencemari data REAL.</p>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm" className="text-xs font-bold">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Dashboard
          </Button>
        </Link>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${actionMessage.startsWith("Error") ? "bg-red-50 border-red-200 text-red-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
          {actionMessage.startsWith("Error") ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Actions Panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border border-amber-200 bg-amber-50/30 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" /> Demo Dataset Management
            </CardTitle>
            <CardDescription className="text-xs text-amber-800">
              Buat atau bersihkan klaim demonstrasi sintetis (tag <code className="bg-amber-100 px-1 rounded font-bold">dataMode: DEMO</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Dataset Sintetis Termasuk:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium text-slate-700">
                <li>Klaim Pneumonia Sedang/Berat (Readiness 95%)</li>
                <li>Klaim Infark Miokard Akut (High Severity)</li>
                <li>Klaim Diabetes Mellitus Komplikasi</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <Button 
                onClick={handleGenerateDemo} 
                disabled={loadingAction === "generate"}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                {loadingAction === "generate" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                [Generate Explicit Demo Dataset]
              </Button>
              <Button 
                onClick={handleClearDemo} 
                disabled={loadingAction === "clear-demo"}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 font-bold text-xs"
              >
                {loadingAction === "clear-demo" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                [Clear Demo Dataset]
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 bg-purple-50/30 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" /> Test Dataset Management
            </CardTitle>
            <CardDescription className="text-xs text-purple-800">
              Bersihkan klaim pengujian otomatis (tag <code className="bg-purple-100 px-1 rounded font-bold">dataMode: TEST</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white rounded-lg border border-purple-200 text-xs text-purple-900 space-y-1">
              <p className="font-bold">Prinsip Proteksi Data REAL:</p>
              <p className="text-[11px] text-slate-600">
                Pembersihan data DEMO atau TEST mengeksekusi filter SQL <code className="bg-slate-100 px-1 rounded">WHERE dataMode = ?</code> sehingga data REAL rekam medis rumah sakit dijamin 100% aman dan tidak akan terhapus.
              </p>
            </div>

            <div className="pt-2">
              <Button 
                onClick={handleClearTest} 
                disabled={loadingAction === "clear-test"}
                variant="outline"
                className="w-full text-purple-700 border-purple-200 hover:bg-purple-100 font-bold text-xs"
              >
                {loadingAction === "clear-test" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                [Clear Test Dataset]
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Principles Summary */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Arsitektur Lineage & Mode Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid md:grid-cols-3 gap-3 font-mono text-[11px]">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="font-bold text-emerald-800 block text-xs mb-1 uppercase">REAL MODE</span>
              <p className="text-emerald-900">Berasal dari PDF Upload, Import File TXT/CSV/JSON, Manual Entry, atau Integrasi SIMRS.</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="font-bold text-amber-800 block text-xs mb-1 uppercase">DEMO MODE</span>
              <p className="text-amber-900">Dibuat secara eksplisit via tombol Generate Demo Data untuk tujuan presentasi.</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="font-bold text-purple-800 block text-xs mb-1 uppercase">TEST MODE</span>
              <p className="text-purple-900">Dibuat oleh Test Center & Mock Sandbox untuk pengujian integrasi otomatis.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
