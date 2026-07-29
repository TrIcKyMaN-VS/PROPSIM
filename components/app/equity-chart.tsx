"use client"

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { fmtCurrency } from "@/lib/format"

interface Point {
  idx: number
  balance: number
  floor: number
  label: string
}

export function EquityChart({ data, target }: { data: Point[]; target: number }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
            domain={["dataMin - 500", "dataMax + 500"]}
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
            formatter={(value: any, name: any) => [fmtCurrency(Number(value || 0)), name === "balance" ? "Equity" : "DD Floor"]}
          />
          <Area type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2} fill="url(#equityFill)" />
          <Line type="monotone" dataKey="floor" stroke="var(--color-destructive)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
