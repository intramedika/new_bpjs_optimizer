import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import Dashboard from "./pages/Dashboard"
import ClaimQueue from "./pages/ClaimQueue"
import ClaimDetail from "./pages/ClaimDetail"
import Integration from "./pages/Integration"
import ImportData from "./pages/ImportData"
import SmartDocumentIntake from "./pages/SmartDocumentIntake"
import TestCenter from "./pages/TestCenter"
import Reconciliation from "./pages/Reconciliation"
import LocalModels from "./pages/LocalModels"
import LocalHealth from "./pages/LocalHealth"
import LocalQueue from "./pages/LocalQueue"
import SimrsIntegration from "./pages/SimrsIntegration"
import ClinicalIntelligence from "./pages/ClinicalIntelligence"
import CodingGrouper from "./pages/CodingGrouper"
import ClaimReadiness from "./pages/ClaimReadiness"
import RiskEngine from "./pages/RiskEngine"
import Settings from "./pages/Settings"
import SystemReport from "./pages/SystemReport"
import DemoDataCenter from "./pages/DemoDataCenter"
import MockSandbox from "./pages/MockSandbox"
import Documentation from "./pages/Documentation"
import FAQ from "./pages/FAQ"
import Admin from "./pages/Admin"
import AdminDatabaseConsole from "./pages/AdminDatabaseConsole"
import Login from "./pages/Login"
import { HospitalProvider, useHospitalContext } from "./context/HospitalContext"
import { ClaimProvider } from "./context/ClaimContext"
import { ROUTES } from "./routes"

function AppRoutes() {
  const { isAuthenticated, userRole } = useHospitalContext()

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        {/* Primary Canonical Routes */}
        <Route path={ROUTES.HOME} element={<Dashboard />} />
        <Route path={ROUTES.CLAIMS} element={<ClaimQueue />} />
        <Route path={ROUTES.CLAIM_DETAIL} element={<ClaimDetail />} />
        <Route path={ROUTES.RECONCILIATION} element={<Reconciliation />} />
        
        {/* Operational Modules with URL :claimId Support */}
        <Route path={ROUTES.CLINICAL} element={<ClinicalIntelligence />} />
        <Route path={`${ROUTES.CLINICAL}/:claimId`} element={<ClinicalIntelligence />} />
        
        <Route path={ROUTES.GROUPER} element={<CodingGrouper />} />
        <Route path={`${ROUTES.GROUPER}/:claimId`} element={<CodingGrouper />} />
        
        <Route path={ROUTES.READINESS} element={<ClaimReadiness />} />
        <Route path={`${ROUTES.READINESS}/:claimId`} element={<ClaimReadiness />} />
        
        <Route path={ROUTES.RISK} element={<RiskEngine />} />
        <Route path={`${ROUTES.RISK}/:claimId`} element={<RiskEngine />} />

        <Route path={ROUTES.INTEGRATION} element={<Integration />} />
        <Route path={ROUTES.MOCK} element={<MockSandbox />} />
        <Route path={ROUTES.SIMRS} element={<SimrsIntegration />} />
        <Route path={ROUTES.SMART_INTAKE} element={<SmartDocumentIntake />} />
        <Route path={ROUTES.IMPORT} element={<ImportData />} />
        <Route path={ROUTES.MAPPING} element={<SimrsIntegration />} />
        <Route path={ROUTES.SYNC_MONITOR} element={<LocalQueue />} />
        <Route path={ROUTES.INTEGRATION_LOGS} element={<Integration />} />
        <Route path={ROUTES.LOCAL_MODELS} element={<LocalModels />} />
        <Route path={ROUTES.LOCAL_HEALTH} element={<LocalHealth />} />
        <Route path={ROUTES.LOCAL_QUEUE} element={<LocalQueue />} />
        <Route path={ROUTES.TEST_CENTER} element={<TestCenter />} />
        <Route path={ROUTES.DEMO_CENTER} element={<DemoDataCenter />} />
        <Route path={ROUTES.SYSTEM_REPORT} element={<SystemReport />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
        <Route path={ROUTES.DOCUMENTATION} element={<Documentation />} />
        <Route path="/dokumentasi/:slug" element={<Documentation />} />
        <Route path={ROUTES.FAQ} element={<FAQ />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />
        
        {/* Admin Console Routes */}
        <Route path={ROUTES.ADMIN} element={<Admin />} />
        <Route path={ROUTES.ADMIN_DATABASE} element={<AdminDatabaseConsole />} />

        {/* Backward Compatibility & Alias Redirects */}
        <Route path="/integrasi/dokumen" element={<Navigate to={ROUTES.SMART_INTAKE} replace />} />
        <Route path="/claims" element={<Navigate to={ROUTES.CLAIMS} replace />} />
        <Route path="/integration" element={<Navigate to={ROUTES.INTEGRATION} replace />} />
        <Route path="/integration/mock" element={<Navigate to={ROUTES.MOCK} replace />} />
        <Route path="/integration/logs" element={<Navigate to={ROUTES.INTEGRATION_LOGS} replace />} />
        <Route path="/simrs" element={<Navigate to={ROUTES.SIMRS} replace />} />
        <Route path="/import" element={<Navigate to={ROUTES.IMPORT} replace />} />
        <Route path="/sync" element={<Navigate to={ROUTES.SYNC_MONITOR} replace />} />
        <Route path="/demo-data" element={<Navigate to={ROUTES.DEMO_CENTER} replace />} />
        <Route path="/system-report" element={<Navigate to={ROUTES.SYSTEM_REPORT} replace />} />
        <Route path="/settings" element={<Navigate to={ROUTES.SETTINGS} replace />} />

        {/* 404 Fallback Boundary */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center h-[50vh] p-8 text-center font-mono">
            <h2 className="text-2xl font-bold text-slate-800 uppercase">404 - Halaman Tidak Ditemukan</h2>
            <p className="text-slate-500 mt-2 text-sm font-sans">Target URL yang Anda tuju tidak terdaftar di BPJS Optimizer Route Registry.</p>
          </div>
        } />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <HospitalProvider>
      <ClaimProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ClaimProvider>
    </HospitalProvider>
  )
}
