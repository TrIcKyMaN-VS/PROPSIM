const fs = require("fs");
let content = fs.readFileSync("app/app/weekly-review/page.tsx", "utf8");

// After every setRuleEvaluations([]) that is a form reset (not the catch), add setMissedTrades([])
// The "else" reset and the "Reset form" reset need missedTrades reset too
// Pattern: setRuleEvaluations([]); followed by newline + spaces + } (closing block)
content = content.replace(
  /setRuleEvaluations\(\[\]\);\n(\s+)\}/g,
  (match, spaces) => `setRuleEvaluations([]);\n${spaces}setMissedTrades([]);\n${spaces}}`
);

fs.writeFileSync("app/app/weekly-review/page.tsx", content, "utf8");
console.log("Done: added missedTrades resets");
