import { Link, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { 
  LayoutDashboard, 
  Files, 
  Activity, 
  ShieldAlert, 
  TrendingDown, 
  History, 
  Settings, 
  Upload, 
  LogOut, 
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  BookOpen,
  HelpCircle
} from "lucide-react"
import { cn } from "../../lib/utils"
import { ROUTES } from "../../routes"

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const location = useLocation()
  const [stats, setStats] = useState({ totalClaims: 0, readyClaims: 0, offlineQueue: 0, eKlaimStatus: 'NOT CONFIGURED' });

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setStats(prev => ({ ...prev, ...data }));
      })
      .catch(console.error);

    fetch('/api/health/status')
      .then(r => r.json())
      .then(data => {
        if (data && data.eKlaim) setStats(prev => ({ ...prev, eKlaimStatus: data.eKlaim }));
      })
      .catch(console.error);
  }, []);

  const navigation = [
    { name: 'Beranda', href: ROUTES.HOME, icon: LayoutDashboard },
    { 
      name: 'Workflow Klaim', 
      items: [
        { name: 'Klaim Baru', href: ROUTES.SMART_INTAKE, icon: Upload },
        { name: 'Claim Queue', href: ROUTES.CLAIMS, icon: Files, count: stats.totalClaims, badgeClass: 'bg-slate-700 text-slate-300' },
        { name: 'Review Klinis', href: ROUTES.CLINICAL, icon: Activity },
        { name: 'Coding & Grouper', href: ROUTES.GROUPER, icon: ShieldCheck },
        { name: 'Claim Readiness', href: ROUTES.READINESS, icon: CheckCircle },
        { name: 'Klaim Siap E-Klaim', href: `${ROUTES.CLAIMS}?status=siap`, icon: CheckCircle, count: stats.readyClaims, badgeClass: 'bg-emerald-900/30 text-emerald-400', textClass: 'text-emerald-400' },
      ]
    },
    {
      name: 'Analytics',
      items: [
        { name: '⚡ Revenue Optimizer', href: ROUTES.REVENUE_OPTIMIZER, icon: Sparkles },
        { name: 'Opportunity Queue', href: ROUTES.REVENUE_OPPORTUNITY_QUEUE, icon: TrendingDown },
        { name: 'Revenue Impact', href: ROUTES.REVENUE_IMPACT, icon: Activity },
        { name: 'Risk Engine', href: ROUTES.RISK, icon: ShieldAlert },
        { name: 'Post-Grouping Reconciliation', href: ROUTES.RECONCILIATION, icon: Activity },
      ]
    },
    {
      name: 'Integrasi',
      items: [
        { name: 'Integration Hub', href: ROUTES.INTEGRATION, icon: Settings },
        { name: 'SIMRS Connector', href: ROUTES.SIMRS, icon: Activity },
        { name: 'Mock Sandbox', href: ROUTES.MOCK, icon: Sparkles },
        { name: 'Import Center', href: ROUTES.IMPORT, icon: Upload },
        { name: 'Integration Logs', href: ROUTES.INTEGRATION_LOGS, icon: History },
      ]
    },
    {
      name: 'Dokumen',
      items: [
        { name: 'Smart Document Intake', href: ROUTES.SMART_INTAKE, icon: Upload },
      ]
    },
    {
      name: 'System Engine',
      items: [
        { name: 'AI Model Manager', href: ROUTES.LOCAL_MODELS, icon: Settings },
        { name: 'Local AI Health', href: ROUTES.LOCAL_HEALTH, icon: Activity },
        { name: 'Offline Queue', href: ROUTES.LOCAL_QUEUE, icon: History, count: stats.offlineQueue, badgeClass: 'bg-amber-900/30 text-amber-400', textClass: 'text-amber-400' },
        { name: 'System Test Center', href: ROUTES.TEST_CENTER, icon: ShieldCheck },
        { name: 'Demo Data Center', href: ROUTES.DEMO_CENTER, icon: Sparkles },
        { name: 'Pengaturan', href: ROUTES.SETTINGS, icon: Settings },
        { name: 'Admin Console', href: ROUTES.ADMIN, icon: ShieldCheck },
        { name: 'Database Console', href: ROUTES.ADMIN_DATABASE, icon: Settings },
      ]
    },
    {
      name: 'Bantuan',
      items: [
        { name: 'Documentation', href: ROUTES.DOCUMENTATION, icon: BookOpen },
        { name: 'FAQ', href: ROUTES.FAQ, icon: HelpCircle },
      ]
    },
  ]
  
  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-20 bg-black/50 lg:hidden",
          isOpen ? "block" : "hidden"
        )} 
        onClick={() => setIsOpen(false)}
      />
      
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 transform flex-col bg-slate-900 transition-transform duration-300 lg:static lg:flex lg:translate-x-0",
        isOpen ? "translate-x-0 flex" : "-translate-x-full hidden"
      )}>
        <div className="flex shrink-0 flex-col p-6 border-b border-slate-800">
          <h1 className="text-white font-bold text-xl tracking-tight uppercase flex items-center gap-2">
            BPJS <span className="text-blue-400">Optimizer</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-medium tracking-wider uppercase mt-1">BPJS Claim Intelligence & Integration Platform</p>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          <nav className="flex-1 space-y-1">
            {navigation.map((section, idx) => (
              <div key={idx}>
                {section.items ? (
                  <>
                    <div className="px-6 pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {section.name}
                    </div>
                    <div className="space-y-0">
                      {section.items.map((item) => {
                        const isActive = location.pathname === item.href || location.pathname + location.search === item.href;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "group flex items-center px-6 py-2.5 transition-colors relative",
                              isActive
                                ? "bg-blue-600 text-white"
                                : "text-slate-300 hover:bg-slate-800"
                            )}
                          >
                            {isActive && <div className="w-1.5 h-full bg-white absolute left-0 top-0"></div>}
                            <item.icon className="mr-3 h-4 w-4 shrink-0" />
                            <span className={cn("text-sm", !isActive && item.textClass)}>{item.name}</span>
                            {Boolean(item.count && item.count > 0) && (
                              <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded font-medium", item.badgeClass, isActive && "bg-blue-700 text-white")}>
                                {item.count}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <Link
                    to={section.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "group flex items-center px-6 py-3 transition-colors relative",
                      location.pathname === section.href
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    {location.pathname === section.href && <div className="w-1.5 h-full bg-white absolute left-0 top-0"></div>}
                    <section.icon className="mr-3 h-4 w-4 shrink-0" />
                    <span className="text-sm font-semibold">{section.name}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Integration Status widget at bottom */}
        <div className="p-4 bg-slate-800/50 m-4 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integrasi E-Klaim</span>
            <div className={cn("w-2 h-2 rounded-full", stats.eKlaimStatus === 'CONNECTED' ? "bg-emerald-500 animate-pulse" : "bg-slate-500")}></div>
          </div>
          <p className="text-[11px] font-bold text-slate-300">
            {stats.eKlaimStatus === 'CONNECTED' ? 'Status: TERHUBUNG' : 'Status: NOT CONFIGURED'}
          </p>
        </div>
      </div>
    </>
  )
}
