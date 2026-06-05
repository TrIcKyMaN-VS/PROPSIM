"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { PropFirm } from "@/lib/types"
import { usePropStore } from "@/lib/store"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, Check, X, Zap, GitCompareArrows } from "lucide-react"
import { cn } from "@/lib/utils"

export function FirmDetail({ firm }: { firm: PropFirm }) {
  const router = useRouter()
  const createAccount = usePropStore((s) => s.createAccount)
  const compareFirmIds = usePropStore((s) => s.compareFirmIds)
  const toggleCompare = usePropStore((s) => s.toggleCompare)
  const [sizeIdx, setSizeIdx] = useState(Math.min(1, firm.sizes.length - 1))

  const size = firm.sizes[sizeIdx]
  const r = size.rules
  const inCompare = compareFirmIds.includes(firm.id)

  function start() {
    createAccount(firm.id, size.label)
    toast.success(`Started ${firm.shortName} ${size.label} challenge`)
    router.push("/app")
  }

  const ruleRows = [
    { label: "Starting balance", value: fmtCurrency(r.startingBalance) },
    { label: "Profit target", value: fmtCurrency(r.profitTarget) },
    { label: "Max drawdown", value: `${fmtCurrency(r.maxDrawdown)} (${firm.drawdownType})` },
    { label: "Daily loss limit", value: r.dailyLossLimit > 0 ? fmtCurrency(r.dailyLossLimit) : "None" },
    { label: "Max contracts", value: `${r.maxContracts}` },
    { label: "Min trading days", value: `${r.minTradingDays}` },
    { label: "Consistency rule", value: r.consistencyPct > 0 ? `${r.consistencyPct}% max day` : "None" },
    { label: "Evaluation price", value: fmtCurrency(size.price) },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/app/firms" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All firms
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold"
            style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
          >
            {firm.shortName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{firm.name}</h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{firm.tagline}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={inCompare ? "secondary" : "outline"} onClick={() => toggleCompare(firm.id)}>
            <GitCompareArrows className="mr-2 h-4 w-4" />
            {inCompare ? "In compare" : "Compare"}
          </Button>
          <Button onClick={start}>
            <Zap className="mr-2 h-4 w-4" /> Simulate
          </Button>
        </div>
      </div>

      {/* meta stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Difficulty", value: firm.difficulty },
          { label: "Pass rate", value: `${firm.successRate}%` },
          { label: "Payout speed", value: firm.payoutSpeed },
          { label: "Drawdown", value: firm.drawdownType, cap: true },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className={cn("mt-1 font-semibold", s.cap && "capitalize")}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* rules */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Account rules</h2>
              <div className="flex flex-wrap gap-1.5">
                {firm.sizes.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setSizeIdx(i)}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                      i === sizeIdx
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <dl className="mt-4 divide-y divide-border">
              {ruleRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* pros cons */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-success">Strengths</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {firm.pros.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-destructive">Watch outs</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {firm.cons.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
