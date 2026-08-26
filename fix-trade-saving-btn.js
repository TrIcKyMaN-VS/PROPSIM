const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

// Update button
content = content.replace(
  '<Button onClick={handleSave} size="sm">Save</Button>',
  '<Button onClick={handleSave} size="sm" disabled={saving}>{saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}{saving ? "Saving..." : "Save"}</Button>'
);

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');