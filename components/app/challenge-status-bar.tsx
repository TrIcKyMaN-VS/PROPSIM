"use client"

import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { Badge } from "@/components/ui/badge"

export function ChallengeStatusBar() {
  const activeId = usePropStore((s) => s.activeAccountId)
  const accounts = usePropStore((s) => s.accounts)
  const trades = usePropStore((s) => s.trades)

  if (!activeId) return null

  const active = accounts.find((a) => a.id === activeId)
  if (!active) return null

  const firm = getFirm(active.firmId)
  if (!firm) return null

  const size = firm.sizes.find(s => s.label === active.sizeLabel)
  if (!size) return null

  const accTrades = trades.filter(t => t.accountId === activeId)
  const pnl = accTrades.reduce((sum, t) => sum + t.pnl, 0)
  
  const currentBalance = size.rules.startingBalance + pnl
  const targetBalance = size.rules.startingBalance + size.rules.profitTarget
  
  // Basic drawdown calc (assuming EOD or static for display purposes)
  const minBalance = size.rules.startingBalance - size.rules.maxDrawdown
  const ddLeft = Math.max(0, currentBalance - minBalance)
  
  const targetPct = Math.min(100, Math.max(0, (pnl / size.rules.profitTarget) * 100))
  
  // Unique trading days
  const tradingDays = new Set(accTrades.map(t => new Date(Number(t.timestamp)).toISOString().split("T")[0])).size

  return (
    <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-lg border bg-card text-sm">
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Balance</span>
        <span className="font-bold">${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      
      <div className="flex flex-col w-32">
        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-1">
          <span className="text-muted-foreground">Target</span>
          <span className="text-primary">{targetPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${targetPct}%` }} />
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">DD Left</span>
        <span className={`font-bold ${ddLeft < size.rules.maxDrawdown * 0.2 ? 'text-destructive' : ''}`}>
          ${ddLeft.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Days</span>
        <span className="font-bold">{tradingDays} {size.rules.minTradingDays > 0 ? `/ ${size.rules.minTradingDays}` : ''}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</span>
        <Badge variant={active.status === "passed" ? "default" : active.status === "failed" ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px]">
          {active.status.toUpperCase()}
        </Badge>
      </div>
    </div>
  )
}
