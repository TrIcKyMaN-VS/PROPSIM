const fs = require('fs');
let content = fs.readFileSync('app/app/journal/page.tsx', 'utf8');

// Remove TableHead
content = content.replace('<TableHead>Playbook</TableHead>', '');

// Remove TableCell
const cellStart = content.indexOf('{/* Playbook */}');
if (cellStart !== -1) {
  const cellEnd = content.indexOf('</TableCell>', cellStart) + '</TableCell>'.length;
  content = content.substring(0, cellStart) + content.substring(cellEnd);
} else {
  // If no comment, find by exact match roughly
  const regex = /<TableCell className="text-sm max-w-\[140px\] truncate">[\s\S]*?\{trade\.playbookName \? \([\s\S]*?<\/TableCell>/;
  content = content.replace(regex, '');
}

fs.writeFileSync('app/app/journal/page.tsx', content, 'utf8');