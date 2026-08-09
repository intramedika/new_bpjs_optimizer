import { ReactNode, useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date>(new Date())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsSyncing(true)
      setTimeout(() => {
        setIsSyncing(false)
        setLastSync(new Date())
      }, 1500)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-[1400px] h-full">
            {children}
          </div>
        </main>
        <div className="mt-auto p-3 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 uppercase tracking-widest font-bold bg-white z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <span className="text-slate-500">BPJS Optimizer Edge</span>
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-50 border border-slate-100">
              {isOnline ? (
                isSyncing ? (
                  <><RefreshCw className="w-3 h-3 text-blue-500 animate-spin" /> <span className="text-blue-600">SYNCING</span></>
                ) : (
                  <><Wifi className="w-3 h-3 text-emerald-500" /> <span className="text-emerald-600">ONLINE</span> <span className="text-slate-300 mx-1">|</span> <span className="text-slate-400 normal-case tracking-normal">Last Sync: {lastSync.toLocaleTimeString()}</span></>
                )
              ) : (
                <><WifiOff className="w-3 h-3 text-amber-500" /> <span className="text-amber-600">OFFLINE (LOCAL MODE)</span> <span className="text-slate-300 mx-1">|</span> <span className="text-slate-400 normal-case tracking-normal">Queued: 3</span></>
              )}
            </div>
          </div>
          <span className="hidden sm:inline-block text-slate-400">Offline-First Engine Active</span>
        </div>
      </div>
    </div>
  )
}
