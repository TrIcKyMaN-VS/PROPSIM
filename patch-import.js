const fs = require('fs');
let content = fs.readFileSync('components/app/import-dialog.tsx', 'utf8');

if (!content.includes('DatePicker')) {
  content = content.replace('import { Input } from "@/components/ui/input"', 'import { Input } from "@/components/ui/input"\nimport { DatePicker } from "@/components/ui/date-picker"');
}

content = content.replace(/<input\s+type="date"\s+value=\{importStartDate\}\s+onChange=\{\(e\) => setImportStartDate\(e\.target\.value\)\}\s+className="[^"]+"\s*\/>/g, '<DatePicker value={importStartDate} onChange={setImportStartDate} />');
content = content.replace(/<input\s+type="date"\s+value=\{importEndDate\}\s+onChange=\{\(e\) => setImportEndDate\(e\.target\.value\)\}\s+className="[^"]+"\s*\/>/g, '<DatePicker value={importEndDate} onChange={setImportEndDate} />');

fs.writeFileSync('components/app/import-dialog.tsx', content, 'utf8');
