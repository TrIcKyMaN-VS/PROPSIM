const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

if (!content.includes('WeekPicker')) {
  content = content.replace('import { Input } from "@/components/ui/input";', 'import { Input } from "@/components/ui/input";\nimport { WeekPicker } from "@/components/ui/week-picker";');
}

content = content.replace(/<Input\s+type="week"\s+value=\{weekOf\}\s+onChange=\{\(e\) => setWeekOf\(e\.target\.value\)\}\s*\/>/g, '<WeekPicker value={weekOf} onChange={setWeekOf} />');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
