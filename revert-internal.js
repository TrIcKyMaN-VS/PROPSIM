const fs = require('fs');

const files = [
  { path: 'components/app/equity-chart.tsx', name: 'EquityChart' },
  { path: 'components/app/compare-view.tsx', name: 'CompareView' },
  { path: 'components/landing/hero-preview.tsx', name: 'HeroPreview' },
  { path: 'components/app/analytics-view.tsx', name: 'AnalyticsView' },
  { path: 'app/admin/analytics/page.tsx', name: 'AdminAnalyticsPage' }
];

for (const {path, name} of files) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace('import dynamic from "next/dynamic"\n', '');
  content = content.replace(new RegExp(`function ${name}Inner`), `export function ${name}`);
  content = content.replace(new RegExp(`export const ${name} = dynamic[^;]+;\\n?`), '');
  content = content.replace(new RegExp(`export default dynamic[^;]+;\\n?`), '');
  
  fs.writeFileSync(path, content, 'utf8');
}
