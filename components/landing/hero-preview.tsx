"use client"

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts"
import { TrendingUp } from "lucide-react"

const data = [
  { v: 50000 },
  { v: 50320 },
  { v: 50180 },
  { v: 50740 },
  { v: 50520 },
  { v: 51260 },
  { v: 51100 },
  { v: 51880 },
  { v: 52140 },
  { v: 52760 },
  { v: 53010 },
]

function Bar({ label, pct, tone }: { label: string; pct: number; tone: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  )
}

export function HeroPreview() {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-2 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="rounded-lg border border-border/60 bg-background/60">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            </div>
            <span className="ml-3 text-xs text-muted-foreground">Apex 50K — Evaluation</span>
          </div>
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
            On Track
          </span>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-border/60 bg-card p-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Account Balance</p>
                <p className="text-2xl font-bold tabular-nums">$53,010</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                <TrendingUp className="h-4 w-4" /> +$3,010
              </span>
            </div>
            <div className="mt-3 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={["dataMin - 200", "dataMax + 200"]} hide />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#heroFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3.5 rounded-lg border border-border/60 bg-card p-4">
            <Bar label="Profit Target" pct={84} tone="var(--primary)" />
            <Bar label="Drawdown Buffer" pct={61} tone="var(--success)" />
            <Bar label="Daily Loss Buffer" pct={92} tone="var(--success)" />
            <Bar label="Contract Usage" pct={30} tone="var(--warning)" />
            <Bar label="Challenge Completion" pct={78} tone="var(--primary)" />
          </div>
        </div>
      </div>
    </div>
  )
}
