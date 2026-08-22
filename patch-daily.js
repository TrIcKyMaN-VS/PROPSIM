const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

if (!content.includes('DatePicker')) {
  content = content.replace('import { CheckSquare', 'import { DatePicker } from "@/components/ui/date-picker"\nimport { CheckSquare');
}

content = content.replace(/<input type="date"[^>]*?value=\{date\}[^>]*?onChange=\{e => setDate\(e\.target\.value\)\}[^>]*?\/>/, '<DatePicker value={date} onChange={setDate} className="w-[180px] bg-background" />');

fs.writeFileSync('app/app/daily/page.tsx', content, 'utf8');
