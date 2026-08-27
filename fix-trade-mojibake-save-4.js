const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('trade.exitTime &&')) {
    lines[i] = lines[i].replace(/`[^$]+\$\{/, '` &mdash; ${');
  }
  if (lines[i].includes('holdDuration !==')) {
    lines[i] = lines[i].replace(/"[^"]+"/, '"--"');
    lines[i] = lines[i].replace(/>[^<]*\{holdDuration\}<\/span>/, '>&middot; {holdDuration}</span>');
  }
  if (lines[i].includes('value: trade.exit ?')) {
    lines[i] = lines[i].replace(/: "[^"]+" \},/, ': "--" },');
  }
  if (lines[i].includes('value: trade.exitTime ?')) {
    lines[i] = lines[i].replace(/: "[^"]+" \},/, ': "--" },');
  }
  // formatHoldDuration function return
  if (lines[i].includes('if (!ms || ms < 0) return')) {
    lines[i] = lines[i].replace(/return "[^"]+"/, 'return "--"');
  }
}

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', lines.join('\n'), 'utf8');