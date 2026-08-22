const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

content = content.replace('<AutoTextarea \n      {...props}', '<Textarea \n      {...props}');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
