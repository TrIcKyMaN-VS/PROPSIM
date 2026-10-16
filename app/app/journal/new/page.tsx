"use client"

import { uploadImageFormData } from "@/app/actions/journal-actions"
import { useState, useEffect, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, Sparkles, Image as ImageIcon, Trash2, Upload, Target, Layers, Scale } from "lucide-react"
import { SetupCombobox } from "@/components/app/setup-combobox"
import { toast } from "sonner"
import { EXIT_TYPES, type TradeDirection } from "@/lib/types"
import { calculateTradeCommission } from "@/lib/trade-commission"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <DebouncedTextarea
      {...props}
      onInput={(e) => {
        e.currentTarget.style.height = "auto"
        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"
        if (props.onInput) props.onInput(e)
      }}
      className={props.className}
      style={{ overflow: "hidden", minHeight: "60px", ...props.style }}
    />
  )
}

function DebouncedTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || "")
  useEffect(() => {
    setVal(props.value || "")
  }, [props.value])
  return (
    <Textarea
      {...props}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={(e) => {
        if (props.onChange) props.onChange(e as any)
        if (props.onBlur) props.onBlur(e)
      }}
    />
  )
}

export default function NewManualTradePage() {
  const router = useRouter()
  const activeAccountId = usePropStore((s) => s.activeAccountId)
  const addTrade = usePropStore((s) => s.addTrade)
  const saveTradePsychology = usePropStore((s) => s.saveTradePsychology)
  const addScreenshot = usePropStore((s) => s.addScreenshot)
  const addCustomSetup = usePropStore((s) => s.addCustomSetup)
  const playbooks = (usePropStore((s) => s.playbooks) || []).filter((p) => !p.deletedAt)
  const defaultPlannedRisk = usePropStore((s) => s.defaultPlannedRisk) || 100

  const [loading, setLoading] = useState(false)
  const [playbookId, setPlaybookId] = useState("")
  const [deleteScreenshotIdx, setDeleteScreenshotIdx] = useState<number | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [screenshots, setScreenshots] = useState<string[]>([])

  const [form, setForm] = useState({
    instrument: "MNQ",
    direction: "long" as TradeDirection,
    date: new Date().toISOString().split("T")[0],
    time: "09:30",
    session: "New York AM",
    contracts: "1",
    entry: "",
    exit: "",
    grossPnl: "",
    commission: "1.00",
    pnl: "",
    netR: "",
    exitType: "",
    setupName: "",
    // Pre-trade plan
    plannedStopLoss: "",
    plannedTarget: "",
    plannedRisk: defaultPlannedRisk.toString(),
    plannedRR: "",
    plannedExitRules: "",
    // Notes
    reasoning: "",
    resultVsExpectation: "",
    mistakes: "",
    processGrade: "",
  })

  // Auto-calculate commission and net PnL when instrument, contracts, or gross PnL change
  const handleRecalculatePnl = (
    newInstrument?: string,
    newContracts?: string,
    newGross?: string,
    newRisk?: string
  ) => {
    const inst = newInstrument ?? form.instrument
    const contractsNum = parseFloat(newContracts ?? form.contracts) || 1
    const grossNum = parseFloat(newGross ?? form.grossPnl) || 0
    const riskNum = parseFloat(newRisk ?? form.plannedRisk) || defaultPlannedRisk

    const autoComm = calculateTradeCommission(inst, contractsNum)
    const netPnl = Number((grossNum - autoComm).toFixed(2))
    const calcR = riskNum > 0 ? (netPnl / riskNum).toFixed(2) : ""

    setForm((f) => ({
      ...f,
      commission: autoComm.toFixed(2),
      pnl: grossNum !== 0 ? netPnl.toString() : f.pnl,
      netR: grossNum !== 0 ? calcR : f.netR,
    }))
  }

  // Live calculation of Points Risk, Points Reward, and Planned R:R
  const livePlanMetrics = useMemo(() => {
    const entry = parseFloat(form.entry)
    const sl = parseFloat(form.plannedStopLoss)
    const tp = parseFloat(form.plannedTarget)
    const riskUsd = parseFloat(form.plannedRisk) || defaultPlannedRisk

    if (isNaN(entry) || isNaN(sl) || isNaN(tp) || entry <= 0 || sl <= 0 || tp <= 0) {
      return {
        hasCalculation: false,
        riskPts: null,
        rewardPts: null,
        rrRatio: parseFloat(form.plannedRR) || null,
        projectedRewardUsd: null,
      }
    }

    const riskPts = Math.abs(entry - sl)
    const rewardPts = Math.abs(tp - entry)
    if (riskPts <= 0) {
      return {
        hasCalculation: false,
        riskPts: null,
        rewardPts: null,
        rrRatio: parseFloat(form.plannedRR) || null,
        projectedRewardUsd: null,
      }
    }

    const rrRatio = Number((rewardPts / riskPts).toFixed(2))
    const projectedRewardUsd = riskUsd > 0 ? Number((riskUsd * rrRatio).toFixed(2)) : null

    return {
      hasCalculation: true,
      riskPts: Number(riskPts.toFixed(2)),
      rewardPts: Number(rewardPts.toFixed(2)),
      rrRatio,
      projectedRewardUsd,
    }
  }, [form.entry, form.plannedStopLoss, form.plannedTarget, form.plannedRisk, form.plannedRR, defaultPlannedRisk])

  useEffect(() => {
    if (livePlanMetrics.hasCalculation && livePlanMetrics.rrRatio != null) {
      const newRRStr = livePlanMetrics.rrRatio.toString()
      if (form.plannedRR !== newRRStr) {
        setForm((prev) => ({ ...prev, plannedRR: newRRStr }))
      }
    }
  }, [livePlanMetrics.hasCalculation, livePlanMetrics.rrRatio]) // eslint-disable-line

  // Handle Ctrl+V paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
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
            formData.append("prefix", "new_trade_paste")
            const url = await uploadImageFormData(formData)
            setScreenshots((s) => [...s, url])
            toast.success("Screenshot pasted!")
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
  }, [])

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "new_trade_upload")
        const url = await uploadImageFormData(formData)
        setScreenshots((s) => [...s, url])
      }
      toast.success("Screenshots uploaded!")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }

  const handleSave = async () => {
    if (!activeAccountId) return toast.error("No active account selected")
    if (!form.instrument || !form.date || !form.time || !form.entry) {
      return toast.error("Please fill the required execution details (Instrument, Date, Time, Entry)")
    }

    setLoading(true)
    try {
      const [year, month, day] = form.date.split("-").map(Number)
      const [hour, minute] = form.time.split(":").map(Number)
      const timestamp = new Date(year, month - 1, day, hour, minute).getTime()

      const contractsNum = parseFloat(form.contracts) || 1
      const commNum = parseFloat(form.commission) ?? calculateTradeCommission(form.instrument, contractsNum)
      const grossNum = form.grossPnl ? parseFloat(form.grossPnl) : parseFloat(form.pnl) + commNum
      const netPnlNum = form.pnl ? parseFloat(form.pnl) : Number((grossNum - commNum).toFixed(2))
      const riskNum = parseFloat(form.plannedRisk) || defaultPlannedRisk
      const netRNum = riskNum > 0 ? Number((netPnlNum / riskNum).toFixed(2)) : null

      const trimmedSetup = form.setupName.trim()
      if (trimmedSetup) {
        addCustomSetup(trimmedSetup)
      }
      const matchingPb = playbooks.find((p: any) => p.name?.toLowerCase() === trimmedSetup.toLowerCase())

      const createdTrade = await addTrade({
        accountId: activeAccountId,
        playbookId: matchingPb?.id || playbookId || undefined,
        playbookName: trimmedSetup || undefined,
        instrument: form.instrument,
        direction: form.direction,
        entry: parseFloat(form.entry) || 0,
        exit: parseFloat(form.exit) || 0,
        contracts: contractsNum,
        grossPnl: grossNum,
        commission: commNum,
        pnl: netPnlNum,
        netR: netRNum,
        plannedRisk: riskNum,
        plannedStopLoss: parseFloat(form.plannedStopLoss) || null,
        plannedTarget: parseFloat(form.plannedTarget) || null,
        plannedRR: livePlanMetrics.rrRatio ?? (parseFloat(form.plannedRR) || null),
        plannedExitRules: form.plannedExitRules || null,
        exitType: form.exitType || null,
        session: form.session as any,
        day: 1,
        timestamp,
        reasonForEntry: form.reasoning,
        resultVsExpectation: form.resultVsExpectation,
        mistakes: form.mistakes,
      })

      if (form.processGrade) {
        await saveTradePsychology({
          tradeId: createdTrade.id,
          executionGrade: form.processGrade,
        })
      }

      if (screenshots.length > 0) {
        for (let i = 0; i < screenshots.length; i++) {
          await addScreenshot(createdTrade.id, "entry_" + i, screenshots[i])
        }
      }

      toast.success("Trade recorded manually with plan parameters!")
      router.push(`/app/journal/${createdTrade.id}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to log trade")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/app/journal")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Manual Trade Entry</h1>
            <p className="text-xs text-muted-foreground">
              Record predefined plan parameters and compare them with actual execution.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="font-bold">
          {loading ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Trade Breakdown
        </Button>
      </div>

      {/* 1. Pre-Trade Plan Card */}
      <Card className="border-border/50 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              1. Pre-Trade Plan
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">Plan Ahead</Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Parameters decided BEFORE clicking execute.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Predefined Stop Loss</Label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 19550.00"
                value={form.plannedStopLoss}
                onChange={(e) => setForm({ ...form, plannedStopLoss: e.target.value })}
                className="bg-background/50 font-mono text-rose-400 font-semibold h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Planned Target</Label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 19650.00"
                value={form.plannedTarget}
                onChange={(e) => setForm({ ...form, plannedTarget: e.target.value })}
                className="bg-background/50 font-mono text-emerald-400 font-semibold h-9"
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
                Risk: <span className="text-rose-400 font-semibold">{livePlanMetrics.riskPts} pts</span> · Target: <span className="text-emerald-400 font-semibold">{livePlanMetrics.rewardPts} pts</span>
                {livePlanMetrics.projectedRewardUsd && (
                  <span className="text-foreground"> · Proj. Reward: <span className="text-emerald-400 font-bold">+${livePlanMetrics.projectedRewardUsd}</span></span>
                )}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/70">
                Enter entry, stop-loss and target to see exact points risk &amp; reward.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Initial Risk ($ USD)</Label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 100"
                value={form.plannedRisk}
                onChange={(e) => {
                  setForm({ ...form, plannedRisk: e.target.value })
                  handleRecalculatePnl(undefined, undefined, undefined, e.target.value)
                }}
                className="bg-background/50 font-mono h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Planned R:R (Override)</Label>
              <Input
                type="text"
                placeholder="e.g. 2.5"
                value={form.plannedRR}
                onChange={(e) => setForm({ ...form, plannedRR: e.target.value })}
                className="bg-background/50 font-mono text-cyan-400 font-bold h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Trade Invalidation &amp; Management Rules
            </Label>
            <AutoTextarea
              className="bg-background/50 text-xs sm:text-sm"
              placeholder="e.g. Move SL to BE at +1R. Close position before economic news release at 10:00 AM..."
              value={form.plannedExitRules}
              onChange={(e) => setForm({ ...form, plannedExitRules: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Execution Details Card */}
      <Card className="border-border/80">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              2. Execution Details
            </CardTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">Actuals</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />
            </div>
            <div className="space-y-2">
              <Label>Time *</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Instrument * (e.g. MNQ, NQ, ES)</Label>
              <Input
                value={form.instrument}
                onChange={(e) => {
                  const inst = e.target.value
                  setForm({ ...form, instrument: inst })
                  handleRecalculatePnl(inst)
                }}
                className="bg-muted/20 font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background"
                value={form.session}
                onChange={(e) => setForm({ ...form, session: e.target.value })}
              >
                <option>New York AM</option>
                <option>New York PM</option>
                <option>London</option>
                <option>Asia</option>
                <option>Overnight</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background"
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value as TradeDirection })}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Contracts / Lots</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.contracts}
                onChange={(e) => {
                  const contracts = e.target.value
                  setForm({ ...form, contracts })
                  handleRecalculatePnl(undefined, contracts)
                }}
                className="bg-muted/20 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Entry Price *</Label>
              <Input
                type="number"
                step="any"
                value={form.entry}
                onChange={(e) => setForm({ ...form, entry: e.target.value })}
                className="bg-muted/20 font-mono font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label>Exit Price</Label>
              <Input
                type="number"
                step="any"
                value={form.exit}
                onChange={(e) => setForm({ ...form, exit: e.target.value })}
                className="bg-muted/20 font-mono font-semibold"
              />
            </div>

            {/* Financial breakdown: Gross P&L, Commission, Net P&L */}
            <div className="space-y-2">
              <Label>Gross P&L ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 150.00"
                value={form.grossPnl}
                onChange={(e) => {
                  const gross = e.target.value
                  setForm({ ...form, grossPnl: gross })
                  handleRecalculatePnl(undefined, undefined, gross)
                }}
                className="bg-muted/20 font-mono"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Commission ($)</Label>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
                  MNQ $1 &middot; NQ $4
                </Badge>
              </div>
              <Input
                type="number"
                step="0.01"
                value={form.commission}
                onChange={(e) => setForm({ ...form, commission: e.target.value })}
                className="bg-muted/20 font-mono text-rose-400 font-semibold"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Realized Net P&L ($) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.pnl}
                onChange={(e) => setForm({ ...form, pnl: e.target.value })}
                className="bg-muted/20 font-mono font-black text-base"
              />
            </div>

            {/* Exit Type Dropdown */}
            <div className="space-y-2 md:col-span-2">
              <Label>Exit Type</Label>
              <Select
                value={form.exitType}
                onValueChange={(val) => setForm({ ...form, exitType: val || "" })}
              >
                <SelectTrigger className="h-10 bg-muted/20">
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

            <div className="space-y-2 md:col-span-2">
              <Label>Setup / Model</Label>
              <SetupCombobox
                value={form.setupName}
                onChange={(setupName) => setForm({ ...form, setupName })}
                placeholder="Select or enter setup..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Strategy & Journal Notes */}
      <Card className="border-border/80">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            3. Notes &amp; Reflection
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Reasoning &amp; Logic</Label>
            <AutoTextarea
              className="bg-muted/20 text-sm border-0 focus-visible:ring-1"
              placeholder="What was the setup, and what confirmed it?"
              value={form.reasoning}
              onChange={(e) => setForm({ ...form, reasoning: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Result vs Expectation</Label>
            <AutoTextarea
              className="bg-muted/20 text-sm border-0 focus-visible:ring-1"
              placeholder="What actually happened vs what you anticipated?"
              value={form.resultVsExpectation}
              onChange={(e) => setForm({ ...form, resultVsExpectation: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Mistakes &amp; Execution Improvement</Label>
            <AutoTextarea
              className="bg-muted/20 text-sm border-0 focus-visible:ring-1"
              placeholder="Could this trade execution have been better?"
              value={form.mistakes}
              onChange={(e) => setForm({ ...form, mistakes: e.target.value })}
            />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Execution Grade</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { grade: "A", desc: "By the model, well executed." },
                { grade: "B", desc: "By the model, sloppy entry or exit." },
                { grade: "C", desc: "Marginal setup, forced." },
                { grade: "D", desc: "Outside the model entirely." },
              ].map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => setForm({ ...form, processGrade: g.grade })}
                  className={`text-left p-3 rounded-lg border text-sm transition-all flex items-start gap-3 ${
                    form.processGrade === g.grade
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-muted/10 border-border/40 text-muted-foreground hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  <span className={`font-black text-lg ${form.processGrade === g.grade ? "text-primary" : "text-muted-foreground/60"}`}>
                    {g.grade}
                  </span>
                  <span className="mt-1 leading-snug">{g.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Chart Screenshots */}
      <Card className="border-border/80">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            4. Chart Screenshots (Ctrl+V to Paste)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {screenshots.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Upload Images or Paste (Ctrl+V)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUploadScreenshot}
                disabled={uploadingImg}
              />
            </label>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {screenshots.map((sc, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border aspect-video">
                  <img src={sc} alt="Screenshot" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setDeleteScreenshotIdx(idx)
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-destructive text-white rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group aspect-video">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-medium">Add More</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUploadScreenshot}
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.push("/app/journal")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} size="lg" className="font-bold">
          {loading && <Sparkles className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" /> Save Trade Breakdown
        </Button>
      </div>

      {/* Delete Screenshot Dialog */}
      <AlertDialog open={deleteScreenshotIdx !== null} onOpenChange={(open) => !open && setDeleteScreenshotIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this screenshot?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteScreenshotIdx(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteScreenshotIdx !== null) {
                  setScreenshots((s) => s.filter((_, i) => i !== deleteScreenshotIdx))
                  setDeleteScreenshotIdx(null)
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
