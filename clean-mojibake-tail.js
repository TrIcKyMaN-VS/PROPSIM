const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

// The mojibake blocks seem to be large sequences starting with AA
content = content.replace(/A['A+?T,A.s]+\n?/g, '');

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');