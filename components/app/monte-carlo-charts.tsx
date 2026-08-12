"use client"

import React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { MonteCarloStats } from "@/lib/simulation/monte-carlo-types"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MonteCarloChartsProps {
  stats: MonteCarloStats
}

export function MonteCarloCharts({ stats }: MonteCarloChartsProps) {
  // Format Equity Curve Data
  const equityData = stats.expectedEquityCurve.map((median, idx) => ({
    tradeIndex: idx,
    median: Math.round(median),
    lower: Math.round(stats.confidenceInterval95Lower[idx]),
    upper: Math.round(stats.confidenceInterval95Upper[idx]),
  }))

  // Format Drawdown Data
  const drawdownData = stats.drawdownCurve.map((dd, idx) => ({
    tradeIndex: idx,
    drawdown: parseFloat(dd.toFixed(2)),
  }))

  return (
    <Tabs defaultValue="equity" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="equity">Equity Curve &amp; Bands</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown Curve</TabsTrigger>
          <TabsTrigger value="returns">Return Distribution</TabsTrigger>
          <TabsTrigger value="streaks">Streak Probabilities</TabsTrigger>
        </TabsList>
      </div>

      {/* Equity Curve & Bands */}
      <TabsContent value="equity">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Equity Projection (Median &amp; 95% Confidence Bands)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="equityBandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis
                  dataKey="tradeIndex"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                  formatter={(value: any, name: any) => [
                    fmtCurrency(Number(value || 0)),
                    name === "upper" ? "95th Percentile" : name === "lower" ? "5th Percentile" : "Median Equity",
                  ]}
                />
                {/* 95% CI Area Band */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="url(#equityBandFill)"
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="var(--color-primary)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="upper"
                />
                <Line
                  type="monotone"
                  dataKey="median"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={false}
                  name="median"
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="var(--color-primary)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="lower"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Drawdown Curve */}
      <TabsContent value="drawdown">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Median Drawdown Progression</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={drawdownData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis
                  dataKey="tradeIndex"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => `${v}%`}
                  reversed
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                  formatter={(value: any) => [`${value}%`, "Median Drawdown"]}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="var(--color-destructive)"
                  strokeWidth={2}
                  fill="url(#drawdownFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Return Distribution */}
      <TabsContent value="returns">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Return Distribution (Ending Balance Probability)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={stats.returnHistogram} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis
                  dataKey="bin"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                  formatter={(value: any, _: any, props: any) => [
                    `${parseFloat(value).toFixed(2)}% (${props?.payload?.count ?? 0} runs)`,
                    "Probability",
                  ]}
                />
                <Bar dataKey="countPct" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Streak Probabilities */}
      <TabsContent value="streaks">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Streak Probability Distribution (Losing vs Winning)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart
                data={stats.winningStreakDistribution.map((w, idx) => ({
                  streak: w.length,
                  win: parseFloat(w.probability.toFixed(2)),
                  loss: parseFloat(stats.losingStreakDistribution[idx].probability.toFixed(2)),
                }))}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis
                  dataKey="streak"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                  formatter={(value: any, name: any) => [
                    `${value}%`,
                    name === "win" ? "Win Streak >= length" : "Loss Streak >= length",
                  ]}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="win" name="Win Streak" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loss" name="Loss Streak" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
