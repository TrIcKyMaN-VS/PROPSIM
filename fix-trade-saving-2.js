const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

// Add saving state
content = content.replace(
  'const router = useRouter()',
  'const router = useRouter()\n  const [saving, setSaving] = useState(false)'
);

// Update handleSave
content = content.replace(
  'const handleSave = async () => {\n    if (!trade) return',
  'const handleSave = async () => {\n    if (!trade) return\n    setSaving(true)\n    try {'
);

// Add try catch block
content = content.replace(
  'toast.success("Trade updated successfully")\n  }',
  'toast.success("Trade updated successfully")\n    } catch (e) {\n      toast.error("Failed to save changes")\n    } finally {\n      setSaving(false)\n    }\n  }'
);

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');