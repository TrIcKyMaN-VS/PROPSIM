"use client"

import { useMemo, useState } from "react"
import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowUp, ArrowDown, NotebookPen, Sparkles, Filter, Plus, Shield, TrendingUp, TrendingDown, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

  const accountTrades = useMemo(() => {
    if (!account) return []
    return trades.filter((t) => t.accountId === account.id)
  }, [trades, account])

  const rows = useMemo(() => {
    return accountTrades
      .filter((t) => (filter === "all" ? true : filter === "win" ? t.pnl >= 0 : t.pnl < 0))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [accountTrades, filter])

  const stats = useMemo(() => {
    const total = accountTrades.length
    const wins = accountTrades.filter(t => t.pnl > 0).length
    const winRate = total ? (wins / total) * 100 : 0
    const netPnl = accountTrades.reduce((sum, t) => sum + t.pnl, 0)
    return { total, wins, winRate, netPnl }
  }, [accountTrades])

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <Card className="border-dashed border-border/80 bg-card/40 backdrop-blur-xl p-12 space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <NotebookPen className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No active account selected</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Select or start a challenge to log and journal your trades in real time.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Trade Journal</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              {account.name || `${firm?.name} · ${account.sizeLabel}`}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Complete execution ledger with real-time rule telemetry and P&amp;L analysis.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-card/80 p-1 rounded-xl border border-border/60">
          {(["all", "win", "loss"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all font-mono",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {f} ({f === "all" ? stats.total : f === "win" ? stats.wins : stats.total - stats.wins})
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary HUD Banner */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-card/50 backdrop-blur-md border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Trades</p>
              <h3 className="text-2xl font-black font-mono text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Win Rate</p>
              <h3 className="text-2xl font-black font-mono text-emerald-400 mt-1">{stats.winRate.toFixed(0)}%</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("bg-card/50 backdrop-blur-md", stats.netPnl >= 0 ? "border-emerald-500/20" : "border-rose-500/20")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Realized P&amp;L</p>
              <h3 className={cn("text-2xl font-black font-mono mt-1", stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {fmtCurrency(stats.netPnl, { sign: true })}
              </h3>
            </div>
            <div className={cn("p-2.5 rounded-xl", stats.netPnl >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
              {stats.netPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cybernetic Table Data Grid */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/60 font-mono">
              <tr>
                <th className="px-4 py-3.5 text-left">Day</th>
                <th className="px-4 py-3.5 text-left">Instrument</th>
                <th className="px-4 py-3.5 text-left">Side</th>
                <th className="px-4 py-3.5 text-right">Contracts</th>
                <th className="px-4 py-3.5 text-left">Session</th>
                <th className="px-4 py-3.5 text-right">P&amp;L</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {rows.map((t) => (
                <tr key={t.id} className="group bg-card/20 hover:bg-primary/5 transition-colors duration-150">
                  <td className="px-4 py-3.5 text-xs text-muted-foreground font-bold">DAY #{t.day}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-muted/60 border border-border text-xs font-bold text-foreground font-mono">
                      {t.instrument}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider border",
                        t.direction === "long"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
                      )}
                    >
                      {t.direction === "long" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-foreground font-bold">{t.contracts}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{t.session}</td>
                  <td className={cn("px-4 py-3.5 text-right font-black tabular-nums text-base", t.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {fmtCurrency(t.pnl, { sign: true })}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setDeleteTradeId(t.id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Delete Trade"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty Filter State */}
        {rows.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground space-y-3">
            <NotebookPen className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="font-bold text-foreground">No trades match this filter.</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Simulate or sync trades from NinjaTrader to see your journal populated.
            </p>
          </div>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
