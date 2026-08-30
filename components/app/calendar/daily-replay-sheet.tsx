"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { usePropStore } from "@/lib/store"
import { Target, FileText, ChevronUp, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { fmtPnl } from "@/lib/format"

export function DailyReplaySheet({
  open,
  onOpenChange,
  dateStr,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateStr: string | null
}) {
  const router = useRouter()
  const trades = usePropStore(s => s.trades)
  const displayTimeMode = usePropStore(s => s.displayTimeMode)
  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const account = usePropStore(s => s.accounts.find(a => a.id === activeAccountId))
  const accountBalance = account?.balance ?? 0
  
  // For trade toggles
  const [openTrades, setOpenTrades] = React.useState<Record<string, boolean>>({})
  const toggleTrade = (id: string) => setOpenTrades(s => ({ ...s, [id]: !s[id] }))
  const [viewImage, setViewImage] = React.useState<string | null>(null)
  const getTradeDateKey = (timestamp: number) => {
    const date = new Date(timestamp)
    if (displayTimeMode === "Exchange Time") {
      const nyDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }))
      return `${nyDate.getFullYear()}-${String(nyDate.getMonth() + 1).padStart(2, "0")}-${String(nyDate.getDate()).padStart(2, "0")}`
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    }
  }
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100
  
  const [isZoomed, setIsZoomed] = React.useState(false)

  // Compute daily stats
  const dateObj = dateStr ? new Date(dateStr + "T12:00:00") : new Date()
  
  const dayTrades = React.useMemo(() => {
    if (!dateStr) return []
    return trades.filter(t => getTradeDateKey(Number(t.timestamp)) === dateStr)
  }, [trades, dateStr, displayTimeMode])
  const pnl = React.useMemo(() => dayTrades.reduce((s, t) => s + t.pnl, 0), [dayTrades])
  
  const winRate = React.useMemo(() => {
    const wins = dayTrades.filter(t => t.pnl > 0)
    return dayTrades.length > 0 ? Math.round((wins.length / dayTrades.length) * 100) : 0
  }, [dayTrades])
  
  const bestTrade = [...dayTrades].sort((a, b) => b.pnl - a.pnl)[0]
  const worstTrade = [...dayTrades].sort((a, b) => a.pnl - b.pnl)[0]

  const totalR = dayTrades.reduce((s, t) => s + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0)

  const gradeColor = (g?: string) => {
    if (!g) return "border-border text-muted-foreground"
    if (g === "A") return "border-green-500 text-green-400 bg-green-500/10"
    if (g === "B") return "border-blue-500 text-blue-400 bg-blue-500/10"
    if (g === "C") return "border-yellow-500 text-yellow-400 bg-yellow-500/10"
    return "border-red-500 text-red-400 bg-red-500/10"
  }

  if (!dateStr) return null

  return (
    <>
      <Dialog open={!!viewImage} onOpenChange={(o) => {
        if (!o) { setIsZoomed(false); setViewImage(null) }
      }}>
        <DialogContent 
          className="max-w-[95vw] w-fit p-1 bg-black/90 border-0 flex items-center justify-center z-[100]"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          {viewImage && (
            <img
              src={viewImage}
              alt="Trade screenshot expanded"
              className={isZoomed ? "max-w-none max-h-none cursor-zoom-out" : "max-w-full max-h-[82vh] object-contain rounded-lg cursor-zoom-in"}
              onClick={(e) => {
                e.stopPropagation()
                setIsZoomed(!isZoomed)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                Daily Replay: {dateStr}
                <Badge variant={pnl >= 0 ? "default" : "destructive"}>{pnl >= 0 ? "Green Day" : "Red Day"}</Badge>
              </DialogTitle>
              <DialogDescription>A simple breakdown of your trades for the day.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="p-3 rounded-xl border bg-card text-center">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Net PnL</div>
                <div className={`text-xl font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>${Math.abs(pnl).toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-xl border bg-card text-center">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Win Rate</div>
                <div className="text-xl font-bold">{winRate.toFixed(0)}%</div>
              </div>
              <div className="p-3 rounded-xl border bg-card text-center">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Net R</div>
                <div className={`text-xl font-bold ${totalR >= 0 ? "text-success" : "text-destructive"}`}>{totalR >= 0 ? "+" : ""}{totalR.toFixed(2)}R</div>
              </div>
              <div className="p-3 rounded-xl border bg-card text-center">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Trades</div>
                <div className="text-xl font-bold">{dayTrades.length}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-8 pb-12">

              <section>
                <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><Target className="w-4 h-4"/> Extremes</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl border border-success/30 bg-success/5">
                    <div className="text-xs text-success font-bold mb-1">Best Trade</div>
                    {bestTrade ? <div className="font-medium text-lg">${bestTrade.pnl.toFixed(2)} <span className="text-muted-foreground text-sm">({bestTrade.instrument})</span></div> : <div className="text-sm text-muted-foreground">None</div>}
                  </div>
                  <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
                    <div className="text-xs text-destructive font-bold mb-1">Worst Trade</div>
                    {worstTrade ? <div className="font-medium text-lg">-${Math.abs(worstTrade.pnl).toFixed(2)} <span className="text-muted-foreground text-sm">({worstTrade.instrument})</span></div> : <div className="text-sm text-muted-foreground">None</div>}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><FileText className="w-4 h-4"/> Trade List</h3>
                <div className="space-y-3">
                  {dayTrades.length === 0 && <div className="text-sm text-muted-foreground">No trades executed on this day.</div>}
                  {dayTrades.slice().reverse().map((t, idx) => {
                    const setupName = t.playbookName ?? t.instrument
                    const grade = t.psychology?.executionGrade
                    const isOpen = !!openTrades[t.id]
                    
                    const reasoning = t.reasonForEntry
                    const mistakesVal = t.mistakes
                    
                    return (
                      <div key={t.id} className="border border-border/60 rounded-xl overflow-hidden bg-card/50">
                        {/* Header row */}
                        <button
                          type="button"
                          onClick={() => toggleTrade(t.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                        >
                          <span className="font-bold tracking-wide text-foreground flex items-center gap-2">
                            <span className="text-muted-foreground/50">#{dayTrades.length - idx}</span> 
                            <span>{setupName?.toUpperCase()}</span>
                            <Badge variant={t.direction === "long" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">{t.direction}</Badge>
                            
                          </span>
                          <div className="flex items-center gap-4">
                            {grade && (
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", gradeColor(grade))}>
                                {grade}
                              </span>
                            )}
                            <span className={cn("font-mono font-bold text-[15px]", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                              {fmtPnl(t.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                            </span>
                            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {/* Expanded details */}
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

                            <div className="space-y-3 font-sans">
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
                            
                            <div className="flex justify-end pt-2">
                              <button 
                                onClick={() => router.push(`/app/journal/${t.id}`)}
                                className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
                              >
                                Full Edit <Target className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
