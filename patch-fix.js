const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');
const lines = content.split('\n');

const formStart = 52; // 0-indexed (line 53)
const formEnd = 186;  // 0-indexed (line 187 is `  );`)

// Extract the form block
const formBlock = lines.slice(formStart, formEnd + 1);

// Remove it from its current position
lines.splice(formStart, formEnd - formStart + 1);

// Find where WeeklyReviewPage starts, specifically where state variables are declared
const weeklyReviewStart = lines.findIndex(l => l.includes('export default function WeeklyReviewPage() {'));

// Insert it right after the component declaration (after the state declarations, maybe around line 170)
const insertTarget = lines.findIndex(l => l.includes('const [deleteMissedId, setDeleteMissedId] = useState<string | null>(null);'));

lines.splice(insertTarget + 1, 0, ...formBlock);

fs.writeFileSync('app/app/weekly-review/page.tsx', lines.join('\n'), 'utf8');
console.log('Moved renderMissedForm to inside WeeklyReviewPage!');
