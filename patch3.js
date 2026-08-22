const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

content = content.replace(`import { generateWeeklyPatterns } from "@/app/actions/weekly-review-ai-actions";\n//\n} from "@/app/actions/journal-actions";`, `import { generateWeeklyPatterns } from "@/app/actions/weekly-review-ai-actions";`);

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
