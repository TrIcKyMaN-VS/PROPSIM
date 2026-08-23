const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

// 1. Imports
content = content.replace('uploadMissedTradeImages', 'uploadImageFormData');
content = content.replace(/import \{ Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen, Upload, X \} from "lucide-react";/, 'import { Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen, Upload, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";');

// 2. State additions
content = content.replace(
  'const [missedDraft, setMissedDraft] = useState<MissedTrade>(emptyMissed());',
  `const [missedDraft, setMissedDraft] = useState<MissedTrade>(emptyMissed());
  const [expandedMissed, setExpandedMissed] = useState<Record<string, boolean>>({});
  const toggleMissed = (id: string) => setExpandedMissed(p => ({ ...p, [id]: !p[id] }));
  const [deleteMissedId, setDeleteMissedId] = useState<string | null>(null);`
);

// 3. Upload Handler
content = content.replace(
  /const handleMissedImageUpload = async \[\s\S]*?e\.target\.value = "";\s*\n\s*\};\s*\n/,
  `const handleMissedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", "mt_" + weekOf);
      const url = await uploadImageFormData(formData);
      setMissedDraft(d => ({ ...d, screenshotUrl: url }));
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingImg(false);
    }
    e.target.value = "";
  };\n\n`
);

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
console.log('Applied patch part 1');
