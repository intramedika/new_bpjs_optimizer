const fs = require('fs');
let code = fs.readFileSync('src/pages/ImportData.tsx', 'utf8');

code = code.replace(
  "            {uploadState === 'done' && (",
  `            {uploadState === 'error' as any && (
              <div className="border border-amber-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-amber-50 relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                    <AlertCircle className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Impor Gagal</h3>
                  <p className="text-sm font-medium text-slate-600 mt-2">{errorMsg}</p>
                  <div className="mt-8 flex gap-3">
                    <Button variant="outline" className="text-xs font-bold bg-white" onClick={() => setUploadState('idle')}>Coba Lagi</Button>
                  </div>
                </div>
              </div>
            )}
            {uploadState === 'done' && (`
);

fs.writeFileSync('src/pages/ImportData.tsx', code);
