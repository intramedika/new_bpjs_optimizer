import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { RefreshCw, FileText, CheckCircle, AlertTriangle, Clock, ArrowRight } from "lucide-react"
import { Button } from "../components/ui/Button"
import { cn } from "../lib/utils"

export default function LocalQueue() {
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number, failed: number } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/local/queue");
      const data = await res.json();
      setSyncQueue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/local/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult({ synced: data.synced, failed: data.failed });
      fetchQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const pendingItemsCount = syncQueue.filter(item => item.status === "PENDING").length;
  const syncedItemsCount = syncQueue.filter(item => item.status === "SYNCED").length;
  const failedItemsCount = syncQueue.filter(item => item.status === "FAILED").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Offline Sync Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Manage local changes pending synchronization to the central server.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={triggerSync} disabled={syncing || pendingItemsCount === 0 && failedItemsCount === 0} className="gap-2">
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Force Sync All"}
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className={cn("p-4 rounded-xl border flex items-center gap-3", syncResult.failed > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
          {syncResult.failed > 0 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle className="w-5 h-5 text-emerald-600" />}
          <div>
            <p className={cn("text-sm font-bold", syncResult.failed > 0 ? "text-amber-900" : "text-emerald-900")}>Sync Complete</p>
            <p className={cn("text-xs", syncResult.failed > 0 ? "text-amber-700" : "text-emerald-700")}>Successfully synced {syncResult.synced} items. {syncResult.failed > 0 ? `Failed ${syncResult.failed} items.` : ''}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold text-slate-900">{pendingItemsCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Pending Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold text-emerald-600">{syncedItemsCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Synced Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold text-amber-600">{failedItemsCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Failed Retries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold text-slate-900">{((syncQueue.length * 1500) / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Est. Queue Size</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Pending Operations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {syncQueue.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-500 text-sm">No items in the queue. All local data is synced.</div>
            )}
            {syncQueue.map((item) => (
              <div key={item.id} className="p-4 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    item.status === 'PENDING' && "bg-slate-100 text-slate-500",
                    item.status === 'SYNCING' && "bg-blue-100 text-blue-600",
                    item.status === 'SYNCED' && "bg-emerald-100 text-emerald-600",
                    item.status === 'FAILED' && "bg-red-100 text-red-600"
                  )}>
                    {item.status === 'PENDING' && <Clock className="w-5 h-5" />}
                    {item.status === 'SYNCING' && <RefreshCw className="w-5 h-5 animate-spin" />}
                    {item.status === 'SYNCED' && <CheckCircle className="w-5 h-5" />}
                    {item.status === 'FAILED' && <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{item.action}</span>
                      <span className="text-sm font-bold text-slate-900">{item.entityType}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">Local ID: {item.localId}</p>
                    {item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{item.status}</p>
                    <p className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()} (Retry: {item.retryCount})</p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
