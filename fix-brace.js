const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8').split('\n');
const uiIdx = lines.findIndex(l => l.includes('            )}'));
if (lines[uiIdx + 1].includes('            )}')) {
  lines.splice(uiIdx + 1, 1);
}
fs.writeFileSync('app/app/journal/new/page.tsx', lines.join('\n'), 'utf8');