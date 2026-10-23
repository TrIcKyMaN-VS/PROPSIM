"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { formatDisplayDateTime, fmtPnl, fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Archive,
  Copy,
  RefreshCw,
  Trash2,
  ShieldAlert,
  Pencil,
  History,
  Layers,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  BarChart2,
  ShieldCheck,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ChallengeAccount, DrawdownType, Trade } from "@/lib/types"

export function HistoryView() {
  const router = useRouter()
  const accounts = usePropStore((s) => s.accounts)
  const trades = usePropStore((s) => s.trades)
  const cloneAccount = usePropStore((s) => s.cloneAccount)
  const restoreAccount = usePropStore((s) => s.restoreAccount)
  const archiveAccount = usePropStore((s) => s.archiveAccount)
  const deleteAccountPermanently = usePropStore((s) => s.deleteAccountPermanently)
  const archiveAllFailedChallenges = usePropStore((s) => s.archiveAllFailedChallenges)
  const updateAccount = usePropStore((s) => s.updateAccount)
  const recoverAccount = usePropStore((s) => s.recoverAccount)
  const removeTrade = usePropStore((s) => s.removeTrade)
  const updateTrade = usePropStore((s) => s.updateTrade)
  const setActive = usePropStore((s) => s.setActive)
  const pnlDisplayMode = usePropStore((s) => s.pnlDisplayMode)

  const [activeTab, setActiveTab] = useState("active")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Edit Account Dialog state
  const [editingAccount, setEditingAccount] = useState<ChallengeAccount | null>(null)
  const [editTab, setEditTab] = useState<"general" | "rules" | "resolution">("general")
  const [editName, setEditName] = useState("")
  const [editSizeLabel, setEditSizeLabel] = useState("")
  const [editBrokerName, setEditBrokerName] = useState("")
  const [editStatus, setEditStatus] = useState<"active" | "passed" | "failed">("active")
  const [clearViolations, setClearViolations] = useState(true)
  const [editStartingBalance, setEditStartingBalance] = useState<number>(25000)
  const [editProfitTarget, setEditProfitTarget] = useState<number>(1500)
  const [editDailyLossLimit, setEditDailyLossLimit] = useState<number>(500)
  const [editMaxDrawdown, setEditMaxDrawdown] = useState<number>(2500)
  const [editDrawdownType, setEditDrawdownType] = useState<DrawdownType>("eod")
  const [editMaxContracts, setEditMaxContracts] = useState<number>(2)
  const [editMinTradingDays, setEditMinTradingDays] = useState<number>(5)
  const [editConsistencyPct, setEditConsistencyPct] = useState<number>(40)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Quick Recover Dialog state
  const [recoveringAccount, setRecoveringAccount] = useState<ChallengeAccount | null>(null)
  const [recoverDailyLossLimit, setRecoverDailyLossLimit] = useState<number>(500)
  const [isRecovering, setIsRecovering] = useState(false)

  // Manage Trades for Challenge state
  const [managingTradesAccount, setManagingTradesAccount] = useState<ChallengeAccount | null>(null)
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null)
  const [editingTradePnlId, setEditingTradePnlId] = useState<string | null>(null)
  const [editingTradePnlValue, setEditingTradePnlValue] = useState<string>("")

  const filteredAccounts = accounts.filter(acc => {
    if (activeTab === "archived") return !!acc.archivedAt
    if (acc.archivedAt) return false
    return acc.status === activeTab
  }).sort((a, b) => b.createdAt - a.createdAt)

  const hasFailedAccounts = accounts.some(a => a.status === "failed" && !a.archivedAt)

  const handleDelete = async () => {
    if (deleteId && deleteConfirmText === "DELETE") {
      try {
        await deleteAccountPermanently(deleteId)
        toast.success("Challenge account permanently deleted")
      } catch (err: any) {
        toast.error(err.message || "Failed to delete account")
      } finally {
        setDeleteId(null)
        setDeleteConfirmText("")
      }
    }
  }

  const handleOpenEdit = (acc: ChallengeAccount) => {
    setEditingAccount(acc)
    setEditTab("general")
    setEditName(acc.name || "")
    setEditSizeLabel(acc.sizeLabel || "25K")
    setEditBrokerName(acc.brokerAccountName || "")
    setEditStatus(acc.status)
    setClearViolations(acc.status === "failed")
    setEditStartingBalance(acc.rules?.startingBalance ?? 25000)
    setEditProfitTarget(acc.rules?.profitTarget ?? 1500)
    // If daily loss limit was set to a breached value (e.g. 260), suggest standard Lucid 25k limit or baseRules
    const currentDll = acc.rules?.dailyLossLimit ?? 500
    setEditDailyLossLimit(currentDll)
    setEditMaxDrawdown(acc.rules?.maxDrawdown ?? 2500)
    setEditDrawdownType((acc.rules?.drawdownType as DrawdownType) ?? "eod")
    setEditMaxContracts(acc.rules?.maxContracts ?? 2)
    setEditMinTradingDays(acc.rules?.minTradingDays ?? 5)
    setEditConsistencyPct(acc.rules?.consistencyPct ?? 40)
  }

  const handleSaveEdit = async () => {
    if (!editingAccount) return
    setIsSavingEdit(true)
    try {
      await updateAccount(editingAccount.id, {
        name: editName,
        sizeLabel: editSizeLabel,
        brokerAccountName: editBrokerName,
        status: editStatus,
        clearViolations: clearViolations,
        rules: {
          startingBalance: Number(editStartingBalance),
          profitTarget: Number(editProfitTarget),
          dailyLossLimit: Number(editDailyLossLimit),
          maxDrawdown: Number(editMaxDrawdown),
          drawdownType: editDrawdownType,
          maxContracts: Number(editMaxContracts),
          minTradingDays: Number(editMinTradingDays),
          consistencyPct: Number(editConsistencyPct),
        }
      })

      if (editingAccount.status === "failed" && editStatus === "active") {
        toast.success(`Account "${editName || editingAccount.id}" recovered to Active!`)
        setActiveTab("active")
        setActive(editingAccount.id)
      } else {
        toast.success("Challenge account updated successfully")
      }
      setEditingAccount(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to update account")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleOpenRecover = (acc: ChallengeAccount) => {
    setRecoveringAccount(acc)
    const baseDll = acc.baseRules?.dailyLossLimit ?? 500
    const currentDll = acc.rules?.dailyLossLimit ?? 260
    setRecoverDailyLossLimit(currentDll < 500 ? baseDll : currentDll)
  }

  const handleConfirmRecover = async () => {
    if (!recoveringAccount) return
    setIsRecovering(true)
    try {
      await recoverAccount(recoveringAccount.id, Number(recoverDailyLossLimit))
      toast.success(`Account "${recoveringAccount.name || 'Challenge'}" successfully recovered to Active!`)
      setActiveTab("active")
      setActive(recoveringAccount.id)
      setRecoveringAccount(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to recover account")
    } finally {
      setIsRecovering(false)
    }
  }

  const handleOpenManageTrades = (acc: ChallengeAccount) => {
    setManagingTradesAccount(acc)
  }

  const handleDeleteTradeItem = async (tradeId: string) => {
    try {
      setDeletingTradeId(tradeId)
      await removeTrade(tradeId)
      toast.success("Trade removed. Challenge metrics recalculated.")
    } catch (err: any) {
      toast.error("Failed to delete trade: " + err.message)
    } finally {
      setDeletingTradeId(null)
    }
  }

  const handleSaveTradePnl = async (trade: Trade) => {
    const num = parseFloat(editingTradePnlValue)
    if (isNaN(num)) return
    try {
      await updateTrade(trade.id, { pnl: num })
      toast.success("Trade P&L updated. Challenge recalculated.")
      setEditingTradePnlId(null)
    } catch (err: any) {
      toast.error("Failed to update trade P&L")
    }
  }

  const handleGoToJournal = (accountId: string) => {
    setActive(accountId)
    router.push("/app/journal")
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Challenge History</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              LEDGER AUDIT & EDIT
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Review past challenge performance, edit challenge rules/status, fix rogue trade issues, or recover failed accounts.
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
                  <Card key={acc.id} className="bg-card/60 backdrop-blur-xl border-border/80 shadow-xl flex flex-col justify-between rounded-2xl overflow-hidden group hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base font-bold">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black border shrink-0"
                              style={{ backgroundColor: `${firm.color}20`, color: firm.color, borderColor: `${firm.color}40` }}
                            >
                              {firm.shortName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate">{acc.name || firm.name}</span>
                          </CardTitle>
                          <CardDescription className="mt-1.5 font-mono text-xs font-bold text-foreground flex items-center gap-2 flex-wrap">
                            <span>{acc.sizeLabel} Challenge</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase border",
                              acc.challengeType === "CUSTOM" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            )}>
                              {acc.challengeType === "CUSTOM" ? "CUSTOM" : "OFFICIAL"}
                            </span>
                          </CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(acc)}
                            className="h-7 px-2.5 text-xs font-mono font-bold bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 shadow-sm"
                            title="Edit challenge rules, status, or parameters"
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
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
                      </div>

                      {acc.status === "failed" && acc.failReason && (
                        <div className="mt-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[11px] flex items-start gap-1.5 leading-snug">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{acc.failReason}</span>
                        </div>
                      )}
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

                      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleOpenManageTrades(acc)}>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold flex items-center justify-between">
                          <span>Trades</span>
                          <span className="text-[9px] text-primary underline">Manage</span>
                        </span>
                        <div className="font-extrabold text-foreground text-sm mt-0.5">{accTrades.length}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Profit Factor</span>
                        <div className="font-extrabold text-foreground text-sm mt-0.5">{profitFactor.toFixed(2)}</div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-3 border-t border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(acc)}
                          className="h-8 text-xs font-mono font-bold text-foreground hover:bg-muted"
                          title="Edit account rules, limits, and status"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1 text-primary" /> Edit Challenge
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenManageTrades(acc)}
                          className="h-8 text-xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="View and delete or edit trades in this challenge"
                        >
                          <Layers className="w-3.5 h-3.5 mr-1 text-blue-400" /> Trades ({accTrades.length})
                        </Button>

                        {acc.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRecover(acc)}
                            className="h-8 text-xs font-mono font-bold text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                            title="Recover failed challenge back to active"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recover
                          </Button>
                        )}

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

      {/* Edit Challenge Account Dialog */}
      <Dialog open={editingAccount !== null} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" /> Edit Challenge Settings & Rules
              </span>
              <span className="text-xs font-mono font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted/40">
                {editingAccount?.firmId?.toUpperCase()} {editingAccount?.sizeLabel}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify account status, change challenge size, fine-tune drawdown limits, or resolve rule breaches.
            </DialogDescription>
          </DialogHeader>

          {/* Nav Pills for Edit Dialog */}
          <div className="flex gap-2 border-b border-border/40 pb-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setEditTab("general")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all",
                editTab === "general" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
              )}
            >
              1. General & Status
            </button>
            <button
              type="button"
              onClick={() => setEditTab("rules")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all",
                editTab === "rules" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
              )}
            >
              2. Challenge Rules & Limits
            </button>
            <button
              type="button"
              onClick={() => setEditTab("resolution")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5",
                editTab === "resolution" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> 3. Issue Resolution
            </button>
          </div>

          <div className="space-y-4 py-2 font-mono text-xs">
            {/* TAB 1: General & Status */}
            {editTab === "general" && (
              <div className="space-y-4">
                <div className="space-y-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Account Identity
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Account / Challenge Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. LUCID 25K 1"
                        className="h-9 font-mono text-xs bg-background/60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Size Label</Label>
                      <Input
                        value={editSizeLabel}
                        onChange={(e) => setEditSizeLabel(e.target.value)}
                        placeholder="e.g. 25K, 50K"
                        className="h-9 font-mono text-xs bg-background/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Broker Account Mapping (NinjaTrader / Tradovate)</Label>
                    <Input
                      value={editBrokerName}
                      onChange={(e) => setEditBrokerName(e.target.value)}
                      placeholder="e.g. LFE02589876410001 or SimVS 1"
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Trades synced with this broker account name will automatically be routed to this challenge.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Challenge Status
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Current Status</span>
                      {editStatus === "active" && editingAccount?.status === "failed" && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Will recover account to ACTIVE
                        </span>
                      )}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["active", "passed", "failed"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditStatus(st)}
                          className={cn(
                            "py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                            editStatus === st
                              ? st === "active"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                                : st === "passed"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                                : "bg-rose-500/20 text-rose-400 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.25)]"
                              : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {editingAccount?.status === "failed" && editStatus === "active" && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] leading-relaxed flex items-start gap-2 mt-2">
                        <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                          <strong>Restoring to ACTIVE:</strong> This will clear the failure forensic banner, reset failure flags, and resolve all rule violations so you can resume trading.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Rules & Parameters */}
            {editTab === "rules" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Challenge Rules & Risk Gates
                  </span>
                  <span className="text-[10px] text-muted-foreground">Adjust limits to resolve issues</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Starting Balance ($)</Label>
                    <Input
                      type="number"
                      value={editStartingBalance}
                      onChange={(e) => setEditStartingBalance(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Profit Target ($)</Label>
                    <Input
                      type="number"
                      value={editProfitTarget}
                      onChange={(e) => setEditProfitTarget(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Daily Loss Limit ($)</span>
                    </Label>
                    <Input
                      type="number"
                      value={editDailyLossLimit}
                      onChange={(e) => setEditDailyLossLimit(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                    <p className="text-[9px] text-muted-foreground">Set to 0 to disable daily loss rule</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Max Drawdown ($)</Label>
                    <Input
                      type="number"
                      value={editMaxDrawdown}
                      onChange={(e) => setEditMaxDrawdown(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Drawdown Type</Label>
                    <Select value={editDrawdownType} onValueChange={(val: any) => setEditDrawdownType(val)}>
                      <SelectTrigger className="h-9 font-mono text-xs bg-background/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-mono text-xs">
                        <SelectItem value="eod">EOD (End of Day)</SelectItem>
                        <SelectItem value="trailing">Trailing (Intraday High)</SelectItem>
                        <SelectItem value="static">Static (Fixed Floor)</SelectItem>
                        <SelectItem value="intraday">Intraday</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Max Contracts</Label>
                    <Input
                      type="number"
                      value={editMaxContracts}
                      onChange={(e) => setEditMaxContracts(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Min Trading Days</Label>
                    <Input
                      type="number"
                      value={editMinTradingDays}
                      onChange={(e) => setEditMinTradingDays(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Consistency %</Label>
                    <Input
                      type="number"
                      value={editConsistencyPct}
                      onChange={(e) => setEditConsistencyPct(Number(e.target.value))}
                      className="h-9 font-mono text-xs bg-background/60"
                    />
                    <p className="text-[9px] text-muted-foreground">Set to 0 to disable</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Issue Resolution */}
            {editTab === "resolution" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Issue Diagnostics & Breach Resolution
                </div>

                {editingAccount?.status === "failed" ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-rose-400">
                      <AlertTriangle className="w-4 h-4" /> Challenge Failure Detected
                    </div>
                    <p className="text-xs">
                      Reason: <span className="font-bold text-foreground">{editingAccount.failReason || "Rule violation triggered."}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>No unhandled failures detected on this challenge.</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border/40 bg-card hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={clearViolations}
                      onChange={(e) => setClearViolations(e.target.checked)}
                      className="mt-0.5 rounded border-border"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Auto-resolve all rule violations on save</span>
                      <span className="text-[11px] text-muted-foreground">
                        Clears the failure forensic banner from the dashboard and marks past violations as resolved.
                      </span>
                    </div>
                  </label>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                    <span className="font-bold text-blue-400 block">Need to remove or edit erroneous trades?</span>
                    <p className="text-muted-foreground text-[11px]">
                      If the challenge issue was caused by an accidental trade, bad tick, or duplicate import, you can view and remove those trades directly.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const acc = editingAccount
                        setEditingAccount(null)
                        if (acc) handleOpenManageTrades(acc)
                      }}
                      className="font-bold text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/20"
                    >
                      <Layers className="w-3.5 h-3.5 mr-1.5" /> Manage Challenge Trades ({trades.filter(t => t.accountId === editingAccount?.id).length})
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/40 pt-3 mt-2">
            <div>
              {editingAccount?.status === "failed" && editStatus !== "active" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditStatus("active")
                    setClearViolations(true)
                    if (editDailyLossLimit <= 260) {
                      setEditDailyLossLimit(500)
                    }
                  }}
                  className="text-xs font-mono font-bold text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> One-Click Recover to Active
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setEditingAccount(null)} className="font-bold text-xs">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="font-bold text-xs">
                {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Recover Challenge Dialog */}
      <Dialog open={recoveringAccount !== null} onOpenChange={(open) => !open && setRecoveringAccount(null)}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <RotateCcw className="w-5 h-5" /> Recover Challenge Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Restore <span className="font-bold text-foreground">{recoveringAccount?.name || "this challenge"}</span> to Active status in your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 font-mono text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Account Restoration
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This will set the challenge status back to <strong className="text-emerald-400">Active</strong>, clear the failure snapshot, and mark any associated rule violations as resolved.
              </p>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/60">
              <Label className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Daily Loss Limit ($)</span>
                <span className="text-[10px] text-muted-foreground">Recommended: $500</span>
              </Label>
              <Input
                type="number"
                value={recoverDailyLossLimit}
                onChange={(e) => setRecoverDailyLossLimit(Number(e.target.value))}
                placeholder="e.g. 500"
                className="h-9 font-mono text-xs bg-background/60"
              />
              <p className="text-[10px] text-muted-foreground">
                Set to $500 or higher (or 0 to disable) to ensure past intraday excursions don&apos;t re-trigger a daily loss breach.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRecoveringAccount(null)} className="font-bold text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRecover}
              disabled={isRecovering}
              className="font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              {isRecovering ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {isRecovering ? "Recovering..." : "Recover Challenge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challenge Trades & Issues Manager Dialog */}
      <Dialog open={managingTradesAccount !== null} onOpenChange={(open) => !open && setManagingTradesAccount(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-2xl border-border/80 shadow-2xl p-0">
          <div className="p-5 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" /> Manage Challenge Trades
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {managingTradesAccount?.name || "Challenge"} · {managingTradesAccount?.sizeLabel} · {trades.filter(t => t.accountId === managingTradesAccount?.id).length} recorded trades
                </DialogDescription>
              </div>

              {managingTradesAccount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGoToJournal(managingTradesAccount.id)}
                  className="font-mono text-xs font-bold gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Journal
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
            {managingTradesAccount && (() => {
              const accTrades = trades.filter(t => t.accountId === managingTradesAccount.id).sort((a, b) => b.timestamp - a.timestamp)
              if (accTrades.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground space-y-2 border border-dashed rounded-xl border-border/60">
                    <p className="font-bold">No trades found for this challenge.</p>
                    <p className="text-xs">Trades logged or imported into this account will appear here.</p>
                  </div>
                )
              }

              return (
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border/40">
                      <tr>
                        <th className="py-2.5 px-3">Day</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Instrument</th>
                        <th className="py-2.5 px-3">Side</th>
                        <th className="py-2.5 px-3 text-right">Contracts</th>
                        <th className="py-2.5 px-3 text-right">P&L ($)</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {accTrades.map(tr => (
                        <tr key={tr.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-3 font-bold">Day {tr.day}</td>
                          <td className="py-2 px-3 text-muted-foreground text-[11px]">
                            {tr.timestamp ? new Date(Number(tr.timestamp)).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-2 px-3 font-bold">{tr.instrument}</td>
                          <td className="py-2 px-3">
                            <span className={cn(
                              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                              tr.direction === "long" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            )}>
                              {tr.direction === "long" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {tr.direction}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">{tr.contracts}</td>
                          <td className="py-2 px-3 text-right">
                            {editingTradePnlId === tr.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  value={editingTradePnlValue}
                                  onChange={(e) => setEditingTradePnlValue(e.target.value)}
                                  className="h-6 w-20 text-right font-mono text-xs px-1"
                                />
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400" onClick={() => handleSaveTradePnl(tr)}>
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingTradePnlId(tr.id)
                                  setEditingTradePnlValue(String(tr.pnl))
                                }}
                                title="Click to edit trade P&L"
                                className={cn(
                                  "font-bold hover:underline",
                                  tr.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                                )}
                              >
                                {fmtCurrency(tr.pnl, { sign: true })}
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteTradeItem(tr.id)}
                              disabled={deletingTradeId === tr.id}
                              className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                              title="Delete trade & recalculate challenge"
                            >
                              {deletingTradeId === tr.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>

          <div className="p-4 border-t border-border/40 bg-muted/20 flex justify-between items-center text-xs font-mono">
            <span className="text-muted-foreground text-[11px]">
              Deleting or editing trades immediately triggers recalculation of daily loss & drawdown limits.
            </span>
            <Button variant="ghost" onClick={() => setManagingTradesAccount(null)} className="font-bold text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
