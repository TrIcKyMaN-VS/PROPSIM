const fs = require('fs');
let content = fs.readFileSync('components/ui/dialog.tsx', 'utf8');

content = content.replace('size="icon-sm"', 'size="icon" className="absolute top-2 right-2 h-6 w-6"');

fs.writeFileSync('components/ui/dialog.tsx', content, 'utf8');
