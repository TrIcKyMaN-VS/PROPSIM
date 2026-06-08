"use client"

import { usePropStore } from "@/lib/store"
import { ImportDialog } from "@/components/app/import-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Plus, Search, SlidersHorizontal, X, RefreshCw, Plug } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { getApiTokens } from "@/app/actions/integration-actions"

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-success text-success-foreground",
  "A":  "bg-success/80 text-success-foreground",
  "B":  "bg-primary/80 text-primary-foreground",
  "C":  "bg-warning/80 text-warning-foreground",
  "D":  "bg-destructive/60 text-destructive-foreground",
  "F":  "bg-destructive text-destructive-foreground",
}

export default function JournalPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades)
  const tradePsychology = usePropStore(s => s.tradePsychology)
  const playbooks = usePropStore(s => s.playbooks) || []
  const accountTrades = trades.filter(t => t.accountId === activeAccountId)
  const syncWithDb = usePropStore(s => s.syncWithDb)
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [ntConnected, setNtConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

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
      const int2 = setInterval(() => syncWithDb(), 15000) // auto-sync trades
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

  // Collect unique playbook names from trades
  const playbookNames = useMemo(() => {
    const names = new Set<string>()
    accountTrades.forEach(t => { if (t.playbookName) names.add(t.playbookName) })
    return [...names].sort()
  }, [accountTrades])

  // Collect unique instruments from trades
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
        // Text search
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-muted-foreground">Log and review your trading history.</p>
        </div>
        <div className="flex gap-2">
          {ntConnected && (
            <Button variant="outline" className="gap-2 border-success/30 bg-success/10 text-success hover:bg-success/20 hover:text-success" onClick={handleManualSync} disabled={isSyncing}>
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync NinjaTrader"}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/app/journal/new')}>
            <Plus className="w-4 h-4 mr-2" /> Manual Entry
          </Button>
          <ImportDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 gap-4 flex-wrap">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>
              {filteredTrades.length} of {accountTrades.length} trades
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Filter toggle */}
            <Button
              variant={showFilters || activeFilters > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(f => !f)}
              className="relative"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilters}
                </span>
              )}
            </Button>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-4">
            {/* Result filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Result</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterResult}
                onChange={e => setFilterResult(e.target.value as any)}
              >
                <option value="">All Results</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="open">Open</option>
              </select>
            </div>
            {/* Direction filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Direction</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterDirection}
                onChange={e => setFilterDirection(e.target.value as any)}
              >
                <option value="">All Directions</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            {/* Session filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Session</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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
            {/* Playbook filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Playbook</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterPlaybook}
                onChange={e => setFilterPlaybook(e.target.value)}
              >
                <option value="">All Playbooks</option>
                {playbookNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            {/* Instrument filter */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Instrument</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filterInstrument}
                onChange={e => setFilterInstrument(e.target.value)}
              >
                <option value="">All Instruments</option>
                {instruments.map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <CardContent className={showFilters ? "pt-0" : ""}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Playbook</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    {search || activeFilters > 0 ? "No trades match your filters." : "No trades found. Import a CSV or add a manual entry to get started."}
                  </TableCell>
                </TableRow>
              )}
              {filteredTrades.map(trade => {
                const dateObj = new Date(trade.timestamp)
                const dateStr = dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                const timeStr = dateObj.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                const open = isOpen(trade)
                
                // Look up execution grade from psychology store
                const psy = tradePsychology.find(p => p.tradeId === trade.id)
                const grade = psy?.executionGrade || ""

                // Parse tags
                let parsedTags: string[] = []
                if (trade.tags) {
                  if (Array.isArray(trade.tags)) parsedTags = trade.tags
                  else if (typeof trade.tags === "string") {
                    try { const p = JSON.parse(trade.tags); parsedTags = Array.isArray(p) ? p : [trade.tags] } catch { parsedTags = [trade.tags] }
                  }
                }

                return (
                  <TableRow
                    key={trade.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => router.push(`/app/journal/${trade.id}`)}
                  >
                    {/* Date */}
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      <div className="font-medium text-foreground">{dateStr}</div>
                      <div className="text-xs text-muted-foreground">{timeStr}</div>
                    </TableCell>

                    {/* Instrument */}
                    <TableCell className="font-semibold">{trade.instrument}</TableCell>

                    {/* Direction */}
                    <TableCell>
                      <Badge variant={trade.direction === "long" ? "default" : "destructive"} className="text-xs">
                        {trade.direction.toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* Session */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {trade.session || "—"}
                    </TableCell>

                    {/* Playbook */}
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {trade.playbookName ? (
                        <span className="text-primary font-medium truncate block">{trade.playbookName}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>

                    {/* Grade */}
                    <TableCell>
                      {grade ? (
                        <span className={cn("inline-flex items-center justify-center h-6 w-8 rounded text-xs font-bold", GRADE_COLORS[grade] || "bg-muted text-muted-foreground")}>
                          {grade}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* PnL */}
                    <TableCell className={cn("text-right font-semibold whitespace-nowrap", open ? "text-muted-foreground" : trade.pnl >= 0 ? "text-success" : "text-destructive")}>
                      {open ? (
                        <Badge variant="outline" className="text-xs font-semibold border-warning/60 text-warning">OPEN</Badge>
                      ) : (
                        `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`
                      )}
                    </TableCell>

                    {/* Tags */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {parsedTags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                        {parsedTags.length > 2 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{parsedTags.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
