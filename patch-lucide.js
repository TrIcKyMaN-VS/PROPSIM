const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');
content = content.replace(
  /import \{ Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen, Upload, X, ChevronDown, ChevronUp, AlertCircle \} from "lucide-react";/,
  'import { Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen, Upload, X, ChevronDown, ChevronUp, AlertCircle, Pencil } from "lucide-react";'
);
fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
