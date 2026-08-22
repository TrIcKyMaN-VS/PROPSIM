const fs = require('fs');

const content = `
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
import { Target, AlertTriangle, FileText, Activity, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { getDailyJournal } from "@/app/actions/journal-actions"

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
  const [journal, setJournal] = React.useState<any>(null)

  React.useEffect(() => {
    if (open && dateStr) {
      getDailyJournal(dateStr).then(res => {
        if (res && (res.overallThoughtProcess || res.rulesBroken || res.stateCheckNotes)) {
          setJournal(res)
        } else {
          setJournal(null)
        }
      }).catch(() => setJournal(null))
    }
  }, [open, dateStr])

  const getTradeDateKey = (timestamp: number) => {
    const date = new Date(timestamp)
    if (displayTimeMode === "Exchange Time") {
      const nyDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }))
      return \`\${nyDate.getFullYear()}-\${String(nyDate.getMonth() + 1).padStart(2, "0")}-\${String(nyDate.getDate()).padStart(2, "0")}\`
    } else {
      return \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, "0")}-\${String(date.getDate()).padStart(2, "0")}\`
    }
  }

  const dayTrades = trades.filter(t => getTradeDateKey(Number(t.timestamp)) === dateStr)
  const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0)
  
  const wins = dayTrades.filter(t => t.pnl > 0)
  const winRate = dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0
  
  const bestTrade = [...dayTrades].sort((a, b) => b.pnl - a.pnl)[0]
  const worstTrade = [...dayTrades].sort((a, b) => a.pnl - b.pnl)[0]

  const totalR = dayTrades.reduce((s, t) => s + (t.netR || 0), 0)

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
            <DialogDescription>A simple breakdown of your trades for the day.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Net PnL</div>
              <div className={\`text-xl font-bold \${pnl >= 0 ? "text-success" : "text-destructive"}\`}>$\${Math.abs(pnl).toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Win Rate</div>
              <div className="text-xl font-bold">{winRate.toFixed(0)}%</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Net R</div>
              <div className={\`text-xl font-bold \${totalR >= 0 ? "text-success" : "text-destructive"}\`}>{totalR >= 0 ? "+" : ""}{totalR.toFixed(2)}R</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Trades</div>
              <div className="text-xl font-bold">{dayTrades.length}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-8 pb-12">
            
            {journal && (
              <section>
                <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4"/> Daily Journal Notes</h3>
                <div className="space-y-3">
                  {journal.overallThoughtProcess && (
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <div className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Thought Process</div>
                      <div className="text-sm">{journal.overallThoughtProcess}</div>
                    </div>
                  )}
                  {journal.rulesBroken && (
                    <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                      <div className="text-xs font-bold text-destructive mb-1 uppercase tracking-wider">Rules Broken</div>
                      <div className="text-sm text-destructive">{journal.rulesBroken}</div>
                    </div>
                  )}
                  {journal.stateCheckNotes && (
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <div className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Mental State</div>
                      <div className="text-sm">{journal.stateCheckNotes}</div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><Target className="w-4 h-4"/> Extremes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-success/30 bg-success/5">
                  <div className="text-xs text-success font-bold mb-1">Best Trade</div>
                  {bestTrade ? <div className="font-medium text-lg">$\${bestTrade.pnl.toFixed(2)} <span className="text-muted-foreground text-sm">({bestTrade.instrument})</span></div> : <div className="text-sm text-muted-foreground">None</div>}
                </div>
                <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
                  <div className="text-xs text-destructive font-bold mb-1">Worst Trade</div>
                  {worstTrade ? <div className="font-medium text-lg">-$\${Math.abs(worstTrade.pnl).toFixed(2)} <span className="text-muted-foreground text-sm">({worstTrade.instrument})</span></div> : <div className="text-sm text-muted-foreground">None</div>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-4"><FileText className="w-4 h-4"/> Trade Timeline</h3>
              <div className="space-y-3">
                {dayTrades.length === 0 && <div className="text-sm text-muted-foreground">No trades executed on this day.</div>}
                {dayTrades.slice().reverse().map((t, i) => {
                  return (
                    <div 
                      key={t.id} 
                      className="p-4 rounded-xl border bg-card flex items-center justify-between group cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-colors"
                      onClick={() => {
                        onOpenChange(false)
                        router.push(\`/app/journal/\${t.id}\`)
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted font-bold text-xs">#{dayTrades.length - i}</div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {t.instrument}
                            <Badge variant={t.direction === "long" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">{t.direction}</Badge>
                            {t.mistakes && <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0">Mistakes</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(Number(t.timestamp)).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} • {t.contracts} Contracts
                          </div>
                        </div>
                      </div>
                      <div className={\`font-bold text-lg \${t.pnl >= 0 ? "text-success" : "text-destructive"}\`}>
                        {t.pnl >= 0 ? "+" : "-"}$\${Math.abs(t.pnl).toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
`;

fs.writeFileSync('components/app/calendar/daily-replay-sheet.tsx', content, 'utf8');
