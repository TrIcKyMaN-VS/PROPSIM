const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

content = content.replace(/<Input\s+value=\{rule\.when\}/g, '<AutoTextarea value={rule.when}');
content = content.replace(/<Input\s+value=\{rule\.then\}/g, '<AutoTextarea value={rule.then}');
content = content.replace(/<Input\s+value=\{rule\.from\}/g, '<AutoTextarea value={rule.from}');
content = content.replace(/<Input\s+value=\{ruleSavedMost\}/g, '<AutoTextarea value={ruleSavedMost}');
content = content.replace(/<Input\s+value=\{ruleFilteredGoodTrade\}/g, '<AutoTextarea value={ruleFilteredGoodTrade}');
content = content.replace(/<Input\s+value=\{oneRuleNotBreak\}/g, '<AutoTextarea value={oneRuleNotBreak}');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
