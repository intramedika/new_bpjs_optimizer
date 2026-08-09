import { useState, useEffect } from "react"
import { ShieldCheck, Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Play, Search, Filter, Layers, Server } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { cn } from "../lib/utils"
import { useHospitalContext } from "../context/HospitalContext"

type TestStatus = 'PASS' | 'FAIL' | 'NOT CONFIGURED' | 'TESTING' | 'PENDING'

interface TestItem {
  id: number
  code: string
  name: string
  category: string
  status: TestStatus
  details: string
}

export default function TestCenter() {
  const { currentUser } = useHospitalContext()
  const [isTesting, setIsTesting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [summary, setSummary] = useState<{ total: number; pass: number; fail: number; notConfigured: number } | null>(null)
  
  const [tests, setTests] = useState<TestItem[]>([
    { id: 1, code: 'TEST_001', name: 'TXT Import', category: 'Import Pipeline', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 2, code: 'TEST_002', name: 'CSV Import', category: 'Import Pipeline', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 3, code: 'TEST_003', name: 'PDF Upload', category: 'Document Ingestion', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 4, code: 'TEST_004', name: 'Multi-file Upload', category: 'Document Ingestion', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 5, code: 'TEST_005', name: 'Folder Upload', category: 'Document Ingestion', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 6, code: 'TEST_006', name: 'ZIP Import', category: 'Document Ingestion', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 7, code: 'TEST_007', name: 'SHA-256 Hashing', category: 'Integrity', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 8, code: 'TEST_008', name: 'Deduplication', category: 'Integrity', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 9, code: 'TEST_009', name: 'OCR Processing', category: 'AI & OCR', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 10, code: 'TEST_010', name: 'Clinical Extraction', category: 'AI & OCR', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 11, code: 'TEST_011', name: 'Coding Rules', category: 'Clinical Intelligence', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 12, code: 'TEST_012', name: 'Validation Engine', category: 'Clinical Intelligence', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 13, code: 'TEST_013', name: 'Grouper Engine', category: 'Grouper', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 14, code: 'TEST_014', name: 'Claim Readiness', category: 'Scoring', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 15, code: 'TEST_015', name: 'Risk Engine', category: 'Risk', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 16, code: 'TEST_016', name: 'E-Klaim Connection', category: 'Integration', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 17, code: 'TEST_017', name: 'E-Klaim Diagnosis', category: 'Integration', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 18, code: 'TEST_018', name: 'E-Klaim Procedure', category: 'Integration', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 19, code: 'TEST_019', name: 'E-Klaim Grouping', category: 'Integration', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 20, code: 'TEST_020', name: 'VClaim Connection', category: 'Integration', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 21, code: 'TEST_021', name: 'SIMRS Connection', category: 'Integration', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 22, code: 'TEST_022', name: 'Database Persistence', category: 'Persistence', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 23, code: 'TEST_023', name: 'Offline Processing', category: 'Offline-First', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 24, code: 'TEST_024', name: 'Sync Queue', category: 'Offline-First', status: 'PENDING', details: 'Waiting to execute...' },
    { id: 25, code: 'TEST_025', name: 'Export Package', category: 'Export', status: 'PENDING', details: 'Waiting to execute...' }
  ])

  const runAllTests = async () => {
    setIsTesting(true)
    
    // Set all to testing state
    setTests(prev => prev.map(t => ({ ...t, status: 'TESTING', details: 'Running empirical system acceptance check...' })))

    try {
      const response = await fetch('/api/test-center/run-all', {
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": currentUser?.userId || "usr-admin-001"
        }
      })
      const data = await response.json()
      
      if (data && Array.isArray(data.tests)) {
        setTests(data.tests)
        setSummary({
          total: data.totalTests || data.tests.length,
          pass: data.passCount || data.tests.filter((t: any) => t.status === "PASS").length,
          fail: data.failCount || data.tests.filter((t: any) => t.status === "FAIL").length,
          notConfigured: data.notConfiguredCount || data.tests.filter((t: any) => t.status === "NOT CONFIGURED").length
        })
      }
    } catch (error: any) {
      console.error("Test center execution failed:", error)
      setTests(prev => prev.map(t => ({ ...t, status: 'FAIL', details: 'Network / backend error during test execution.' })))
    } finally {
      setIsTesting(false)
    }
  }

  useEffect(() => {
    runAllTests()
  }, [])

  const categories = ["ALL", ...Array.from(new Set(tests.map(t => t.category)))]

  const filteredTests = tests.filter(t => {
    const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.details.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'PASS': return <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-bold uppercase"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> PASS</span>
      case 'FAIL': return <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 px-2.5 py-1 rounded font-bold uppercase"><XCircle className="w-3.5 h-3.5 text-red-600" /> FAIL</span>
      case 'NOT CONFIGURED': return <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2.5 py-1 rounded font-bold uppercase"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> NOT CONFIGURED</span>
      case 'TESTING': return <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 px-2.5 py-1 rounded font-bold uppercase"><Activity className="w-3.5 h-3.5 animate-spin text-blue-600" /> TESTING...</span>
      default: return <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-400 px-2.5 py-1 rounded font-bold uppercase">PENDING</span>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 font-mono text-xs max-w-[1600px] mx-auto p-4 md:p-6 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase font-mono">BPJS OPTIMIZER TEST CENTER</h1>
            <Badge className="bg-blue-600 text-white font-bold text-[10px]">AUTOMATED SUITE</Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">Real acceptance testing suite untuk pengujian empiris seluruh komponen, modul, & arsitektur end-to-end.</p>
        </div>

        <Button onClick={runAllTests} disabled={isTesting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm font-mono">
          {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {isTesting ? 'Menjalankan Tes System...' : `[ Jalankan Ulang Tes ]`}
        </Button>
      </div>

      {/* Metric Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <Card className="border border-slate-200 p-4 bg-white shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Scenarios</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{summary.total}</span>
          </Card>
          
          <Card className="border border-emerald-300 p-4 bg-emerald-50/40 shadow-sm border-l-4 border-l-emerald-500">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">PASSED</span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">{summary.pass}</span>
          </Card>

          <Card className="border border-red-300 p-4 bg-red-50/40 shadow-sm border-l-4 border-l-red-500">
            <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest block">FAILED</span>
            <span className="text-2xl font-bold text-red-700 mt-1 block">{summary.fail}</span>
          </Card>

          <Card className="border border-amber-300 p-4 bg-amber-50/40 shadow-sm border-l-4 border-l-amber-500">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">NOT CONFIGURED</span>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">{summary.notConfigured}</span>
          </Card>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="border border-slate-200 shadow-sm p-4 bg-white space-y-3 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tes (e.g. OCR, Grouper, RBAC)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 font-bold"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all shrink-0",
                  selectedCategory === cat ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Test Execution Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between bg-slate-50">
          <div>
            <CardTitle className="text-xs font-bold uppercase text-slate-800">
              Tabel Pengujian Sistem Empiris ({filteredTests.length} Scenarios)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 font-sans mt-0.5">
              Menampilkan rincian hasil tes per komponen sistem.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border-blue-200">
            VERIFIED ACCEPTANCE
          </Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-[650px]">
          <table className="w-full text-left font-mono">
            <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Kode / Modul</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status Execution</th>
                <th className="px-4 py-3">Hasil Empiris & Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredTests.map(test => (
                <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 text-xs">{test.name}</p>
                    <p className="text-[10px] font-bold text-blue-600">{test.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[9px] font-bold uppercase">
                      {test.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(test.status)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-sans">
                    <p className="text-xs font-medium">{test.details || '-'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
