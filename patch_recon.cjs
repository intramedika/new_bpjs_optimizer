const fs = require('fs');
let code = fs.readFileSync('src/pages/Reconciliation.tsx', 'utf8');

code = code.replace(
  "Integrasi import otomatis E-Klaim belum terkonfigurasi.",
  "Status: NOT CONFIGURED (E-Klaim import credentials required)"
);
code = code.replace(
  "<button disabled className=\"w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-lg text-sm mb-2 flex items-center justify-center gap-2\">",
  "<button disabled className=\"w-full bg-amber-50 text-amber-700 font-bold py-3 rounded-lg text-sm mb-2 flex items-center justify-center gap-2 border border-amber-200\">"
);

fs.writeFileSync('src/pages/Reconciliation.tsx', code);
