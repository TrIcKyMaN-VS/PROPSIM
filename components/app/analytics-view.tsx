"use client"

import { useMemo } from "react"
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
import { Target, Percent, Scale, Activity, TrendingDown, Gauge, BookOpen, Clock, CalendarDays, Tag, Sparkles, ShieldCheck, BarChart3 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AnalyticsView() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)

  const account = useMemo(() => accounts.find((a) => a.id === activeId), [accounts, activeId])
  const accountTrades = useMemo(() => account ? trades.filter((t) => t.accountId === account.id) : [], [account, trades])
  const a = useMemo(() => computeAnalytics(accountTrades), [accountTrades])
  const readiness = useMemo(() => fundedReadiness(a), [a])
  const probabilities = useMemo(() => calculatePassProbability({ winRate: a.winRate/100, rr: a.profitFactor, consistency: 0 }), [a])
  const firm = useMemo(() => account ? getFirm(account.firmId) : undefined, [account])

  if (!account || accountTrades.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <Card className="border-dashed border-border/80 bg-card/40 backdrop-blur-xl p-12 space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No trades available to analyze</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Log trades on your dashboard or import a CSV log to calculate live performance analytics.
          </p>
        </Card>
      </div>
    )
  }

  const readinessColor =
    readiness.score >= 80 ? "#10b981" : readiness.score >= 60 ? "#38bdf8" : readiness.score >= 40 ? "#f59e0b" : "#f43f5e"

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Performance Analytics</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              {account.name || `${firm?.name} · ${account.sizeLabel}`}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Statistical breakdown of expectancy, profit factor, risk of ruin, and session performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-card border border-border/80 text-foreground">
            {a.totalTrades} Executed Trades
          </span>
        </div>
      </div>

      {/* Core Telemetry Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Win rate" value={fmtPct(a.winRate, 0)} icon={Percent} sub={`${a.wins}W / ${a.losses}L`} tone={a.winRate >= 50 ? "success" : "warning"} />
        <StatCard label="Profit factor" value={a.profitFactor.toFixed(2)} icon={Scale} tone={a.profitFactor >= 1.3 ? "success" : "warning"} sub="Gross win / loss" />
        <StatCard label="Expectancy" value={fmtCurrency(a.expectancy, { sign: true })} icon={Target} sub="Per trade" tone={a.expectancy >= 0 ? "success" : "destructive"} />
        <StatCard label="Net Realized P&L" value={fmtCurrency(a.netPnl, { sign: true })} icon={Activity} tone={a.netPnl >= 0 ? "success" : "destructive"} />
        <StatCard label="Avg winner" value={fmtCurrency(a.avgWinner)} icon={Target} tone="success" />
        <StatCard label="Avg loser" value={fmtCurrency(-a.avgLoser)} icon={TrendingDown} tone="destructive" />
        <StatCard label="Max drawdown" value={fmtCurrency(a.maxDrawdown)} icon={TrendingDown} sub="Peak to trough" />
        <StatCard label="Risk of ruin" value={fmtPct(a.riskOfRuin, 0)} icon={Gauge} tone={a.riskOfRuin > 30 ? "destructive" : "success"} />
      </div>

      {/* Readiness Hologram & Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Holographic Funded Readiness Card */}
        <Card className="bg-card/60 backdrop-blur-xl border-primary/20 shadow-[0_0_25px_rgba(56,189,248,0.06)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Funded Readiness Score
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {readiness.label}
              </span>
            </div>

            {/* Radial Gauge */}
            <div className="relative mx-auto mt-6 h-48 w-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="75%"
                  outerRadius="100%"
                  barSize={12}
                  data={[{ value: readiness.score }]}
                  startAngle={225}
                  endAngle={-45}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={12}
                    fill={readinessColor}
                    background={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black font-mono tracking-tight text-foreground">{readiness.score}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">OUT OF 100</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground text-center font-mono">
            Evaluates win rate, risk-reward ratio, discipline score, and max drawdown buffer.
          </div>
        </Card>

        {/* PnL by Session Bar Chart */}
        <Card className="lg:col-span-2 bg-card/60 backdrop-blur-xl border-border/80 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> P&amp;L by Trading Session
            </h3>
            <span className="text-xs font-mono text-muted-foreground">Exchange Local Time</span>
          </div>

          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.bySession} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="session" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-xl border border-border/80 bg-card/90 backdrop-blur-xl p-3 shadow-2xl font-mono text-xs">
                          <p className="font-bold text-foreground">{data.session}</p>
                          <p className={cn("font-black mt-1 text-sm", data.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {fmtCurrency(data.pnl, { sign: true })} ({data.trades} trades)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {a.bySession.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* PnL by Instrument Breakdown */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/80 p-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Instrument Breakdown Matrix
          </h3>
          <span className="text-xs font-mono text-muted-foreground">{a.byInstrument.length} Instruments Traded</span>
        </div>

        <div className="overflow-x-auto">
          <Table className="font-mono text-xs">
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/40">
                <TableHead className="font-bold text-muted-foreground uppercase">Instrument</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-right">Trades</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-right">Net P&amp;L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.byInstrument.map((row) => (
                <TableRow key={row.instrument} className="border-border/30 hover:bg-muted/20">
                  <TableCell className="font-bold text-foreground font-mono">
                    <Badge variant="outline" className="font-mono text-xs bg-muted/60">
                      {row.instrument}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-foreground">{row.trades}</TableCell>
                  <TableCell className={cn("text-right font-black tabular-nums text-sm", row.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {fmtCurrency(row.pnl, { sign: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
