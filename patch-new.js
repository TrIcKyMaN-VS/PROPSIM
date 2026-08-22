const fs = require('fs');
let content = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8');

if (!content.includes('DatePicker')) {
  content = content.replace('import { Input } from "@/components/ui/input"', 'import { Input } from "@/components/ui/input"\nimport { DatePicker } from "@/components/ui/date-picker"');
}

content = content.replace(/<Input type="date"[^>]*?value=\{form\.date\}[^>]*?onChange=\{e => setForm\(\{\.\.\.form, date: e\.target\.value\}\)\}[^>]*?\/>/, '<DatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />');

fs.writeFileSync('app/app/journal/new/page.tsx', content, 'utf8');
