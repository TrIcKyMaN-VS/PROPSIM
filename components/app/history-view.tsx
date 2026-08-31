"use client"

import { useState } from "react"
import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { formatDisplayDateTime, fmtPnl } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Archive, Copy, RefreshCw, Trash2, ShieldAlert, Pencil, History, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export function HistoryView() {
  const accounts = usePropStore((s) => s.accounts)
  const trades = usePropStore((s) => s.trades)
  const cloneAccount = usePropStore((s) => s.cloneAccount)
  const restoreAccount = usePropStore((s) => s.restoreAccount)
  const archiveAccount = usePropStore((s) => s.archiveAccount)
  const renameAccount = usePropStore((s) => s.renameAccount)
  const deleteAccountPermanently = usePropStore((s) => s.deleteAccountPermanently)
  const archiveAllFailedChallenges = usePropStore((s) => s.archiveAllFailedChallenges)
  const pnlDisplayMode = usePropStore((s) => s.pnlDisplayMode)

  const [activeTab, setActiveTab] = useState("active")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState("")

  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === "archived") return !!acc.archivedAt
    if (acc.archivedAt) return false
    return acc.status === activeTab
  }).sort((a, b) => b.createdAt - a.createdAt)

  const hasFailedAccounts = accounts.some(a => a.status === "failed" && !a.archivedAt)

  const handleDelete = () => {
    if (deleteId && deleteConfirmText === "DELETE") {
      deleteAccountPermanently(deleteId)
      setDeleteId(null)
      setDeleteConfirmText("")
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Challenge History</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              LEDGER AUDIT
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Review past challenge performances, statistics, and clone custom rulesets.
          </p>
        </div>

        {hasFailedAccounts && (
          <Button variant="outline" onClick={() => archiveAllFailedChallenges()} className="font-mono text-xs font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
            <Archive className="mr-2 h-4 w-4" />
            Archive All Failed
          </Button>
        )}
      </div>

      {/* Glass Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[460px] bg-card/80 p-1 border border-border/80 rounded-xl font-mono text-xs">
          <TabsTrigger value="active" className="font-bold">Active ({accounts.filter(a => a.status === 'active' && !a.archivedAt).length})</TabsTrigger>
          <TabsTrigger value="passed" className="font-bold">Passed ({accounts.filter(a => a.status === 'passed' && !a.archivedAt).length})</TabsTrigger>
          <TabsTrigger value="failed" className="font-bold">Failed ({accounts.filter(a => a.status === 'failed' && !a.archivedAt).length})</TabsTrigger>
          <TabsTrigger value="archived" className="font-bold">Archived ({accounts.filter(a => !!a.archivedAt).length})</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl border-border/80 bg-card/40 backdrop-blur-xl space-y-3">
              <History className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No {activeTab} challenges found.</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Start a new challenge or import trades to populate your challenge history ledger.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map(acc => {
                const firm = getFirm(acc.firmId)
                if (!firm) return null

                const accTrades = trades.filter(t => t.accountId === acc.id)
                const winCount = accTrades.filter(t => t.pnl > 0).length
                const winRate = accTrades.length > 0 ? (winCount / accTrades.length) * 100 : 0
                const netPnl = accTrades.reduce((sum, t) => sum + t.pnl, 0)
                
                const grossProfit = accTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
                const grossLoss = Math.abs(accTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
                const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.99 : 0) : grossProfit / grossLoss

                return (
                  <Card key={acc.id} className="bg-card/60 backdrop-blur-xl border-border/80 shadow-xl flex flex-col justify-between rounded-2xl overflow-hidden group">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base font-bold">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black border"
                              style={{ backgroundColor: `${firm.color}20`, color: firm.color, borderColor: `${firm.color}40` }}
                            >
                              {firm.shortName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[150px]">{acc.name || firm.name}</span>
                          </CardTitle>
                          <CardDescription className="mt-1.5 font-mono text-xs font-bold text-foreground flex items-center gap-2">
                            <span>{acc.sizeLabel} Challenge</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase border",
                              acc.challengeType === "CUSTOM" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            )}>
                              {acc.challengeType === "CUSTOM" ? "CUSTOM" : "OFFICIAL"}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-xs font-bold uppercase tracking-wider border",
                            acc.status === "passed"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                              : acc.status === "failed"
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                          )}
                        >
                          {acc.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 grid grid-cols-2 gap-3 font-mono text-xs">
                      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Net PnL</span>
                        <div className={cn("font-black text-sm mt-0.5", netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {fmtPnl(netPnl, pnlDisplayMode, acc.rules?.startingBalance ?? 100000, { sign: true })}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Win Rate</span>
                        <div className="font-extrabold text-foreground text-sm mt-0.5">{winRate.toFixed(1)}%</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Trades</span>
                        <div className="font-extrabold text-foreground text-sm mt-0.5">{accTrades.length}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Profit Factor</span>
                        <div className="font-extrabold text-foreground text-sm mt-0.5">{profitFactor.toFixed(2)}</div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => cloneAccount(acc.id)} className="h-8 text-xs font-mono font-bold">
                          <Copy className="w-3.5 h-3.5 mr-1" /> Clone
                        </Button>
                        {!acc.archivedAt ? (
                          <Button variant="ghost" size="sm" onClick={() => archiveAccount(acc.id)} className="h-8 text-xs font-mono font-bold text-muted-foreground hover:text-foreground">
                            <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => restoreAccount(acc.id)} className="h-8 text-xs font-mono font-bold text-emerald-400">
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restore
                          </Button>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setDeleteId(acc.id); setDeleteConfirmText("") }}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" /> Permanently Delete Challenge?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>This action will permanently delete this challenge and all of its associated trade records from your database. This action cannot be undone.</p>
              <p className="font-mono font-bold text-foreground">Type <span className="text-rose-400">DELETE</span> to confirm:</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE..."
              className="font-mono text-sm bg-muted/30 border-border"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
