const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

content = content.replace(/\{riskPct != null \? \`\$\\{riskPct\.toFixed\(2\)\\}%\` : "[^"]+"\}/g, '{riskPct != null ? `${riskPct.toFixed(2)}%` : "--"}');
content = content.replace(/\{rMultiple != null \? \`\$\\{rMultiple >= 0 \? "\+" : ""\\}\$\\{rMultiple\.toFixed\(2\)\\}R\` : "[^"]+"\}/g, '{rMultiple != null ? `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R` : "--"}');

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');