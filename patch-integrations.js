const fs = require('fs');
let content = fs.readFileSync('app/app/settings/integrations/page.tsx', 'utf8');

if (!content.includes('DatePicker')) {
  content = content.replace('import { Input } from "@/components/ui/input"', 'import { Input } from "@/components/ui/input"\nimport { DatePicker } from "@/components/ui/date-picker"');
}

content = content.replace(/<Input\s+type="date"\s+value=\{syncStartDate\}\s+onChange=\{e => setSyncStartDate\(e\.target\.value\)\}\s*\/>/g, '<DatePicker value={syncStartDate} onChange={setSyncStartDate} />');
content = content.replace(/<Input\s+type="date"\s+value=\{syncEndDate\}\s+onChange=\{e => setSyncEndDate\(e\.target\.value\)\}\s*\/>/g, '<DatePicker value={syncEndDate} onChange={setSyncEndDate} />');

fs.writeFileSync('app/app/settings/integrations/page.tsx', content, 'utf8');
