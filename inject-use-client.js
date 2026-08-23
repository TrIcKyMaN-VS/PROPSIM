const fs = require('fs');

const files = [
  'app/admin/analytics/page.tsx',
  'app/app/analytics/page.tsx',
  'app/app/compare/page.tsx',
  'app/app/replay/page.tsx',
  'app/app/simulator/page.tsx',
  'components/app/dashboard-view.tsx',
  'components/landing/hero.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('"use client"')) {
    content = '"use client"\n' + content;
    fs.writeFileSync(file, content, 'utf8');
  }
}
