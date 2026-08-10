import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Activity, CheckCircle2, ShieldAlert, BarChart3, ArrowRight, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { formatRupiah, cn } from "../lib/utils";
import { ROUTES } from "../routes";

export default function RevenueImpactDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/revenue/analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to fetch revenue analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans max-w-[1600px] mx-auto p-4 md:p-6 font-mono text-xs">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase font-mono">REVENUE IMPACT DASHBOARD</h1>
            <Badge className="bg-slate-900 text-emerald-400 font-bold text-[10px]">EXECUTIVE ANALYTICS</Badge>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1 font-sans">
            Dampak Finansial Sah dari Optimasi Koding Klaim BPJS Kesehatan & Pencegahan Under-coding.
          </p>
        </div>

        <Link to={ROUTES.REVENUE_OPTIMIZER}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold shrink-0">
            [ Buka Single Claim Revenue Optimizer ]
          </Button>
        </Link>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-white p-5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Klaim Dianalisis</span>
          <strong className="text-2xl font-bold text-slate-900 block mt-1">{analytics?.totalOpportunities || 0} Klaim</strong>
          <span className="text-[10px] text-slate-400 block mt-1">Status Disetujui & Ditolak</span>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white p-5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Potensi Selisih Total</span>
          <strong className="text-2xl font-bold text-emerald-600 block mt-1">{formatRupiah(analytics?.totalPotentialDelta || 0)}</strong>
          <span className="text-[10px] text-emerald-700 block mt-1">Rekomendasi Berbasis Bukti</span>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white p-5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Selisih Disetujui (Approved)</span>
          <strong className="text-2xl font-bold text-blue-600 block mt-1">{formatRupiah(analytics?.approvedPotentialDelta || 0)}</strong>
          <span className="text-[10px] text-blue-700 block mt-1">Disetujui oleh Coder</span>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white p-5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Tingkat Persetujuan (Approval Rate)</span>
          <strong className="text-2xl font-bold text-purple-600 block mt-1">{analytics?.approvalRate || 0}%</strong>
          <span className="text-[10px] text-purple-700 block mt-1">Rasio Coder Approval</span>
        </Card>
      </div>

      {/* DETAILED OPPORTUNITIES TABLE */}
      <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden font-sans">
        <CardHeader className="border-b bg-slate-50/70 p-4 font-mono">
          <CardTitle className="text-xs font-bold uppercase text-slate-900">Rekapitulasi Riwayat Optimasi Finansial</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3">ID Klaim</th>
                <th className="px-4 py-3">Tipe Optimasi</th>
                <th className="px-4 py-3">Koding Awal</th>
                <th className="px-4 py-3">Koding Direkomendasikan</th>
                <th className="px-4 py-3 text-right">Potensi Selisih</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {analytics?.opportunities && analytics.opportunities.length > 0 ? (
                analytics.opportunities.map((opp: any) => (
                  <tr key={opp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{opp.claimId}</td>
                    <td className="px-4 py-3 font-bold text-blue-700">{opp.opportunityType}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">{opp.currentCoding}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-800">{opp.recommendedCoding}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">+ {formatRupiah(opp.potentialDelta)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={opp.status === "APPROVED" ? "bg-emerald-600 text-white font-bold" : "bg-slate-200 text-slate-700 font-bold"}>
                        {opp.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    Belum ada riwayat data optimasi finansial klaim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
