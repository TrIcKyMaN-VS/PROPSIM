"use client"

import { useState, useEffect } from "react"
import { usePropStore } from "@/lib/store"
import { formatDisplayTime } from "@/lib/format"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"

import { Target, TrendingUp, AlertTriangle, CheckCircle2, XCircle, FileText, BrainCircuit } from "lucide-react"

interface Props {
  dateStr: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DailyReplaySheet({ dateStr, open, onOpenChange }: Props) {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades).filter(t => t.accountId === activeAccountId)
  const psychology = usePropStore(s => s.tradePsychology)
  const displayTimeMode = usePropStore(s => s.displayTimeMode)
  const router = useRouter()

  const [dailyReview, setDailyReview] = useState<any>(null)
  const [loadingReview, setLoadingReview] = useState(false)

  const getTradeDateKey = (timestamp: number) => {
    const date = new Date(timestamp)
    if (displayTimeMode === "Exchange Time") {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
      const parts = formatter.formatToParts(date)
      const year = parts.find(p => p.type === "year")?.value || ""
      const month = parts.find(p => p.type === "month")?.value || ""
      const day = parts.find(p => p.type === "day")?.value || ""
      return `${year}-${month}-${day}`
    } else {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  // Get trades for this day
  const dayTrades = trades.filter(t => getTradeDateKey(Number(t.timestamp)) === dateStr)
  const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0)
  const wins = dayTrades.filter(t => t.pnl > 0)
  const winRate = dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0
  
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(dayTrades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0)

  const bestTrade = [...dayTrades].sort((a, b) => b.pnl - a.pnl)[0]
  const worstTrade = [...dayTrades].sort((a, b) => a.pnl - b.pnl)[0]

  // Psychology stats for this day
  const dayPsychology = dayTrades.map(t => psychology.find(p => p.tradeId === t.id)).filter(Boolean)
  const ruleBreaks = dayPsychology.filter(p => p?.brokeRules).length
  const revengeTrades = dayPsychology.filter(p => p?.emotionAffected).length // Proxy for revenge/fomo right now
  const avgConfidence = dayPsychology.length ? dayPsychology.reduce((s, p) => s + (p?.convictionScore || 0), 0) / dayPsychology.length : 0

  useEffect(() => {
    if (!open || !dateStr) return
    const activeDateStr = dateStr

    async function loadOrGenerate() {
      setLoadingReview(true)
      try {
        const { getAiReviewAction, generateDailyReviewAction } = await import("@/app/actions/ai-actions")
        
        // Try cached first
        const cached = await getAiReviewAction("DAILY", activeDateStr)
        if (cached) {
          setDailyReview(JSON.parse(cached.summary))
        } else {
          // If no cached, but we have trades, generate it
          if (dayTrades.length > 0) {
            const payloadTrades = dayTrades.map(t => ({
              instrument: t.instrument,
              pnl: t.pnl,
              direction: t.direction,
              session: t.session,
              notes: t.notes || ""
            }))
            const res = await generateDailyReviewAction(payloadTrades, activeDateStr)
            setDailyReview(res)
          } else {
            setDailyReview(null)
          }
        }
      } catch (err) {
        console.error("Failed to load daily review:", err)
      } finally {
        setLoadingReview(false)
      }
    }

    loadOrGenerate()
  }, [open, dateStr, dayTrades.length])

  if (!dateStr) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              Daily Replay: {dateStr}
              <Badge variant={pnl >= 0 ? "default" : "destructive"}>{pnl >= 0 ? "Green Day" : "Red Day"}</Badge>
            </DialogTitle>
            <DialogDescription>Comprehensive breakdown of your trading performance.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Net PnL</div>
              <div className={`text-xl font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>${pnl.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Win Rate</div>
              <div className="text-xl font-bold">{winRate.toFixed(0)}%</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Profit Factor</div>
              <div className="text-xl font-bold">{profitFactor.toFixed(2)}</div>
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
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4"/> Mistake Analytics</h3>
              <div className="p-4 rounded-xl border bg-card grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-destructive">{ruleBreaks}</div>
                  <div className="text-xs text-muted-foreground">Rule Violations</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">{revengeTrades}</div>
                  <div className="text-xs text-muted-foreground">Emotion Driven</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{avgConfidence.toFixed(1)}/10</div>
                  <div className="text-xs text-muted-foreground">Avg Confidence</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><FileText className="w-4 h-4"/> Trade Timeline</h3>
              <div className="space-y-3">
                {dayTrades.length === 0 && <div className="text-sm text-muted-foreground">No trades executed on this day.</div>}
                {dayTrades.slice().reverse().map((t, i) => {
                  const ps = dayPsychology.find(p => p?.tradeId === t.id)
                  return (
                    <div 
                      key={t.id} 
                      className="p-4 rounded-xl border bg-card flex items-center justify-between group cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-colors"
                      onClick={() => {
                        onOpenChange(false)
                        router.push(`/app/journal/${t.id}`)
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted font-bold text-xs">#{dayTrades.length - i}</div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {t.instrument}
                            <Badge variant={t.direction === "long" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">{t.direction}</Badge>
                            {ps?.brokeRules && <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0">Rule Broken</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDisplayTime(t.timestamp, displayTimeMode)} • {t.contracts} Contracts • Exit: {ps?.exitReason || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold text-lg ${t.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                        {t.pnl >= 0 ? "+" : "-"}${Math.abs(t.pnl).toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><BrainCircuit className="w-4 h-4 text-primary"/> AI Daily Review</h3>
              {loadingReview ? (
                <div className="p-4 rounded-xl border border-muted text-center text-sm text-muted-foreground">
                  AI is analyzing today's performance...
                </div>
              ) : dailyReview ? (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    "{dailyReview.summary}"
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                    <Badge variant="secondary" className="bg-success/20 text-success border-0 max-w-full truncate">
                      Best: {dailyReview.bestDecision}
                    </Badge>
                    <Badge variant="secondary" className="bg-destructive/20 text-destructive border-0 max-w-full truncate">
                      Worst: {dailyReview.worstDecision}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-muted text-center text-sm text-muted-foreground">
                  No AI review available. Log trades today to get an automated reflection.
                </div>
              )}
            </section>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
