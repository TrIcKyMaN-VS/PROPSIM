const fs = require('fs');
let content = fs.readFileSync('components/app/calendar/daily-replay-sheet.tsx', 'utf8');

// 1. Remove Journal Section entirely
const journalStart = content.indexOf('{journal && (');
const journalEnd = content.indexOf('</section>', journalStart) + 11;
if (journalStart !== -1 && journalEnd > 10) {
    content = content.slice(0, journalStart) + content.slice(journalEnd);
}
// Remove journal usage
content = content.replace('const [journal, setJournal] = React.useState<any>(null)', '');
content = content.replace(/React\.useEffect\(\(\) => \{\s*if \(open && dateStr\) \{\s*getDailyJournal[\s\S]*?\}\s*\}, \[open, dateStr\]\)/m, '');

// 2. Fix Double Dollar Signs
content = content.replace(/`\$\$\{Math\.abs\((pnl|bestTrade\.pnl|worstTrade\.pnl|t\.pnl)\)\.toFixed\(2\)\}`/g, 
  '`$${Math.abs($1).toFixed(2)}`' // Wait, regex replacement is tricky, let's just do exact string replacement
);
// Actually, let's just replace the exact substrings
content = content.replace(/>\$\$\{Math\.abs\(pnl\)\.toFixed\(2\)\}</g, '>${Math.abs(pnl).toFixed(2)}<');
content = content.replace(/>\$\$\{bestTrade\.pnl\.toFixed\(2\)\}</g, '>${bestTrade.pnl.toFixed(2)}<');
content = content.replace(/>-\$\$\{Math\.abs\(worstTrade\.pnl\)\.toFixed\(2\)\}</g, '>-$${Math.abs(worstTrade.pnl).toFixed(2)}<'.replace('$$', '$'));
content = content.replace(/>\{t\.pnl >= 0 \? "\+" \: "\-"\}\$\$\{Math\.abs\(t\.pnl\)\.toFixed\(2\)\}</g, '>{t.pnl >= 0 ? "+" : "-"}${Math.abs(t.pnl).toFixed(2)}<');

// 3. Replace the trade expanded details with the 4-box layout
const expandedStart = content.indexOf('{/* Expanded details */}');
const expandedEnd = content.indexOf('{/* Footer stats */}'); // wait, I don't have footer stats
const expandedEndAlternative = content.indexOf('<div className="flex justify-end pt-2">');

if (expandedStart !== -1 && expandedEndAlternative !== -1) {
  const replacement = `{/* Expanded details */}
                        {isOpen && (
                          <div className="border-t border-border/60 p-4 space-y-4 bg-muted/5 font-mono text-sm">
                            {/* Screenshot */}
                            {t.screenshots && t.screenshots.length > 0 && (
                              <div 
                                className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                                onClick={() => setViewImage(t.screenshots![0].url)}
                              >
                                <img
                                  src={t.screenshots[0].url}
                                  alt="Trade screenshot"
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                              {/* Reasoning */}
                              <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70" /> Reasoning / logic / confirmation
                                </div>
                                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                  {reasoning || <span className="italic text-muted-foreground/50">No reasoning provided</span>}
                                </div>
                              </div>

                              {/* Expectation */}
                              <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/70" /> Result vs expectation
                                </div>
                                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                  {(t as any).resultVsExpectation || <span className="italic text-muted-foreground/50">No result provided</span>}
                                </div>
                              </div>

                              {/* Mistakes */}
                              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-1.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-destructive/70" /> Mistakes
                                </div>
                                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                  {mistakesVal || <span className="italic text-muted-foreground/50">No mistakes logged</span>}
                                </div>
                              </div>

                              {/* Improvement */}
                              <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-warning/70 mb-1.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-warning/70" /> How execution could improve
                                </div>
                                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                  {(t as any).executionImprovement || <span className="italic text-muted-foreground/50">No improvement notes logged</span>}
                                </div>
                              </div>
                            </div>
                            
                            `;
  
  content = content.slice(0, expandedStart) + replacement + content.slice(expandedEndAlternative);
}

fs.writeFileSync('components/app/calendar/daily-replay-sheet.tsx', content, 'utf8');
