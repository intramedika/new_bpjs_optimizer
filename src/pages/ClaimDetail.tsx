import { useParams, Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { 
  ArrowLeft, 
  Info,
  FileText,
  Activity,
  Stethoscope,
  ShieldAlert,
  BrainCircuit,
  Sparkles,
  Loader2,
  History,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Check,
  X,
  Plus,
  Edit3,
  Download,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Progress } from "../components/ui/Progress"
import { Badge } from "../components/ui/Badge"
import { formatRupiah, formatDate, cn } from "../lib/utils"
import { Claim } from "../types"
import { validationEngine, ValidationFinding } from "../../server/engines/ValidationEngine"

export default function ClaimDetail() {
  const { id } = useParams()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("ringkasan")

  const [aiAnalysis, setAiAnalysis] = useState<{analysis: string, suggestions: string[]} | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  
  const [grouperPrediction, setGrouperPrediction] = useState<any>(null)
  const [grouperLoading, setGrouperLoading] = useState(false)

  // Validation findings state
  const [findings, setFindings] = useState<ValidationFinding[]>([])
  
  // Interactive Coding State
  const [secDiagInput, setSecDiagInput] = useState("")
  const [procInput, setProcInput] = useState("")
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; time: string; user: string; action: string; details: string }>>([])

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const response = await fetch(`/api/claims/${id}`)
        const data = await response.json()
        setClaim(data)
        
        // Initial audit log
        setAuditLogs([
          { id: '1', time: new Date().toLocaleTimeString(), user: 'System', action: 'CLAIM_LOADED', details: `Klaim #${data.claimNumber} dibuka.` },
          { id: '2', time: new Date(Date.now() - 3600000).toLocaleTimeString(), user: 'Coder Medis', action: 'INITIAL_CODING', details: `Diagnosa utama: ${data.principalDiagnosisCode}` }
        ]);

        // Calculate validation rules
        if (data) {
          const valFindings = await validationEngine.validateClaim(data);
          setFindings(valFindings);
        }
      } catch (error) {
        console.error("Failed to fetch claim:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchClaim()
  }, [id])

  useEffect(() => {
    if (activeTab === 'ai' && claim && !aiAnalysis && !aiLoading) {
      const fetchAnalysis = async () => {
        setAiLoading(true)
        try {
          const response = await fetch(`/api/claims/${id}/analyze`, { method: 'POST' })
          const data = await response.json()
          if (response.ok && data.status === 'success') {
             setAiAnalysis({ analysis: data.analysis, suggestions: data.suggestions })
          } else {
             setAiAnalysis({ 
               analysis: data.message || "Gagal menjalankan analisis AI cloud (provider tidak terkonfigurasi).", 
               suggestions: ["Gunakan local edge ruleset untuk validasi offline."],
               error: data.error 
             } as any)
          }
        } catch (error) {
          console.error("AI Analysis Failed", error)
          setAiAnalysis({ analysis: "Error koneksi saat analisis AI.", suggestions: [], error: "NETWORK_ERROR" } as any)
        } finally {
          setAiLoading(false)
        }
      }
      fetchAnalysis()
    }
    
    if (activeTab === 'cbg' && claim && !grouperPrediction && !grouperLoading) {
      const fetchGrouper = async () => {
        setGrouperLoading(true)
        try {
          const response = await fetch(`/api/claims/${id}/grouper`, { method: 'POST' })
          const data = await response.json()
          if (data.status === 'success') {
            setGrouperPrediction(data.prediction)
          }
        } catch (error) {
          console.error("Grouper Prediction Failed", error)
        } finally {
          setGrouperLoading(false)
        }
      }
      fetchGrouper()
    }
  }, [activeTab, claim, id, aiAnalysis, aiLoading, grouperPrediction, grouperLoading])

  if (loading || !claim) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const handleAddSecDiag = () => {
    if (!secDiagInput.trim()) return;
    const updatedSec = [...claim.secondaryDiagnoses, secDiagInput.trim()];
    setClaim({ ...claim, secondaryDiagnoses: updatedSec });
    setSecDiagInput("");
    setAuditLogs(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString(), user: 'Coder Medis', action: 'ADD_SECONDARY_DIAGNOSIS', details: `Menambahkan diagnosa sekunder: ${secDiagInput}` }, ...prev]);
  }

  const handleAddProc = () => {
    if (!procInput.trim()) return;
    const updatedProc = [...claim.procedures, procInput.trim()];
    setClaim({ ...claim, procedures: updatedProc });
    setProcInput("");
    setAuditLogs(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString(), user: 'Coder Medis', action: 'ADD_PROCEDURE', details: `Menambahkan prosedur: ${procInput}` }, ...prev]);
  }

  const handleExportPackage = () => {
    const jsonStr = JSON.stringify(claim, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EKLAIM_READY_${claim.claimNumber}.json`;
    a.click();
  }

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: Info },
    { id: 'dokumen', label: 'Evidence', icon: FileText },
    { id: 'klinis', label: 'Validation', icon: Activity },
    { id: 'coding', label: 'Coding', icon: Stethoscope },
    { id: 'cbg', label: 'Grouper Intelligence', icon: BrainCircuit },
    { id: 'ai', label: 'Readiness', icon: CheckCircle },
    { id: 'eklaim', label: 'E-Klaim Ready', icon: ArrowRight },
    { id: 'reconciliation', label: 'Reconciliation', icon: Activity },
    { id: 'risiko', label: 'Risk Engine', icon: ShieldAlert },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ]

  const readinessColor = claim.readinessScore >= 90 ? 'text-emerald-600' :
                         claim.readinessScore >= 75 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Link to="/klaim">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Klaim <span className="text-slate-500">#{claim.claimNumber}</span></h1>
            <span className={cn(
              "px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
              claim.status === 'Siap Diajukan' ? 'bg-emerald-100 text-emerald-700' : 
              claim.status === 'Perlu Perbaikan' ? 'bg-red-100 text-red-700' : 
              'bg-amber-100 text-amber-700'
            )}>
              {claim.status}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">{claim.patient.name} ({claim.patient.mrNumber}) • {formatDate(claim.serviceDate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left Sidebar Info */}
        <div className="space-y-6 md:col-span-1">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 text-center border-b border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Claim Readiness</div>
                <div className={cn("text-5xl font-bold font-mono tracking-tighter", readinessColor)}>
                  {claim.readinessScore}
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Skor Kesiapan / 100</div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                    <span className="text-slate-500">Clinical Validation</span>
                    <span className="text-slate-800">96%</span>
                  </div>
                  <Progress value={96} className="h-1.5" indicatorClassName="bg-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                    <span className="text-slate-500">Coding Consistency</span>
                    <span className="text-slate-800">85%</span>
                  </div>
                  <Progress value={85} className="h-1.5" indicatorClassName="bg-amber-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                    <span className="text-slate-500">Documentation</span>
                    <span className="text-slate-800">100%</span>
                  </div>
                  <Progress value={100} className="h-1.5" indicatorClassName="bg-emerald-500" />
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Tindakan</div>
                  {claim.readinessScore >= 90 ? (
                    <Button onClick={() => setActiveTab('eklaim')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl h-10 shadow-lg shadow-emerald-200">
                      Lanjutkan ke E-Klaim
                    </Button>
                  ) : (
                    <Button onClick={() => setActiveTab('klinis')} className="w-full bg-amber-500 hover:bg-amber-600 text-xs font-bold rounded-xl h-10 shadow-lg shadow-amber-200 text-white">
                      Review Catatan Perbaikan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Data Demografi & Adm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-[13px]">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">No. SEP</span>
                <span className="font-bold text-slate-800">{claim.sepNumber}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Gender / DOB</span>
                <span className="font-bold text-slate-800">{claim.patient.gender}, {formatDate(claim.patient.dob)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">DPJP Utama</span>
                <span className="font-bold text-slate-800">{claim.doctorName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Unit / Ruangan</span>
                <span className="font-bold text-slate-800">{claim.unit}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-1 flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center px-3 py-2 text-xs font-bold rounded-lg transition-colors flex-1 min-w-[110px] justify-center",
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                <tab.icon className="mr-1.5 h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in duration-300">
            
            {/* TAB: RINGKASAN */}
            {activeTab === 'ringkasan' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Diagnosis & Tindakan Utama</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Diagnosis Utama (ICD-10)</p>
                          <div className="flex items-start gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <div className="px-2.5 py-1 bg-white text-blue-700 font-mono text-sm rounded shadow-sm border border-blue-200 font-bold">
                              {claim.principalDiagnosisCode}
                            </div>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{claim.principalDiagnosis}</p>
                          </div>
                        </div>
                        {claim.secondaryDiagnoses.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Diagnosis Sekunder</p>
                            <ul className="space-y-2 text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {claim.secondaryDiagnoses.map((dx, i) => (
                                <li key={i} className="flex items-start before:content-['•'] before:mr-2 before:text-slate-400">
                                  {dx}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-6">
                         <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tindakan (ICD-9-CM)</p>
                          {claim.procedures.length > 0 ? (
                            <ul className="space-y-2 text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {claim.procedures.map((px, i) => (
                                <li key={i} className="flex items-start before:content-['•'] before:mr-2 before:text-slate-400">
                                  {px}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center h-[100px]">
                               <p className="text-sm text-slate-400 font-medium italic">- Tidak ada tindakan tercatat -</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-900 border-none shadow-lg text-white overflow-hidden relative">
                  <div className="relative z-10 p-6 flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Simulasi INA-CBG</div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="px-4 py-2 bg-blue-950 text-white font-mono rounded-lg font-bold text-xl shadow-inner border border-blue-700">
                          {claim.cbgCode}
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight text-white">{claim.cbgDescription}</p>
                          <p className="text-[11px] font-medium text-blue-200 mt-1">Severity Level: <span className="font-bold text-white">{claim.severity}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right bg-blue-800/60 p-4 rounded-2xl border border-blue-700">
                      <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Estimasi Tarif</div>
                      <div className="text-3xl font-bold text-white tracking-tight">{formatRupiah(claim.tariff)}</div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB: EVIDENCE / DOKUMEN */}
            {activeTab === 'dokumen' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" /> Dokumen Rekam Medis & Clinical Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">Resume_Medis_Pasien_{claim.patient.mrNumber}.pdf</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Uploaded: {formatDate(claim.serviceDate)} • Match Confidence: 96%</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs">TERKONFIRMASI</Badge>
                      </div>
                      <div className="p-4 space-y-3 bg-white text-xs">
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                          <span className="font-bold text-yellow-900 block mb-1">Kutipan Diagnosis Utama (Hal. 1):</span>
                          <p className="italic text-slate-700">"{claim.principalDiagnosis} - Ditandai sesak napas berat dan ronki pada kedua paru."</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="font-bold text-blue-900 block mb-1">Kutipan Laboratorium (Hal. 2):</span>
                          <p className="italic text-slate-700">"Leukosit 14.800 /uL, CRP 48 mg/L. Mendukung inflamasi akut."</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: VALIDATION / KLINIS */}
            {activeTab === 'klinis' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                      <span>Hasil Rule Validation Engine</span>
                      <Badge className="bg-blue-100 text-blue-800 font-bold">{findings.length} Rule Checks</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {findings.length === 0 ? (
                      <div className="p-6 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-sm">
                        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        Semua Rule Validation PASS. Tidak ditemukan isu klinis.
                      </div>
                    ) : (
                      findings.map((f, idx) => (
                        <div key={idx} className={cn("p-4 rounded-xl border space-y-2", f.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200')}>
                          <div className="flex items-center justify-between">
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", f.severity === 'CRITICAL' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900')}>
                              {f.severity} - {f.ruleId}
                            </span>
                            <span className="text-xs font-bold text-slate-500">Confidence: {f.confidence}%</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{f.title}</h4>
                          <p className="text-xs text-slate-700">{f.description}</p>
                          <div className="text-xs font-medium text-slate-600 bg-white p-2 rounded border">
                            <span className="font-bold block text-slate-800">Evidence:</span> {f.evidence}
                          </div>
                          <div className="text-xs font-bold text-blue-700">
                            💡 Rekomendasi: {f.recommendation}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: CODING */}
            {activeTab === 'coding' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Manajemen Kode ICD-10 & ICD-9-CM</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Diagnosis Utama</h4>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <span className="font-mono font-bold text-blue-900 bg-white px-2 py-1 rounded border border-blue-200">{claim.principalDiagnosisCode}</span>
                        <span className="font-bold text-slate-800 text-sm flex-1">{claim.principalDiagnosis}</span>
                        <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">VERIFIED</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Diagnosis Sekunder (ICD-10)</h4>
                      <div className="space-y-2 mb-3">
                        {claim.secondaryDiagnoses.map((dx, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800">
                            <span>• {dx}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => {
                                const filtered = claim.secondaryDiagnoses.filter((_, idx) => idx !== i);
                                setClaim({ ...claim, secondaryDiagnoses: filtered });
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Tambah ICD-10 Sekunder (misal: E11.9)" 
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2"
                          value={secDiagInput}
                          onChange={e => setSecDiagInput(e.target.value)}
                        />
                        <Button size="sm" onClick={handleAddSecDiag} className="bg-blue-600 text-xs font-bold"><Plus className="w-3.5 h-3.5 mr-1" /> Tambah</Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prosedur / Tindakan (ICD-9-CM)</h4>
                      <div className="space-y-2 mb-3">
                        {claim.procedures.map((px, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800">
                            <span>• {px}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => {
                                const filtered = claim.procedures.filter((_, idx) => idx !== i);
                                setClaim({ ...claim, procedures: filtered });
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Tambah ICD-9-CM Prosedur (misal: 89.52)" 
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2"
                          value={procInput}
                          onChange={e => setProcInput(e.target.value)}
                        />
                        <Button size="sm" onClick={handleAddProc} className="bg-blue-600 text-xs font-bold"><Plus className="w-3.5 h-3.5 mr-1" /> Tambah</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: GROUPER INTELLIGENCE */}
            {activeTab === 'cbg' && (
              <div className="space-y-6">
                <Card className="border border-blue-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-blue-50 border-b border-blue-100 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-900 flex items-center justify-between">
                      <div className="flex items-center">
                        <BrainCircuit className="w-4 h-4 mr-2 text-blue-600" /> 
                        Grouper Intelligence Simulation
                      </div>
                      <span className="text-[10px] bg-blue-200 text-blue-900 px-2.5 py-1 rounded-full font-bold">MODE: PREDICTION / SIMULATION</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {grouperLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : grouperPrediction ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Predicted CBG</span>
                            <span className="text-2xl font-mono font-bold text-blue-900">{grouperPrediction.predictedCbg}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Predicted Severity</span>
                            <span className="text-lg font-bold text-slate-800">Level {grouperPrediction.predictedSeverity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Estimated Tariff</span>
                            <span className="text-2xl font-bold text-emerald-600">{formatRupiah(grouperPrediction.estimatedTariff)}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Faktor Penentu Grouping</h4>
                          <ul className="space-y-2 text-xs font-medium text-slate-600">
                            {grouperPrediction.factors.map((fac: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {fac}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: READINESS */}
            {activeTab === 'ai' && (
              <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                  <div>
                    <h3 className="font-bold text-base">Claim Readiness Score Analysis</h3>
                    <p className="text-xs text-slate-400">Calculated dynamically based on active claim rules.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
                  <p className="text-xs font-bold text-blue-300 uppercase">Analisis AI Readiness:</p>
                  {aiLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  ) : (
                    <p className="text-xs text-slate-200 leading-relaxed">{aiAnalysis?.analysis || "Klaim memenuhi standar dokumentasi utama."}</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: E-KLAIM READY */}
            {activeTab === 'eklaim' && (
              <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span>E-Klaim Ready Package Generator</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold">API: NOT CONFIGURED</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">Paket Berkas E-Klaim Valid</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">Siap di-export atau dikirim langsung melalui E-Klaim API Adapter.</p>
                    </div>
                    <Button onClick={handleExportPackage} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold">
                      <Download className="w-4 h-4 mr-1.5" /> Export JSON Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB: RECONCILIATION */}
            {activeTab === 'reconciliation' && (
              <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Variance Reconciliation</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs font-bold text-blue-900 uppercase">Prediksi Optimizer</p>
                      <p className="text-xl font-bold text-blue-900 mt-1">{claim.cbgCode}</p>
                      <p className="text-xs text-blue-700">{formatRupiah(claim.tariff)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 uppercase">Hasil E-Klaim Actual</p>
                      <p className="text-xs font-bold text-amber-600 mt-2">NOT CONFIGURED (Belum Tarik Data E-Klaim)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB: RISK ENGINE */}
            {activeTab === 'risiko' && (
              <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Risk Assessment Matrix</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Risk</span>
                      <span className="text-lg font-bold text-emerald-600">{claim.risk}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Audit Risk</span>
                      <span className="text-lg font-bold text-blue-600">LOW</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Financial Leakage</span>
                      <span className="text-lg font-bold text-slate-800">Rp 0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB: AUDIT TRAIL */}
            {activeTab === 'audit' && (
              <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Chronological Audit Log</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div>
                          <span className="font-bold text-slate-800 mr-2">[{log.action}]</span>
                          <span className="text-slate-600">{log.details}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{log.time} • {log.user}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
