import React from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ChevronRight, FileText, BrainCircuit, Code, ShieldCheck, Activity, Scale, Send, ArrowRight } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { useClaimContext } from "../../context/ClaimContext";
import { ROUTES } from "../../routes";

interface Step {
  id: number;
  label: string;
  route: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { id: 1, label: "1. Intake", route: ROUTES.SMART_INTAKE, icon: FileText },
  { id: 2, label: "2. Clinical", route: ROUTES.CLINICAL, icon: BrainCircuit },
  { id: 3, label: "3. Coding", route: ROUTES.GROUPER, icon: Code },
  { id: 4, label: "4. Validation", route: ROUTES.READINESS, icon: ShieldCheck },
  { id: 5, label: "5. Grouper", route: ROUTES.GROUPER, icon: Activity },
  { id: 6, label: "6. Readiness", route: ROUTES.READINESS, icon: CheckCircle2 },
  { id: 7, label: "7. E-Klaim Ready", route: `${ROUTES.CLAIMS}?status=siap`, icon: Send }
];

export const ClaimWorkflowHeader: React.FC<{ currentStep: number; nextRoute?: string; nextLabel?: string }> = ({ 
  currentStep, 
  nextRoute, 
  nextLabel 
}) => {
  const location = useLocation();
  const { activeClaim } = useClaimContext();

  if (!activeClaim) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 font-mono text-xs space-y-3">
      {/* Active Claim Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {activeClaim.patient?.name ? activeClaim.patient.name.charAt(0) : "P"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{activeClaim.patient?.name || "Pasien"}</span>
              <Badge className="bg-slate-800 text-white font-bold text-[9px] uppercase">{activeClaim.dataMode || "REAL"}</Badge>
              <Badge variant="outline" className="text-[9px] font-bold text-blue-700 border-blue-200">
                SEP: {activeClaim.sepNumber}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Diagnosis Utama: <strong className="text-slate-800">{activeClaim.principalDiagnosisCode} — {activeClaim.principalDiagnosis}</strong>
            </p>
          </div>
        </div>

        {/* Continuation Action Button */}
        {nextRoute && nextLabel && (
          <Link to={nextRoute}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm">
              {nextLabel} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        )}
      </div>

      {/* Step Progression Wizard Bar */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pt-1">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <React.Fragment key={step.id}>
              <Link 
                to={step.route}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all shrink-0",
                  isActive ? "bg-blue-600 text-white shadow-sm" :
                  isCompleted ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100" :
                  "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{step.label}</span>
              </Link>

              {step.id < steps.length && (
                <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
