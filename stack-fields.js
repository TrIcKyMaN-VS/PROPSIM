const fs = require('fs');
let content = fs.readFileSync('components/app/calendar/daily-replay-sheet.tsx', 'utf8');

// 1. Revert width to 2xl
content = content.replace('sm:max-w-4xl', 'sm:max-w-2xl');

// 2. Change the 2x2 grid to a vertical stack
// Current: <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
content = content.replace('className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans"', 'className="space-y-3 font-sans"');

fs.writeFileSync('components/app/calendar/daily-replay-sheet.tsx', content, 'utf8');
