const fs = require('fs');
let lines = fs.readFileSync('app/app/daily/page.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('<Dialog open={!!viewImage} onOpenChange={(o) => {'));
if (startIdx !== -1) {
  let endIdx = startIdx;
  while (!lines[endIdx].includes('</Dialog>')) endIdx++;
  
  lines.splice(startIdx, endIdx - startIdx + 1);
  fs.writeFileSync('app/app/daily/page.tsx', lines.join('\n'), 'utf8');
  console.log("Deleted duplicated Dialog in daily page");
}