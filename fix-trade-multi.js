const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

// 1. handleFileUpload to support multiple
content = content.replace(
  /const handleFileUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\)\n\s*e\.target\.value = ""\n\s*\}/,
  `const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !trade) return
    
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader()
      reader.onloadend = async () => {
        await addScreenshot(trade.id, \`gallery-\${Date.now()}-\${index}\`, reader.result as string)
        toast.success("Screenshot uploaded!")
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }`
);

// 2. handlePaste to support Date.now()-paste
content = content.replace(
  /await addScreenshot\(trade\.id, \`gallery-\$\{Date\.now\(\)\}\`, reader\.result as string\)/,
  `await addScreenshot(trade.id, \`gallery-\${Date.now()}-paste\`, reader.result as string)`
);

// 3. Delete confirmation
content = content.replace(
  /const handleDeleteScreenshot = async \(id: string\) => \{/,
  `const handleDeleteScreenshot = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this screenshot?")) return;`
);

// 4. Input multiple
content = content.replace(
  /<input id="sc-upload" type="file" accept="image\/\*" className="hidden" onChange=\{handleFileUpload\} \/>/g,
  `<input id="sc-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />`
);
content = content.replace(
  /<input id="sc-upload-more" type="file" accept="image\/\*" className="hidden" onChange=\{handleFileUpload\} \/>/g,
  `<input id="sc-upload-more" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />`
);

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');