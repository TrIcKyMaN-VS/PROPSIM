const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{trade.exitTime && `')) {
    lines[i] = `                {trade.exitTime && \` &mdash; \${formatDisplayTime(trade.exitTime, displayTimeMode)}\`}`;
  }
  if (lines[i].includes('holdDuration !==')) {
    lines[i] = `                {holdDuration !== "--" && <span className="ml-1.5 text-muted-foreground/60">&middot; {holdDuration}</span>}`;
  }
  if (lines[i].includes('value: trade.exit ? `$${trade.exit?.toLocaleString()}` :')) {
    lines[i] = `                  { label: "EXIT PRICE",    value: trade.exit ? \`$\${trade.exit?.toLocaleString()}\` : "--" },`;
  }
  if (lines[i].includes('value: trade.exitTime ? formatDisplayDateTime(trade.exitTime,')) {
    lines[i] = `                  { label: "EXIT DATE",     value: trade.exitTime ? formatDisplayDateTime(trade.exitTime, displayTimeMode) : "--" },`;
  }
}

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', lines.join('\n'), 'utf8');