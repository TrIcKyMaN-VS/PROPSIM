const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

// Replace the hardcoded overflow-hidden with min-h-[40px] to make it single line by default
content = content.replace('className={props.className + " resize-none overflow-hidden"}', 'className={props.className + " resize-none overflow-hidden min-h-[40px]"}');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
