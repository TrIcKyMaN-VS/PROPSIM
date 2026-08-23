const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

content = content.replace(/\{\/\* Help Status.*?only if followed \*\/\}/, '{/* Help Status \\u2014 only if followed */}');
content = content.replace(/\{\/\* Adjustment note.*?only if verdict is adjust \*\/\}/, '{/* Adjustment note \\u2014 only if verdict is adjust */}');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');