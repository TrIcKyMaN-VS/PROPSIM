const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

if (!content.includes('generateWeeklyPatterns')) {
  content = content.replace('saveWeeklyReview,', 'saveWeeklyReview,\n} from "@/app/actions/journal-actions";\nimport { generateWeeklyPatterns } from "@/app/actions/weekly-review-ai-actions";\n//');
}

if (!content.includes('Sparkles')) {
  content = content.replace('Plus, Trash, Save, Loader2', 'Plus, Trash, Save, Loader2, Sparkles');
}

if (!content.includes('isGenerating')) {
  content = content.replace('const [saving, setSaving] = useState(false);', 'const [saving, setSaving] = useState(false);\n  const [isGenerating, setIsGenerating] = useState(false);');
}

if (!content.includes('handleAutoFillPatterns')) {
  const handler = `
  const handleAutoFillPatterns = async () => {
    try {
      setIsGenerating(true)
      const res = await generateWeeklyPatterns(weekOf)
      setRepeatedMistakes(res.repeatedMistakes || "")
      setRepeatedWinConditions(res.repeatedWinConditions || "")
      setEmotionalTimingPatterns(res.emotionalTimingPatterns || "")
      toast.success("Successfully summarized daily journals!")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate patterns")
    } finally {
      setIsGenerating(false)
    }
  }
  
  useEffect(() => {
`
  content = content.replace('useEffect(() => {', handler);
}

content = content.replace('<CardTitle>1. Patterns From The Daily Journals</CardTitle>', 
`<div className="flex flex-row items-center justify-between w-full">
            <CardTitle>1. Patterns From The Daily Journals</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAutoFillPatterns} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-amber-500" />}
              Auto-Fill from Journals
            </Button>
          </div>`);

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
