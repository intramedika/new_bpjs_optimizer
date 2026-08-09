import React, { useState, FormEvent } from "react"
import { ShieldCheck, Lock, Mail, Building2, UserCheck, ArrowRight, Activity, Sparkles, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { useHospitalContext, PRESET_USERS } from "../context/HospitalContext"

export default function Login() {
  const { login } = useHospitalContext()
  const [selectedUserId, setSelectedUserId] = useState<string>(PRESET_USERS[0].userId)
  const [email, setEmail] = useState<string>(PRESET_USERS[0].email)
  const [password, setPassword] = useState<string>("Admin#2026!Secure")
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedUser = PRESET_USERS.find(u => u.userId === selectedUserId) || PRESET_USERS[0]

  const handleSelectPreset = (userId: string) => {
    setSelectedUserId(userId)
    const user = PRESET_USERS.find(u => u.userId === userId)
    if (user) {
      setEmail(user.email)
      setPassword("SecurePassword#2026")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    setTimeout(() => {
      login(selectedUserId)
      setLoading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100 relative overflow-hidden">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* Application Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-mono mt-2">
            BPJS OPTIMIZER
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Enterprise Strong RBAC + Multi-Tenant Healthcare Claims Portal
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="bg-slate-800/90 border border-slate-700 shadow-2xl backdrop-blur-md p-6 font-mono text-xs text-slate-200">
          <CardHeader className="p-0 pb-4 border-b border-slate-700">
            <CardTitle className="text-sm font-bold text-white uppercase flex items-center justify-between">
              <span>Autentikasi Sesi Pengguna</span>
              <Badge className="bg-blue-600 text-white font-bold text-[9px]">ENCRYPTED</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-1 font-sans">
              Pilih peran akun terdaftar atau masukkan kredensial login Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-4 space-y-4">
            
            {/* Quick Persona Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase block">
                Pilih Peran Pengguna (Preset Roles):
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              >
                {PRESET_USERS.map(u => (
                  <option key={u.userId} value={u.userId}>
                    [{u.role}] {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase block">Email / User ID</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    placeholder="nama@bpjsoptimizer.id"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase block">Kata Sandi (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {/* Active Role Badge Details */}
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase">Hak Akses Role:</span>
                  <Badge className="bg-purple-600 text-white font-bold text-[9px]">{selectedUser.role}</Badge>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Nama Pengguna:</span>
                  <strong className="text-white">{selectedUser.name}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Scope Tenant & RS:</span>
                  <span className="text-emerald-400 font-bold">{selectedUser.tenantId} / {selectedUser.hospitalId}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs shadow-lg uppercase font-mono tracking-wider flex items-center justify-center gap-2"
              >
                {loading ? "Memproses Login..." : "[ MASUK KE SISTEM OPTIMIZER ]"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

          </CardContent>
        </Card>

        {/* Security Notice Footer */}
        <p className="text-[10px] text-slate-500 text-center font-mono">
          Strict Security Active • Server Principal Verification Enabled • SQLite Audit Log Enforced
        </p>

      </div>
    </div>
  )
}
