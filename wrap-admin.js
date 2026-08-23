const fs = require('fs');

let content = fs.readFileSync('app/admin/analytics/page.tsx', 'utf8');

if (!content.includes("import dynamic from")) {
  content = content.replace('"use client"\n', '"use client"\nimport dynamic from "next/dynamic"\n');
  content = content.replace('export default function AdminAnalyticsPage', 'function AdminAnalyticsPageInner');
  content += '\nexport default dynamic(() => Promise.resolve(AdminAnalyticsPageInner), { ssr: false });\n';
  fs.writeFileSync('app/admin/analytics/page.tsx', content, 'utf8');
}
