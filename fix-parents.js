const fs = require('fs');

function dynamicImportParent(filePath, importLine, componentName, importPath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(importLine)) {
    content = content.replace(importLine, `import dynamic from 'next/dynamic'\nconst ${componentName} = dynamic(() => import("${importPath}").then(m => m.${componentName}), { ssr: false })`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

// 1. Analytics
dynamicImportParent('app/app/analytics/page.tsx', 'import { AnalyticsView } from "@/components/app/analytics-view"', 'AnalyticsView', '@/components/app/analytics-view');

// 2. Compare
dynamicImportParent('app/app/compare/page.tsx', 'import { CompareView } from "@/components/app/compare-view"', 'CompareView', '@/components/app/compare-view');

// 3. Hero Preview
dynamicImportParent('components/landing/hero.tsx', 'import { HeroPreview } from "./hero-preview"', 'HeroPreview', './hero-preview');

// 4. Equity Chart (3 places)
dynamicImportParent('app/app/replay/page.tsx', 'import { EquityChart } from "@/components/app/equity-chart"', 'EquityChart', '@/components/app/equity-chart');
dynamicImportParent('app/app/simulator/page.tsx', 'import { EquityChart } from "@/components/app/equity-chart"', 'EquityChart', '@/components/app/equity-chart');
dynamicImportParent('components/app/dashboard-view.tsx', 'import { EquityChart } from "./equity-chart"', 'EquityChart', './equity-chart');

