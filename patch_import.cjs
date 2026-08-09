const fs = require('fs');
let code = fs.readFileSync('src/pages/ImportData.tsx', 'utf8');

code = code.replace(
  "  const simulateUpload = () => {\n    setUploadState('uploading')\n    setTimeout(() => {\n      setUploadState('validating')\n      setTimeout(() => {\n        setUploadState('done')\n      }, 2000)\n    }, 1500)\n  }",
  `  const [errorMsg, setErrorMsg] = useState("");
  const simulateUpload = async () => {
    setUploadState('uploading');
    try {
      const res = await fetch('/api/import/e-klaim', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || data.error);
        setUploadState('error' as any);
      } else {
        setUploadState('done');
      }
    } catch (err) {
      setErrorMsg("Network error");
      setUploadState('error' as any);
    }
  }`
);

fs.writeFileSync('src/pages/ImportData.tsx', code);
