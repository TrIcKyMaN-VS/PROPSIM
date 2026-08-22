const fs = require('fs');
let content = fs.readFileSync('components/app/calendar/daily-replay-sheet.tsx', 'utf8');

// Remove the Mistakes badge from the header row
content = content.replace('{mistakesVal && <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0">Mistakes</Badge>}', '');

fs.writeFileSync('components/app/calendar/daily-replay-sheet.tsx', content, 'utf8');
