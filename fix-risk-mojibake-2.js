const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('riskPct != null ?')) {
    lines[i] = '                      {riskPct != null ? `${riskPct.toFixed(2)}%` : "--"}';
  }
  if (lines[i].includes('rMultiple != null ?')) {
    lines[i] = '                      {rMultiple != null ? `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R` : "--"}';
  }
}

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', lines.join('\n'), 'utf8');