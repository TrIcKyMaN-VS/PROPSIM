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
import { Archive, Copy, RefreshCw, Trash2, ShieldAlert, Pencil } from "lucide-react"

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
    if (acc.archivedAt) return false // other tabs hide archived
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Challenge History</h1>
          <p className="text-muted-foreground text-sm">Review your past challenges, statistics, and clone rulesets.</p>
        </div>
        {hasFailedAccounts && (
          <Button variant="outline" onClick={() => archiveAllFailedChallenges()}>
            <Archive className="mr-2 h-4 w-4" />
            Archive All Failed
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="passed">Passed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          {filteredAccounts.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg bg-card/50">
              <p className="text-muted-foreground">No {activeTab} challenges found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map(acc => {
                const firm = getFirm(acc.firmId)
                if (!firm) return null

                const accTrades = trades.filter(t => t.accountId === acc.id)
                const winCount = accTrades.filter(t => t.pnl > 0).length
                const lossCount = accTrades.filter(t => t.pnl <= 0).length
                const winRate = accTrades.length > 0 ? (winCount / accTrades.length) * 100 : 0
                const netPnl = accTrades.reduce((sum, t) => sum + t.pnl, 0)
                
                const grossProfit = accTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
                const grossLoss = Math.abs(accTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
                const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss

                return (
                  <Card key={acc.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold"
                              style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
                            >
                              {firm.shortName.slice(0, 2).toUpperCase()}
                            </span>
                            {acc.name || firm.name}
                          </CardTitle>
                          <CardDescription className="mt-1 font-medium text-foreground">
                            {acc.sizeLabel} Challenge
                            <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${acc.challengeType === "CUSTOM" ? "bg-amber-500/15 text-amber-500 border border-amber-500/25" : "bg-blue-600/15 text-blue-500 border border-blue-500/25"}`}>
                              {acc.challengeType === "CUSTOM" ? "CUSTOM" : "OFFICIAL"}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant={acc.status === "passed" ? "default" : acc.status === "failed" ? "destructive" : "outline"}
                          className={acc.status === "passed" ? "bg-green-600/15 text-green-600 border border-green-600/25 hover:bg-green-600/25" : ""}
                        >
                          {acc.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm grid grid-cols-2 gap-y-3 gap-x-4 flex-1">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Net PnL</span>
                        <span className={`font-semibold ${netPnl > 0 ? "text-success" : netPnl < 0 ? "text-destructive" : ""}`}>
                          {fmtPnl(netPnl, pnlDisplayMode, acc.rules?.startingBalance ?? 100000, { sign: true })}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Win Rate</span>
                        <span className="font-semibold">{winRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Trades</span>
                        <span className="font-semibold">{accTrades.length}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Profit Factor</span>
                        <span className="font-semibold">{profitFactor.toFixed(2)}</span>
                      </div>

                      <div className="col-span-2 flex flex-col pt-2 border-t mt-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Created</span>
                        <span>{formatDisplayDateTime(acc.createdAt)}</span>
                      </div>

                      {acc.archivedAt && (
                        <div className="col-span-2 flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Archived</span>
                          <span>{formatDisplayDateTime(Number(acc.archivedAt))}</span>
                        </div>
                      )}

                      {acc.status === "failed" && acc.failReason && (
                        <div className="col-span-2 flex flex-col mt-1 bg-destructive/10 p-2 rounded-md border border-destructive/20">
                          <span className="text-destructive text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Failure Reason
                          </span>
                          <span className="text-xs text-destructive mt-0.5">{acc.failReason}</span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-3 border-t flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setRenameId(acc.id)
                        setRenameText(acc.name || "")
                      }}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rename
                      </Button>

                      <Button variant="outline" size="sm" onClick={() => cloneAccount(acc.id)}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Clone
                      </Button>
                      
                      {!acc.archivedAt ? (
                        <Button variant="outline" size="sm" onClick={() => archiveAccount(acc.id)}>
                          <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => restoreAccount(acc.id)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Restore
                        </Button>
                      )}

                      <AlertDialog open={deleteId === acc.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                        <AlertDialogTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto" })} onClick={() => setDeleteId(acc.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently delete challenge?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. All trades, screenshots, psychology logs, and analytics attached to this challenge will be permanently erased.
                              <br /><br />
                              Please type <strong>DELETE</strong> to confirm.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-2">
                            <Input 
                              value={deleteConfirmText} 
                              onChange={(e) => setDeleteConfirmText(e.target.value)} 
                              placeholder="Type DELETE" 
                              className="w-full"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDelete} 
                              disabled={deleteConfirmText !== "DELETE"}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Permanently Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog open={renameId !== null} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Challenge</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Challenge Name</label>
              <Input
                id="name"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                placeholder="e.g. Lucid Trading Fund"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button size="sm" onClick={async () => {
              if (renameId) {
                await renameAccount(renameId, renameText)
                setRenameId(null)
                setRenameText("")
              }
            }}>Save Name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
