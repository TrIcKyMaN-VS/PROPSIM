"use client"

import { useMemo, useState } from "react"
import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function JournalView() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)
  const removeTrade = usePropStore((s) => s.removeTrade)
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all")
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null)

  const account = accounts.find((a) => a.id === activeId)
  const firm = account ? getFirm(account.firmId) : undefined

  const rows = useMemo(() => {
    if (!account) return []
    return trades
      .filter((t) => t.accountId === account.id)
      .filter((t) => (filter === "all" ? true : filter === "win" ? t.pnl >= 0 : t.pnl < 0))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [trades, account, filter])

  if (!account) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <div className="mt-6 rounded-xl border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          No active account. Start a challenge to begin journaling.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {account.name || `${firm?.name} · ${account.sizeLabel}`} · {rows.length} trades
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["all", "win", "loss"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Day</th>
                <th className="px-4 py-3 text-left font-medium">Instrument</th>
                <th className="px-4 py-3 text-left font-medium">Side</th>
                <th className="px-4 py-3 text-right font-medium">Contracts</th>
                <th className="px-4 py-3 text-left font-medium">Session</th>
                <th className="px-4 py-3 text-right font-medium">P&amp;L</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => (
                <tr key={t.id} className="bg-background hover:bg-card/60">
                  <td className="px-4 py-3 text-muted-foreground">Day {t.day}</td>
                  <td className="px-4 py-3 font-medium">{t.instrument}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                        t.direction === "long" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {t.direction === "long" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.contracts}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.session}</td>
                  <td className={cn("px-4 py-3 text-right font-medium tabular-nums", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                    {fmtCurrency(t.pnl, { sign: true })}
                  </td>
                   <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTradeId(t.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Delete trade"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="bg-background py-16 text-center text-sm text-muted-foreground">No trades match this filter.</div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTradeId !== null} onOpenChange={(open) => !open && setDeleteTradeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade from your journal? This will permanently erase the trade record and recalculate your challenge rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTradeId) {
                  const id = deleteTradeId
                  setDeleteTradeId(null)
                  removeTrade(id)
                    .then(() => {
                      toast.success("Trade deleted successfully")
                    })
                    .catch(() => {
                      toast.error("Failed to delete trade")
                    })
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
