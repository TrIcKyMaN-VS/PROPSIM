const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('<Dialog open={!!expandedImage} onOpenChange={o => { if (!o) { setExpandedImage(null); setIsZoomed(false) } }}>'));
if (startIdx !== -1) {
  let endIdx = startIdx;
  while (!lines[endIdx].includes('</Dialog>')) endIdx++;
  
  // We only delete if it's the FIRST occurrence (the broken one at the top)
  if (startIdx < 200) {
    lines.splice(startIdx, endIdx - startIdx + 1);
    fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', lines.join('\n'), 'utf8');
    console.log("Deleted first duplicated Dialog");
  }
}