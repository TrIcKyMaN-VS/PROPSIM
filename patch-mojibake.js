const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

// 1. whyMissed comment
content = content.replace(/whyMissed: string;\s*\/\/ free text.*?user types whatever reason/, 'whyMissed: string;          // free text \\u2014 user types whatever reason');

// 2. free text be honest
content = content.replace(/\(free text.*?be honest\)/, '(free text \\u2014 be honest)');

// 3. Hindsight Reality Check warning
content = content.replace(/>.*?Hindsight Reality Check/, '>\\u26A0\\uFE0F Hindsight Reality Check');

// 4. Yes 100% - I had a clear plan
content = content.replace(/Yes, 100%<\/span>.*?I had a clear plan/, 'Yes, 100%</span> \\u2014 I had a clear plan');

// 5. Maybe - not sure
content = content.replace(/Maybe<\/span>.*?not sure I'd have seen it live/, "Maybe</span> \\u2014 not sure I'd have seen it live");

// 6. Honest no - only obvious
content = content.replace(/Honest no<\/span>.*?only obvious in hindsight/, "Honest no</span> \\u2014 only obvious in hindsight");

// 7. When ...
content = content.replace(/{ev\.when \|\| <span className="italic text-muted-foreground">.*?<\/span>}/g, '{ev.when || <span className="italic text-muted-foreground">\\u2014</span>}');

// 8. Then ...
content = content.replace(/{ev\.then \|\| <span className="italic text-muted-foreground">.*?<\/span>}/g, '{ev.then || <span className="italic text-muted-foreground">\\u2014</span>}');

// 9. Help status comment
content = content.replace(/\/\/ Help Status.*?only if followed/, '// Help Status \\u2014 only if followed');

// 10. Adjustment note comment
content = content.replace(/\/\/ Adjustment note.*?only if verdict is adjust/, '// Adjustment note \\u2014 only if verdict is adjust');

// 11. MISSED TRADES header comment
content = content.replace(/\{\/\*.*?MISSED TRADES.*?\*\/\}/, '{/* \u2501\u2501\u2501 MISSED TRADES \u2501\u2501\u2501 */}');

// 12. Estimated R bullet
content = content.replace(/{t\.estimatedR}.*?{t\.outcome\.toUpperCase\(\)}/g, '{t.estimatedR} \\u2022 {t.outcome.toUpperCase()}');

// 13. Rule saved you
content = content.replace(/>.*?Rule saved you<\/span>/g, '>\\u2713 Rule saved you</span>');

// 14. maybe - unconfirmed
content = content.replace(/\(maybe.*?unconfirmed\)/g, '(maybe \\u2014 unconfirmed)');

// 15. R missed fallback
content = content.replace(/: ".*?"\}/g, match => {
  if (match.includes('A') || match.includes('Ã')) {
    return ': "\\u2014"}';
  }
  return match;
});

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
console.log('Fixed mojibake!');