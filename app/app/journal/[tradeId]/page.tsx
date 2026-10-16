"use client"

import { uploadImageFormData } from "@/app/actions/journal-actions"
import { usePropStore } from "@/lib/store"
import { formatDisplayDateTime, formatDisplayTime } from "@/lib/format"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Upload,
  Clipboard,
  Trash2,
  ImageIcon,
  Maximize2,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Target,
  ShieldAlert,
  Percent,
  Coins,
  Copy,
  Check,
  Loader2,
  Brain,
  Scale,
  Activity,
  Layers,
} from "lucide-react"
import { SetupCombobox } from "@/components/app/setup-combobox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { EXIT_TYPES, ExitType, Trade } from "@/lib/types"
import { calculateTradeCommission } from "@/lib/trade-commission"
import {
  evaluatePlanVsActual,
  buildGeminiTradePrompt,
  formatMinutes,
  parseDurationToMinutes,
} from "@/lib/trade-plan-review"
import { reviewSingleTradeWithAiAction } from "@/app/actions/ai-actions"

function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      onInput={(e) => {
        e.currentTarget.style.height = "auto"
        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"
        if (props.onInput) props.onInput(e)
      }}
      className={cn("resize-none overflow-hidden min-h-[40px]", props.className)}
    />
  )
}

function formatHoldDuration(ms: number): string {
  if (!ms || ms < 0) return "--"
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const GRADES = ["A", "B", "C", "D"] as const

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  C: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  D: "bg-rose-500/20 text-rose-400 border-rose-500/40",
}

const DURATION_PRESETS = ["30 mins", "45 mins", "1 hour", "1.5 hours", "2 hours", "3 hours"]

export default function TradeDetailsPage() {
  const { tradeId } = useParams()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [aiReviewOutput, setAiReviewOutput] = useState<string | null>(null)

  const trades = usePropStore((s) => s.trades)
  const tradePsychology = usePropStore((s) => s.tradePsychology)
  const displayTimeMode = usePropStore((s) => s.displayTimeMode)
  const accounts = usePropStore((s) => s.accounts)
  const activeAccountId = usePropStore((s) => s.activeAccountId)
  const updateTrade = usePropStore((s) => s.updateTrade)
  const addScreenshot = usePropStore((s) => s.addScreenshot)
  const deleteScreenshot = usePropStore((s) => s.deleteScreenshot)
  const saveTradePsychology = usePropStore((s) => s.saveTradePsychology)
  const addCustomSetup = usePropStore((s) => s.addCustomSetup)
  const defaultPlannedRisk = usePropStore((s) => s.defaultPlannedRisk) || 100

  const trade = trades.find((t) => t.id === tradeId)
  const psyc = tradePsychology.find((p) => p.tradeId === tradeId) || ({} as any)
  const account = accounts.find((a) => a.id === activeAccountId)
  const accountBalance = account?.rules?.startingBalance ?? 100000

  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [setupName, setSetupName] = useState("")

  // Form States
  const [execForm, setExecForm] = useState({
    entry: "",
    exit: "",
    contracts: "1",
    grossPnl: "",
    commission: "",
    pnl: "",
    exitType: "",
  })

  const [planForm, setPlanForm] = useState({
    plannedStopLoss: "",
    plannedTarget: "",
    plannedTargetUsd: "",
    plannedRisk: "",
    plannedRR: "",
    plannedDuration: "",
    plannedExitRules: "",
  })

  const [stratForm, setStratForm] = useState({
    reasonForEntry: "",
    resultVsExpectation: "",
    expectedRR: "",
    executionGrade: "",
  })

  const [journalForm, setJournalForm] = useState({
    mistakes: "",
    executionImprovement: "",
  })

  const [uploadingImg, setUploadingImg] = useState(false)
  const [deleteScreenshotId, setDeleteScreenshotId] = useState<string | null>(null)

  // Populate data from trade
  useEffect(() => {
    if (!trade) return

    const contractsNum = trade.contracts || 1
    const initialComm =
      trade.commission !== undefined
        ? trade.commission
        : calculateTradeCommission(trade.instrument, contractsNum)
    const initialGross =
      trade.grossPnl !== undefined && trade.grossPnl !== null
        ? trade.grossPnl
        : trade.pnl + initialComm

    setExecForm({
      entry: trade.entry?.toString() ?? "",
      exit: trade.exit?.toString() ?? "",
      contracts: contractsNum.toString(),
      grossPnl: initialGross ? initialGross.toFixed(2) : (trade.pnl || 0).toFixed(2),
      commission: initialComm.toFixed(2),
      pnl: trade.pnl?.toString() ?? "",
      exitType: trade.exitType ?? "",
    })

    const initialRisk =
      trade.plannedRisk != null && trade.plannedRisk > 0
        ? trade.plannedRisk.toString()
        : trade.riskAmount != null && trade.riskAmount > 0
        ? trade.riskAmount.toString()
        : defaultPlannedRisk.toString()

    setPlanForm({
      plannedStopLoss: trade.plannedStopLoss?.toString() ?? trade.stopLoss?.toString() ?? "",
      plannedTarget: trade.plannedTarget?.toString() ?? trade.takeProfit?.toString() ?? "",
      plannedTargetUsd: trade.plannedTargetUsd?.toString() ?? "",
      plannedRisk: initialRisk,
      plannedRR: trade.plannedRR?.toString() ?? trade.expectedRR ?? "",
      plannedDuration: trade.plannedDuration ?? "",
      plannedExitRules: trade.plannedExitRules ?? "",
    })

    setStratForm({
      reasonForEntry: trade.reasonForEntry ?? "",
      resultVsExpectation: (trade as any).resultVsExpectation ?? "",
      expectedRR: trade.expectedRR ?? "",
      executionGrade: psyc.executionGrade ?? "",
    })

    setJournalForm({
      mistakes: trade.mistakes ?? "",
      executionImprovement: (trade as any).executionImprovement ?? "",
    })

    setSetupName(trade.playbookName ?? "")
  }, [trade?.id]) // eslint-disable-line

  // Handle Ctrl+V paste for screenshots
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!trade) return
      const items = e.clipboardData?.items
      if (!items) return
      let hasImage = false
      for (const item of Array.from(items)) {
        if (item.type.indexOf("image") !== -1) hasImage = true
      }
      if (hasImage) e.preventDefault()

      for (const item of Array.from(items)) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile()
          if (!file) continue
          setUploadingImg(true)
          try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("prefix", "trade_" + trade.id)
            const url = await uploadImageFormData(formData)
            await addScreenshot(trade.id, "gallery-" + Date.now() + "-paste", url)
            toast.success("Screenshot pasted successfully!")
          } catch {
            toast.error("Paste upload failed")
          } finally {
            setUploadingImg(false)
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [trade?.id]) // eslint-disable-line

  // Auto-calculate Commission & Net P&L when Gross P&L or Contracts change
  const handleGrossOrContractsChange = (field: "grossPnl" | "contracts", value: string) => {
    setExecForm((prev) => {
      const next = { ...prev, [field]: value }
      const contractsNum = parseFloat(field === "contracts" ? value : prev.contracts) || 1
      const grossNum = parseFloat(field === "grossPnl" ? value : prev.grossPnl) || 0
      const autoComm = calculateTradeCommission(trade?.instrument, contractsNum)
      const netPnl = Number((grossNum - autoComm).toFixed(2))

      return {
        ...next,
        commission: autoComm.toFixed(2),
        pnl: netPnl.toString(),
      }
    })
  }

  // Auto-calculate Planned Target USD or Planned RR when Stop/Target/Entry change
  useEffect(() => {
    const entry = parseFloat(execForm.entry)
    const sl = parseFloat(planForm.plannedStopLoss)
    const tp = parseFloat(planForm.plannedTarget)
    const riskAmt = parseFloat(planForm.plannedRisk) || defaultPlannedRisk
    const contractsNum = parseFloat(execForm.contracts) || 1

    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp) && Math.abs(entry - sl) > 0) {
      const riskPerContract = Math.abs(entry - sl)
      const rewardPerContract = Math.abs(tp - entry)
      const calcRR = (rewardPerContract / riskPerContract).toFixed(2)

      setPlanForm((f) => {
        if (!f.plannedRR) {
          return { ...f, plannedRR: calcRR }
        }
        return f
      })

      // Target USD approx if empty
      if (!planForm.plannedTargetUsd && riskAmt > 0) {
        const approxTargetUsd = (riskAmt * (rewardPerContract / riskPerContract)).toFixed(2)
        setPlanForm((f) => ({ ...f, plannedTargetUsd: approxTargetUsd }))
      }
    }
  }, [execForm.entry, planForm.plannedStopLoss, planForm.plannedTarget, planForm.plannedRisk, execForm.contracts, defaultPlannedRisk]) // eslint-disable-line

  // Upload file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !trade) return

    setUploadingImg(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "trade_" + trade.id)
        const url = await uploadImageFormData(formData)
        await addScreenshot(trade.id, "gallery-" + Date.now() + "-" + i, url)
      }
      toast.success("Screenshots uploaded!")
    } catch {
      toast.error("Screenshot upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }

  const handleDeleteScreenshot = async (id: string) => {
    if (!trade) return
    await deleteScreenshot(trade.id, id)
    toast.success("Screenshot deleted")
    setDeleteScreenshotId(null)
  }

  // Combined current trade object for live evaluation
  const liveTradeData: Trade = useMemo(() => {
    if (!trade) return {} as any
    const netPnlNum = parseFloat(execForm.pnl) || trade.pnl
    const commNum = parseFloat(execForm.commission) || 0
    const grossNum = parseFloat(execForm.grossPnl) || (netPnlNum + commNum)
    const riskNum = parseFloat(planForm.plannedRisk) || trade.plannedRisk || defaultPlannedRisk

    return {
      ...trade,
      entry: parseFloat(execForm.entry) || trade.entry,
      exit: parseFloat(execForm.exit) || trade.exit,
      contracts: parseFloat(execForm.contracts) || trade.contracts,
      grossPnl: grossNum,
      commission: commNum,
      pnl: netPnlNum,
      exitType: execForm.exitType || trade.exitType || null,
      plannedStopLoss: parseFloat(planForm.plannedStopLoss) || null,
      plannedTarget: parseFloat(planForm.plannedTarget) || null,
      plannedTargetUsd: parseFloat(planForm.plannedTargetUsd) || null,
      plannedRisk: riskNum > 0 ? riskNum : null,
      plannedRR: parseFloat(planForm.plannedRR) || null,
      plannedDuration: planForm.plannedDuration || null,
      plannedExitRules: planForm.plannedExitRules || null,
      playbookName: setupName.trim() || null,
    }
  }, [trade, execForm, planForm, setupName, defaultPlannedRisk])

  const planEval = useMemo(() => evaluatePlanVsActual(liveTradeData), [liveTradeData])

  const handleCopyGeminiPrompt = () => {
    if (!trade) return
    const prompt = buildGeminiTradePrompt(liveTradeData, account?.name ?? undefined)
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(true)
    toast.success("Trade data & Gemini prompt copied to clipboard!")
    setTimeout(() => setCopiedPrompt(false), 3000)
  }

  const handleRunAiAnalysis = async () => {
    if (!trade) return
    setAnalyzingAi(true)
    try {
      const res = await reviewSingleTradeWithAiAction(liveTradeData, account?.name ?? undefined)
      if (res.success && res.review) {
        setAiReviewOutput(res.review)
        toast.success("AI trade analysis generated!")
      } else {
        setAiReviewOutput(
          `### Gemini Review Prompt Ready\n\nDirect AI key not configured or returned error. You can copy the prepared prompt to Gemini:\n\n\`\`\`text\n${res.prompt}\n\`\`\``
        )
        toast.info("Prompt prepared. Click 'Copy Data for Gemini' to analyze.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI review")
    } finally {
      setAnalyzingAi(false)
    }
  }

  const handleSave = async () => {
    if (!trade) return
    setSaving(true)
    try {
      const trimmedSetup = setupName.trim()
      if (trimmedSetup) {
        addCustomSetup(trimmedSetup)
      }

      await saveTradePsychology({
        tradeId: trade.id,
        executionGrade: stratForm.executionGrade,
      })

      const netPnlNum = parseFloat(execForm.pnl) || trade.pnl
      const commNum = parseFloat(execForm.commission) ?? 0
      const grossNum = parseFloat(execForm.grossPnl) ?? (netPnlNum + commNum)
      const riskNum = parseFloat(planForm.plannedRisk) || undefined
      const netR = riskNum && riskNum > 0 ? Number((netPnlNum / riskNum).toFixed(2)) : undefined

      await updateTrade(trade.id, {
        entry: parseFloat(execForm.entry) || trade.entry,
        exit: parseFloat(execForm.exit) || trade.exit,
        contracts: parseFloat(execForm.contracts) || trade.contracts,
        grossPnl: grossNum,
        commission: commNum,
        pnl: netPnlNum,
        exitType: execForm.exitType || null,
        plannedStopLoss: parseFloat(planForm.plannedStopLoss) || null,
        plannedTarget: parseFloat(planForm.plannedTarget) || null,
        plannedTargetUsd: parseFloat(planForm.plannedTargetUsd) || null,
        plannedRisk: riskNum || null,
        plannedRR: parseFloat(planForm.plannedRR) || null,
        plannedDuration: planForm.plannedDuration || null,
        plannedExitRules: planForm.plannedExitRules || null,
        stopLoss: parseFloat(planForm.plannedStopLoss) || trade.stopLoss || null,
        takeProfit: parseFloat(planForm.plannedTarget) || trade.takeProfit || null,
        netR,
        playbookName: trimmedSetup || null,
        reasonForEntry: stratForm.reasonForEntry,
        resultVsExpectation: stratForm.resultVsExpectation,
        expectedRR: planForm.plannedRR || stratForm.expectedRR,
        mistakes: journalForm.mistakes,
        executionImprovement: journalForm.executionImprovement,
      } as any)

      toast.success("Trade saved successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  if (!trade) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground font-mono">
        Trade not found
      </div>
    )
  }

  const holdMs =
    trade.timestamp && trade.exitTime ? Number(trade.exitTime) - Number(trade.timestamp) : 0
  const holdDuration = formatHoldDuration(holdMs)
  const screenshots = (trade.screenshots || []) as any[]

  return (
    <div className="max-w-[1600px] mx-auto pb-24 space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border py-3 -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1600px] mx-auto">
          {/* Left: back + chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 -ml-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-black tracking-tight font-mono">{trade.instrument}</span>
            <Badge
              variant={trade.direction === "long" ? "default" : "destructive"}
              className="text-xs font-bold px-2.5 uppercase"
            >
              {trade.direction.toUpperCase()}
            </Badge>
            {trade.session && (
              <span className="text-xs bg-muted/60 border border-border px-2.5 py-0.5 rounded-full text-muted-foreground font-medium">
                {trade.session}
              </span>
            )}
            {(setupName || trade.playbookName) && (
              <span className="text-xs bg-primary/10 border border-primary/30 text-primary px-2.5 py-0.5 rounded-full font-bold">
                {setupName || trade.playbookName}
              </span>
            )}
            {execForm.exitType && (
              <span className="text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">
                {execForm.exitType}
              </span>
            )}
          </div>

          {/* Right: timestamp + Gemini button + save */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs text-muted-foreground hidden lg:block font-mono">
              {formatDisplayDateTime(trade.timestamp, displayTimeMode)}
              {trade.exitTime && ` - ${formatDisplayTime(trade.exitTime, displayTimeMode)}`}
              {holdDuration !== "--" && (
                <span className="ml-1.5 text-muted-foreground/60">&middot; {holdDuration}</span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyGeminiPrompt}
              className="gap-1.5 border-primary/30 hover:bg-primary/10 text-primary"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline font-semibold">Copy Data for Gemini</span>
            </Button>

            <Button onClick={handleSave} size="sm" disabled={saving} className="font-bold">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Trade"}
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Financial & R Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border/80 bg-card/60 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gross P&L</span>
          <p className={cn("text-lg font-black font-mono mt-1", planEval.grossPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {planEval.grossPnl >= 0 ? "+" : ""}${planEval.grossPnl.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Commission</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground font-mono">
              ROUND TRIP
            </Badge>
          </div>
          <p className="text-lg font-black font-mono mt-1 text-rose-400/90">
            -${planEval.commission.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Realized Net P&L</span>
          <p className={cn("text-xl font-black font-mono mt-1", planEval.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {planEval.realizedPnl >= 0 ? "+" : ""}${planEval.realizedPnl.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Realized R</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold">
              AUTO
            </Badge>
          </div>
          <p className={cn("text-xl font-black font-mono mt-1", planEval.actualR == null ? "text-muted-foreground" : planEval.actualR >= 0 ? "text-cyan-400" : "text-rose-400")}>
            {planEval.actualR != null ? `${planEval.actualR >= 0 ? "+" : ""}${planEval.actualR.toFixed(2)}R` : "--"}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Initial Planned Risk</span>
          <p className="text-lg font-black font-mono mt-1 text-foreground">
            {planEval.plannedRisk != null ? `$${planEval.plannedRisk.toFixed(2)}` : "--"}
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Pre-Trade Plan & Execution */}
        <div className="space-y-6">
          {/* Card: 1. Pre-Trade Plan */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  1. Pre-Trade Plan
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">Plan Ahead</Badge>
              </div>
              <CardDescription className="text-xs">
                Predefined targets, stop loss, risk and holding expectations before entry.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Predefined Stop Loss ($ level)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 19550.00"
                    value={planForm.plannedStopLoss}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedStopLoss: e.target.value }))}
                    className="h-9 mt-1 font-mono font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Planned Target ($ level)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 19650.00"
                    value={planForm.plannedTarget}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedTarget: e.target.value }))}
                    className="h-9 mt-1 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target Profit ($ USD)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 300"
                    value={planForm.plannedTargetUsd}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedTargetUsd: e.target.value }))}
                    className="h-9 mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Initial Risk ($ USD)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 100"
                    value={planForm.plannedRisk}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedRisk: e.target.value }))}
                    className="h-9 mt-1 font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Planned R:R
                    </Label>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 text-cyan-400 border-cyan-500/30">AUTO</Badge>
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. 2.5"
                    value={planForm.plannedRR}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedRR: e.target.value }))}
                    className="h-9 mt-1 font-mono text-cyan-400 font-bold"
                  />
                </div>
              </div>

              {/* Planned Duration with Presets */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Planned Holding Duration</span>
                  <span className="text-[10px] font-normal text-muted-foreground/70">e.g. 1 hour, 1.5 hours, 45m</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. 1 hour"
                    value={planForm.plannedDuration}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedDuration: e.target.value }))}
                    className="h-9 font-medium"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DURATION_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlanForm((f) => ({ ...f, plannedDuration: p }))}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md border transition-all font-mono",
                        planForm.plannedDuration.toLowerCase() === p.toLowerCase()
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Planned Exit Conditions & Rules */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Planned Exit Conditions &amp; Trade Management Rules
                </Label>
                <AutoTextarea
                  value={planForm.plannedExitRules}
                  onChange={(e) => setPlanForm((f) => ({ ...f, plannedExitRules: e.target.value }))}
                  placeholder="e.g. Move SL to BE at +1R. Close fully before 11:30 AM NY or if volume dries up at key liquidity..."
                  className="mt-1 bg-muted/20 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: 2. Actual Execution & Exit */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  2. Actual Trade Execution
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">Execution</Badge>
              </div>
              <CardDescription className="text-xs">
                Realized entry, exit, holding duration and specific exit categorization.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SETUP / MODEL</Label>
                <div className="mt-1">
                  <SetupCombobox
                    value={setupName}
                    onChange={setSetupName}
                    placeholder="Select or enter setup..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ENTRY PRICE</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.entry}
                    onChange={(e) => setExecForm((f) => ({ ...f, entry: e.target.value }))}
                    className="h-9 mt-1 text-sm font-semibold font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">EXIT PRICE</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.exit}
                    onChange={(e) => setExecForm((f) => ({ ...f, exit: e.target.value }))}
                    className="h-9 mt-1 text-sm font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CONTRACTS</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={execForm.contracts}
                    onChange={(e) => handleGrossOrContractsChange("contracts", e.target.value)}
                    className="h-9 mt-1 text-sm font-semibold font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GROSS P&L ($)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.grossPnl}
                    onChange={(e) => handleGrossOrContractsChange("grossPnl", e.target.value)}
                    className="h-9 mt-1 text-sm font-semibold font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">COMMISSION</Label>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 text-cyan-400 border-cyan-500/30">AUTO</Badge>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.commission}
                    onChange={(e) => setExecForm((f) => ({ ...f, commission: e.target.value }))}
                    className="h-9 mt-1 text-sm font-semibold font-mono text-rose-400"
                  />
                </div>
              </div>

              {/* Exit Type Dropdown - All 10 specific options */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  EXIT TYPE (SELECT OUTCOME REASON)
                </Label>
                <div className="mt-1">
                  <Select
                    value={execForm.exitType}
                    onValueChange={(val) => setExecForm((f) => ({ ...f, exitType: val || "" }))}
                  >
                    <SelectTrigger className="h-9 font-medium">
                      <SelectValue placeholder="Select how the trade exited..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXIT_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="font-medium text-xs">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timing & Duration details */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase block">Actual Hold Duration</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatMinutes(planEval.actualDurationMinutes)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase block">Exit Time</span>
                  <span className="font-mono text-sm text-foreground">
                    {trade.exitTime ? formatDisplayTime(trade.exitTime, displayTimeMode) : "Open / Unspecified"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Plan vs Actual Review & AI Analysis */}
        <div className="space-y-6">
          {/* Card: 3. Planned vs Actual Review (Objective & Factual) */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  3. Planned vs. Actual Review
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">Factual Audit</Badge>
              </div>
              <CardDescription className="text-xs">
                Objective facts comparing your pre-trade plan to your real execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              {/* Fact Rows */}
              <div className="divide-y divide-border/50 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Target Reached?</p>
                    <p className="text-[11px] text-muted-foreground">Price reached or touched planned profit target</p>
                  </div>
                  <div>
                    {planEval.targetReached === null ? (
                      <Badge variant="outline" className="text-muted-foreground">--</Badge>
                    ) : planEval.targetReached ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-rose-400 border-rose-500/30">No</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Stop Loss Hit?</p>
                    <p className="text-[11px] text-muted-foreground">Exited at or beyond initial planned stop price</p>
                  </div>
                  <div>
                    {planEval.stopLossHit === null ? (
                      <Badge variant="outline" className="text-muted-foreground">--</Badge>
                    ) : planEval.stopLossHit ? (
                      <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">No</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Exited Before Planned Target?</p>
                    <p className="text-[11px] text-muted-foreground">Closed position prior to reaching the full target price</p>
                  </div>
                  <div>
                    {planEval.exitedBeforeTarget === null ? (
                      <Badge variant="outline" className="text-muted-foreground">--</Badge>
                    ) : planEval.exitedBeforeTarget ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">No</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Exited Before Planned Duration?</p>
                    <p className="text-[11px] text-muted-foreground">
                      Planned: {planForm.plannedDuration || "--"} &middot; Actual: {formatMinutes(planEval.actualDurationMinutes)}
                    </p>
                  </div>
                  <div>
                    {planEval.exitedBeforeDuration === null ? (
                      <Badge variant="outline" className="text-muted-foreground">--</Badge>
                    ) : planEval.exitedBeforeDuration ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">No</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Manually Closed?</p>
                    <p className="text-[11px] text-muted-foreground">Manual intervention instead of automated limit/stop execution</p>
                  </div>
                  <div>
                    {planEval.manuallyClosed ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border">No</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Moved Stop Loss / Target?</p>
                    <p className="text-[11px] text-muted-foreground">Altered order levels from the initial plan mid-trade</p>
                  </div>
                  <div>
                    {planEval.movedStopLoss || planEval.movedTarget ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                        {planEval.movedStopLoss && planEval.movedTarget ? "Moved Both" : planEval.movedStopLoss ? "Moved SL" : "Moved Target"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Maintained</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* R-Multiple Comparison Pill */}
              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Planned vs Realized R</span>
                  <div className="text-xs font-mono font-medium text-muted-foreground mt-0.5">
                    Planned: <span className="font-bold text-foreground">{planEval.plannedRR != null ? `${planEval.plannedRR}R` : "--"}</span>
                    {" "} &rarr; {" "}
                    Realized: <span className="font-bold text-cyan-400">{planEval.actualR != null ? `${planEval.actualR}R` : "--"}</span>
                  </div>
                </div>
                {planEval.rDelta != null && (
                  <Badge variant="outline" className={cn("font-mono text-xs font-bold", planEval.rDelta >= 0 ? "text-emerald-400 border-emerald-500/30" : "text-rose-400 border-rose-500/30")}>
                    {planEval.rDelta >= 0 ? `+${planEval.rDelta.toFixed(2)}R` : `${planEval.rDelta.toFixed(2)}R`}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: 4. Gemini AI Trade Review */}
          <Card className="border-primary/30 shadow-sm bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  4. Gemini AI Trade Review
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyGeminiPrompt}
                    className="h-7 text-xs gap-1 border-primary/30"
                  >
                    {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Prompt</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRunAiAnalysis}
                    disabled={analyzingAi}
                    className="h-7 text-xs gap-1.5 font-bold"
                  >
                    {analyzingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    <span>{analyzingAi ? "Analyzing..." : "Analyze with AI"}</span>
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                Extracts plan vs actual deviations, premature exits, and rule compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {aiReviewOutput ? (
                <div className="p-3.5 rounded-lg border border-primary/20 bg-muted/30 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {aiReviewOutput}
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-border/60 bg-muted/10 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Click <strong>Analyze with AI</strong> for an instant coach diagnosis, or copy the formatted trade plan prompt to chat directly with Gemini.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Includes setup model, planned risk, holding duration, exit type, commission, and execution delta.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-Width Section: Strategy, Journal Notes & Process Grading */}
      <Card className="border-border/80">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            5. Strategy, Psychology &amp; Execution Grading
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-2 bg-muted/30 border-b border-border/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Reasoning / Logic / Confirmation
                </span>
              </div>
              <div className="p-3">
                <AutoTextarea
                  value={stratForm.reasonForEntry}
                  onChange={(e) => setStratForm((f) => ({ ...f, reasonForEntry: e.target.value }))}
                  placeholder="Why did you take this trade? What confirmed your bias?"
                  className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/10 resize-none min-h-[90px] text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-2 bg-muted/30 border-b border-border/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Result vs Expectation
                </span>
              </div>
              <div className="p-3">
                <AutoTextarea
                  value={stratForm.resultVsExpectation}
                  onChange={(e) => setStratForm((f) => ({ ...f, resultVsExpectation: e.target.value }))}
                  placeholder="What actually unfolded compared to what you envisioned?"
                  className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/10 resize-none min-h-[90px] text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-destructive/30 bg-card overflow-hidden">
              <div className="px-4 py-2 bg-destructive/5 border-b border-destructive/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/80">
                  Mistakes
                </span>
              </div>
              <div className="p-3">
                <AutoTextarea
                  value={journalForm.mistakes}
                  onChange={(e) => setJournalForm((f) => ({ ...f, mistakes: e.target.value }))}
                  placeholder="Did you break any rules, exit early, or oversize?"
                  className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/10 resize-none min-h-[90px] text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-warning/30 bg-card overflow-hidden">
              <div className="px-4 py-2 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-warning/80">
                  How Execution Could Improve
                </span>
              </div>
              <div className="p-3">
                <AutoTextarea
                  value={journalForm.executionImprovement}
                  onChange={(e) => setJournalForm((f) => ({ ...f, executionImprovement: e.target.value }))}
                  placeholder="Concrete adjustments for the next time this setup triggers..."
                  className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/10 resize-none min-h-[90px] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Process Grade Selector */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Execution &amp; Process Grade
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Grade the execution adherence, not whether the trade won or lost dollars.
              </p>
            </div>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    setStratForm((f) => ({ ...f, executionGrade: f.executionGrade === g ? "" : g }))
                  }
                  className={cn(
                    "h-9 px-4 rounded-lg text-xs font-bold border transition-all",
                    stratForm.executionGrade === g
                      ? GRADE_COLORS[g]
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Gallery & Ctrl+V Paste */}
      <Card className="border-border/80">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Screenshots &amp; Chart Evidence
              </CardTitle>
              {screenshots.length > 0 && (
                <Badge variant="secondary" className="text-xs font-bold tabular-nums">
                  {screenshots.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/60 px-2.5 py-1 rounded-md">
                <Clipboard className="w-3.5 h-3.5" />
                <span>Ctrl+V to paste anywhere</span>
              </div>
              <label htmlFor="sc-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload Image
                  </span>
                </Button>
              </label>
              <input
                id="sc-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadingImg}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {screenshots.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/50 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/20 transition-colors group"
              onClick={() => document.getElementById("sc-upload")?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/40 transition-colors">
                <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No chart screenshots yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+V</kbd> to paste, or click to upload
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map((sc: any) => (
                <div
                  key={sc.id}
                  className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer shadow-sm"
                  onClick={() => setExpandedImage(sc.url)}
                >
                  <img
                    src={sc.url}
                    alt="Trade screenshot"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                    <p className="text-[10px] text-white/70 font-medium font-mono">
                      {sc.createdAt ? new Date(sc.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : ""}
                    </p>
                  </div>
                  <button
                    className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive/80 z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteScreenshotId(sc.id)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
              <label
                htmlFor="sc-upload-more"
                className="aspect-video rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all group"
              >
                <Upload className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                <span className="text-xs text-muted-foreground/60 font-medium group-hover:text-muted-foreground">Add more</span>
                <input
                  id="sc-upload-more"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingImg}
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-6xl p-2 bg-background/95 border-border">
          <DialogHeader className="p-2">
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Trade Screenshot</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsZoomed(!isZoomed)}
                className="gap-1 h-7 text-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isZoomed ? "Fit" : "Zoom"}</span>
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[80vh] flex items-center justify-center p-2">
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Expanded chart"
                className={cn(
                  "rounded-md transition-all",
                  isZoomed ? "max-w-none cursor-zoom-out" : "max-w-full max-h-[75vh] object-contain cursor-zoom-in"
                )}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Screenshot Confirmation */}
      <AlertDialog
        open={!!deleteScreenshotId}
        onOpenChange={() => setDeleteScreenshotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chart image from your trade records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScreenshotId && handleDeleteScreenshot(deleteScreenshotId)}
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
