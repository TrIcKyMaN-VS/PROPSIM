const fs = require('fs');
let content = fs.readFileSync('components/app/import-dialog.tsx', 'utf8');

if (!content.includes('import { DatePicker }')) {
  content = content.replace('import { Button } from "@/components/ui/button"', 'import { Button } from "@/components/ui/button"\nimport { DatePicker } from "@/components/ui/date-picker"');
  fs.writeFileSync('components/app/import-dialog.tsx', content, 'utf8');
}
