"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { usePropStore } from "@/lib/store"
import { Target, FileText, ChevronUp, ChevronDown, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { fmtPnl } from "@/lib/format"
import { toast } from "sonner"
import { ImageLightbox } from "@/components/app/image-lightbox"

function getExitTypeBadge(exitType?: string | null) {
  if (!exitType) return null
  const lower = exitType.toLowerCase()
  if (lower.includes("take profit") || lower.includes("tp")) {
    return { color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10", label: exitType }
  }
  if (lower.includes("stop loss") || lower.includes("sl")) {
    return { color: "border-rose-500/40 text-rose-400 bg-rose-500/10", label: exitType }
  }
  if (lower.includes("breakeven") || lower.includes("be")) {
    return { color: "border-amber-500/40 text-amber-400 bg-amber-500/10", label: exitType }
  }
  if (lower.includes("trailing")) {
    return { color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10", label: exitType }
  }
  if (lower.includes("early profit") || lower.includes("partial")) {
    return { color: "border-blue-500/40 text-blue-400 bg-blue-500/10", label: exitType }
  }
  if (lower.includes("early loss")) {
    return { color: "border-purple-500/40 text-purple-400 bg-purple-500/10", label: exitType }
  }
  return { color: "border-muted-foreground/40 text-muted-foreground bg-muted/20", label: exitType }
}

function formatTradeDuration(entryTs?: number | bigint, exitTs?: number | bigint | null) {
  if (!entryTs || !exitTs) return null
  const diffMs = Number(exitTs) - Number(entryTs)
  if (diffMs <= 0) return null
  const totalSecs = Math.round(diffMs / 1000)
  if (totalSecs < 60) return `${totalSecs}s`
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatTimeEST(ts?: number | bigint) {
  if (!ts) return null
  return new Date(Number(ts)).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit"
  })
}


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
  const removeTrade = usePropStore(s => s.removeTrade)
  const account = usePropStore(s => s.accounts.find(a => a.id === activeAccountId))
  const accountBalance = account?.rules?.startingBalance ?? 50000
  
  // For trade toggles
  const [openTrades, setOpenTrades] = React.useState<Record<string, boolean>>({})
  const toggleTrade = (id: string) => setOpenTrades(s => ({ ...s, [id]: !s[id] }))
  const [viewImage, setViewImage] = React.useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = React.useState(0)
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

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
    return trades.filter(t => (activeAccountId ? t.accountId === activeAccountId : true) && getTradeDateKey(Number(t.timestamp)) === dateStr)
  }, [trades, activeAccountId, dateStr, displayTimeMode])
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
      <ImageLightbox
        open={!!viewImage}
        src={viewImage}
        alt={`Daily Replay ${dateStr} Trade Screenshot`}
        onClose={() => setViewImage(null)}
      />

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
                    const setupName = t.playbookName || (t as any).setupName || t.instrument
                    const grade = t.psychology?.executionGrade
                    const isOpen = !!openTrades[t.id]
                    const exitBadge = getExitTypeBadge((t as any).exitType)
                    const durationStr = formatTradeDuration(t.timestamp, t.exitTime)
                    const timeEst = formatTimeEST(t.timestamp)
                    const screenshotUrls = (t.screenshots || []).map((s: any) => typeof s === "string" ? s : s?.url).filter(Boolean)
                    
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
                          <span className="font-bold tracking-wide text-foreground flex items-center gap-2.5">
                            <span className="text-muted-foreground/50">#{dayTrades.length - idx}</span> 
                            <span className="text-primary font-bold">{setupName?.toUpperCase()}</span>
                            <Badge variant={t.direction === "long" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0 uppercase">{t.direction}</Badge>
                          </span>
                          <div className="flex items-center gap-3">
                            {exitBadge && (
                              <span className={cn("hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", exitBadge.color)}>
                                {exitBadge.label}
                              </span>
                            )}
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
                            {/* Screenshots Gallery */}
                            {screenshotUrls.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-sans">
                                    Chart Screenshots ({screenshotUrls.length})
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-sans">Click to inspect in high resolution</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {screenshotUrls.map((url: string, imgIdx: number) => (
                                    <div 
                                      key={imgIdx}
                                      className="group relative aspect-video rounded-xl overflow-hidden border border-border/70 bg-black/40 cursor-pointer shadow-sm hover:border-primary/50 transition-all"
                                      onClick={() => {
                                        setLightboxImages(screenshotUrls)
                                        setLightboxIndex(imgIdx)
                                        setViewImage(url)
                                      }}
                                    >
                                      <img
                                        src={url}
                                        alt={`Trade ${dayTrades.length - idx} screenshot ${imgIdx + 1}`}
                                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-sans font-semibold">
                                        Expand Chart
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Setup, Exit Type, and Execution Details Ribbon */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-card/70 border border-border/60 text-xs font-mono shadow-sm">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Setup / Model</span>
                                <span className="text-primary font-bold truncate block text-[13px]">
                                  {setupName || "Untagged Setup"}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Exit Type</span>
                                {exitBadge ? (
                                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded border inline-block", exitBadge.color)}>
                                    {exitBadge.label}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50 italic text-[11px]">Unspecified</span>
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Execution Prices</span>
                                <span className="text-foreground font-semibold block text-[12px]">
                                  {t.entry ? Number(t.entry).toFixed(2) : "--"} &rarr; {t.exit ? Number(t.exit).toFixed(2) : "--"}
                                  {t.contracts ? <span className="text-[10px] text-muted-foreground font-normal ml-1">({t.contracts} ct)</span> : null}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Time & Duration</span>
                                <span className="text-foreground font-semibold block text-[12px]">
                                  {timeEst || "--"} {durationStr ? <span className="text-muted-foreground font-normal">({durationStr})</span> : null}
                                </span>
                              </div>
                            </div>

                            {/* Post-Exit Outcome Quality if exists */}
                            {(t as any).postExitResult && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/40 text-xs font-sans">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Post-Exit Review:</span>
                                <span className={cn(
                                  "font-semibold text-xs",
                                  (t as any).postExitResult === "Saved Me (Hit SL)" ? "text-emerald-400" :
                                  (t as any).postExitResult === "Cost Me (Hit TP)" ? "text-rose-400" : "text-amber-400"
                                )}>
                                  {(t as any).postExitResult}
                                </span>
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
                            
                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                              <button 
                                type="button"
                                onClick={() => setDeleteConfirmId(t.id)}
                                className="text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Trade
                              </button>
                              <button 
                                type="button"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Trade Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this trade? It will be removed from your journal, calendar, and rule telemetry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold" disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async () => {
                if (!deleteConfirmId) return
                setIsDeleting(true)
                try {
                  await removeTrade(deleteConfirmId)
                  toast.success("Trade deleted successfully")
                  setDeleteConfirmId(null)
                } catch {
                  toast.error("Failed to delete trade")
                } finally {
                  setIsDeleting(false)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete Trade"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
