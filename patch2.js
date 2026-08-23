const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

const oldBlock = `{missedTrades.map(t => {
                    const isConfirmed = t.realtimeValidity === "yes_100"
                    const isMaybe = t.realtimeValidity === "maybe"
                    return (
                      <div
                        key={t.id}
                        className={\`rounded-lg border p-3 text-sm relative group \${
                          t.ruleHelped
                            ? "border-success/30 bg-success/5"
                            : isConfirmed
                            ? "border-border bg-muted/20"
                            : "border-border bg-muted/10 opacity-70"
                        }\`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={\`text-xs font-bold px-2 py-0.5 rounded-full \${t.direction === "long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}\`}>
                              {t.direction.toUpperCase()}
                            </span>
                            <span className="font-semibold">{t.instrument}</span>
                            {t.estimatedR && (
                              <span className={\`text-xs font-mono font-bold \${t.outcome === "win" ? "text-success" : t.outcome === "loss" ? "text-destructive" : "text-muted-foreground"}\`}>
                                {t.estimatedR} • {t.outcome.toUpperCase()}
                              </span>
                            )}
                            {t.ruleHelped && <span className="text-xs text-success font-medium">✓ Rule saved you</span>}
                            {!isConfirmed && (
                              <span className="text-xs text-muted-foreground italic">
                                {isMaybe ? "(maybe — unconfirmed)" : "(hindsight only)"}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeMissedTrade(t.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-muted-foreground mt-1.5 text-xs"><span className="font-medium text-foreground">Missed:</span> {t.whyMissed}</p>
                        {t.setupDescription && <p className="text-muted-foreground mt-1 text-xs italic">{t.setupDescription}</p>}
                        {t.screenshotUrl && (
                          <div
                            className="mt-2 group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer max-w-xs"
                            onClick={() => { setViewImage(t.screenshotUrl!); setIsZoomed(false); }}
                          >
                            <img src={t.screenshotUrl} alt="Chart screenshot" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">Click to zoom</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}`;

const newBlock = `{missedTrades.map(t => {
                    const isConfirmed = t.realtimeValidity === "yes_100"
                    const isMaybe = t.realtimeValidity === "maybe"
                    const expanded = expandedMissed[t.id];
                    return (
                      <div
                        key={t.id}
                        className={\`rounded-lg border text-sm relative transition-all \${
                          t.ruleHelped
                            ? "border-success/30 bg-success/5"
                            : isConfirmed
                            ? "border-border bg-muted/20"
                            : "border-border bg-muted/10 opacity-70"
                        }\`}
                      >
                        <div 
                          className="flex items-center justify-between gap-2 p-3 cursor-pointer group"
                          onClick={() => toggleMissed(t.id)}
                        >
                          <div className="flex items-center gap-2 flex-wrap flex-1">
                            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mr-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mr-1" />}
                            <span className={\`text-xs font-bold px-2 py-0.5 rounded-full \${t.direction === "long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}\`}>
                              {t.direction.toUpperCase()}
                            </span>
                            <span className="font-semibold">{t.instrument}</span>
                            {t.estimatedR && (
                              <span className={\`text-xs font-mono font-bold \${t.outcome === "win" ? "text-success" : t.outcome === "loss" ? "text-destructive" : "text-muted-foreground"}\`}>
                                {t.estimatedR} • {t.outcome.toUpperCase()}
                              </span>
                            )}
                            {t.ruleHelped && <span className="text-xs text-success font-medium">✓ Rule saved you</span>}
                            {!isConfirmed && (
                              <span className="text-xs text-muted-foreground italic">
                                {isMaybe ? "(maybe — unconfirmed)" : "(hindsight only)"}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteMissedId(t.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {expanded && (
                          <div className="px-3 pb-4 pt-1 border-t border-border/40 mt-1">
                            <p className="text-muted-foreground text-xs"><span className="font-medium text-foreground">Missed:</span> {t.whyMissed}</p>
                            {t.setupDescription && <p className="text-muted-foreground mt-2 text-xs italic">{t.setupDescription}</p>}
                            {t.screenshotUrl && (
                              <div
                                className="mt-3 group/img relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer max-w-sm"
                                onClick={(e) => { e.stopPropagation(); setViewImage(t.screenshotUrl!); setIsZoomed(false); }}
                              >
                                <img src={t.screenshotUrl} alt="Chart screenshot" className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-[1.03]" />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                                  <span className="opacity-0 group-hover/img:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">Click to zoom</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
console.log('Applied patch part 2');
