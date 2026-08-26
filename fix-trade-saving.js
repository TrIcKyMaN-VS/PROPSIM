const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

// Add saving state
content = content.replace(
  'const [loading, setLoading] = useState(true)',
  'const [loading, setLoading] = useState(true)\n  const [saving, setSaving] = useState(false)'
);

// Update handleSave
content = content.replace(
  'const handleSave = async () => {\n    if (!trade) return',
  'const handleSave = async () => {\n    if (!trade) return\n    setSaving(true)\n    try {'
);

// Close try block and add finally
content = content.replace(
  /toast\.success\("Trade updated successfully"\)\n\s*\}\n/,
  'toast.success("Trade updated successfully")\n    } catch (e) {\n      toast.error("Failed to save changes")\n    } finally {\n      setSaving(false)\n    }\n  }\n'
);

// Update button
content = content.replace(
  '<Button onClick={handleSave} size="sm">Save</Button>',
  '<Button onClick={handleSave} size="sm" disabled={saving}>{saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}{saving ? "Saving..." : "Save"}</Button>'
);

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');