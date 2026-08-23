const fs = require('fs');

const files = [
  'components/app/equity-chart.tsx',
  'components/app/compare-view.tsx',
  'components/landing/hero-preview.tsx',
  'components/app/analytics-view.tsx',
  'app/admin/analytics/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove the old import dynamic at the top
  content = content.replace('import dynamic from "next/dynamic"\n', '');
  
  // Ensure "use client" is at the very top, and import dynamic is right after
  if (content.includes('"use client"')) {
    content = content.replace('"use client"', '"use client"\nimport dynamic from "next/dynamic"');
  } else {
    content = 'import dynamic from "next/dynamic"\n' + content;
  }
  
  fs.writeFileSync(file, content, 'utf8');
}
