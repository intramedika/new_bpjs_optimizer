import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { CheckCircle, AlertTriangle, Cpu, HardDrive, Network, Zap, Activity } from "lucide-react"
import { cn } from "../lib/utils"

export default function LocalHealth() {
  const healthMetrics = [
    { name: "PDF Parser", status: "READY", description: "Local document extraction engine" },
    { name: "OCR Engine", status: "READY", description: "PaddleOCR local inference" },
    { name: "Layout Detector", status: "READY", description: "YOLOv8 medical layout model" },
    { name: "Clinical LLM", status: "READY", description: "Llama-3-8B-Q4 local inference" },
    { name: "Local Database", status: "READY", description: "SQLite embedded storage" },
    { name: "Grouper Engine", status: "READY", description: "INA-CBG local ruleset" },
    { name: "Sync Engine", status: "ONLINE", description: "Connected to central server" },
  ]

  const renderBadge = (status: string) => {
    switch (status) {
      case 'READY':
      case 'ONLINE':
        return (
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 w-fit">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700">{status}</span>
          </div>
        )
      case 'OFFLINE':
        return (
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 w-fit">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">{status}</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
            <span className="text-xs font-bold text-slate-500">{status}</span>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Local AI Health</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time status of local processing pipelines and resources.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Activity className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-xl font-bold text-slate-900">System Healthy</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">All Systems Normal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Cpu className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-xl font-bold text-slate-900">24%</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">CPU Load</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <HardDrive className="w-8 h-8 text-indigo-500 mb-2" />
            <p className="text-xl font-bold text-slate-900">7.0 GB</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">AI Memory</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Zap className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-xl font-bold text-slate-900">2 sec/page</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Avg Process Time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Pipeline Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {healthMetrics.map((metric, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-900">{metric.name}</p>
                  <p className="text-xs text-slate-500">{metric.description}</p>
                </div>
                {renderBadge(metric.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
