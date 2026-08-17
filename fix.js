const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

// Fix redVerdict button className
content = content.replace(
  /className=\{px-3 py-1\.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all \}/g,
  'className={px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all {redVerdict === v ? (v === "Good process" ? "bg-green-500/20 text-green-500 border-green-500/50" : "bg-destructive/20 text-destructive border-destructive/50") : "border-border text-muted-foreground hover:border-primary/40"}}'
);

// Fix Your answer
content = content.replace(/Your answer/g, "Your answer...");

fs.writeFileSync('app/app/daily/page.tsx', content, 'utf8');
