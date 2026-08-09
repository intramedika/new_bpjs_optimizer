const fs = require('fs');
let code = fs.readFileSync('server/routes/documents.ts', 'utf8');

code = code.replace(
  /  \} catch \(error\) \{\n    console\.error\("Document extraction error:", error\);\n    res\.status\(500\)\.json\(\{ error: "Failed to extract document data" \}\);\n  \}/g,
  `  } catch (error: any) {
    console.error("Document extraction error:", error);
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      res.status(429).json({ error: "Rate limit exceeded. Please wait a few moments and try again." });
    } else {
      res.status(500).json({ error: "Failed to extract document data" });
    }
  }`
);

fs.writeFileSync('server/routes/documents.ts', code);
