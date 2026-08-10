import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  BrainCircuit, 
  Code, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight, 
  FileText, 
  Loader2, 
  RefreshCw,
  Search,
  Scale
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ClaimWorkflowHeader } from "../components/layout/ClaimWorkflowHeader";
import { useClaimContext } from "../context/ClaimContext";
import { useHospitalContext } from "../context/HospitalContext";
import { formatRupiah, cn } from "../lib/utils";
import { ROUTES } from "../routes";

export default function RevenueOptimizer() {
  const navigate = useNavigate();
  const { activeClaim, selectClaim, setClaimData } = useClaimContext();
  const { currentUser } = useHospitalContext();
  
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeClaim) {
      fetchOpportunities(activeClaim.id);
    }
  }, [activeClaim]);

  const fetchOpportunities = async (claimId: string) => {
    setAnalyzing(true);
    setActionMessage(null);
    try {
      // 1. Fetch existing opportunities
      const res = await fetch(`/api/claims/${claimId}/revenue-opportunities`, {
        headers: { "X-User-Id": currentUser?.userId || "usr-admin-001" }
      });
      const data = await res.json();
      
      if (data.opportunities && data.opportunities.length > 0) {
        setOpportunities(data.opportunities);
      } else {
        // Automatically trigger fresh evidence-backed analysis
        await handleRunAnalysis(claimId);
      }
    } catch (e: any) {
      console.error("Failed to fetch opportunities:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunAnalysis = async (claimId: string) => {
    setAnalyzing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/claims/${claimId}/revenue-opportunities/analyze`, {
        method: "POST",
        headers: { "X-User-Id": currentUser?.userId || "usr-admin-001" }
      });
      const data = await res.json();
      if (data.opportunities) {
        setOpportunities(data.opportunities);
      }
    } catch (e: any) {
      setActionMessage({ type: 'error', text: "Analisis gagal: " + e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async (oppId: string) => {
    setActingId(oppId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/revenue-opportunities/${oppId}/approve`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": currentUser?.userId || "usr-admin-001" 
        }
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: "Peluang optimasi disetujui! Koding & prediksi tarif klaim berhasil diperbarui." });
        if (data.claim) {
          setClaimData(data.claim);
        }
        await fetchOpportunities(activeClaim!.id);
      } else {
        setActionMessage({ type: 'error', text: "Gagal menyetujui: " + (data.error || "Unknown error") });
      }
    } catch (e: any) {
      setActionMessage({ type: 'error', text: "Gagal menyetujui: " + e.message });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (oppId: string) => {
    setActingId(oppId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/revenue-opportunities/${oppId}/reject`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": currentUser?.userId || "usr-admin-001" 
        },
        body: JSON.stringify({ reason: "Pertimbangan klinis coder" })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: "Peluang optimasi ditolak. Koding klaim tetap utuh." });
        await fetchOpportunities(activeClaim!.id);
      } else {
        setActionMessage({ type: 'error', text: "Gagal menolak: " + (data.error || "Unknown error") });
      }
    } catch (e: any) {
      setActionMessage({ type: 'error', text: "Gagal menolak: " + e.message });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans max-w-[1600px] mx-auto p-4 md:p-6">
      
      {/* Workflow Step Bar */}
      {activeClaim && (
        <ClaimWorkflowHeader 
          currentStep={4} 
          nextRoute={ROUTES.READINESS} 
          nextLabel="[ Lanjut ke Claim Readiness → ]" 
        />
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase font-mono">EVIDENCE-BASED REVENUE OPTIMIZER</h1>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">MAXIMIZE VALID CLAIM VALUE</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Deteksi Peluang Pengkodean Berbasis Bukti Klinis Resume Medis & INA-CBG Grouper Engine.
          </p>
        </div>

        {activeClaim && (
          <Button 
            onClick={() => handleRunAnalysis(activeClaim.id)} 
            disabled={analyzing}
            variant="outline"
            className="font-mono text-xs font-bold shrink-0"
          >
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            [ Jalankan Ulang Engine Optimasi ]
          </Button>
        )}
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 font-mono text-xs font-bold ${
          actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* NO ACTIVE CLAIM STATE */}
      {!activeClaim ? (
        <Card className="border border-slate-200 bg-slate-50/50 p-12 text-center my-4 font-sans rounded-2xl">
          <CardContent className="space-y-4 max-w-md mx-auto p-0 font-sans">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase font-mono">Belum Ada Klaim Aktif</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Silakan pilih klaim dari Claim Queue terlebih dahulu untuk menganalisis peluang optimasi klaim berbasis bukti klinis.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
              <Link to={ROUTES.CLAIMS} className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  <Search className="w-4 h-4 mr-2" /> [ Buka Claim Queue ]
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* MAIN REVENUE OPTIMIZER CONSOLE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLS: CURRENT VALUE & OPPORTUNITY ANALYSIS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CURRENT CLAIM VALUE CARD */}
            <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
              <CardHeader className="border-b bg-slate-50/70 pb-3 rounded-t-2xl">
                <div className="flex items-center justify-between font-mono">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-600" /> A. CURRENT CLAIM VALUE & GROUPER BASELINE
                  </CardTitle>
                  <Badge className="bg-slate-900 text-white font-bold text-[9px] font-mono font-bold">
                    PREDICTED TARIF: {formatRupiah(activeClaim.tariff || 4300000)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 font-mono text-xs space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 text-slate-200">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">CBG Code</span>
                    <strong className="text-emerald-400 text-sm block font-bold">{activeClaim.cbgCode || "E-4-10-I"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Severity Level</span>
                    <strong className="text-amber-400 text-sm block font-bold">Level {activeClaim.severity || 1}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Principal ICD-10</span>
                    <strong className="text-blue-400 text-sm block font-bold">{activeClaim.principalDiagnosisCode}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Readiness Score</span>
                    <strong className="text-emerald-400 text-sm block font-bold">{activeClaim.readinessScore || 85}%</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-sans text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase font-mono block">Secondary Diagnoses ({activeClaim.secondaryDiagnoses?.length || 0})</span>
                    <p className="font-mono text-xs font-semibold text-slate-800">
                      {activeClaim.secondaryDiagnoses && activeClaim.secondaryDiagnoses.length > 0 ? activeClaim.secondaryDiagnoses.join(", ") : "Tidak ada diagnosis sekunder"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase font-mono block">Procedures ({activeClaim.procedures?.length || 0})</span>
                    <p className="font-mono text-xs font-semibold text-slate-800">
                      {activeClaim.procedures && activeClaim.procedures.length > 0 ? activeClaim.procedures.join(", ") : "Tidak ada tindakan medis"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OPPORTUNITY ANALYSIS LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono">
                <h3 className="text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> B. EVIDENCE-BASED OPPORTUNITIES ({opportunities.length})
                </h3>
                <span className="text-xs text-slate-500">Prinsip: No Clinical Evidence = No Opportunity</span>
              </div>

              {opportunities.length === 0 ? (
                <Card className="border border-emerald-200 bg-emerald-50/50 p-8 text-center rounded-2xl font-sans">
                  <CardContent className="space-y-2 max-w-md mx-auto p-0">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="text-sm font-bold text-emerald-950 font-mono uppercase">Pengkodean Sudah Optimal</h4>
                    <p className="text-xs text-emerald-800 leading-relaxed font-sans">
                      Seluruh bukti klinis resume medis telah terwakili dengan sempurna dalam kode ICD-10 & ICD-9-CM saat ini. Tidak ditemukan celah under-coding.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                opportunities.map((opp) => (
                  <Card key={opp.id} className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden font-sans">
                    <CardHeader className="border-b bg-slate-50/70 p-4 font-mono">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-600 text-white font-bold text-[9px]">{opp.opportunityType}</Badge>
                            <Badge variant="outline" className="text-[9px] font-bold text-amber-700 border-amber-300 bg-amber-50">
                              RISK: {opp.riskLevel}
                            </Badge>
                          </div>
                          <CardTitle className="text-sm font-bold text-slate-900 mt-1 font-sans">{opp.title}</CardTitle>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Potensi Selisih Klaim</span>
                          <strong className="text-emerald-600 font-bold text-base block">+ {formatRupiah(opp.potentialDelta)}</strong>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 text-xs">
                      <p className="text-slate-600 font-medium leading-relaxed">{opp.description}</p>

                      {/* Evidence Grounding */}
                      <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 font-mono space-y-1">
                        <span className="text-[10px] font-bold text-purple-900 uppercase block">🔍 Grounded Clinical Evidence:</span>
                        <p className="text-purple-950 font-semibold text-[11px] italic">{opp.evidenceSummary}</p>
                      </div>

                      {/* Before / After Coding Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Koding Saat Ini</span>
                          <p className="font-bold text-slate-800 mt-0.5">{opp.currentCoding}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">Grouper: {opp.currentGrouper} ({formatRupiah(opp.currentTariff)})</span>
                        </div>

                        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                          <span className="text-[10px] text-emerald-800 font-bold uppercase block">Koding Direkomendasikan</span>
                          <p className="font-bold text-emerald-950 mt-0.5">{opp.recommendedCoding}</p>
                          <span className="text-[10px] text-emerald-700 block mt-1">Grouper: {opp.recommendedGrouper} ({formatRupiah(opp.recommendedTariff)})</span>
                        </div>
                      </div>

                      {/* Action Suite */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t font-mono">
                        <span className="text-[10px] text-slate-500 font-bold">Opportunity Score: {opp.opportunityScore}/100</span>

                        <div className="flex items-center gap-2">
                          {opp.status === "APPROVED" || opp.status === "APPLIED" ? (
                            <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3">✓ TELAH DISETUJUI & DIAPLIKASIKAN</Badge>
                          ) : opp.status === "REJECTED" ? (
                            <Badge className="bg-red-600 text-white font-bold text-xs py-1 px-3">✕ DITOLAK CODER</Badge>
                          ) : (
                            <>
                              <Button 
                                onClick={() => handleReject(opp.id)}
                                disabled={actingId === opp.id}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 border-red-200 font-bold text-xs"
                              >
                                [ TOLAK ]
                              </Button>
                              <Button 
                                onClick={() => handleApprove(opp.id)}
                                disabled={actingId === opp.id}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                              >
                                {actingId === opp.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                [ SETUJUI & Terapkan Koding ]
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COL: QUICK NAVIGATION & REVENUE SUMMARY */}
          <div className="space-y-6">
            <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl font-mono">
              <CardHeader className="border-b bg-slate-50/70 pb-3 rounded-t-2xl">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-900">Summary Optimasi Klaim</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Total Peluang:</span>
                  <strong className="text-slate-900">{opportunities.length} Ditemukan</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Total Potensi Selisih:</span>
                  <strong className="text-emerald-600 font-bold">+ {formatRupiah(opportunities.reduce((s, o) => s + (o.potentialDelta || 0), 0))}</strong>
                </div>
                <div className="pt-3 border-t flex flex-col gap-2 font-mono text-xs">
                  <Link to={ROUTES.REVENUE_OPPORTUNITY_QUEUE} className="w-full">
                    <Button variant="outline" className="w-full font-bold text-xs">
                      <TrendingUp className="w-4 h-4 mr-2 text-blue-600" /> Buka Opportunity Queue
                    </Button>
                  </Link>
                  <Link to={ROUTES.READINESS} className="w-full">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                      [ Lanjut ke Claim Readiness → ]
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
