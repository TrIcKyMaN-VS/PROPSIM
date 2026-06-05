"use client"

import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { computeAnalytics, fundedReadiness } from "@/lib/analytics"
import { calculatePassProbability } from "@/lib/analytics-engine"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { StatCard } from "./stat-card"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
} from "recharts"
import { Target, Percent, Scale, Activity, TrendingDown, Gauge } from "lucide-react"

export function AnalyticsView() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)

  const account = accounts.find((a) => a.id === activeId)
  const accountTrades = account ? trades.filter((t) => t.accountId === account.id) : []
  const a = computeAnalytics(accountTrades)
  const readiness = fundedReadiness(a)
  const probabilities = calculatePassProbability({ winRate: a.winRate/100, rr: a.profitFactor, consistency: 0 })
  const firm = account ? getFirm(account.firmId) : undefined

  if (!account || accountTrades.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="mt-6 rounded-xl border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          No trades to analyze yet. Log trades on the dashboard to populate analytics.
        </div>
      </div>
    )
  }

  const readinessColor =
    readiness.score >= 80 ? "var(--color-success)" : readiness.score >= 60 ? "var(--color-primary)" : readiness.score >= 40 ? "var(--color-warning)" : "var(--color-destructive)"

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {firm?.name} · {account.sizeLabel} · {a.totalTrades} trades
          </p>
        </div>
      </div>

      {/* core stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Win rate" value={fmtPct(a.winRate, 0)} icon={Percent} sub={`${a.wins}W / ${a.losses}L`} tone={a.winRate >= 50 ? "success" : "warning"} />
        <StatCard label="Profit factor" value={a.profitFactor.toFixed(2)} icon={Scale} tone={a.profitFactor >= 1.3 ? "success" : "warning"} sub="Gross win / loss" />
        <StatCard label="Expectancy" value={fmtCurrency(a.expectancy, { sign: true })} icon={Target} sub="Per trade" tone={a.expectancy >= 0 ? "success" : "destructive"} />
        <StatCard label="Net P&L" value={fmtCurrency(a.netPnl, { sign: true })} icon={Activity} tone={a.netPnl >= 0 ? "success" : "destructive"} />
        <StatCard label="Avg winner" value={fmtCurrency(a.avgWinner)} icon={Target} tone="success" />
        <StatCard label="Avg loser" value={fmtCurrency(-a.avgLoser)} icon={TrendingDown} tone="destructive" />
        <StatCard label="Max drawdown" value={fmtCurrency(a.maxDrawdown)} icon={TrendingDown} sub="Peak to trough" />
        <StatCard label="Risk of ruin" value={fmtPct(a.riskOfRuin, 0)} icon={Gauge} tone={a.riskOfRuin > 30 ? "destructive" : "success"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* readiness gauge */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium">Funded readiness</h3>
          <div className="relative mx-auto mt-2 h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ name: "score", value: readiness.score, fill: readinessColor }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "var(--color-secondary)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">{readiness.score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className="mt-2 text-center text-sm font-medium" style={{ color: readinessColor }}>
            {readiness.label}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {readiness.factors.map((f) => (
              <div key={f.name}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{f.name}</span>
                  <span className="tabular-nums">{f.value}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${f.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pass Probability */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium">Pass Probability Engine</h3>
          <div className="mt-4 space-y-4">
            {probabilities.map(p => (
              <div key={p.firm}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{p.firm}</span>
                  <span className="font-medium">{p.probability}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.probability}%`, backgroundColor: p.probability > 75 ? "var(--color-success)" : p.probability > 40 ? "var(--color-warning)" : "var(--color-destructive)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* by session */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-medium">P&amp;L by session</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.bySession} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="session" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmtCurrency(v), "P&L"]}
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {a.bySession.map((s, i) => (
                    <Cell key={i} fill={s.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* by instrument */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">P&amp;L by instrument</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.byInstrument} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="instrument" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [fmtCurrency(v), "P&L"]}
              />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                {a.byInstrument.map((s, i) => (
                  <Cell key={i} fill={s.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
