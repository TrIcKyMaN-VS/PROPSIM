const fs = require('fs');
let content = fs.readFileSync('components/app/calendar/daily-replay-sheet.tsx', 'utf8');

// Replace sm:max-w-2xl with sm:max-w-4xl
content = content.replace('sm:max-w-2xl', 'sm:max-w-4xl');

fs.writeFileSync('components/app/calendar/daily-replay-sheet.tsx', content, 'utf8');
