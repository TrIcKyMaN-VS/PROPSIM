const fs = require('fs');
const content = fs.readFileSync('app/actions/weekly-review-ai-actions.ts', 'utf8');
console.log(content.includes('prisma.trade.findMany'));
