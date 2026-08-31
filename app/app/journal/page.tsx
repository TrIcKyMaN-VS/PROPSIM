"use client"

import { usePropStore } from "@/lib/store"
import { formatDisplayTime, fmtPnl, fmtCurrency } from "@/lib/format"
import { ImportDialog } from "@/components/app/import-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Plus, Search, SlidersHorizontal, X, RefreshCw, Plug, Trash2, ArrowUp, ArrowDown, NotebookPen, Layers, TrendingUp, TrendingDown, Scale, Filter } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { getApiTokens } from "@/app/actions/integration-actions"
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
import { toast } from "sonner"

const GRADE_STYLES: Record<string, string> = {
  "A+": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]",
  "A":  "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]",
  "B":  "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.2)]",
  "C":  "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
  "D":  "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]",
  "F":  "bg-rose-600/30 text-rose-300 border-rose-600/50 shadow-[0_0_8px_rgba(225,29,72,0.3)]",
}

export default function JournalPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades)
  const tradePsychology = usePropStore(s => s.tradePsychology)
  const playbooks = usePropStore(s => s.playbooks) || []
  const accountTrades = trades.filter(t => t.accountId === activeAccountId)
  const syncWithDb = usePropStore(s => s.syncWithDb)
  const removeTrade = usePropStore(s => s.removeTrade)
  const displayTimeMode = usePropStore(s => s.displayTimeMode)
  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)
  const accounts = usePropStore(s => s.accounts)
  const account = accounts.find(a => a.id === activeAccountId)
  const accountBalance = account?.rules?.startingBalance ?? 100000
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [ntConnected, setNtConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 50

  // Check NT connection and auto-sync
  useEffect(() => {
    const checkNt = async () => {
      try {
        const tokens = await getApiTokens()
        const ntToken = tokens.find((t: any) => t.provider === "NinjaTrader")
        const isConnected = ntToken?.lastUsed && (Date.now() - new Date(ntToken.lastUsed).getTime() < 65000)
        setNtConnected(!!isConnected)
      } catch {}
    }
    checkNt()
    const int = setInterval(checkNt, 15000)
    return () => clearInterval(int)
  }, [])

  useEffect(() => {
    if (ntConnected) {
      const int2 = setInterval(() => syncWithDb(), 15000)
      return () => clearInterval(int2)
    }
  }, [ntConnected, syncWithDb])

  const handleManualSync = async () => {
    setIsSyncing(true)
    await syncWithDb()
    setIsSyncing(false)
  }

  const [showFilters, setShowFilters] = useState(false)
  const [filterDirection, setFilterDirection] = useState<"" | "long" | "short">("")
  const [filterSession, setFilterSession] = useState("")
  const [filterPlaybook, setFilterPlaybook] = useState("")
  const [filterResult, setFilterResult] = useState<"" | "win" | "loss" | "open">("")
  const [filterInstrument, setFilterInstrument] = useState("")

  const playbookNames = useMemo(() => {
    const names = new Set<string>()
    accountTrades.forEach(t => { if (t.playbookName) names.add(t.playbookName) })
    return [...names].sort()
  }, [accountTrades])

  const instruments = useMemo(() => {
    const set = new Set<string>()
    accountTrades.forEach(t => { if (t.instrument) set.add(t.instrument) })
    return [...set].sort()
  }, [accountTrades])

  const isOpen = (t: typeof accountTrades[0]) => t.exit === t.entry && t.pnl === 0

  const filteredTrades = useMemo(() => {
    return accountTrades
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(t => {
        if (search) {
          const s = search.toLowerCase()
          let tagsStr = ""
          if (t.tags) {
            if (Array.isArray(t.tags)) tagsStr = t.tags.join(" ")
            else if (typeof t.tags === "string") {
              try { const p = JSON.parse(t.tags); tagsStr = Array.isArray(p) ? p.join(" ") : t.tags } catch { tagsStr = t.tags }
            }
          }
          const haystack = [
            t.instrument, t.direction, t.session || "",
            t.playbookName || "", tagsStr, t.notes || ""
          ].join(" ").toLowerCase()
          if (!haystack.includes(s)) return false
        }
        if (filterDirection && t.direction !== filterDirection) return false
        if (filterSession && t.session !== filterSession) return false
        if (filterPlaybook && t.playbookName !== filterPlaybook) return false
        if (filterInstrument && t.instrument !== filterInstrument) return false
        if (filterResult) {
          if (filterResult === "win" && t.pnl <= 0) return false
          if (filterResult === "loss" && t.pnl >= 0) return false
          if (filterResult === "open" && !isOpen(t)) return false
        }
        return true
      })
  }, [accountTrades, search, filterDirection, filterSession, filterPlaybook, filterInstrument, filterResult])

  const stats = useMemo(() => {
    const total = accountTrades.length
    const wins = accountTrades.filter(t => t.pnl > 0).length
    const losses = accountTrades.filter(t => t.pnl < 0).length
    const winRate = total ? (wins / total) * 100 : 0
    const netPnl = accountTrades.reduce((sum, t) => sum + t.pnl, 0)
    const grossWins = accountTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
    const grossLosses = Math.abs(accountTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99.99 : 0
    return { total, wins, losses, winRate, netPnl, profitFactor }
  }, [accountTrades])

  const activeFilters = [filterDirection, filterSession, filterPlaybook, filterInstrument, filterResult].filter(Boolean).length
  const clearFilters = () => {
    setFilterDirection("")
    setFilterSession("")
    setFilterPlaybook("")
    setFilterInstrument("")
    setFilterResult("")
    setSearch("")
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Trade Journal</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              {account?.name || `${account?.sizeLabel || "Account"} Ledger`}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Log and review your complete execution history with real-time analytics telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ntConnected && (
            <Button variant="outline" className="gap-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold" onClick={handleManualSync} disabled={isSyncing}>
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync NinjaTrader"}
            </Button>
          )}
          <Button onClick={() => router.push('/app/journal/new')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Manual Entry
          </Button>
          <ImportDialog />
        </div>
      </div>

      {/* Stats Summary HUD Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-card/60 backdrop-blur-xl border-border/80 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Trades</p>
              <h3 className="text-2xl font-black font-mono text-foreground mt-1">{stats.total}</h3>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{stats.wins}W / {stats.losses}L</p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-emerald-500/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Win Rate</p>
              <h3 className="text-2xl font-black font-mono text-emerald-400 mt-1">{stats.winRate.toFixed(0)}%</h3>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Execution Efficiency</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className={cn("bg-card/60 backdrop-blur-xl p-4", stats.netPnl >= 0 ? "border-emerald-500/20" : "border-rose-500/20")}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Realized P&amp;L</p>
              <h3 className={cn("text-2xl font-black font-mono mt-1", stats.netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {fmtCurrency(stats.netPnl, { sign: true })}
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Realized Total</p>
            </div>
            <div className={cn("p-3 rounded-2xl border", stats.netPnl >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
              {stats.netPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl border-border/80 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profit Factor</p>
              <h3 className="text-2xl font-black font-mono text-foreground mt-1">{stats.profitFactor.toFixed(2)}</h3>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Gross Win / Loss</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/60 text-muted-foreground border border-border">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Trade History Card Container */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4 gap-4 flex-wrap border-b border-border/60">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-primary" /> Trade History
            </CardTitle>
            <CardDescription className="text-xs font-mono mt-0.5">
              {filteredTrades.length} of {accountTrades.length} trades recorded
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 bg-muted/30 border-border/80 font-mono text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters || activeFilters > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(f => !f)}
              className="relative font-mono text-xs font-bold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
              Filters
              {activeFilters > 0 && (
                <span className="ml-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilters}
                </span>
              )}
            </Button>

            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3 border-b border-border/60 bg-muted/20 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Result</label>
              <select
                className="flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold"
                value={filterResult}
                onChange={e => setFilterResult(e.target.value as any)}
              >
                <option value="">All Results</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="open">Open</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Direction</label>
              <select
                className="flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold"
                value={filterDirection}
                onChange={e => setFilterDirection(e.target.value as any)}
              >
                <option value="">All Directions</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Session</label>
              <select
                className="flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold"
                value={filterSession}
                onChange={e => setFilterSession(e.target.value)}
              >
                <option value="">All Sessions</option>
                <option value="Asia">Asia</option>
                <option value="London">London</option>
                <option value="New York AM">New York AM</option>
                <option value="New York PM">New York PM</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Playbook</label>
              <select
                className="flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold"
                value={filterPlaybook}
                onChange={e => { setFilterPlaybook(e.target.value); setPage(1); }}
              >
                <option value="">All Playbooks</option>
                {playbookNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Instrument</label>
              <select
                className="flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1 text-xs font-bold"
                value={filterInstrument}
                onChange={e => { setFilterInstrument(e.target.value); setPage(1); }}
              >
                <option value="">All Instruments</option>
                {instruments.map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Data Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/60">
                  <TableHead className="font-mono text-xs font-bold uppercase text-muted-foreground">Date &amp; Time</TableHead>
                  <TableHead className="font-mono text-xs font-bold uppercase text-muted-foreground">Instrument</TableHead>
                  <TableHead className="font-mono text-xs font-bold uppercase text-muted-foreground">Direction</TableHead>
                  <TableHead className="font-mono text-xs font-bold uppercase text-muted-foreground">Session</TableHead>
                  <TableHead className="font-mono text-xs font-bold uppercase text-muted-foreground">Grade</TableHead>
                  <TableHead className="font-mono text-xs font-bold uppercase text-muted-foreground text-right">P&amp;L</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40 font-mono text-xs">
                {filteredTrades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      {search || activeFilters > 0 ? "No trades match your filters." : "No trades found. Import a CSV or add a manual entry to get started."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredTrades.slice((page - 1) * perPage, page * perPage).map(trade => {
                  const dateStr = new Date(Number(trade.timestamp)).toLocaleDateString("en-US", {
                    timeZone: displayTimeMode === "Exchange Time" ? "America/New_York" : undefined,
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                  const timeStr = formatDisplayTime(trade.timestamp, displayTimeMode)
                  const open = isOpen(trade)
                  
                  const psy = tradePsychology.find(p => p.tradeId === trade.id)
                  const grade = psy?.executionGrade || ""

                  return (
                    <TableRow
                      key={trade.id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors duration-150 group"
                      onClick={() => router.push(`/app/journal/${trade.id}`)}
                    >
                      {/* Date & Time */}
                      <TableCell className="whitespace-nowrap py-3.5">
                        <div className="font-bold text-foreground">{dateStr}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{timeStr}</div>
                      </TableCell>

                      {/* Instrument */}
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/60 text-foreground border-border/80">
                          {trade.instrument}
                        </Badge>
                      </TableCell>

                      {/* Direction */}
                      <TableCell className="py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider border",
                            trade.direction === "long"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
                          )}
                        >
                          {trade.direction === "long" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                          {trade.direction}
                        </span>
                      </TableCell>

                      {/* Session */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3.5">
                        {trade.session || "—"}
                      </TableCell>

                      {/* Grade */}
                      <TableCell className="py-3.5">
                        {grade ? (
                          <span className={cn("inline-flex items-center justify-center h-6 w-8 rounded-lg text-xs font-extrabold border", GRADE_STYLES[grade] || "bg-muted text-muted-foreground border-border")}>
                            {grade}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* PnL */}
                      <TableCell className={cn("text-right font-black tabular-nums text-base whitespace-nowrap py-3.5", open ? "text-muted-foreground" : trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {open ? (
                          <Badge variant="outline" className="text-xs font-bold border-warning/60 text-warning">OPEN</Badge>
                        ) : (
                          fmtPnl(trade.pnl, pnlDisplayMode, accountBalance, { sign: true })
                        )}
                      </TableCell>

                      {/* Delete action */}
                      <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleteTradeId(trade.id)}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg"
                          aria-label="Delete trade"
                          title="Delete trade record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {filteredTrades.length > perPage && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 bg-muted/20 font-mono text-xs">
              <p className="text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredTrades.length)} of {filteredTrades.length} trades
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="font-bold"
                >
                  Previous
                </Button>
                <span className="text-muted-foreground font-bold px-2">
                  Page {page} of {Math.ceil(filteredTrades.length / perPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * perPage >= filteredTrades.length}
                  onClick={() => setPage((p) => p + 1)}
                  className="font-bold"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTradeId !== null} onOpenChange={(open) => !open && setDeleteTradeId(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Trade Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this trade from your journal? This will permanently erase the execution log and update your rule telemetry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
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
              Delete Trade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
