"use client"

import { useState, useEffect } from "react"
import { usePropStore } from "@/lib/store"
import { evaluate } from "@/lib/rule-engine"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { Play, Pause, SkipForward, SkipBack, RotateCcw } from "lucide-react"
import { EquityChart } from "@/components/app/equity-chart"
import { equityCurve } from "@/lib/rule-engine"

export default function ReplayPage() {
  const accounts = usePropStore(s => s.accounts)
  const activeId = usePropStore(s => s.activeAccountId)
  const allTrades = usePropStore(s => s.trades)

  const account = accounts.find(a => a.id === activeId)
  const trades = account ? allTrades.filter(t => t.accountId === account.id).sort((a, b) => a.timestamp - b.timestamp) : []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && currentIndex < trades.length) {
      interval = setInterval(() => {
        setCurrentIndex(i => Math.min(i + 1, trades.length))
      }, speed)
    } else if (currentIndex >= trades.length) {
      setIsPlaying(false)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentIndex, speed, trades.length])

  if (!account) return <div className="p-12 text-center">No active account.</div>
  if (trades.length === 0) return <div className="p-12 text-center">No trades to replay.</div>

  const visibleTrades = trades.slice(0, currentIndex)
  const status = evaluate(account.rules, visibleTrades)
  const curve = equityCurve(account, visibleTrades)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Challenge Replay Engine</h1>
          <p className="text-muted-foreground">Relive your challenge day-by-day to study your psychology and drawdown.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border">
          <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(0)}><RotateCcw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}><SkipBack className="w-4 h-4" /></Button>
          <Button variant="default" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(Math.min(trades.length, currentIndex + 1))}><SkipForward className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
        <span className="text-sm font-medium whitespace-nowrap">Trade {currentIndex} / {trades.length}</span>
        <input 
          type="range"
          className="w-full accent-primary"
          value={currentIndex}
          min={0}
          max={trades.length} 
          step={1} 
          onChange={(e) => { setCurrentIndex(Number(e.target.value)); setIsPlaying(false) }} 
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed</span>
          <select 
            className="bg-transparent border text-sm rounded px-2 py-1"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={100}>Max</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Replay Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityChart data={curve} target={account.rules.startingBalance + account.rules.profitTarget} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold capitalize ${status.status === 'passed' ? 'text-success' : status.status === 'failed' ? 'text-destructive' : 'text-primary'}`}>
                {status.status}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Drawdown Buffer</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${status.remainingDrawdown.toLocaleString()}</div>
              <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all" style={{ width: `${100 - status.drawdownUsedPct}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Target Progress</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.profitTargetProgress.toFixed(1)}%</div>
              <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                <div className="bg-success h-full transition-all" style={{ width: `${status.profitTargetProgress}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
