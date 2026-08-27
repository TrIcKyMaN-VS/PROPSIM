const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8').split('\n');

// 1. Fix handleSave
const saveIdx = lines.findIndex(l => l.includes('const handleSave = async () => {'));
if (saveIdx !== -1) {
  let endIdx = saveIdx;
  while (!lines[endIdx].includes('toast.success("Trade updated successfully")')) endIdx++;
  endIdx++; // skip the toast
  
  if (!lines[saveIdx + 2].includes('setSaving(true)')) {
    lines.splice(saveIdx, endIdx - saveIdx + 1,
`  const handleSave = async () => {
    if (!trade) return
    setSaving(true)
    try {
      await saveTradePsychology({
        tradeId: trade.id,
        executionGrade: stratForm.executionGrade,
      })
      await updateTrade(trade.id, {
        entry:          parseFloat(execForm.entry)     || trade.entry,
        exit:           parseFloat(execForm.exit)      || trade.exit,
        contracts:      parseFloat(execForm.contracts) || trade.contracts,
        pnl:            parseFloat(execForm.pnl)       || trade.pnl,
        stopLoss:       parseFloat(riskForm.stopLoss)  || undefined,
        takeProfit:     parseFloat(riskForm.takeProfit)|| undefined,
        riskAmount:     parseFloat(riskForm.riskAmount)|| undefined,
        reasonForEntry: stratForm.reasonForEntry,
        resultVsExpectation: stratForm.resultVsExpectation,
      })
      toast.success("Trade updated successfully")
    } catch {
      toast.error("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }`
    );
  }
}

let content = lines.join('\n');

// 2. Fix Mojibake
// A... helpers -> // --- helpers ---
content = content.replace(/\/\/ A.*helpers A.*/g, '// --- helpers ---');
// A... component -> // --- component ---
content = content.replace(/\/\/ A.*component A.*/g, '// --- component ---');
content = content.replace(/\/\/ A.*clipboard paste A.*/g, '// --- clipboard paste ---');
content = content.replace(/\/\/ A.*handlers A.*/g, '// --- handlers ---');
content = content.replace(/\/\/ A.*LIGHTBOX.*/g, '// --- LIGHTBOX ---');

// formatHoldDuration return
content = content.replace(/if \(!ms \|\| ms < 0\) return "A.+"/g, 'if (!ms || ms < 0) return "--"');
content = content.replace(/\{holdDuration !== "A.+" && <span className="ml\.1\.5 text-muted-foreground\/60">A.+ \{holdDuration\}<\/span>\}/g, '{holdDuration !== "--" && <span className="ml-1.5 text-muted-foreground/60">&middot; {holdDuration}</span>}');

content = content.replace(/\{trade\.exitTime && \` A.+\`\}/g, '{trade.exitTime && ` - ${formatDisplayTime(trade.exitTime, displayTimeMode)}`}');

// A... labels
content = content.replace(/\/\/ A.+' label/g, '// --- labels ---');

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');