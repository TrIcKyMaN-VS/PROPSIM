"use client"

import { usePropStore } from "@/lib/store"
import { formatDisplayDateTime, formatDisplayTime } from "@/lib/format"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Upload, Clipboard, Trash2, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── helpers ───────────────────────────────────────────────────────────────

function formatHoldDuration(ms: number): string {
  if (!ms || ms < 0) return "—"
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const GRADES = ["A+", "A", "B", "C", "D", "F"] as const

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-success text-success-foreground border-success",
  "A":  "bg-success/70 text-success-foreground border-success/70",
  "B":  "bg-primary/70 text-primary-foreground border-primary/70",
  "C":  "bg-warning/70 text-warning-foreground border-warning/70",
  "D":  "bg-destructive/60 text-destructive-foreground border-destructive/60",
  "F":  "bg-destructive text-destructive-foreground border-destructive",
}

// Conviction score → label
function convictionLabel(score: number) {
  if (score <= 3) return "Low"
  if (score <= 6) return "Medium"
  return "High"
}

// ─── component ─────────────────────────────────────────────────────────────

export default function TradeDetailsPage() {
  const { tradeId } = useParams()
  const router = useRouter()

  const trades           = usePropStore(s => s.trades)
  const tradePsychology  = usePropStore(s => s.tradePsychology)
  const displayTimeMode  = usePropStore(s => s.displayTimeMode)
  const playbooks        = usePropStore(s => s.playbooks)
  const accounts         = usePropStore(s => s.accounts)
  const activeAccountId  = usePropStore(s => s.activeAccountId)
  const updateTrade      = usePropStore(s => s.updateTrade)
  const addScreenshot    = usePropStore(s => s.addScreenshot)
  const deleteScreenshot = usePropStore(s => s.deleteScreenshot)
  const saveTradePsychology = usePropStore(s => s.saveTradePsychology)

  const trade   = trades.find(t => t.id === tradeId)
  const psyc    = tradePsychology.find(p => p.tradeId === tradeId) || {} as any
  const account = accounts.find(a => a.id === activeAccountId)
  const accountBalance = account?.rules?.startingBalance ?? 100000
  const playbook = trade?.playbookId ? playbooks.find(p => p.id === trade.playbookId) : null

  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  // ── form state ────────────────────────────────────────────────────────────

  const [execForm, setExecForm] = useState({ entry: "", exit: "", contracts: "", pnl: "" })
  const [riskForm, setRiskForm] = useState({ stopLoss: "", takeProfit: "", riskAmount: "" })
  const [stratForm, setStratForm] = useState({
    marketBias: "Neutral", tradeIdea: "", reasonForEntry: "",
    expectedRR: "", executionGrade: "", preNotes: "",
  })
  const [psychForm, setPsychForm] = useState({
    preFeeling: "", convictionScore: 5,
    hesitated: false, movedStop: false, movedTarget: false,
    addedSize: false, brokeRules: false,
    exitReason: "", decisionScore: 50, preNotes: "", psychologyGrade: "",
  })
  const [journalForm, setJournalForm] = useState({
    outcome: "", mistakes: "", lessonsLearned: "", psychologyNotes: "", notes: "",
  })

  // ── init from store ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!trade) return
    setExecForm({
      entry:     trade.entry?.toString()     ?? "",
      exit:      trade.exit?.toString()      ?? "",
      contracts: trade.contracts?.toString() ?? "1",
      pnl:       trade.pnl?.toString()       ?? "",
    })
    setRiskForm({
      stopLoss:   trade.stopLoss?.toString()   ?? "",
      takeProfit: trade.takeProfit?.toString() ?? "",
      riskAmount: trade.riskAmount?.toString() ?? "",
    })
    setStratForm({
      marketBias:     trade.marketBias      ?? "Neutral",
      tradeIdea:      trade.tradeIdea       ?? "",
      reasonForEntry: trade.reasonForEntry  ?? "",
      expectedRR:     trade.expectedRR      ?? "",
      executionGrade: psyc.executionGrade   ?? "",
      preNotes:       (trade as any).preNotes ?? "",
    })
    setPsychForm({
      preFeeling:      psyc.preFeeling      ?? "",
      convictionScore: psyc.convictionScore ?? 5,
      hesitated:       psyc.hesitated       ?? false,
      movedStop:       psyc.movedStop       ?? false,
      movedTarget:     psyc.movedTarget     ?? false,
      addedSize:       psyc.addedSize       ?? false,
      brokeRules:      psyc.brokeRules      ?? false,
      exitReason:      psyc.exitReason      ?? "",
      decisionScore:   psyc.decisionScore   ?? 50,
      preNotes:        psyc.preNotes        ?? "",
      psychologyGrade: psyc.psychologyGrade ?? "",
    })
    setJournalForm({
      outcome:         trade.outcome          ?? "",
      mistakes:        trade.mistakes         ?? "",
      lessonsLearned:  trade.lessonsLearned   ?? "",
      psychologyNotes: trade.psychologyNotes  ?? "",
      notes:           trade.notes            ?? "",
    })
    setCheckedItems(trade.playbookChecklist ?? {})
  }, [trade?.id]) // eslint-disable-line

  // ── clipboard paste ───────────────────────────────────────────────────────

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!trade) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onloadend = async () => {
            await addScreenshot(trade.id, "gallery", reader.result as string)
            toast.success("Screenshot pasted!")
          }
          reader.readAsDataURL(file)
          e.preventDefault()
          break
        }
      }
    }
    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [trade?.id, addScreenshot])

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !trade) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      await addScreenshot(trade.id, "gallery", reader.result as string)
      toast.success("Screenshot uploaded!")
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleDeleteScreenshot = async (id: string) => {
    if (!trade) return
    await deleteScreenshot(trade.id, id)
    toast.success("Screenshot deleted")
  }

  const handleSave = async () => {
    if (!trade) return
    await saveTradePsychology({
      tradeId: trade.id,
      ...psychForm,
      executionGrade: stratForm.executionGrade,
    })
    await updateTrade(trade.id, {
      entry:          parseFloat(execForm.entry)     || trade.entry,
      exit:           parseFloat(execForm.exit)      || trade.exit,
      contracts:      parseFloat(execForm.contracts) || trade.contracts,
      pnl:            parseFloat(execForm.pnl)       || trade.pnl,
      stopLoss:       parseFloat(riskForm.stopLoss)  || undefined,
      takeProfit:     parseFloat(riskForm.takeProfit)|| undefined,
      riskAmount:     parseFloat(riskForm.riskAmount)|| undefined,
      marketBias:     stratForm.marketBias,
      tradeIdea:      stratForm.tradeIdea,
      reasonForEntry: stratForm.reasonForEntry,
      expectedRR:     stratForm.expectedRR,
      outcome:        journalForm.outcome,
      mistakes:       journalForm.mistakes,
      lessonsLearned: journalForm.lessonsLearned,
      psychologyNotes:journalForm.psychologyNotes,
      notes:          journalForm.notes,
      playbookChecklist: checkedItems,
    } as any)
    toast.success("Trade saved!")
  }

  // ── early return ──────────────────────────────────────────────────────────

  if (!trade) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Trade not found
    </div>
  )

  // ── computed ──────────────────────────────────────────────────────────────

  const pnlVal    = parseFloat(execForm.pnl) || trade.pnl
  const riskAmt   = parseFloat(riskForm.riskAmount) || 0
  const rMultiple = riskAmt > 0 ? (pnlVal / riskAmt) : null
  const riskPct   = riskAmt > 0 ? ((riskAmt / accountBalance) * 100) : null
  const holdMs    = trade.timestamp && trade.exitTime
    ? Number(trade.exitTime) - Number(trade.timestamp) : 0
  const holdDuration = formatHoldDuration(holdMs)

  let parsedTags: string[] = []
  if (trade.tags) {
    if (Array.isArray(trade.tags)) parsedTags = trade.tags
    else {
      try { const p = JSON.parse(trade.tags as any); parsedTags = Array.isArray(p) ? p : [trade.tags as any] }
      catch { parsedTags = [trade.tags as any] }
    }
  }

  const screenshots = (trade.screenshots || []) as any[]

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto pb-24">

      {/* ─────────────────────────────────────────────────────────────────────
          ① STICKY HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border py-3 mb-8 -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-6xl mx-auto">
          {/* Left: back + chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold tracking-tight">{trade.instrument}</span>
            <Badge
              variant={trade.direction === "long" ? "default" : "destructive"}
              className="text-xs font-bold px-2.5"
            >
              {trade.direction.toUpperCase()}
            </Badge>
            {trade.session && (
              <span className="text-xs bg-muted/50 border border-border px-2.5 py-0.5 rounded-full text-muted-foreground font-medium">
                {trade.session}
              </span>
            )}
            {trade.playbookName && (
              <span className="text-xs bg-primary/10 border border-primary/25 text-primary px-2.5 py-0.5 rounded-full font-medium">
                {trade.playbookName}
              </span>
            )}
            {parsedTags.map(tag => (
              <span key={tag} className="text-xs bg-muted/40 border border-border px-2.5 py-0.5 rounded-full text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
          {/* Right: timestamp + save */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs text-muted-foreground hidden md:block">
              {formatDisplayDateTime(trade.timestamp, displayTimeMode)}
              {trade.exitTime && ` → ${formatDisplayTime(trade.exitTime, displayTimeMode)}`}
              {holdDuration !== "—" && <span className="ml-1.5 text-muted-foreground/60">· {holdDuration}</span>}
            </div>
            <Button onClick={handleSave} size="sm">Save</Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* ─────────────────────────────────────────────────────────────────────
            ② HERO P&L
        ───────────────────────────────────────────────────────────────────── */}
        <div className="relative flex flex-col items-center justify-center py-10 rounded-2xl overflow-hidden border border-border bg-card">
          {/* Soft radial glow */}
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            pnlVal >= 0
              ? "bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,hsl(var(--success)/0.15),transparent)]"
              : "bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,hsl(var(--destructive)/0.15),transparent)]"
          )} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 relative">
            {pnlVal >= 0 ? "Profit" : "Loss"}
          </p>
          <p className={cn(
            "text-6xl md:text-7xl font-black tracking-tight leading-none relative",
            pnlVal >= 0 ? "text-success" : "text-destructive"
          )}>
            {pnlVal >= 0 ? "+" : ""}${Math.abs(pnlVal).toFixed(2)}
          </p>
          {rMultiple !== null && (
            <p className={cn(
              "text-xl font-bold mt-3 relative",
              rMultiple >= 0 ? "text-success/80" : "text-destructive/80"
            )}>
              {rMultiple >= 0 ? "+" : ""}{rMultiple.toFixed(2)}R
            </p>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            ③ TRADE DETAILS | EXECUTION | RISK MANAGEMENT  (3-col)
        ───────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Trade Details (display-only) ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Trade Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {[
                { label: "ENTRY PRICE",   value: `$${trade.entry?.toLocaleString()}` },
                { label: "EXIT PRICE",    value: trade.exit ? `$${trade.exit?.toLocaleString()}` : "—" },
                { label: "ENTRY DATE",    value: formatDisplayDateTime(trade.timestamp, displayTimeMode) },
                { label: "EXIT DATE",     value: trade.exitTime ? formatDisplayDateTime(trade.exitTime, displayTimeMode) : "—" },
                { label: "POSITION SIZE", value: `${trade.contracts} contract${trade.contracts !== 1 ? "s" : ""}` },
                { label: "HOLD DURATION", value: holdDuration },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Execution (editable) ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              {([
                { label: "ENTRY PRICE",  key: "entry" },
                { label: "EXIT PRICE",   key: "exit" },
                { label: "CONTRACTS",    key: "contracts" },
                { label: "NET P&L ($)",  key: "pnl" },
              ] as const).map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={execForm[key]}
                    onChange={e => setExecForm(f => ({ ...f, [key]: e.target.value }))}
                    className="h-8 mt-1 text-sm font-semibold"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Risk Management (editable + auto-calc) ───────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Risk Management
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">STOP LOSS</Label>
                <Input type="number" step="any" value={riskForm.stopLoss}
                  onChange={e => setRiskForm(f => ({ ...f, stopLoss: e.target.value }))}
                  className="h-8 mt-1 text-sm" placeholder="Price level" />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TAKE PROFIT</Label>
                <Input type="number" step="any" value={riskForm.takeProfit}
                  onChange={e => setRiskForm(f => ({ ...f, takeProfit: e.target.value }))}
                  className="h-8 mt-1 text-sm" placeholder="Price level" />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">RISK AMOUNT ($)</Label>
                <Input type="number" step="any" value={riskForm.riskAmount}
                  onChange={e => setRiskForm(f => ({ ...f, riskAmount: e.target.value }))}
                  className="h-8 mt-1 text-sm" placeholder="Dollar risk" />
              </div>
              {/* Auto-calculated */}
              <div className="pt-3 mt-1 border-t border-border/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">RISK %</p>
                  <p className="text-sm font-bold mt-0.5 text-foreground">
                    {riskPct != null ? `${riskPct.toFixed(2)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">R-MULTIPLE</p>
                  <p className={cn("text-sm font-bold mt-0.5",
                    rMultiple == null ? "text-muted-foreground" :
                    rMultiple >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {rMultiple != null ? `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            ④ STRATEGY | PSYCHOLOGY  (2-col)
        ───────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Strategy ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Strategy</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Market Bias */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">MARKET BIAS</Label>
                <select
                  className="flex h-8 mt-1 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={stratForm.marketBias}
                  onChange={e => setStratForm(f => ({ ...f, marketBias: e.target.value }))}
                >
                  {["Bullish", "Bearish", "Neutral"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              {/* Trade Idea */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TRADE IDEA</Label>
                <Textarea value={stratForm.tradeIdea}
                  onChange={e => setStratForm(f => ({ ...f, tradeIdea: e.target.value }))}
                  placeholder="Describe setup, key levels, structure..." className="mt-1 min-h-[80px] text-sm" />
              </div>
              {/* Reason for Entry */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">REASON FOR ENTRY</Label>
                <Textarea value={stratForm.reasonForEntry}
                  onChange={e => setStratForm(f => ({ ...f, reasonForEntry: e.target.value }))}
                  placeholder="What triggered you to enter?" className="mt-1 min-h-[80px] text-sm" />
              </div>
              {/* Expected RR */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">EXPECTED RR</Label>
                <Input value={stratForm.expectedRR}
                  onChange={e => setStratForm(f => ({ ...f, expectedRR: e.target.value }))}
                  placeholder="e.g. 2.5 or 1:3" className="h-8 mt-1 text-sm" />
              </div>
              {/* Execution Grade */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">EXECUTION GRADE</Label>
                <div className="flex gap-1.5">
                  {GRADES.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setStratForm(f => ({ ...f, executionGrade: f.executionGrade === g ? "" : g }))}
                      className={cn(
                        "h-8 w-10 rounded-md text-xs font-bold border transition-all",
                        stratForm.executionGrade === g
                          ? GRADE_COLORS[g]
                          : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >{g}</button>
                  ))}
                </div>
              </div>
              {/* Pre-Trade Notes */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PRE-TRADE NOTES</Label>
                <Textarea value={stratForm.preNotes}
                  onChange={e => setStratForm(f => ({ ...f, preNotes: e.target.value }))}
                  placeholder="What were you thinking before entering?" className="mt-1 min-h-[80px] text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* ── Psychology ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Psychology</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Pre-Feeling */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PRE-FEELING</Label>
                <select
                  className="flex h-8 mt-1 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={psychForm.preFeeling}
                  onChange={e => setPsychForm(f => ({ ...f, preFeeling: e.target.value }))}
                >
                  <option value="">Select Emotion</option>
                  {["Calm", "Confident", "Focused", "Neutral", "Anxious", "Fearful", "Frustrated", "Greedy"].map(e => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
              {/* Conviction */}
              <div>
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CONVICTION</Label>
                  <span className="text-xs font-bold text-foreground">
                    {convictionLabel(psychForm.convictionScore)} · {psychForm.convictionScore}/10
                  </span>
                </div>
                <input
                  type="range" min="1" max="10"
                  value={psychForm.convictionScore}
                  onChange={e => setPsychForm(f => ({ ...f, convictionScore: parseInt(e.target.value) }))}
                  className="w-full mt-2 accent-primary"
                />
              </div>
              {/* Execution Flags */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">EXECUTION FLAGS</Label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: "hesitated",   label: "Hesitated" },
                    { key: "movedStop",   label: "Moved Stop" },
                    { key: "movedTarget", label: "Moved Target" },
                    { key: "addedSize",   label: "Added to Loser" },
                    { key: "brokeRules",  label: "Broke Rules" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPsychForm(f => ({ ...f, [key]: !f[key] }))}
                      className={cn(
                        "text-xs px-3 py-1 rounded-full border font-medium transition-all",
                        psychForm[key]
                          ? "bg-destructive/20 border-destructive/50 text-destructive"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"
                      )}
                    >{label}</button>
                  ))}
                </div>
              </div>
              {/* Exit Reason */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">EXIT REASON</Label>
                <select
                  className="flex h-8 mt-1 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={psychForm.exitReason}
                  onChange={e => setPsychForm(f => ({ ...f, exitReason: e.target.value }))}
                >
                  <option value="">Select Reason</option>
                  {["Target Hit", "Stop Hit", "Manual Exit", "Fear Exit (Early)", "Greed Exit (Late)", "Rule Violation"].map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {/* Decision Score */}
              <div>
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DECISION SCORE</Label>
                  <span className="text-xs font-bold text-foreground">{psychForm.decisionScore}/100</span>
                </div>
                <input
                  type="range" min="0" max="100"
                  value={psychForm.decisionScore}
                  onChange={e => setPsychForm(f => ({ ...f, decisionScore: parseInt(e.target.value) }))}
                  className="w-full mt-2 accent-primary"
                />
              </div>
              {/* Psychology Grade */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">PSYCHOLOGY GRADE</Label>
                <div className="flex gap-1.5">
                  {GRADES.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPsychForm(f => ({ ...f, psychologyGrade: f.psychologyGrade === g ? "" : g }))}
                      className={cn(
                        "h-8 w-10 rounded-md text-xs font-bold border transition-all",
                        psychForm.psychologyGrade === g
                          ? GRADE_COLORS[g]
                          : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >{g}</button>
                  ))}
                </div>
              </div>
              {/* Pre-trade Thoughts */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PRE-TRADE THOUGHTS</Label>
                <Textarea value={psychForm.preNotes}
                  onChange={e => setPsychForm(f => ({ ...f, preNotes: e.target.value }))}
                  placeholder="What were you feeling entering this trade?" className="mt-1 min-h-[80px] text-sm" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            ⑤ PLAYBOOK CHECKLIST (conditional)
        ───────────────────────────────────────────────────────────────────── */}
        {playbook && playbook.checklist && playbook.checklist.length > 0 && (
          <Card className="border-primary/25">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Playbook — {playbook.name}
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {Math.round(
                    (Object.values(checkedItems).filter(Boolean).length / playbook.checklist.length) * 100
                  )}% Compliance
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {playbook.checklist.map((item: any, idx: number) => {
                  const text = typeof item === "string" ? item : item.text
                  const id   = item.id || idx.toString()
                  return (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary rounded shrink-0"
                        checked={!!checkedItems[id]}
                        onChange={e => setCheckedItems(prev => ({ ...prev, [id]: e.target.checked }))}
                      />
                      <span className={cn("text-sm leading-tight",
                        checkedItems[id] ? "line-through text-muted-foreground" : "font-medium"
                      )}>{text}</span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            ⑥ JOURNAL
        ───────────────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Journal</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { label: "OUTCOME",           key: "outcome",         placeholder: "How did the trade play out?" },
                { label: "MISTAKES MADE",      key: "mistakes",        placeholder: "What did you do wrong?" },
                { label: "LESSONS LEARNED",    key: "lessonsLearned",  placeholder: "What will you do differently next time?" },
                { label: "PSYCHOLOGY NOTES",   key: "psychologyNotes", placeholder: "Cognitive biases or emotional responses?" },
              ] as const).map(({ label, key, placeholder }) => (
                <div key={key}>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
                  <Textarea
                    value={journalForm[key]}
                    onChange={e => setJournalForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 min-h-[110px] text-sm"
                  />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GENERAL NOTES</Label>
              <Textarea
                value={journalForm.notes}
                onChange={e => setJournalForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anything else you want to remember about this trade..."
                className="mt-1 min-h-[150px] text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─────────────────────────────────────────────────────────────────────
            ⑦ SCREENSHOTS
        ───────────────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Screenshots
                </CardTitle>
                {screenshots.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-bold tabular-nums">
                    {screenshots.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/60 px-2.5 py-1 rounded-md">
                  <Clipboard className="w-3 h-3" />
                  <span>Ctrl+V to paste</span>
                </div>
                <label htmlFor="sc-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</span>
                  </Button>
                </label>
                <input id="sc-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {screenshots.length === 0 ? (
              /* Empty state */
              <div
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-14 text-center cursor-pointer hover:bg-muted/20 transition-colors group"
                onClick={() => document.getElementById("sc-upload")?.click()}
              >
                <div className="w-14 h-14 rounded-full bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">No screenshots yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+V</kbd>
                    {" "}to paste, or click to upload
                  </p>
                </div>
              </div>
            ) : (
              /* Gallery grid */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {screenshots.map((sc: any) => (
                  <div
                    key={sc.id}
                    className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedImage(sc.url)}
                  >
                    <img
                      src={sc.url}
                      alt="Trade screenshot"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                    {/* Bottom gradient + timestamp */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 py-2">
                      <p className="text-[10px] text-white/65 font-medium leading-none">
                        {sc.addedAt
                          ? new Date(sc.addedAt).toLocaleString("en-US", {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive/80 z-10"
                      onClick={e => { e.stopPropagation(); handleDeleteScreenshot(sc.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
                {/* Add more tile */}
                <label
                  htmlFor="sc-upload-more"
                  className="aspect-video rounded-lg border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all group"
                >
                  <Upload className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                  <span className="text-[10px] text-muted-foreground/50 font-medium group-hover:text-muted-foreground transition-colors">Add more</span>
                  <input id="sc-upload-more" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </CardContent>
        </Card>

      </div>{/* end space-y-6 */}

      {/* ─────────────────────────────────────────────────────────────────────
          LIGHTBOX
      ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95 border-border flex flex-col">
          <DialogHeader className="px-2 pt-1 pb-0">
            <DialogTitle className="text-xs font-semibold text-white/60 uppercase tracking-wider">Screenshot</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Trade screenshot expanded"
                className="max-w-full max-h-[82vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
