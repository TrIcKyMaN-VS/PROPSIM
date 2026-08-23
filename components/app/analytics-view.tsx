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
import { Target, Percent, Scale, Activity, TrendingDown, Gauge, BookOpen, Clock, CalendarDays, Tag } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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
            {account.name || `${firm?.name} · ${account.sizeLabel}`} · {a.totalTrades} trades
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
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={a.bySession} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="session" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [fmtCurrency(Number(v || 0)), "P&L"]}
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
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={a.byInstrument} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="instrument" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [fmtCurrency(Number(v || 0)), "P&L"]}
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

      {/* P&L by Day of Week + Hour of Day */}
      {(() => {
        const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        const byDay = DAYS.map((label, i) => {
          // 0=Sun in JS, we want Mon=0
          const jsDay = i === 6 ? 0 : i + 1
          const dayTrades = accountTrades.filter(t => new Date(t.timestamp).getDay() === jsDay)
          return {
            day: label.slice(0, 3),
            pnl: Math.round(dayTrades.reduce((s, t) => s + t.pnl, 0)),
            trades: dayTrades.length
          }
        })

        const HOURS = Array.from({ length: 24 }, (_, i) => i)
        const byHour = HOURS
          .map(h => {
            const hourTrades = accountTrades.filter(t => new Date(t.timestamp).getHours() === h)
            return {
              hour: `${String(h).padStart(2, "0")}:00`,
              pnl: Math.round(hourTrades.reduce((s, t) => s + t.pnl, 0)),
              trades: hourTrades.length
            }
          })
          .filter(h => h.trades > 0)

        return (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-medium">P&amp;L by Day of Week</h3>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={byDay} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                      contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any, _: any, props: any) => [fmtCurrency(Number(v || 0)), `P&L (${props?.payload?.trades ?? 0} trades)`]}
                    />
                    <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                      {byDay.map((d, i) => (
                        <Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-medium">P&amp;L by Hour of Day</h3>
              </div>
              {byHour.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                  Not enough data — trades without timestamps or no trades yet.
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={byHour} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <XAxis dataKey="hour" tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.ceil(byHour.length / 8)} />
                      <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                        contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any, _: any, props: any) => [fmtCurrency(Number(v || 0)), `P&L (${props?.payload?.trades ?? 0} trades)`]}
                      />
                      <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                        {byHour.map((h, i) => (
                          <Cell key={i} fill={h.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* P&L by Tag */}
      {(() => {
        // Build tag stats: group trades by each tag they carry
        const tagMap = new Map<string, { pnl: number; trades: number }>()
        accountTrades.forEach(t => {
          let tags: string[] = []
          if (t.tags) {
            if (Array.isArray(t.tags)) tags = t.tags
            else if (typeof t.tags === "string") {
              try { const p = JSON.parse(t.tags); tags = Array.isArray(p) ? p : [t.tags] } catch { tags = [t.tags] }
            }
          }
          tags.forEach(tag => {
            const existing = tagMap.get(tag) ?? { pnl: 0, trades: 0 }
            tagMap.set(tag, { pnl: existing.pnl + t.pnl, trades: existing.trades + 1 })
          })
        })

        const byTag = [...tagMap.entries()]
          .map(([tag, stats]) => ({ tag, pnl: Math.round(stats.pnl), trades: stats.trades }))
          .sort((a, b) => b.trades - a.trades)
          .slice(0, 10)

        return (
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-primary" />
              <h3 className="font-medium">P&amp;L by Tag</h3>
            </div>
            {byTag.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                No tags found — add tags to your trades to see performance by tag.
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={byTag} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <XAxis dataKey="tag" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      cursor={{ fill: "var(--color-secondary)", opacity: 0.4 }}
                      contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any, _: any, props: any) => [fmtCurrency(Number(v || 0)), `P&L (${props?.payload?.trades ?? 0} trades)`]}
                    />
                    <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>
                      {byTag.map((d, i) => (
                        <Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )
      })()}

      {/* Playbook Performance Analytics */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Playbook Performance Analytics</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Playbook</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Trades</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Net P&amp;L</TableHead>
                <TableHead className="text-right">Profit Factor</TableHead>
                <TableHead className="text-right">Avg Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const playbooks = usePropStore((s) => s.playbooks) || []
                
                // Get playbooks that are either active or have historical trades
                const playbooksWithStats = playbooks.map(pb => {
                  const pbTrades = accountTrades.filter(t => t.playbookId === pb.id || (t.playbookName && t.playbookName === pb.name))
                  
                  const total = pbTrades.length
                  const wins = pbTrades.filter(t => t.pnl > 0).length
                  const winRate = total > 0 ? (wins / total) * 100 : 0
                  const netPnl = pbTrades.reduce((sum, t) => sum + t.pnl, 0)
                  
                  const grossWin = pbTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
                  const grossLoss = Math.abs(pbTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
                  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0

                  // Calculate average checklist compliance
                  let avgCompliance = 100
                  if (total > 0 && pb.checklist && pb.checklist.length > 0) {
                    const checklistItems = pb.checklist
                    const compliances = pbTrades.map(trade => {
                      const checked = trade.playbookChecklist || {}
                      const checkedCount = checklistItems.filter((item: any, idx: number) => {
                        const itemId = item.id || idx.toString()
                        return !!checked[itemId]
                      }).length
                      return (checkedCount / checklistItems.length) * 100
                    })
                    avgCompliance = compliances.reduce((sum, val) => sum + val, 0) / total
                  } else if (!pb.checklist || pb.checklist.length === 0) {
                    avgCompliance = 100
                  } else {
                    avgCompliance = 0
                  }

                  return {
                    id: pb.id,
                    name: pb.name,
                    deletedAt: pb.deletedAt,
                    total,
                    winRate,
                    netPnl,
                    profitFactor,
                    avgCompliance
                  }
                }).filter(pb => !pb.deletedAt || pb.total > 0) // Hide soft-deleted playbooks with 0 trades

                if (playbooksWithStats.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No playbooks logged for this account yet.
                      </TableCell>
                    </TableRow>
                  )
                }

                return playbooksWithStats.map(pb => (
                  <TableRow key={pb.id}>
                    <TableCell className="font-medium">{pb.name}</TableCell>
                    <TableCell>
                      {pb.deletedAt ? (
                        <Badge variant="secondary" className="opacity-60">Deleted</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{pb.total}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {pb.total > 0 ? `${pb.winRate.toFixed(1)}%` : "N/A"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${pb.netPnl > 0 ? "text-success" : pb.netPnl < 0 ? "text-destructive" : ""}`}>
                      {pb.total > 0 ? `${pb.netPnl >= 0 ? "+" : ""}${fmtCurrency(pb.netPnl)}` : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {pb.total > 0 ? (pb.profitFactor >= 99 ? "99.00" : pb.profitFactor.toFixed(2)) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-primary">
                      {pb.total > 0 ? `${pb.avgCompliance.toFixed(1)}%` : "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              })()}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

