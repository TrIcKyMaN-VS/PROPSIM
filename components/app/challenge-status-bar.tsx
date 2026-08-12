"use client"

import { usePropStore } from "@/lib/store"
import { evaluate } from "@/lib/rule-engine"
import { Badge } from "@/components/ui/badge"

export function ChallengeStatusBar() {
  const activeId = usePropStore((s) => s.activeAccountId)
  const accounts = usePropStore((s) => s.accounts)
  const trades = usePropStore((s) => s.trades)

  if (!activeId) return null

  const active = accounts.find((a) => a.id === activeId)
  if (!active?.rules) return null

  const accTrades = trades.filter((t) => t.accountId === activeId)

  // Use the same rule engine as the Compliance page for accurate, consistent values.
  // This correctly handles trailing, static, EOD, and intraday drawdown types.
  const status = evaluate(active.rules, accTrades)

  const currentBalance = status.balance
  // remainingDrawdown is the real headroom before breach — correctly computed per drawdown type
  const ddLeft = status.remainingDrawdown
  const tradingDays = status.tradingDays
  const targetPct = status.profitTargetProgress // 0-100

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
        <span
          className={`font-bold ${
            active.rules.maxDrawdown > 0 && ddLeft < active.rules.maxDrawdown * 0.2
              ? "text-destructive"
              : ""
          }`}
        >
          ${ddLeft.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Days</span>
        <span className="font-bold">
          {tradingDays}
          {active.rules.minTradingDays > 0 ? ` / ${active.rules.minTradingDays}` : ""}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</span>
        <Badge
          variant={
            status.status === "passed"
              ? "default"
              : status.status === "failed"
              ? "destructive"
              : "secondary"
          }
          className="h-5 px-1.5 text-[10px]"
        >
          {status.status.toUpperCase()}
        </Badge>
      </div>
    </div>
  )
}
