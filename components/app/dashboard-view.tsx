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
import { Wallet, TrendingUp, Calendar, Layers, AlertTriangle, CheckCircle2, XCircle, Trophy, Plus, Activity, Brain, HeartPulse, CalendarDays, Target, Shield, Flame, TrendingDown, Zap } from "lucide-react"
import { AnimatedCard, AnimatedButton } from "./animated-ui"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

export function DashboardView() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)
  const tradePsychology = usePropStore((s) => s.tradePsychology)

  const account = accounts.find((a) => a.id === activeId)

  if (!account) {
    return (
      <AnimatedCard className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-24 text-center bg-card">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">No active challenge</h2>
        <p className="max-w-sm text-sm text-muted-foreground mb-4">
          Start a new simulated challenge to track your progress against a prop firm&apos;s rules.
        </p>
        <AnimatedButton className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" onClick={() => window.location.href='/app/new'}>
          <Plus className="mr-2 h-4 w-4" /> New challenge
        </AnimatedButton>
      </AnimatedCard>
    )
  }

  const firm = getFirm(account.firmId)!
  const accountTrades = trades.filter((t) => t.accountId === account.id)
  const status = evaluate(account.rules, accountTrades)
  const curve = equityCurve(account, accountTrades)
  const r = account.rules

  const ddTone = status.drawdownUsedPct > 80 ? "destructive" : status.drawdownUsedPct > 55 ? "warning" : "success"
  const dailyTone = status.dailyLossUsedPct > 80 ? "destructive" : status.dailyLossUsedPct > 55 ? "warning" : "success"

  // Compute wins/losses/winRate from trades
  const wins = accountTrades.filter(t => t.pnl > 0).length
  const losses = accountTrades.filter(t => t.pnl < 0).length
  const winRateNum = accountTrades.length > 0 ? (wins / accountTrades.length) * 100 : 0
  const winRateStr = `${winRateNum.toFixed(0)}%`

  // ── Date window helpers ──────────────────────────────────────────────────
  const now = new Date()

  // Current week: Mon 00:00 → Sun 23:59
  const dayOfWeek = now.getDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  weekStart.setHours(0, 0, 0, 0)

  // Current month: 1st 00:00 → end of month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  const weeklyPnl = accountTrades
    .filter(t => t.timestamp >= weekStart.getTime())
    .reduce((sum, t) => sum + t.pnl, 0)

  const monthlyPnl = accountTrades
    .filter(t => t.timestamp >= monthStart.getTime())
    .reduce((sum, t) => sum + t.pnl, 0)

  // ── Best Setup: highest win rate playbook with ≥2 trades ─────────────────
  const bestSetup = useMemo(() => {
    if (accountTrades.length === 0) return "N/A"
    const map: Record<string, { wins: number; total: number }> = {}
    for (const t of accountTrades) {
      if (!t.playbookName) continue
      if (!map[t.playbookName]) map[t.playbookName] = { wins: 0, total: 0 }
      map[t.playbookName].total++
      if (t.pnl > 0) map[t.playbookName].wins++
    }
    const candidates = Object.entries(map).filter(([, v]) => v.total >= 2)
    if (candidates.length === 0) {
      // Fallback: most profitable setup by tag
      const tagMap: Record<string, number> = {}
      for (const t of accountTrades) {
        const tags = Array.isArray(t.tags) ? t.tags : []
        for (const tag of tags) {
          tagMap[tag] = (tagMap[tag] || 0) + t.pnl
        }
      }
      const best = Object.entries(tagMap).sort((a, b) => b[1] - a[1])[0]
      return best ? best[0] : "No Playbook Data"
    }
    const best = candidates.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0]
    return `${best[0]} (${Math.round((best[1].wins / best[1].total) * 100)}% WR)`
  }, [accountTrades])

  const bestSetupExists = bestSetup !== "N/A" && bestSetup !== "No Playbook Data"

  // ── Common Mistake: from psychology records ──────────────────────────────
  const commonMistake = useMemo(() => {
    const accountPsy = tradePsychology.filter(p => {
      const t = accountTrades.find(tr => tr.id === p.tradeId)
      return !!t
    })
    if (accountPsy.length === 0) return "None detected"

    const flags: Record<string, number> = {
      "Broke rules": accountPsy.filter(p => p.brokeRules).length,
      "Moved stop": accountPsy.filter(p => p.movedStop).length,
      "Moved target": accountPsy.filter(p => p.movedTarget).length,
      "Emotion affected": accountPsy.filter(p => p.emotionAffected).length,
      "Averaged losers": accountPsy.filter(p => p.addedSize).length,
      "Hesitated": accountPsy.filter(p => p.hesitated).length,
    }
    const top = Object.entries(flags).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]
    if (!top) return "None detected"
    return `${top[0]} (${top[1]}×)`
  }, [tradePsychology, accountTrades])

  const hasMistake = commonMistake !== "None detected"

  // ── Psychology Score: from real psych records ────────────────────────────
  const psyScore = useMemo(() => {
    const accountPsy = tradePsychology.filter(p => {
      const t = accountTrades.find(tr => tr.id === p.tradeId)
      return !!t
    })
    if (accountPsy.length === 0) return 100

    let totalDeductions = 0
    for (const p of accountPsy) {
      if (p.brokeRules) totalDeductions += 15
      if (p.emotionAffected) totalDeductions += 10
      if (p.movedStop) totalDeductions += 8
      if (p.addedSize) totalDeductions += 8
      if (p.movedTarget) totalDeductions += 5
      if (p.hesitated) totalDeductions += 3
    }
    const maxPossible = accountPsy.length * 49 // max deductions per trade
    const rawScore = Math.max(0, 100 - (totalDeductions / Math.max(maxPossible, 1)) * 100)

    // Also factor in execution grades
    const graded = accountPsy.filter(p => p.executionGrade)
    if (graded.length > 0) {
      const gradeMap: Record<string, number> = { "A+": 100, "A": 90, "B": 75, "C": 60, "D": 40, "F": 10 }
      const avgGrade = graded.reduce((sum, p) => sum + (gradeMap[p.executionGrade] || 50), 0) / graded.length
      return Math.round((rawScore * 0.6) + (avgGrade * 0.4))
    }

    return Math.round(rawScore)
  }, [tradePsychology, accountTrades])

  // ── Streak Analytics ─────────────────────────────────────────────────────
  const streaks = useMemo(() => {
    const sorted = [...accountTrades].sort((a, b) => a.timestamp - b.timestamp)
    let currentWin = 0, currentLoss = 0, maxWin = 0, maxLoss = 0
    for (const t of sorted) {
      if (t.pnl > 0) {
        currentWin++
        currentLoss = 0
        maxWin = Math.max(maxWin, currentWin)
      } else if (t.pnl < 0) {
        currentLoss++
        currentWin = 0
        maxLoss = Math.max(maxLoss, currentLoss)
      }
    }
    return { currentWin, currentLoss, maxWin, maxLoss }
  }, [accountTrades])

  // ── AI Coach message ─────────────────────────────────────────────────────
  const aiCoachMessage = accountTrades.length === 0
    ? "No trades recorded yet. Start trading to get AI coaching insights."
    : winRateNum > 50
      ? `You are maintaining strong discipline with a ${winRateStr} win rate. Keep managing your risk and letting winners run.`
      : `Your win rate is currently ${winRateStr}. Focus on waiting for A+ setups and sticking strictly to your risk limits.`

  // ── Goals ────────────────────────────────────────────────────────────────
  const weeklyGoal = r.profitTarget * 0.25
  const monthlyGoal = r.profitTarget

  const wGoalPct = Math.min(100, Math.max(0, (weeklyPnl / weeklyGoal) * 100))
  const mGoalPct = Math.min(100, Math.max(0, (monthlyPnl / monthlyGoal) * 100))

  // ── Calendar Heatmap (Last 28 days) ──────────────────────────────────────
  const getLocalDateString = (d: Date | number) => {
    const date = new Date(d)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const today = new Date()
  const last28Days = Array.from({length: 28}).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (27 - i))
    return getLocalDateString(d)
  })

  const dailyPnls: Record<string, number> = {}
  accountTrades.forEach(t => {
    const d = t.timestamp ? getLocalDateString(t.timestamp) : ""
    if (d) dailyPnls[d] = (dailyPnls[d] || 0) + t.pnl
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* top section: Core Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard delay={0.05} label="Current Balance" rawNumber={status.balance} formatNumber={fmtCurrency} icon={Wallet} />
        <StatCard delay={0.1} label="Current P&L" rawNumber={status.totalPnl} formatNumber={(v) => fmtCurrency(v, { sign: true })} icon={TrendingUp} tone={status.totalPnl >= 0 ? "success" : "destructive"} />
        <StatCard delay={0.15} label="Profit Target" rawNumber={r.profitTarget} formatNumber={fmtCurrency} icon={Target} sub={`${status.completionPct.toFixed(1)}% complete`} />
        <StatCard delay={0.2} label="Remaining DD" rawNumber={status.drawdownRemaining} formatNumber={fmtCurrency} icon={Shield} tone={ddTone} />
        <StatCard delay={0.25} label="Trading Days" rawNumber={status.tradingDays} icon={Calendar} sub={`Min ${r.minTradingDays} required`} />
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-center">
          <span className="text-xs text-muted-foreground uppercase font-bold mb-2">Status</span>
          <StatusBadge status={status.status} />
        </div>
      </div>

      {/* middle section: Overview & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AnimatedCard delay={0.3} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary"/>Performance Curve</h3>
              <span className="text-xs text-muted-foreground">Drawdown limit: {fmtCurrency(status.drawdownLimit)}</span>
            </div>
            <div className="h-[250px]">
              <EquityChart data={curve} target={r.startingBalance + r.profitTarget} maxDrawdown={status.drawdownLimit} />
            </div>
          </AnimatedCard>

          <div className="grid grid-cols-2 gap-4">
            <AnimatedCard delay={0.4} className="rounded-xl border bg-card p-5 border-primary/20 bg-primary/5">
              <h3 className="font-bold flex items-center gap-2 mb-2"><Brain className="w-5 h-5 text-primary"/> AI Coach Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {aiCoachMessage}
              </p>
            </AnimatedCard>
            <AnimatedCard delay={0.5} className="rounded-xl border bg-card p-5">
              <h3 className="font-bold flex items-center gap-2 mb-2"><HeartPulse className="w-5 h-5 text-destructive"/> Psychology Score</h3>
              <div className="flex items-end gap-2">
                <span className={cn("text-4xl font-bold", psyScore > 80 ? "text-success" : psyScore > 50 ? "text-warning" : "text-destructive")}>{psyScore}</span>
                <span className="text-muted-foreground pb-1">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {tradePsychology.length > 0 ? "Based on your psychology logs." : "Log psychology data on trade reviews."}
              </p>
            </AnimatedCard>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatedCard delay={0.35} className="rounded-xl border bg-card p-5">
            <h3 className="font-bold flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-primary"/> Calendar Snapshot</h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['M','T','W','T','F','S','S'].map((d, i) => <div key={`${i}-${d}`} className="text-xs text-muted-foreground font-bold mb-2">{d}</div>)}
              {last28Days.map((dateStr, i) => {
                const pnl = dailyPnls[dateStr] || 0
                let bg = "bg-muted/30"
                if (pnl > 0) bg = pnl > r.profitTarget * 0.05 ? "bg-success/80" : "bg-success/40"
                else if (pnl < 0) bg = pnl < -r.dailyLossLimit * 0.5 ? "bg-destructive/80" : "bg-destructive/40"
                return <div key={dateStr} className={`h-8 rounded-sm ${bg}`} title={`${dateStr}: ${fmtCurrency(pnl, {sign: true})}`} />
              })}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.45} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-bold mb-4">Risk Limits</h3>
            <RuleMeter label="Daily loss limit" used={fmtCurrency(status.dailyLossUsed)} limit={fmtCurrency(r.dailyLossLimit)} pct={status.dailyLossUsedPct} tone={dailyTone} />
            <RuleMeter label="Max drawdown" used={fmtCurrency(status.drawdownUsed)} limit={fmtCurrency(r.maxDrawdown)} pct={status.drawdownUsedPct} tone={ddTone} className="mt-4" />
          </AnimatedCard>
        </div>
      </div>

      {/* bottom section: Goals & Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weekly Goal */}
        <AnimatedCard delay={0.6} className="rounded-xl border bg-card p-5">
          <h3 className="font-bold text-sm text-muted-foreground uppercase mb-4">This Week</h3>
          <div className="flex justify-between items-end mb-2">
            <span className={cn("text-2xl font-bold", weeklyPnl >= 0 ? "text-primary" : "text-destructive")}>{fmtCurrency(weeklyPnl, {sign: true})}</span>
            <span className="text-muted-foreground text-sm">/ {fmtCurrency(weeklyGoal)}</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className={cn("h-full transition-all rounded-full", weeklyPnl >= 0 ? "bg-primary" : "bg-destructive")} style={{width: `${wGoalPct}%`}} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Weekly target = 25% of profit goal</p>
        </AnimatedCard>

        {/* Monthly Goal */}
        <AnimatedCard delay={0.7} className="rounded-xl border bg-card p-5">
          <h3 className="font-bold text-sm text-muted-foreground uppercase mb-4">This Month</h3>
          <div className="flex justify-between items-end mb-2">
            <span className={cn("text-2xl font-bold", monthlyPnl >= 0 ? "text-primary" : "text-destructive")}>{fmtCurrency(monthlyPnl, {sign: true})}</span>
            <span className="text-muted-foreground text-sm">/ {fmtCurrency(monthlyGoal)}</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className={cn("h-full transition-all rounded-full", monthlyPnl >= 0 ? "bg-primary" : "bg-destructive")} style={{width: `${mGoalPct}%`}} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Monthly target = profit goal</p>
        </AnimatedCard>

        {/* Best Setup — real data */}
        <AnimatedCard delay={0.8} className={cn("rounded-xl border p-5", bestSetupExists ? "bg-success/5 border-success/20" : "bg-card")}>
          <h3 className={cn("font-bold text-sm uppercase mb-2 flex items-center gap-2", bestSetupExists ? "text-success" : "text-muted-foreground")}><TrendingUp className="w-4 h-4"/> Best Setup</h3>
          <div className="text-lg font-bold leading-tight break-words">{bestSetup}</div>
          <div className="text-sm text-muted-foreground mt-1">{accountTrades.length > 0 ? `${status.winRate} Overall Win Rate` : 'Log trades to calculate'}</div>
        </AnimatedCard>

        {/* Common Mistake — real data */}
        <AnimatedCard delay={0.9} className={cn("rounded-xl border p-5", hasMistake ? "bg-destructive/5 border-destructive/20" : "bg-card")}>
          <h3 className={cn("font-bold text-sm uppercase mb-2 flex items-center gap-2", hasMistake ? "text-destructive" : "text-muted-foreground")}><AlertTriangle className="w-4 h-4"/> Common Mistake</h3>
          <div className="text-lg font-bold leading-tight">{commonMistake}</div>
          <div className="text-sm text-muted-foreground mt-1">{hasMistake ? 'Focus on discipline' : 'Great discipline!'}</div>
        </AnimatedCard>
      </div>

      {/* Streak Analytics Row */}
      {accountTrades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatedCard delay={1.0} className={cn("rounded-xl border p-4", streaks.currentWin > 0 ? "border-success/30 bg-success/5" : "bg-card")}>
            <div className="flex items-center gap-2 mb-1">
              <Flame className={cn("w-4 h-4", streaks.currentWin > 0 ? "text-success" : "text-muted-foreground")} />
              <span className="text-xs font-bold uppercase text-muted-foreground">Current Streak</span>
            </div>
            {streaks.currentWin > 0 ? (
              <div className="text-2xl font-bold text-success">{streaks.currentWin}W</div>
            ) : streaks.currentLoss > 0 ? (
              <div className="text-2xl font-bold text-destructive">{streaks.currentLoss}L</div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </AnimatedCard>

          <AnimatedCard delay={1.05} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-success" />
              <span className="text-xs font-bold uppercase text-muted-foreground">Best Win Streak</span>
            </div>
            <div className="text-2xl font-bold text-success">{streaks.maxWin}W</div>
          </AnimatedCard>

          <AnimatedCard delay={1.1} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-xs font-bold uppercase text-muted-foreground">Worst Loss Streak</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{streaks.maxLoss}L</div>
          </AnimatedCard>

          <AnimatedCard delay={1.15} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase text-muted-foreground">Total Trades</span>
            </div>
            <div className="text-2xl font-bold">{accountTrades.length}</div>
            <div className="text-xs text-muted-foreground">{wins}W / {losses}L</div>
          </AnimatedCard>
        </div>
      )}
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
