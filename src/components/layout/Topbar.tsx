import { Menu, Building2, ShieldCheck, LogOut, User, KeyRound } from "lucide-react"
import { Link } from "react-router-dom"
import { useHospitalContext, PRESET_USERS } from "../../context/HospitalContext"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { 
    activeTenant, 
    activeGroup, 
    activeHospital, 
    hospitals, 
    currentUser, 
    userRole, 
    switchHospital, 
    switchUser, 
    logout 
  } = useHospitalContext();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex shrink-0 items-center justify-between px-4 sm:px-6 shadow-sm font-sans">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-slate-500 hover:text-slate-900 lg:hidden"
          onClick={onMenuClick}
        >
          <span className="sr-only">Buka sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Global Multi-Tenant Context Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs font-mono">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-bold hidden md:inline">{activeTenant.code} / {activeGroup.code} /</span>
            <select
              value={activeHospital.id}
              onChange={(e) => switchHospital(e.target.value)}
              className="bg-white border border-slate-300 rounded p-1 font-bold text-slate-800 focus:outline-none focus:border-blue-500 text-xs"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* User Identity & Role Switcher */}
        <div className="hidden sm:flex items-center gap-2 bg-purple-50/70 p-1.5 rounded-xl border border-purple-200 text-xs font-mono">
          <User className="w-3.5 h-3.5 text-purple-700 shrink-0 ml-1" />
          <select
            value={currentUser.userId}
            onChange={(e) => switchUser(e.target.value)}
            className="bg-white border border-purple-200 rounded p-1 font-bold text-purple-900 focus:outline-none focus:border-purple-500 text-xs"
            title="Ganti Peran Pengguna / Persona Test"
          >
            {PRESET_USERS.map(u => (
              <option key={u.userId} value={u.userId}>
                [{u.role}] {u.name}
              </option>
            ))}
          </select>
          <Badge className="bg-purple-600 text-white text-[9px] font-bold shrink-0">
            {userRole}
          </Badge>
        </div>

        {/* Admin Console Link for Admins */}
        {(userRole === "PLATFORM_ADMIN" || userRole === "TENANT_ADMIN" || userRole === "HOSPITAL_ADMIN") && (
          <Link to="/admin" className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Admin
          </Link>
        )}

        {/* Explicit Logout Button */}
        <Button 
          onClick={logout}
          variant="outline" 
          size="sm" 
          className="text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold text-xs flex items-center gap-1.5 font-mono shadow-sm"
          title="Keluar dari sesi autentikasi & reset identitas"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
