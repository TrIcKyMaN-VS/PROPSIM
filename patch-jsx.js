const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

// Fix the ruined buttons
content = content.replace(
  /\{uploadingImg \? <><Loader2 className="w-3 h-3 mr-1 animate-spin" \/>Uploading\.\.\.<\/> : editingMissedId \? "Save Changes" : "\\u2014"\}/,
  '{uploadingImg ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading...</> : editingMissedId ? "Save Changes" : "Add Missed Trade"}'
);

content = content.replace(
  /\{showMissedForm && !editingMissedId \? "Cancel" : "\\u2014"\}/,
  '{showMissedForm && !editingMissedId ? "Cancel" : "+ Add Missed Setup"}'
);

// Fix the JSX text nodes to use HTML entities
content = content.replace(/\(free text \\u2014 be honest\)/g, '(free text &mdash; be honest)');
content = content.replace(/\\u26A0\\uFE0F Hindsight Reality Check/g, '&#x26A0;&#xFE0F; Hindsight Reality Check');
content = content.replace(/\\u2014 I had a clear plan/g, '&mdash; I had a clear plan');
content = content.replace(/\\u2014 not sure/g, '&mdash; not sure');
content = content.replace(/\\u2014 only obvious/g, '&mdash; only obvious');
content = content.replace(/>\\u2014<\/span>/g, '>&mdash;</span>');
content = content.replace(/\{t\.estimatedR\} \\u2022 \{t\.outcome\.toUpperCase\(\)\}/g, '{t.estimatedR} &bull; {t.outcome.toUpperCase()}');
content = content.replace(/\\u2713 Rule saved you/g, '&#x2713; Rule saved you');
content = content.replace(/\(maybe \\u2014 unconfirmed\)/g, '(maybe &mdash; unconfirmed)');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');