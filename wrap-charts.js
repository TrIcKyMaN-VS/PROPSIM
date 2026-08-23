const fs = require('fs');

function wrapComponent(filePath, componentName) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("import dynamic from")) {
    content = 'import dynamic from "next/dynamic"\n' + content;
  }
  
  // Replace `export function Name` with `function NameInner`
  content = content.replace(new RegExp(`export function ${componentName}\\b`), `function ${componentName}Inner`);
  
  // Append dynamic export
  content += `\nexport const ${componentName} = dynamic(() => Promise.resolve(${componentName}Inner), { ssr: false });\n`;
  
  fs.writeFileSync(filePath, content, 'utf8');
}

wrapComponent('components/app/equity-chart.tsx', 'EquityChart');
wrapComponent('components/app/compare-view.tsx', 'CompareView');
wrapComponent('components/landing/hero-preview.tsx', 'HeroPreview');

// analytics-view.tsx was already wrapped in its page, but let's do it internally and revert the page.
wrapComponent('components/app/analytics-view.tsx', 'AnalyticsView');
