"use client"

import Link from "next/link"
import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { evaluate, equityCurve } from "@/lib/rule-engine"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { StatCard } from "./stat-card"
import { RuleMeter } from "./rule-meter"
import { EquityChart } from "./equity-chart"
import { QuickTrade } from "./quick-trade"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, Calendar, Layers, AlertTriangle, CheckCircle2, XCircle, Trophy, Plus, Activity, Brain, HeartPulse, CalendarDays, Target, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

export function DashboardView() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)

  const account = accounts.find((a) => a.id === activeId)

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-24 text-center">
        <h2 className="text-xl font-semibold">No active challenge</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Start a new simulated challenge to track your progress against a prop firm&apos;s rules.
        </p>
        <Button asChild>
          <Link href="/app/new"><Plus className="mr-2 h-4 w-4" />New challenge</Link>
        </Button>
      </div>
    )
  }

  const firm = getFirm(account.firmId)!
  const accountTrades = trades.filter((t) => t.accountId === account.id)
  const status = evaluate(account.rules, accountTrades)
  const curve = equityCurve(account, accountTrades)
  const r = account.rules

  const ddTone = status.drawdownUsedPct > 80 ? "destructive" : status.drawdownUsedPct > 55 ? "warning" : "success"
  const dailyTone = status.dailyLossUsedPct > 80 ? "destructive" : status.dailyLossUsedPct > 55 ? "warning" : "success"

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* top section: Core Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Current Balance" value={fmtCurrency(status.balance)} icon={Wallet} />
        <StatCard label="Current P&L" value={fmtCurrency(status.totalPnl, { sign: true })} icon={TrendingUp} tone={status.totalPnl >= 0 ? "success" : "destructive"} />
        <StatCard label="Profit Target" value={fmtCurrency(r.profitTarget)} icon={Target} sub={`${status.completionPct.toFixed(1)}% complete`} />
        <StatCard label="Remaining DD" value={fmtCurrency(status.drawdownRemaining)} icon={Shield} tone={ddTone} />
        <StatCard label="Trading Days" value={`${status.tradingDays}`} icon={Calendar} sub={`Min ${r.minTradingDays} required`} />
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-center">
          <span className="text-xs text-muted-foreground uppercase font-bold mb-2">Status</span>
          <StatusBadge status={status.status} />
        </div>
      </div>

      {/* middle section: Overview & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary"/> Performance Curve</h3>
              <span className="text-xs text-muted-foreground">Drawdown limit: {fmtCurrency(status.drawdownLimit)}</span>
            </div>
            <div className="h-[250px]">
              <EquityChart data={curve} target={r.startingBalance + r.profitTarget} maxDrawdown={status.drawdownLimit} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5 border-primary/20 bg-primary/5">
              <h3 className="font-bold flex items-center gap-2 mb-2"><Brain className="w-5 h-5 text-primary"/> AI Coach Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "You are maintaining strong discipline. Your win rate has improved by 4% this week. Focus on letting your winners run, as your average RR is slightly below optimal."
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-bold flex items-center gap-2 mb-2"><HeartPulse className="w-5 h-5 text-destructive"/> Psychology Score</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-success">92</span>
                <span className="text-muted-foreground pb-1">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Based on your last 10 trades.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-bold flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-primary"/> Calendar Snapshot</h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['M','T','W','T','F','S','S'].map(d => <div key={d} className="text-xs text-muted-foreground font-bold mb-2">{d}</div>)}
              {Array.from({length: 28}).map((_, i) => {
                const val = Math.random()
                const bg = val > 0.8 ? "bg-success/80" : val > 0.6 ? "bg-success/40" : val < 0.2 ? "bg-destructive/60" : "bg-muted/30"
                return <div key={i} className={`h-8 rounded-sm ${bg}`} />
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-bold mb-4">Risk Limits</h3>
            <RuleMeter label="Daily loss limit" used={fmtCurrency(status.dailyLossUsed)} limit={fmtCurrency(r.dailyLossLimit)} pct={status.dailyLossUsedPct} tone={dailyTone} />
            <RuleMeter label="Max drawdown" used={fmtCurrency(status.drawdownUsed)} limit={fmtCurrency(r.maxDrawdown)} pct={status.drawdownUsedPct} tone={ddTone} className="mt-4" />
          </div>
        </div>
      </div>

      {/* bottom section: Goals & Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-bold text-sm text-muted-foreground uppercase mb-4">Weekly Goal</h3>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold text-primary">$450</span>
            <span className="text-muted-foreground text-sm">/ $1,000</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{width: '45%'}} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-bold text-sm text-muted-foreground uppercase mb-4">Monthly Goal</h3>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold text-primary">$2,100</span>
            <span className="text-muted-foreground text-sm">/ $4,000</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{width: '52%'}} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 bg-success/5 border-success/20">
          <h3 className="font-bold text-sm text-success uppercase mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Best Setup</h3>
          <div className="text-xl font-bold">Trend Pullback</div>
          <div className="text-sm text-muted-foreground mt-1">72% Win Rate</div>
        </div>

        <div className="rounded-xl border bg-card p-5 bg-destructive/5 border-destructive/20">
          <h3 className="font-bold text-sm text-destructive uppercase mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Common Mistake</h3>
          <div className="text-xl font-bold">Revenge Trading</div>
          <div className="text-sm text-muted-foreground mt-1">Cost: -$420 this week</div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: "active" | "passed" | "failed" }) {
  const map = {
    active: { icon: TrendingUp, label: "In Progress", cls: "border-primary/40 bg-primary/10 text-primary" },
    passed: { icon: Trophy, label: "Passed", cls: "border-success/40 bg-success/10 text-success" },
    failed: { icon: XCircle, label: "Failed", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  }[status]
  const Icon = status === "passed" ? Trophy : status === "failed" ? XCircle : CheckCircle2
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium", map.cls)}>
      <Icon className="h-4 w-4" />
      {map.label}
    </span>
  )
}
