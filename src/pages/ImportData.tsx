import * as React from "react"
import { useState, useRef } from "react"
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, ArrowRight, Check, X, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Progress } from "../components/ui/Progress"
import { Claim } from "../types"
import { formatRupiah } from "../lib/utils"

export default function ImportData() {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploadState, setUploadState] = useState<'idle' | 'parsing' | 'preview' | 'persisting' | 'done' | 'error'>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<{
    fileName: string;
    format: string;
    delimiter: string;
    totalRows: number;
    validCount: number;
    invalidCount: number;
    claims: Claim[];
    errors: Array<{ row: number; column: string; value: string; stage: string; error: string }>;
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState("");
  const [importLogs, setImportLogs] = useState<Array<{ id: number; file: string; status: string; count: number; time: string; error?: string }>>([
    { id: 1, file: 'eklaim_export_20260808.txt', status: 'success', count: 128, time: '2 jam lalu' },
    { id: 2, file: 'eklaim_export_20260807.txt', status: 'success', count: 142, time: '1 hari lalu' },
  ])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file)
    setUploadState('parsing')
    setErrorMsg("")

    try {
      const text = await file.text()
      const res = await fetch('/api/import/e-klaim/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileContent: text })
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.message || data.error || "Gagal memproses file")
        setUploadState('error')
      } else {
        setParseResult(data)
        setUploadState('preview')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg("Gagal membaca file: " + (err.message || "Network error"))
      setUploadState('error')
    }
  }

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.claims.length === 0) return;
    setUploadState('persisting');

    try {
      const res = await fetch('/api/import/e-klaim/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims: parseResult.claims })
      });

      const data = await res.json();
      if (res.ok) {
        setUploadState('done');
        setImportLogs(prev => [
          {
            id: Date.now(),
            file: parseResult.fileName,
            status: 'success',
            count: parseResult.validCount,
            time: 'Baru saja'
          },
          ...prev
        ]);
      } else {
        setErrorMsg(data.message || data.error || "Gagal menyimpan data klaim");
        setUploadState('error');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Network error saat menyimpan klaim");
      setUploadState('error');
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Impor Data E-Klaim</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Unggah file ekstraksi E-Klaim (TXT/CSV/JSON) untuk dianalisis oleh BPJS Optimizer.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {uploadState === 'preview' ? 'Pratinjau & Konfirmasi Data' : 'Area Unggah Berkas'}
            </CardTitle>
            <CardDescription className="text-xs font-medium mt-1">
              {uploadState === 'preview' 
                ? 'Periksa baris valid dan kesalahan format sebelum menyimpan ke antrean klaim.'
                : 'Pilih atau Drag & drop file TXT, CSV, atau JSON dari sistem E-Klaim Anda.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileInput}
              accept=".txt,.csv,.json,.xml" 
            />

            {uploadState === 'idle' && (
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 border border-slate-100">
                  <UploadCloud className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Klik atau drag berkas ke area ini</h3>
                <p className="text-xs font-medium text-slate-500 mt-2 max-w-sm">Mendukung format TXT (Pipe/Tab Delimited), CSV, atau JSON dari E-Klaim.</p>
                <div className="mt-6">
                  <Button className="font-bold text-xs bg-blue-600 hover:bg-blue-700">Pilih Berkas E-Klaim</Button>
                </div>
              </div>
            )}

            {uploadState === 'parsing' && (
              <div className="border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-slate-50 shadow-inner">
                <Loader2 className="h-10 w-10 text-blue-600 mb-4 animate-spin" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Menganalisis & Memvalidasi Format Berkas...</h3>
                <Progress value={65} className="mt-6 w-full max-w-[250px] h-2 bg-slate-200" indicatorClassName="bg-blue-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">Mendeteksi Enkodal, Delimiter & Header...</p>
              </div>
            )}

            {uploadState === 'persisting' && (
              <div className="border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-slate-50 shadow-inner">
                <Loader2 className="h-10 w-10 text-emerald-600 mb-4 animate-spin" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Menyimpan Klaim ke Database...</h3>
                <Progress value={90} className="mt-6 w-full max-w-[250px] h-2 bg-slate-200" indicatorClassName="bg-emerald-600" />
              </div>
            )}

            {uploadState === 'error' && (
              <div className="border border-red-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-red-50 relative">
                <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-100">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">Impor Gagal</h3>
                <p className="text-sm font-medium text-red-700 mt-2 max-w-md bg-white p-3 rounded-lg border border-red-200 font-mono text-xs">{errorMsg}</p>
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" className="text-xs font-bold bg-white" onClick={() => setUploadState('idle')}>Coba Lagi</Button>
                </div>
              </div>
            )}

            {uploadState === 'preview' && parseResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Format</span>
                    <span className="text-xs font-bold text-slate-800">{parseResult.format}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Delimiter</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{parseResult.delimiter === "\t" ? "TAB" : parseResult.delimiter}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Baris Valid</span>
                    <span className="text-xs font-bold text-emerald-600">{parseResult.validCount} / {parseResult.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Baris Error</span>
                    <span className="text-xs font-bold text-red-600">{parseResult.invalidCount}</span>
                  </div>
                </div>

                {parseResult.errors.length > 0 && (
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50/50">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" /> Detail Kesalahan Parser ({parseResult.errors.length} baris)
                    </h4>
                    <div className="max-h-40 overflow-y-auto rounded border border-red-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-red-100/50 sticky top-0 font-bold text-red-900">
                          <tr>
                            <th className="px-3 py-1.5">Baris</th>
                            <th className="px-3 py-1.5">Kolom</th>
                            <th className="px-3 py-1.5">Tahap</th>
                            <th className="px-3 py-1.5">Pesan Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100 font-mono text-[11px]">
                          {parseResult.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-red-50">
                              <td className="px-3 py-1 font-bold text-red-800">#{err.row}</td>
                              <td className="px-3 py-1">{err.column}</td>
                              <td className="px-3 py-1 text-slate-500">{err.stage}</td>
                              <td className="px-3 py-1 text-red-600">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Pratinjau Data Klaim ({parseResult.validCount} Data Ready)</h4>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">SEP / Klaim</th>
                          <th className="px-4 py-2">Pasien</th>
                          <th className="px-4 py-2">Diagnosis (ICD-10)</th>
                          <th className="px-4 py-2">CBG</th>
                          <th className="px-4 py-2 text-right">Tarif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parseResult.claims.map((claim, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-bold text-slate-800">{claim.sepNumber}</td>
                            <td className="px-4 py-2">{claim.patient.name} ({claim.patient.mrNumber})</td>
                            <td className="px-4 py-2">{claim.principalDiagnosisCode} - {claim.principalDiagnosis}</td>
                            <td className="px-4 py-2 font-mono">{claim.cbgCode}</td>
                            <td className="px-4 py-2 text-right font-bold text-slate-800">{formatRupiah(claim.tariff)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setUploadState('idle')}>Batal / Impor File Lain</Button>
                  <Button onClick={handleConfirmImport} disabled={parseResult.validCount === 0} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs">
                    <Check className="w-4 h-4 mr-1.5" /> Konfirmasi & Simpan {parseResult.validCount} Klaim
                  </Button>
                </div>
              </div>
            )}

            {uploadState === 'done' && parseResult && (
              <div className="border border-emerald-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-emerald-50 relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Impor Berhasil Disimpan</h3>
                  <p className="text-sm font-medium text-slate-600 mt-2">{parseResult.validCount} klaim dari berkas <span className="font-bold">{parseResult.fileName}</span> telah disimpan ke database.</p>
                  <div className="mt-8 flex gap-3">
                    <Button variant="outline" className="text-xs font-bold bg-white" onClick={() => setUploadState('idle')}>Impor Berkas Lain</Button>
                    <Button className="text-xs font-bold bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href='/klaim'}>Lihat Daftar Klaim</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800">Riwayat Impor</CardTitle>
            <CardDescription className="text-xs font-medium mt-1">Log aktivitas unggah data sebelumnya.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {importLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg border ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {log.status === 'success' ? <FileText className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{log.file}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {log.status === 'success' ? `${log.count} klaim berhasil diimpor` : <span className="text-red-500">{log.error}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
