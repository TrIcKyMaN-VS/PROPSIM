const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

if (!content.includes('import { DatePicker }')) {
  content = content.replace('import { Input } from "@/components/ui/input"', 'import { Input } from "@/components/ui/input"\nimport { DatePicker } from "@/components/ui/date-picker"');
  fs.writeFileSync('app/app/daily/page.tsx', content, 'utf8');
}
