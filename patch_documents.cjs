const fs = require('fs');
let code = fs.readFileSync('server/routes/documents.ts', 'utf8');

const replacement = `
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              prompt,
              { inlineData: { data: fileData, mimeType } }
            ],
            config: {
              responseMimeType: "application/json",
            }
          });
          break;
        } catch (e) {
          if (e.status === 429 || (e.message && e.message.includes('429'))) {
            retries--;
            if (retries === 0) throw e;
            console.log("Rate limited, waiting 10s...");
            await new Promise(r => setTimeout(r, 10000));
          } else {
            throw e;
          }
        }
      }
`;

code = code.replace(
  /      const response = await ai\.models\.generateContent\(\{[\s\S]*?\}\);/,
  replacement
);

fs.writeFileSync('server/routes/documents.ts', code);
