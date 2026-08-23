const fs = require('fs');
let content = fs.readFileSync('components/app/equity-chart.tsx', 'utf8');

content = content.replace(
  '<Area type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2} fill="url(#equityFill)" />',
  '<Area type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2} fill="url(#equityFill)" isAnimationActive={data.length < 50} />'
);

content = content.replace(
  '<Line type="monotone" dataKey="floor" stroke="var(--color-destructive)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />',
  '<Line type="monotone" dataKey="floor" stroke="var(--color-destructive)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={data.length < 50} />'
);

fs.writeFileSync('components/app/equity-chart.tsx', content, 'utf8');
console.log('Optimized Recharts animation.');
