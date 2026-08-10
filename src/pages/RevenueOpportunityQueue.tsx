import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, Search, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useClaimContext } from "../context/ClaimContext";
import { formatRupiah, cn } from "../lib/utils";
import { ROUTES } from "../routes";

export default function RevenueOpportunityQueue() {
  const navigate = useNavigate();
  const { selectClaim } = useClaimContext();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/revenue/analytics");
      const data = await res.json();
      if (data.opportunities) {
        setOpportunities(data.opportunities);
      }
    } catch (e) {
      console.error("Failed to fetch opportunity queue:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClaim = (claimId: string) => {
    selectClaim(claimId);
    navigate(ROUTES.REVENUE_OPTIMIZER);
  };

  const filteredOpps = opportunities.filter(o => 
    o.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.claimId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.opportunityType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16 font-sans max-w-[1600px] mx-auto p-4 md:p-6 font-mono text-xs">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase font-mono">REVENUE OPPORTUNITY QUEUE</h1>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">PRIORITIZED CLAIMS</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1 font-sans">
            Antrean Klaim Terurut Berdasarkan Nilai Potensi Selisih Sah, Kekuatan Bukti Klinis, & Tingkat Kepatuhan.
          </p>
        </div>

        <Link to={ROUTES.REVENUE_IMPACT}>
          <Button variant="outline" className="font-mono text-xs font-bold shrink-0">
            [ Lihat Revenue Impact Dashboard ]
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-slate-200 shadow-sm bg-white p-4 font-sans">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Cari klaim, tipe optimasi, atau ICD..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-4 py-2 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">Menampilkan {filteredOpps.length} Peluang Optimasi</span>
        </div>
      </Card>

      {/* Opportunity Table */}
      <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden font-sans">
        <CardHeader className="border-b bg-slate-50/70 p-4 font-mono">
          <CardTitle className="text-xs font-bold uppercase text-slate-900">Daftar Antrean Peluang Klaim Valid</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3">ID Klaim / Tipe</th>
                <th className="px-4 py-3">Deskripsi Optimasi</th>
                <th className="px-4 py-3">Tarif Saat Ini</th>
                <th className="px-4 py-3">Tarif Rekomendasi</th>
                <th className="px-4 py-3 text-right">Potensi Selisih</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredOpps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    Belum ada antrean peluang optimasi klaim.
                  </td>
                </tr>
              ) : (
                filteredOpps.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">
                      <span className="block text-slate-900">{opp.claimId}</span>
                      <Badge className="bg-blue-100 text-blue-800 text-[9px] mt-0.5">{opp.opportunityType}</Badge>
                    </td>
                    <td className="px-4 py-3 max-w-xs font-sans">
                      <span className="font-bold block text-slate-900">{opp.title}</span>
                      <span className="text-[11px] text-slate-500 truncate block">{opp.evidenceSummary}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatRupiah(opp.currentTariff)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{formatRupiah(opp.recommendedTariff)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">+ {formatRupiah(opp.potentialDelta)}</td>
                    <td className="px-4 py-3 text-center font-bold text-purple-700">{opp.opportunityScore}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        opp.status === "APPROVED" ? "bg-emerald-600 text-white font-bold" :
                        opp.status === "REJECTED" ? "bg-red-600 text-white font-bold" :
                        "bg-amber-100 text-amber-900 font-bold"
                      }>
                        {opp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleReviewClaim(opp.claimId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                      >
                        [ REVIEW ]
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
