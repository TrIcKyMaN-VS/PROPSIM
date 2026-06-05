"use client"

import { usePropStore } from "@/lib/store"
import { FIRMS, getFirm } from "@/lib/firms"
import { fmtCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Plus, X } from "lucide-react"

export function CompareView() {
  const compareFirmIds = usePropStore((s) => s.compareFirmIds)
  const toggleCompare = usePropStore((s) => s.toggleCompare)

  const firms = compareFirmIds.map((id) => getFirm(id)).filter(Boolean) as NonNullable<ReturnType<typeof getFirm>>[]
  const available = FIRMS.filter((f) => !compareFirmIds.includes(f.id))

  const rows: { label: string; get: (f: (typeof firms)[number]) => string; best?: "min" | "max"; raw?: (f: (typeof firms)[number]) => number }[] = [
    { label: "Drawdown type", get: (f) => f.drawdownType },
    { label: "Difficulty", get: (f) => f.difficulty },
    { label: "Pass rate", get: (f) => `${f.successRate}%`, best: "max", raw: (f) => f.successRate },
    { label: "Payout speed", get: (f) => f.payoutSpeed },
    { label: "50K target", get: (f) => fmtCurrency(size50(f).rules.profitTarget), best: "min", raw: (f) => size50(f).rules.profitTarget },
    { label: "50K drawdown", get: (f) => fmtCurrency(size50(f).rules.maxDrawdown), best: "max", raw: (f) => size50(f).rules.maxDrawdown },
    { label: "50K daily loss", get: (f) => (size50(f).rules.dailyLossLimit > 0 ? fmtCurrency(size50(f).rules.dailyLossLimit) : "None") },
    { label: "50K contracts", get: (f) => `${size50(f).rules.maxContracts}`, best: "max", raw: (f) => size50(f).rules.maxContracts },
    { label: "Consistency", get: (f) => (size50(f).rules.consistencyPct > 0 ? `${size50(f).rules.consistencyPct}%` : "None") },
    { label: "50K price", get: (f) => fmtCurrency(size50(f).price), best: "min", raw: (f) => size50(f).price },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare firms</h1>
        <p className="mt-1 text-sm text-muted-foreground">Side-by-side on 50K accounts. Green marks the best value per row.</p>
      </div>

      {/* add chips */}
      {available.length > 0 && firms.length < 4 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Add:</span>
          {available.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleCompare(f.id)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> {f.shortName}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 bg-background p-3 text-left text-xs uppercase tracking-wide text-muted-foreground" />
              {firms.map((f) => (
                <th key={f.id} className="p-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold"
                        style={{ backgroundColor: `${f.color}1a`, color: f.color }}
                      >
                        {f.shortName.slice(0, 2).toUpperCase()}
                      </div>
                      <button onClick={() => toggleCompare(f.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm font-medium">{f.shortName}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const bestVal =
                row.best && row.raw
                  ? firms.reduce(
                      (best, f) => {
                        const v = row.raw!(f)
                        if (best === null) return v
                        return row.best === "min" ? Math.min(best, v) : Math.max(best, v)
                      },
                      null as number | null,
                    )
                  : null
              return (
                <tr key={row.label}>
                  <td className="sticky left-0 bg-background border-t border-border p-3 text-sm font-medium text-muted-foreground">
                    {row.label}
                  </td>
                  {firms.map((f) => {
                    const isBest = bestVal !== null && row.raw && row.raw(f) === bestVal && firms.length > 1
                    return (
                      <td
                        key={f.id}
                        className={cn(
                          "border-t border-border p-3 text-center text-sm capitalize tabular-nums",
                          isBest ? "font-semibold text-success" : "text-foreground",
                        )}
                      >
                        {row.get(f)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {firms.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Add firms above to compare them.
        </div>
      )}
    </div>
  )
}

function size50(f: NonNullable<ReturnType<typeof getFirm>>) {
  return f.sizes.find((s) => s.label === "50K") ?? f.sizes[0]
}
