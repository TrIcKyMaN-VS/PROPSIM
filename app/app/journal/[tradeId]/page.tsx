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
  Copy,
  Check,
  Loader2,
  Brain,
  Scale,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react"
import { SetupCombobox } from "@/components/app/setup-combobox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { EXIT_TYPES, ExitType, POST_EXIT_RESULTS, PostExitResult, Trade } from "@/lib/types"
import { calculateTradeCommission } from "@/lib/trade-commission"
import { calculateDollarRiskFromPoints } from "@/lib/pnl-calculator"
import {
  evaluatePlanVsActual,
  buildGeminiTradePrompt,
  formatMinutes,
} from "@/lib/trade-plan-review"
import { reviewSingleTradeWithAiAction } from "@/app/actions/ai-actions"
import { ImageLightbox } from "@/components/app/image-lightbox"
import { AiReviewFormatted } from "@/components/app/ai-review-card"

function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      onInput={(e) => {
        e.currentTarget.style.height = "auto"
        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"
        if (props.onInput) props.onInput(e)
      }}
      className={cn("resize-none overflow-hidden min-h-[44px]", props.className)}
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

const GRADE_LABELS: Record<string, string> = {
  A: "A — By the model, well executed",
  B: "B — By the model, sloppy entry/exit",
  C: "C — Marginal setup, forced",
  D: "D — Outside the model entirely",
}

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
  const removeTrade = usePropStore((s) => s.removeTrade)
  const addScreenshot = usePropStore((s) => s.addScreenshot)
  const deleteScreenshot = usePropStore((s) => s.deleteScreenshot)
  const saveTradePsychology = usePropStore((s) => s.saveTradePsychology)
  const addCustomSetup = usePropStore((s) => s.addCustomSetup)
  const defaultPlannedRisk = usePropStore((s) => s.defaultPlannedRisk) || 100

  const trade = trades.find((t) => t.id === tradeId)
  const psyc = tradePsychology.find((p) => p.tradeId === tradeId) || ({} as any)
  const account = accounts.find((a) => a.id === activeAccountId)

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
    postExitResult: "",
  })

  const [planForm, setPlanForm] = useState({
    plannedStopLoss: "",
    plannedTarget: "",
    plannedRisk: "",
    plannedRR: "",
    plannedExitRules: "",
  })

  const [stratForm, setStratForm] = useState({
    reasonForEntry: "",
    resultVsExpectation: "",
    executionGrade: "",
  })

  const [journalForm, setJournalForm] = useState({
    mistakes: "",
    executionImprovement: "",
  })

  const [uploadingImg, setUploadingImg] = useState(false)
  const [deleteScreenshotId, setDeleteScreenshotId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      postExitResult: trade.postExitResult ?? "",
    })

    const entryNum = trade.entry || 0
    const slNum = trade.plannedStopLoss ?? trade.stopLoss ?? 0
    const tpNum = trade.plannedTarget ?? trade.takeProfit ?? 0
    const contractsNumForRisk = trade.contracts || 1
    const autoRisk = (entryNum > 0 && slNum > 0)
      ? calculateDollarRiskFromPoints(trade.instrument, Math.abs(entryNum - slNum), contractsNumForRisk)
      : null

    const initialRisk =
      trade.plannedRisk != null && trade.plannedRisk > 0
        ? trade.plannedRisk.toString()
        : autoRisk != null
        ? autoRisk.toString()
        : trade.riskAmount != null && trade.riskAmount > 0
        ? trade.riskAmount.toString()
        : defaultPlannedRisk.toString()

    let calcInitialRR = ""
    if (entryNum > 0 && slNum > 0 && tpNum > 0 && Math.abs(entryNum - slNum) > 0) {
      calcInitialRR = (Math.abs(tpNum - entryNum) / Math.abs(entryNum - slNum)).toFixed(2)
    } else if (trade.plannedRR != null && trade.plannedRR > 0) {
      calcInitialRR = trade.plannedRR.toString()
    }

    setPlanForm({
      plannedStopLoss: trade.plannedStopLoss?.toString() ?? trade.stopLoss?.toString() ?? "",
      plannedTarget: trade.plannedTarget?.toString() ?? trade.takeProfit?.toString() ?? "",
      plannedRisk: initialRisk,
      plannedRR: calcInitialRR,
      plannedExitRules: trade.plannedExitRules ?? "",
    })

    setStratForm({
      reasonForEntry: trade.reasonForEntry ?? "",
      resultVsExpectation: (trade as any).resultVsExpectation ?? "",
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

  const [riskIsManual, setRiskIsManual] = useState(false)

  // Live Auto-Calculation of Points Risk, Points Reward, and Planned R:R
  const livePlanMetrics = useMemo(() => {
    const entry = parseFloat(execForm.entry)
    const sl = parseFloat(planForm.plannedStopLoss)
    const tp = parseFloat(planForm.plannedTarget)
    const contractsNum = parseFloat(execForm.contracts) || 1

    if (isNaN(entry) || isNaN(sl) || entry <= 0 || sl <= 0) {
      return {
        hasCalculation: false,
        riskPts: null,
        rewardPts: null,
        rrRatio: parseFloat(planForm.plannedRR) || null,
        autoDollarRisk: null,
        projectedRewardUsd: null,
      }
    }

    const riskPts = Math.abs(entry - sl)
    if (riskPts <= 0) {
      return {
        hasCalculation: false,
        riskPts: null,
        rewardPts: null,
        rrRatio: parseFloat(planForm.plannedRR) || null,
        autoDollarRisk: null,
        projectedRewardUsd: null,
      }
    }

    const autoDollarRisk = calculateDollarRiskFromPoints(trade?.instrument, riskPts, contractsNum)
    const rewardPts = !isNaN(tp) && tp > 0 ? Math.abs(tp - entry) : null
    const rrRatio = rewardPts != null && riskPts > 0 ? Number((rewardPts / riskPts).toFixed(2)) : (parseFloat(planForm.plannedRR) || null)
    const riskUsd = parseFloat(planForm.plannedRisk) || autoDollarRisk || defaultPlannedRisk
    const projectedRewardUsd = rrRatio != null && riskUsd > 0 ? Number((riskUsd * rrRatio).toFixed(2)) : null

    return {
      hasCalculation: true,
      riskPts: Number(riskPts.toFixed(2)),
      rewardPts: rewardPts != null ? Number(rewardPts.toFixed(2)) : null,
      rrRatio,
      autoDollarRisk,
      projectedRewardUsd,
    }
  }, [execForm.entry, execForm.contracts, planForm.plannedStopLoss, planForm.plannedTarget, planForm.plannedRisk, planForm.plannedRR, trade?.instrument, defaultPlannedRisk])

  // Sync calculated RR into planForm when valid levels change
  useEffect(() => {
    if (livePlanMetrics.hasCalculation && livePlanMetrics.rrRatio != null) {
      const newRRStr = livePlanMetrics.rrRatio.toString()
      if (planForm.plannedRR !== newRRStr) {
        setPlanForm((f) => ({ ...f, plannedRR: newRRStr }))
      }
    }
  }, [livePlanMetrics.hasCalculation, livePlanMetrics.rrRatio]) // eslint-disable-line

  // Auto-sync calculated Dollar Risk into planForm if not manually overridden
  useEffect(() => {
    if (!riskIsManual && livePlanMetrics.hasCalculation && livePlanMetrics.autoDollarRisk != null) {
      const autoStr = livePlanMetrics.autoDollarRisk.toString()
      if (planForm.plannedRisk !== autoStr) {
        setPlanForm((f) => ({ ...f, plannedRisk: autoStr }))
      }
    }
  }, [livePlanMetrics.hasCalculation, livePlanMetrics.autoDollarRisk, riskIsManual]) // eslint-disable-line

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
      toast.success("Screenshots uploaded successfully!")
    } catch {
      toast.error("Failed to upload screenshot")
    } finally {
      setUploadingImg(false)
      e.target.value = ""
    }
  }

  // Combined current trade object for live evaluation
  const liveTradeData: Trade = useMemo(() => {
    if (!trade) return {} as any
    const netPnlNum = parseFloat(execForm.pnl) || trade.pnl
    const commNum = parseFloat(execForm.commission) || 0
    const grossNum = parseFloat(execForm.grossPnl) || (netPnlNum + commNum)
    const riskNum = parseFloat(planForm.plannedRisk) || livePlanMetrics.autoDollarRisk || trade.plannedRisk || defaultPlannedRisk

    return {
      ...trade,
      entry: parseFloat(execForm.entry) || trade.entry,
      exit: parseFloat(execForm.exit) || trade.exit,
      contracts: parseFloat(execForm.contracts) || trade.contracts,
      grossPnl: grossNum,
      commission: commNum,
      pnl: netPnlNum,
      exitType: execForm.exitType || trade.exitType || null,
      postExitResult: execForm.postExitResult || trade.postExitResult || null,
      plannedStopLoss: parseFloat(planForm.plannedStopLoss) || null,
      plannedTarget: parseFloat(planForm.plannedTarget) || null,
      plannedRisk: riskNum > 0 ? riskNum : null,
      plannedRR: livePlanMetrics.rrRatio ?? (parseFloat(planForm.plannedRR) || null),
      plannedExitRules: planForm.plannedExitRules || null,
      playbookName: setupName.trim() || null,
    }
  }, [trade, execForm, planForm, setupName, defaultPlannedRisk, livePlanMetrics.rrRatio, livePlanMetrics.autoDollarRisk])

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
      const riskNum = parseFloat(planForm.plannedRisk) || livePlanMetrics.autoDollarRisk || undefined
      const netR = riskNum && riskNum > 0 ? Number((netPnlNum / riskNum).toFixed(2)) : undefined

      await updateTrade(trade.id, {
        entry: parseFloat(execForm.entry) || trade.entry,
        exit: parseFloat(execForm.exit) || trade.exit,
        contracts: parseFloat(execForm.contracts) || trade.contracts,
        grossPnl: grossNum,
        commission: commNum,
        pnl: netPnlNum,
        exitType: execForm.exitType || null,
        postExitResult: execForm.postExitResult || null,
        plannedStopLoss: parseFloat(planForm.plannedStopLoss) || null,
        plannedTarget: parseFloat(planForm.plannedTarget) || null,
        plannedRisk: riskNum || null,
        plannedRR: livePlanMetrics.rrRatio ?? (parseFloat(planForm.plannedRR) || null),
        plannedExitRules: planForm.plannedExitRules || null,
        stopLoss: parseFloat(planForm.plannedStopLoss) || trade.stopLoss || null,
        netR,
        playbookName: trimmedSetup || null,
        reasonForEntry: stratForm.reasonForEntry,
        resultVsExpectation: stratForm.resultVsExpectation,
        expectedRR: planForm.plannedRR,
        mistakes: journalForm.mistakes,
        executionImprovement: journalForm.executionImprovement,
      } as any)

      toast.success("Trade saved successfully!")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTrade = async () => {
    if (!trade) return
    try {
      await removeTrade(trade.id)
      toast.success("Trade deleted")
      router.push("/app/journal")
    } catch {
      toast.error("Failed to delete trade")
    }
  }

  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-muted-foreground text-sm font-medium">Trade not found or still loading...</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/app/journal")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Journal
        </Button>
      </div>
    )
  }

  const isWin = planEval.realizedPnl > 0
  const isLoss = planEval.realizedPnl < 0
  const isLong = trade.direction === "long"

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/app/journal")}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Journal
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-foreground tracking-tight">
              {trade.instrument}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md",
                isLong
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              )}
            >
              {isLong ? (
                <TrendingUp className="w-3 h-3 inline mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 inline mr-1" />
              )}
              {trade.direction.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {trade.contracts} {trade.contracts === 1 ? "ct" : "cts"}
            </span>
          </div>
        </div>

        {/* Right Actions: Setup Combobox + Save */}
        <div className="flex items-center gap-2.5">
          <div className="w-56 sm:w-64">
            <SetupCombobox
              value={setupName}
              onChange={setSetupName}
              placeholder="Select or enter setup..."
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="h-9 px-4 font-semibold shadow-sm gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-9 w-9 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modern, Comfortable Financial Banner */}
      <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-border/40">
          {/* Net P&L */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Net P&amp;L
              </span>
              <span className="text-[9px] text-muted-foreground/60 font-mono">(realized)</span>
            </div>
            <p
              className={cn(
                "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-muted-foreground"
              )}
            >
              {isWin ? "+" : ""}
              ${planEval.realizedPnl.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              ${planEval.grossPnl.toFixed(2)} gross · -${planEval.commission.toFixed(2)} comm
            </p>
          </div>

          {/* Realized R */}
          <div className="pt-3 md:pt-0 md:pl-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Realized R
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-cyan-400 border-cyan-500/30">
                Net
              </Badge>
            </div>
            <p
              className={cn(
                "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                planEval.actualR == null
                  ? "text-muted-foreground"
                  : planEval.actualR >= 0
                  ? "text-cyan-400"
                  : "text-rose-400"
              )}
            >
              {planEval.actualR != null
                ? `${planEval.actualR >= 0 ? "+" : ""}${planEval.actualR.toFixed(2)}R`
                : "--"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Based on ${planEval.plannedRisk?.toFixed(0) ?? defaultPlannedRisk} risk
            </p>
          </div>

          {/* Planned R:R */}
          <div className="pt-3 md:pt-0 md:pl-5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Planned R:R
            </span>
            <p className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
              {livePlanMetrics.rrRatio ? `${livePlanMetrics.rrRatio}R` : planForm.plannedRR ? `${planForm.plannedRR}R` : "--"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {livePlanMetrics.hasCalculation
                ? `${livePlanMetrics.rewardPts} pts TP / ${livePlanMetrics.riskPts} pts SL`
                : "Enter SL & Target below"}
            </p>
          </div>

          {/* Trade Timing & Session */}
          <div className="pt-3 md:pt-0 md:pl-5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Trade Info
            </span>
            <p className="text-sm font-semibold text-foreground pt-1">
              {trade.timestamp ? formatDisplayDateTime(trade.timestamp, displayTimeMode) : "Date N/A"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Session: {trade.session || "NY"} · {trade.exitTime ? formatHoldDuration(Number(trade.exitTime) - Number(trade.timestamp)) : "Open"}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Clean, Breathable Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: Trade Plan & Execution Details */}
        <div className="space-y-6">
          {/* Pre-Trade Plan Card */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Pre-Trade Plan
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                  Plan Ahead
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Predefined stop-loss, target level, and expected R:R ratio.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* SL and Target Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Predefined Stop Loss
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 19550.00"
                    value={planForm.plannedStopLoss}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedStopLoss: e.target.value }))}
                    className="h-9 font-mono font-semibold bg-background/50 text-rose-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Planned Target
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 19650.00"
                    value={planForm.plannedTarget}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedTarget: e.target.value }))}
                    className="h-9 font-mono font-semibold bg-background/50 text-emerald-400"
                  />
                </div>
              </div>

              {/* Dynamic Points & R:R Calculator Pill */}
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-cyan-400" />
                    Auto-Calculated R:R
                  </span>
                  <span className="font-mono font-bold text-cyan-400">
                    {livePlanMetrics.rrRatio ? `${livePlanMetrics.rrRatio} : 1` : "--"}
                  </span>
                </div>
                {livePlanMetrics.hasCalculation ? (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Risk: <span className="text-rose-400 font-semibold">{livePlanMetrics.riskPts} pts{livePlanMetrics.autoDollarRisk ? ` ($${livePlanMetrics.autoDollarRisk})` : ""}</span>{livePlanMetrics.rewardPts != null && <> · Target: <span className="text-emerald-400 font-semibold">{livePlanMetrics.rewardPts} pts</span></>}
                    {livePlanMetrics.projectedRewardUsd && (
                      <span className="text-foreground"> · Proj. Reward: <span className="text-emerald-400 font-bold">+${livePlanMetrics.projectedRewardUsd}</span></span>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70">
                    Enter entry price, stop-loss and target to see exact points and R:R.
                  </p>
                )}
              </div>

              {/* Initial Planned Risk */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Initial Risk ($ USD)
                    </Label>
                    {livePlanMetrics.autoDollarRisk != null && (
                      <button
                        type="button"
                        onClick={() => {
                          setRiskIsManual(false)
                          setPlanForm((f) => ({ ...f, plannedRisk: livePlanMetrics.autoDollarRisk!.toString() }))
                          toast.info(`Snapped risk to chart SL: $${livePlanMetrics.autoDollarRisk}`)
                        }}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
                        title="Reset to auto-calculated risk from Stop Loss"
                      >
                        ⚡ Auto: ${livePlanMetrics.autoDollarRisk}
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    placeholder="100"
                    value={planForm.plannedRisk}
                    onChange={(e) => {
                      setRiskIsManual(true)
                      setPlanForm((f) => ({ ...f, plannedRisk: e.target.value }))
                    }}
                    className="h-9 font-mono bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Planned R:R (Override)
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. 2.5"
                    value={planForm.plannedRR}
                    onChange={(e) => setPlanForm((f) => ({ ...f, plannedRR: e.target.value }))}
                    className="h-9 font-mono text-cyan-400 font-bold bg-background/50"
                  />
                </div>
              </div>

              {/* Planned Exit Conditions & Rules */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Trade Invalidation &amp; Management Rules
                </Label>
                <AutoTextarea
                  value={planForm.plannedExitRules}
                  onChange={(e) => setPlanForm((f) => ({ ...f, plannedExitRules: e.target.value }))}
                  placeholder="e.g. Move SL to BE at +1R. Invalidate if 5m candle closes below support. Close before 11:30 AM..."
                  className="bg-background/50 text-xs sm:text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actual Execution & Outcome Card */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Actual Execution
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                  Outcome
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Actual entry, exit price, contracts, and commission breakdown.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Entry, Exit, Contracts */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Entry Price</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.entry}
                    onChange={(e) => setExecForm((f) => ({ ...f, entry: e.target.value }))}
                    className="h-9 font-mono font-semibold bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Exit Price</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.exit}
                    onChange={(e) => setExecForm((f) => ({ ...f, exit: e.target.value }))}
                    className="h-9 font-mono font-semibold bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Contracts</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={execForm.contracts}
                    onChange={(e) => handleGrossOrContractsChange("contracts", e.target.value)}
                    className="h-9 font-mono bg-background/50"
                  />
                </div>
              </div>

              {/* Financials: Gross, Commission, Net */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Gross P&amp;L ($)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.grossPnl}
                    onChange={(e) => handleGrossOrContractsChange("grossPnl", e.target.value)}
                    className="h-9 font-mono bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Commission</Label>
                    <span className="text-[9px] text-muted-foreground font-mono">auto</span>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.commission}
                    onChange={(e) => setExecForm((f) => ({ ...f, commission: e.target.value }))}
                    className="h-9 font-mono text-rose-400 bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Net P&amp;L ($)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm.pnl}
                    onChange={(e) => setExecForm((f) => ({ ...f, pnl: e.target.value }))}
                    className={cn(
                      "h-9 font-mono font-bold bg-background/50",
                      parseFloat(execForm.pnl) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  />
                </div>
              </div>

              {/* Exit Type Dropdown (10 Options) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Exit Type (Select Outcome)
                </Label>
                <Select
                  value={execForm.exitType}
                  onValueChange={(val) => setExecForm((f) => ({ ...f, exitType: val || "" }))}
                >
                  <SelectTrigger className="h-9 bg-background/50 text-xs font-medium">
                    <SelectValue placeholder="Select how the trade exited..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs font-medium">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Post-Exit Outcome (Did BE / Early Exit Help or Hurt?) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                    Post-Exit Quality (Did BE / Early Exit Help or Hurt?)
                  </Label>
                  {execForm.postExitResult && (
                    <button
                      type="button"
                      onClick={() => setExecForm((f) => ({ ...f, postExitResult: "" }))}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-mono underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {POST_EXIT_RESULTS.map((res) => {
                    const active = execForm.postExitResult === res
                    const isSaved = res === "Saved Me (Hit SL)"
                    const isCost = res === "Cost Me (Hit TP)"
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() =>
                          setExecForm((f) => ({
                            ...f,
                            postExitResult: f.postExitResult === res ? "" : res,
                          }))
                        }
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all flex flex-col items-center justify-center gap-0.5",
                          active
                            ? isSaved
                              ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm"
                              : isCost
                              ? "bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm"
                              : "bg-muted border-foreground/40 text-foreground shadow-sm"
                            : isSaved
                            ? "bg-background/50 border-border/50 text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400"
                            : isCost
                            ? "bg-background/50 border-border/50 text-muted-foreground hover:border-rose-500/50 hover:text-rose-400"
                            : "bg-background/50 border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        <span className="text-[11px] font-bold tracking-tight">{res}</span>
                        <span className="text-[9px] font-normal opacity-80">
                          {isSaved ? "Avoided SL Loss" : isCost ? "Missed Target Gain" : "Neutral Effect"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Plan vs Actual Factual Review Badges */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Plan vs Actual Review
                </span>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-md border font-medium inline-flex items-center gap-1.5",
                      planEval.targetReached === true
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : planEval.targetReached === false
                        ? "bg-muted/40 text-muted-foreground border-border/50"
                        : "bg-muted/20 text-muted-foreground/60 border-transparent"
                    )}
                  >
                    {planEval.targetReached === true ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Info className="w-3.5 h-3.5" />}
                    Target Reached: {planEval.targetReached === true ? "Yes" : planEval.targetReached === false ? "No" : "Not set"}
                  </span>

                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-md border font-medium inline-flex items-center gap-1.5",
                      planEval.stopLossHit === true
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : planEval.stopLossHit === false
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-muted/20 text-muted-foreground/60 border-transparent"
                    )}
                  >
                    {planEval.stopLossHit === true ? <XCircle className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    Stop Loss Hit: {planEval.stopLossHit === true ? "Yes" : planEval.stopLossHit === false ? "No" : "Not set"}
                  </span>

                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-md border font-medium inline-flex items-center gap-1.5",
                      planEval.exitedBeforeTarget === true
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : planEval.exitedBeforeTarget === false
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-muted/20 text-muted-foreground/60 border-transparent"
                    )}
                  >
                    Exited Before Target: {planEval.exitedBeforeTarget === true ? "Yes (Early)" : planEval.exitedBeforeTarget === false ? "No (Full Target)" : "N/A"}
                  </span>

                  {planEval.manuallyClosed && (
                    <span className="text-xs px-2.5 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-medium inline-flex items-center gap-1.5">
                      Manual Close
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Screenshots, Mindset, and AI Review */}
        <div className="space-y-6">
          {/* Screenshots Gallery Card */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Trade Screenshots
                </CardTitle>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingImg}
                    />
                  </label>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-[11px] text-muted-foreground font-mono">Ctrl+V to paste</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {uploadingImg && (
                <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                  Uploading image...
                </div>
              )}

              {trade.screenshots && trade.screenshots.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {trade.screenshots.map((sc) => (
                    <div
                      key={sc.id}
                      className="group relative rounded-lg overflow-hidden border border-border/50 bg-black/40 aspect-video cursor-pointer"
                      onClick={() => setExpandedImage(sc.url)}
                    >
                      <img
                        src={sc.url}
                        alt="Trade screenshot"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedImage(sc.url)
                          }}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-400 hover:bg-rose-500/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteScreenshotId(sc.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-lg border border-dashed border-border/60 p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("hidden-file-input")?.click()}
                >
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">No screenshots added yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Click to upload or press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+V</kbd> anywhere to paste from clipboard.
                  </p>
                  <input
                    id="hidden-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade Reflection & Execution Grade */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Notes &amp; Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Execution Grade Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Execution Grade</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setStratForm((f) => ({ ...f, executionGrade: g }))}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all text-xs font-semibold",
                        stratForm.executionGrade === g
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <span className="block font-bold text-sm">{g}</span>
                      <span className="text-[10px] font-normal block truncate">
                        {g === "A" ? "Model followed" : g === "B" ? "Sloppy execution" : g === "C" ? "Forced setup" : "Outside model"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason for Entry */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Reason for Entry</Label>
                <AutoTextarea
                  value={stratForm.reasonForEntry}
                  onChange={(e) => setStratForm((f) => ({ ...f, reasonForEntry: e.target.value }))}
                  placeholder="What market structure or setup confluence triggered this entry?"
                  className="bg-background/50 text-xs sm:text-sm"
                />
              </div>

              {/* Result vs Expectation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Result vs Expectation</Label>
                <AutoTextarea
                  value={stratForm.resultVsExpectation}
                  onChange={(e) => setStratForm((f) => ({ ...f, resultVsExpectation: e.target.value }))}
                  placeholder="How did price behave compared to what you anticipated before entry?"
                  className="bg-background/50 text-xs sm:text-sm"
                />
              </div>

              {/* Mistakes & Execution Improvement */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Mistakes + How Execution Could Improve</Label>
                <AutoTextarea
                  value={journalForm.mistakes}
                  onChange={(e) => setJournalForm((f) => ({ ...f, mistakes: e.target.value }))}
                  placeholder="What would you do differently next time? (e.g. waited for candle close, held to full target)..."
                  className="bg-background/50 text-xs sm:text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Gemini AI Coach Review */}
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Gemini AI Trade Review
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyGeminiPrompt}
                  className="h-7 text-xs gap-1.5 font-mono text-muted-foreground"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrompt ? "Copied" : "Copy Data for Gemini"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Objective review comparing your planned risk &amp; target against actual execution, premature exits, and rule discipline.
              </p>

              <Button
                onClick={handleRunAiAnalysis}
                disabled={analyzingAi}
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs font-semibold border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-2"
              >
                {analyzingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {analyzingAi ? "Analyzing Trade with Gemini..." : "Run AI Trade Review"}
              </Button>

              {aiReviewOutput && (
                <div className="mt-3 p-4 rounded-xl border border-cyan-500/30 bg-muted/30 shadow-inner max-h-[520px] overflow-y-auto">
                  <AiReviewFormatted text={aiReviewOutput} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lightbox Modal for Screenshots — Full Screen & High-Res Zoom */}
      <ImageLightbox
        open={!!expandedImage}
        src={expandedImage}
        alt={`${trade.instrument} Chart Screenshot`}
        onClose={() => setExpandedImage(null)}
      />

      {/* Delete Screenshot Confirmation */}
      <AlertDialog
        open={!!deleteScreenshotId}
        onOpenChange={(open) => !open && setDeleteScreenshotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this screenshot from this trade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async () => {
                if (deleteScreenshotId && trade) {
                  await deleteScreenshot(trade.id, deleteScreenshotId)
                  setDeleteScreenshotId(null)
                  toast.success("Screenshot deleted")
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Trade Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {trade.instrument} trade? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDeleteTrade}
            >
              Delete Trade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
