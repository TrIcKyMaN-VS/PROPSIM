const fs = require('fs');

const files = [
  'app/app/daily/page.tsx',
  'app/app/journal/new/page.tsx',
  'app/app/journal/[tradeId]/page.tsx',
  'app/app/weekly-review/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/item\.getFile\(\)/g, "item.getAsFile()");
    fs.writeFileSync(file, content, 'utf8');
  }
}