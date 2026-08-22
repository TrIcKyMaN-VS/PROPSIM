const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

// The rules section
content = content.replace(
  '<Input\n                      value={rule.when}',
  '<AutoTextarea\n                      value={rule.when}'
);
content = content.replace(
  '<Input\n                      value={rule.then}',
  '<AutoTextarea\n                      value={rule.then}'
);
content = content.replace(
  '<Input\n                      value={rule.from}',
  '<AutoTextarea\n                      value={rule.from}'
);

// Comparison section
content = content.replace(
  '<Input\n                  value={ruleSavedMost}',
  '<AutoTextarea\n                  value={ruleSavedMost}'
);
content = content.replace(
  '<Input\n                  value={ruleFilteredGoodTrade}',
  '<AutoTextarea\n                  value={ruleFilteredGoodTrade}'
);

// Commitment section
content = content.replace(
  '<Input\n                value={oneRuleNotBreak}',
  '<AutoTextarea\n                value={oneRuleNotBreak}'
);

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
