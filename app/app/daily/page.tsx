"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { usePropStore } from "@/lib/store"
import { getDailyJournal, getLatestDailyJournal, saveDailyJournal, uploadImageFormData } from "@/app/actions/journal-actions"
import { getRuleBookEntries } from "@/app/actions/rulebook-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
import { Save, Loader2, ImageIcon, Upload, ChevronDown, ChevronUp, Link, Maximize2, ChevronRight, ArrowLeft, Trash2, Plus, Check, X, BookOpen, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Trade } from "@/lib/types"
import { cn } from "@/lib/utils"
import { fmtPnl } from "@/lib/format"

function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || '')
  
  useEffect(() => {
    setVal(props.value || '')
  }, [props.value])

  return (
    <Textarea 
      {...props} 
      value={val}
      onChange={(e) => {
        setVal(e.target.value)
        if (props.onChange) props.onChange(e as any)
      }}
      onBlur={(e) => {
        if (props.onBlur) props.onBlur(e)
      }}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto'
        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
        if (props.onInput) props.onInput(e)
      }}
      className={cn("resize-none overflow-hidden min-h-[40px] px-3 py-2", props.className)}
    />
  )
}

function JournalField({ title, colorClass, children, className }: { title: string, colorClass?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col", className)}>
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40 flex items-center gap-2">
        {colorClass && <span className={cn("w-2 h-2 rounded-full shrink-0", colorClass)} />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-start">
        {children}
      </div>
    </div>
  )
}

function ScreenshotGallery({ screenshots, onUpload, onDelete, onView, uploading, id = "sc" }: {
  screenshots: string[]
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete?: (idx: number) => void
  onView: (url: string) => void
  uploading?: boolean
  id?: string
}) {
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  return (
    <div className="mt-4">
      {screenshots.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-8 text-center cursor-pointer hover:bg-muted/20 transition-colors group"
          onClick={() => document.getElementById(`upload-${id}`)?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
            {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/50" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Attach Chart Screenshot</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click to upload image</p>
          </div>
          <input id={`upload-${id}`} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screenshots.map((sc, idx) => (
            <div
              key={idx}
              className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
              onClick={() => onView(sc)}
            >
              <img src={sc} alt="Screenshot" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              {onDelete && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setDeleteIdx(idx)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-destructive text-white rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <label
            htmlFor={`upload-more-${id}`}
            className="aspect-video rounded-lg border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all group"
          >
            {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />}
            <span className="text-[10px] text-muted-foreground/50 font-medium group-hover:text-muted-foreground transition-colors">Add more</span>
            <input id={`upload-more-${id}`} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          </label>
        </div>
      )}

      {/* Delete Screenshot Confirmation Dialog */}
      <AlertDialog open={deleteIdx !== null} onOpenChange={(open) => !open && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this screenshot from your daily journal?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIdx(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteIdx !== null && onDelete) {
                  onDelete(deleteIdx)
                  setDeleteIdx(null)
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">{title}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}

const today = () => new Date().toISOString().split("T")[0]

function TradeListCard({ dayTrades, date }: { dayTrades: Trade[]; date: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setOpen(s => ({ ...s, [id]: !s[id] }))

  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const accounts = usePropStore(s => s.accounts)
  const activeAcc = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const accountBalance = activeAcc?.rules?.startingBalance ?? 50000
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100

  const gradeColor = (g?: string) => {
    if (!g) return "border-border text-muted-foreground"
    if (g === "A") return "border-green-500 text-green-400 bg-green-500/10"
    if (g === "B") return "border-blue-500 text-blue-400 bg-blue-500/10"
    if (g === "C") return "border-yellow-500 text-yellow-400 bg-yellow-500/10"
    return "border-red-500 text-red-400 bg-red-500/10"
  }

  const [viewImage, setViewImage] = useState<string | null>(null)

  return (
      <>

        <SectionHeader title="Trade List" />
        <div>
          {dayTrades.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No trades logged on {date}.</p>
          ) : (
            <div className="space-y-3">
              {dayTrades.map((t, idx) => {
                const setupName = t.playbookName ?? t.instrument
                const grade = t.psychology?.executionGrade
                const isOpen = !!open[t.id]
                const calcNetR = t.netR ?? (t.pnl / defaultPlannedRisk)
                const displayR = t.expectedRR ? `${t.expectedRR}R` : (calcNetR !== 0 ? `${calcNetR > 0 ? "+" : ""}${calcNetR.toFixed(2)}R` : "-")

                const reasoning = t.reasonForEntry
                const expectation = (t as any).resultVsExpectation
                const mistakesVal = t.mistakes
                const improvementVal = (t as any).executionImprovement

                return (
                  <div key={t.id} className="border border-border/60 rounded-xl overflow-hidden bg-card/50">
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-bold tracking-wide text-foreground flex items-center gap-2">
                        <span className="text-muted-foreground/50">TRADE {idx + 1}</span> 
                        <span>{setupName?.toUpperCase()}</span>
                      </span>
                      <div className="flex items-center gap-4">
                        {grade && (
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", gradeColor(grade))}>
                            {grade} Grade
                          </span>
                        )}
                        <span className={cn("font-mono font-bold text-[15px]", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                          {fmtPnl(t.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/60 p-4 space-y-4 bg-muted/5 font-mono text-sm">
                        {t.screenshots && t.screenshots.length > 0 && (
                          <div 
                            className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                            onClick={() => setViewImage(t.screenshots![0].url)}
                          >
                            <img
                              src={t.screenshots[0].url}
                              alt="Trade screenshot"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                          </div>
                        )}

                        <div className="space-y-3 font-sans">
                          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70" /> Reasoning / logic / confirmation
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {reasoning || <span className="italic text-muted-foreground/50">No reasoning provided</span>}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400/70" /> Result vs expectation
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {expectation || <span className="italic text-muted-foreground/50">No result provided</span>}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive/70" /> Mistakes
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {mistakesVal || <span className="italic text-muted-foreground/50">No mistakes logged</span>}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-warning/70 mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning/70" /> How execution could improve
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {improvementVal || <span className="italic text-muted-foreground/50">No improvement notes logged</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/40 font-sans mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">R-Multiple:</span>
                            <span className={cn("font-bold font-mono text-sm", calcNetR >= 0 ? "text-success" : "text-destructive")}>
                              {displayR}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Process:</span>
                            <div className="flex gap-1">
                              {["A", "B", "C", "D"].map(g => (
                                <span key={g} className={cn(
                                  "w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold border",
                                  grade === g ? gradeColor(g) : "border-border/40 text-muted-foreground/30 bg-muted/10"
                                )}>{g}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </>
    )
  }



export type DailyMissedTrade = {
  id: string
  date: string
  setup: string
  direction: "long" | "short"
  outcome: "win" | "loss" | "breakeven"
  potentialR: string
  reason: string
  screenshots: string[]
}

function DailyJournalContent() {
  const searchParams = useSearchParams()
  const paramDate = searchParams?.get("date")
  const [date, setDate] = useState(() => paramDate || today())

  useEffect(() => {
    if (paramDate && paramDate !== date) {
      setDate(paramDate)
    }
  }, [paramDate])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeAccountId = usePropStore(s => s.activeAccountId)
  const allTrades = usePropStore(s => s.trades)

  // Trades for the selected date
  const dayTrades = allTrades.filter(t => {
    if (t.accountId !== activeAccountId) return false
    if (!t.timestamp) return false
    const ts = Number(t.timestamp)
    if (isNaN(ts) || ts <= 0) return false
    try {
      const d = new Date(ts).toISOString().split("T")[0]
      return d === date
    } catch {
      return false
    }
  })

  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)
  const accounts = usePropStore(s => s.accounts)
  const activeAcc = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const accountBalance = activeAcc?.rules?.startingBalance ?? 50000
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100

  const dayTotalPnl = useMemo(() => dayTrades.reduce((s, t) => s + t.pnl, 0), [dayTrades])
  const dayTotalNetR = useMemo(() => dayTrades.reduce((s, t) => s + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0), [dayTrades, defaultPlannedRisk])
  const dayWins = useMemo(() => dayTrades.filter(t => t.pnl > 0).length, [dayTrades])
  const dayLosses = useMemo(() => dayTrades.filter(t => t.pnl < 0).length, [dayTrades])
  const dayWinRate = dayTrades.length > 0 ? Math.round((dayWins / dayTrades.length) * 100) : 0

  // ---- Missed Setups / Replay state ----
  const [missedTrades, setMissedTrades] = useState<DailyMissedTrade[]>([])
  const [isAddingMissed, setIsAddingMissed] = useState(false)
  const [draftSetup, setDraftSetup] = useState("")
  const [draftDirection, setDraftDirection] = useState<"long" | "short">("long")
  const [draftOutcome, setDraftOutcome] = useState<"win" | "loss" | "breakeven">("win")
  const [draftPotentialR, setDraftPotentialR] = useState("+2R")
  const [draftReason, setDraftReason] = useState("")
  const [draftScreenshots, setDraftScreenshots] = useState<string[]>([])
  const [uploadingMissedImg, setUploadingMissedImg] = useState(false)

  const resetMissedForm = () => {
    setIsAddingMissed(false)
    setDraftSetup("")
    setDraftDirection("long")
    setDraftOutcome("win")
    setDraftPotentialR("+2R")
    setDraftReason("")
    setDraftScreenshots([])
  }

  const handleAddMissed = () => {
    if (!draftSetup.trim()) {
      toast.error("Please enter a setup name")
      return
    }
    const newMissed: DailyMissedTrade = {
      id: `daily_${date}_${Date.now()}`,
      date,
      setup: draftSetup.trim(),
      direction: draftDirection,
      outcome: draftOutcome,
      potentialR: draftPotentialR.trim() || "+1R",
      reason: draftReason.trim(),
      screenshots: draftScreenshots,
    }
    setMissedTrades(prev => [...prev, newMissed])
    resetMissedForm()
    toast.success("Missed setup added! Click Save to persist.")
  }

  const handleUploadMissedScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingMissedImg(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "daily_missed_" + date)
        const url = await uploadImageFormData(formData)
        newUrls.push(url)
      }
      setDraftScreenshots(prev => [...prev, ...newUrls])
    } catch {
      toast.error("Failed to upload screenshot")
    } finally {
      setUploadingMissedImg(false)
    }
    e.target.value = ""
  }

  // ---- form state ----
  const [session, setSession] = useState("NY")
  const [instrument, setInstrument] = useState("")
  // Pre-Market Plan
  const [preMarketScreenshots, setPreMarketScreenshots] = useState<string[]>([])
  const [postSessionScreenshots, setPostSessionScreenshots] = useState<string[]>([])
  const [htfContext, setHtfContext] = useState("")
  const [keyLevels, setKeyLevels] = useState("")
  const [scenarioAIf, setScenarioAIf] = useState("")
  const [scenarioAThen, setScenarioAThen] = useState("")
  const [scenarioBIf, setScenarioBIf] = useState("")
  const [scenarioBThen, setScenarioBThen] = useState("")
  const [newsEventRisk, setNewsEventRisk] = useState("")
  const [riskPerTrade, setRiskPerTrade] = useState("")
  const [maxTrades, setMaxTrades] = useState("")
  const [maxDailyLoss, setMaxDailyLoss] = useState("")
  const [stateCheck, setStateCheck] = useState("")
  const [stateCheckNotes, setStateCheckNotes] = useState("")
  // Red-Day Checklist
  const [isRedDay, setIsRedDay] = useState(false)
  const [redQ1, setRedQ1] = useState("")
  const [redQ2, setRedQ2] = useState("")
  const [redQ3, setRedQ3] = useState("")
  const [redQ4, setRedQ4] = useState("")
  const [redVerdict, setRedVerdict] = useState("")
  const [redCorrectiveAction, setRedCorrectiveAction] = useState("")
  // Post-Session
  const [planAccuracy, setPlanAccuracy] = useState("")
  const [planAccuracyWhy, setPlanAccuracyWhy] = useState("")
  const [planAdherence, setPlanAdherence] = useState("")
  const [planAdherenceWhy, setPlanAdherenceWhy] = useState("")
  const [overallThoughtProcess, setOverallThoughtProcess] = useState("")
  const [tomorrowAdd, setTomorrowAdd] = useState("")
  const [tomorrowRemove, setTomorrowRemove] = useState("")
  const [tomorrowConsider, setTomorrowConsider] = useState("")
  const [netR, setNetR] = useState("")
  const [rulesBrokenList, setRulesBrokenList] = useState<string[]>([])
  const [customRuleInput, setCustomRuleInput] = useState("")
  const [ruleBookRules, setRuleBookRules] = useState<{ id: string; title?: string | null; condition: string; action: string; status: string; stableIndex?: number; fromMistake?: string | null }[]>([])
  const [showRuleSelector, setShowRuleSelector] = useState(false)
  const [isAutoFilled, setIsAutoFilled] = useState(false)

  // Load Rule Book rules on mount with stable chronological order
  useEffect(() => {
    getRuleBookEntries()
      .then(rules => {
        setRuleBookRules(rules.filter(r => r.status !== "retired").map((r, i) => ({ ...r, stableIndex: i + 1 })))
      })
      .catch(() => {})
  }, [])

  function getRuleBadgeText(ruleStr: string): { title: string; fullText: string; isClean: boolean } {
    const isClean = ruleStr.toUpperCase() === "NO" || ruleStr.toLowerCase().includes("followed all")
    if (isClean) return { title: "Followed All Rules (NO)", fullText: "Followed All Rules", isClean: true }

    // Check if rule matches any rule in ruleBookRules
    const match = ruleBookRules.find(r => 
      (r.title && r.title.toLowerCase() === ruleStr.toLowerCase()) ||
      (`WHEN ${r.condition} THEN ${r.action}`.toLowerCase() === ruleStr.toLowerCase()) ||
      (r.condition.toLowerCase() === ruleStr.toLowerCase()) ||
      (ruleStr.toLowerCase().includes(r.condition.toLowerCase()))
    )

    if (match) {
      const title = match.title ? `Rule #${match.stableIndex}: ${match.title}` : `Rule #${match.stableIndex}: WHEN ${match.condition}`
      const fullText = `WHEN ${match.condition} THEN ${match.action}`
      return { title, fullText, isClean: false }
    }

    // Custom text entered by user
    const title = ruleStr.length > 45 ? ruleStr.substring(0, 42) + "..." : ruleStr
    return { title, fullText: ruleStr, isClean: false }
  }

  function parseRulesBroken(val?: string | null): string[] {
    if (!val || !val.trim()) return []
    const trimmed = val.trim()
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
      } catch {}
    }
    if (trimmed.includes(" | ")) {
      return trimmed.split(" | ").map(s => s.trim()).filter(Boolean)
    }
    return [trimmed]
  }

  // Load from DB on date change
  useEffect(() => {
    setLoading(true)
    getDailyJournal(date).then(async data => {
      if (data) {
        setIsAutoFilled(false)
        setSession(data.session ?? "NY")
        setInstrument(data.instrument ?? "")
        setHtfContext(data.htfContext ?? "")
        setKeyLevels(data.keyLevels ?? "")
        const [aIf = "", aThen = ""] = (data.scenarioA ?? "").split("|||")
        const [bIf = "", bThen = ""] = (data.scenarioB ?? "").split("|||")
        setScenarioAIf(aIf); setScenarioAThen(aThen)
        setScenarioBIf(bIf); setScenarioBThen(bThen)
        setNewsEventRisk(data.newsEventRisk ?? "")
        setRiskPerTrade(data.riskPerTrade ?? "")
        setMaxTrades(data.maxTrades?.toString() ?? "")
        setMaxDailyLoss(data.maxDailyLoss ?? "")
        setStateCheck(data.stateCheck?.toString() ?? "")
        setStateCheckNotes(data.stateCheckNotes ?? "")
        setIsRedDay(data.isRedDay ?? false)
        setRedQ1(data.redQ1LosingMore ?? "")
        setRedQ2(data.redQ2FollowedModel ?? "")
        setRedQ3(data.redQ3BlameRisk ?? "")
        setRedQ4(data.redQ4SleepCalm ?? "")
        setRedVerdict(data.redVerdict ?? "")
        setRedCorrectiveAction(data.redCorrectiveAction ?? "")
        setPlanAccuracy(data.planAccuracy?.toString() ?? "")
        setPlanAccuracyWhy(data.planAccuracyWhy ?? "")
        setPlanAdherence(data.planAdherence?.toString() ?? "")
        setPlanAdherenceWhy(data.planAdherenceWhy ?? "")
        setOverallThoughtProcess(data.overallThoughtProcess ?? "")
        setTomorrowAdd(data.tomorrowAdd ?? "")
        setTomorrowRemove(data.tomorrowRemove ?? "")
        setTomorrowConsider(data.tomorrowConsider ?? "")
        setNetR(data.netR ?? "")
        setRulesBrokenList(parseRulesBroken(data.rulesBroken))
        setPreMarketScreenshots(data.preMarketScreenshots ?? [])
        setPostSessionScreenshots(data.postSessionScreenshots ?? [])
        if (data.missedTrades) {
          try {
            setMissedTrades(JSON.parse(data.missedTrades))
          } catch {
            setMissedTrades([])
          }
        } else {
          setMissedTrades([])
        }
      } else {
        try {
          const prev = await getLatestDailyJournal(date)
          if (prev) {
            setIsAutoFilled(true)
            setSession(prev.session ?? "NY")
            setInstrument(prev.instrument ?? "")
            setRiskPerTrade(prev.riskPerTrade ?? "")
            setMaxTrades(prev.maxTrades?.toString() ?? "")
            setMaxDailyLoss(prev.maxDailyLoss ?? "")
          } else {
            setIsAutoFilled(false)
            setSession("NY")
            setInstrument("")
            setRiskPerTrade("")
            setMaxTrades("")
            setMaxDailyLoss("")
          }
        } catch {
          setIsAutoFilled(false)
          setSession("NY")
          setInstrument("")
          setRiskPerTrade("")
          setMaxTrades("")
          setMaxDailyLoss("")
        }
        setHtfContext("")
        setKeyLevels("")
        setScenarioAIf(""); setScenarioAThen("")
        setScenarioBIf(""); setScenarioBThen("")
        setNewsEventRisk("")
        setStateCheck("")
        setStateCheckNotes("")
        setIsRedDay(false)
        setRedQ1(""); setRedQ2(""); setRedQ3(""); setRedQ4("")
        setRedVerdict("")
        setRedCorrectiveAction("")
        setPlanAccuracy(""); setPlanAccuracyWhy("")
        setPlanAdherence(""); setPlanAdherenceWhy("")
        setOverallThoughtProcess("")
        setTomorrowAdd(""); setTomorrowRemove(""); setTomorrowConsider("")
        setNetR("")
        setRulesBrokenList([])
        setPreMarketScreenshots([])
        setPostSessionScreenshots([])
        setMissedTrades([])
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [date])

  const [uploadingImg, setUploadingImg] = useState(false)
  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>, target: 'pre' | 'post') => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "daily_" + target + "_" + date)
        const url = await uploadImageFormData(formData)
        newUrls.push(url)
      }
      if (target === 'pre') setPreMarketScreenshots((s: string[]) => [...s, ...newUrls])
      else setPostSessionScreenshots((s: string[]) => [...s, ...newUrls])
    } catch {
      toast.error("Image upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }

  const [viewImage, setViewImage] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try {
      await saveDailyJournal(date, {
        session, instrument,
        htfContext, keyLevels,
        scenarioA: `${scenarioAIf}|||${scenarioAThen}`,
        scenarioB: `${scenarioBIf}|||${scenarioBThen}`,
        newsEventRisk, riskPerTrade,
        maxTrades: maxTrades ? parseInt(maxTrades) : null,
        maxDailyLoss,
        stateCheck: stateCheck ? parseInt(stateCheck) : null,
        stateCheckNotes, isRedDay,
        redQ1LosingMore: redQ1, redQ2FollowedModel: redQ2,
        redQ3BlameRisk: redQ3, redQ4SleepCalm: redQ4,
        redVerdict, redCorrectiveAction,
        planAccuracy: planAccuracy ? parseInt(planAccuracy) : null,
        planAccuracyWhy,
        planAdherence: planAdherence ? parseInt(planAdherence) : null,
        planAdherenceWhy, overallThoughtProcess,
        tomorrowAdd, tomorrowRemove, tomorrowConsider,
        netR, rulesBroken: rulesBrokenList.join(" | "),
        missedTrades: JSON.stringify(missedTrades),
        preMarketScreenshots,
        postSessionScreenshots,
      })
      toast.success("Daily journal saved!")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "h-9 text-sm"
  const textCls = "text-sm bg-background border-input"

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header & Daily Summary */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Daily Journal</h1>
              {dayTrades.length > 0 && (
                <Badge variant={dayTotalPnl >= 0 ? "default" : "destructive"} className="text-xs font-mono font-bold px-2.5 py-0.5">
                  {dayTotalPnl >= 0 ? "GREEN DAY" : "RED DAY"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-muted-foreground text-sm">Pre-market plan + post-session review</p>
              {isAutoFilled && (
                <Badge variant="outline" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/30 flex items-center gap-1 py-0 px-2">
                  <Sparkles className="w-3 h-3" /> Auto-filled defaults from previous day
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DatePicker value={date} onChange={setDate} className="w-[180px] bg-background" />
            <select value={session} onChange={e => setSession(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option>NY</option>
              <option>London</option>
              <option>Asia</option>
            </select>
            <Input className="h-10 text-sm w-36" placeholder="Instrument" value={instrument} onChange={e => setInstrument(e.target.value)} />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* Daily Stats Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DAY P&L ({pnlDisplayMode === "r_multiple" ? "R" : pnlDisplayMode === "percentage" ? "%" : "$"})</p>
            <p className={cn("text-xl font-extrabold font-mono mt-0.5", dayTotalPnl >= 0 ? "text-success" : "text-destructive")}>
              {dayTrades.length > 0 ? fmtPnl(dayTotalPnl, pnlDisplayMode, accountBalance, { sign: true }) : "$0.00"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TOTAL NET R</p>
              <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold">AUTO</Badge>
            </div>
            <p className={cn("text-xl font-extrabold font-mono mt-0.5", dayTotalNetR >= 0 ? "text-cyan-400" : "text-destructive")}>
              {dayTrades.length > 0 ? `${dayTotalNetR >= 0 ? "+" : ""}${dayTotalNetR.toFixed(2)}R` : "0.00R"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WIN RATE</p>
            <p className="text-xl font-extrabold font-mono mt-0.5 text-foreground">
              {dayWinRate}% <span className="text-xs font-normal text-muted-foreground">({dayWins}W-{dayLosses}L)</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TOTAL TRADES</p>
            <p className="text-xl font-extrabold font-mono mt-0.5 text-foreground">
              {dayTrades.length} <span className="text-xs font-normal text-muted-foreground">logged</span>
            </p>
          </div>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      <SectionHeader title="Pre-Market Plan" />
      <div className="space-y-4">
        <JournalField title="HTF Context (balanced / imbalanced, prior value, overnight)" colorClass="bg-blue-400">
          <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={htfContext} onChange={e => setHtfContext(e.target.value)} placeholder="Describe higher-timeframe context..." />
        </JournalField>
        
        <JournalField title="Key Levels + Why They Matter" colorClass="bg-purple-400">
          <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={keyLevels} onChange={e => setKeyLevels(e.target.value)} placeholder="List key levels and their significance..." />
        </JournalField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JournalField title="Scenario A" colorClass="bg-green-400">
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IF</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioAIf} onChange={e => setScenarioAIf(e.target.value)} placeholder="price does X..." />
              </div>
              <div className="h-px bg-border/40" />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">THEN</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioAThen} onChange={e => setScenarioAThen(e.target.value)} placeholder="I will look for Y..." />
              </div>
            </div>
          </JournalField>

          <JournalField title="Scenario B" colorClass="bg-amber-400">
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IF</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioBIf} onChange={e => setScenarioBIf(e.target.value)} placeholder="price does X..." />
              </div>
              <div className="h-px bg-border/40" />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">THEN</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioBThen} onChange={e => setScenarioBThen(e.target.value)} placeholder="I will look for Y..." />
              </div>
            </div>
          </JournalField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JournalField title="News / Event Risk + Time" colorClass="bg-destructive">
            <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={newsEventRisk} onChange={e => setNewsEventRisk(e.target.value)} placeholder="e.g. NFP at 8:30 AM, FOMC at 2:00 PM" />
          </JournalField>
          
          <div className="grid grid-cols-3 gap-2">
            <JournalField title="Risk / Trade">
              <Input className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm font-bold font-mono h-auto" value={riskPerTrade} onChange={e => setRiskPerTrade(e.target.value)} placeholder="e.g. 1%" />
            </JournalField>
            <JournalField title="Max Trades">
              <Input type="number" className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm font-bold font-mono h-auto" value={maxTrades} onChange={e => setMaxTrades(e.target.value)} placeholder="3" />
            </JournalField>
            <JournalField title="Max Daily Loss">
              <Input className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm font-bold font-mono h-auto" value={maxDailyLoss} onChange={e => setMaxDailyLoss(e.target.value)} placeholder="e.g. 2R" />
            </JournalField>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-4">
          <JournalField title="State Check (1-10)">
            <Input type="number" min={1} max={10} className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-2xl font-bold font-mono h-auto" value={stateCheck} onChange={e => setStateCheck(e.target.value)} placeholder="-" />
          </JournalField>
          <JournalField title="Notes on State">
            <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={stateCheckNotes} onChange={e => setStateCheckNotes(e.target.value)} placeholder="How are you feeling mentally today?" />
          </JournalField>
        </div>

        <JournalField title="Pre-Market Charts" colorClass="bg-blue-400">
          <ScreenshotGallery 
            screenshots={preMarketScreenshots} 
            onUpload={(e) => handleUploadScreenshot(e, 'pre')} 
            onView={setViewImage} 
            onDelete={(idx) => setPreMarketScreenshots(s => s.filter((_, i) => i !== idx))}
          />
        </JournalField>
      </div>

      {/* -- TRADE LIST ----------------------------------------------------- */}
      <TradeListCard dayTrades={dayTrades} date={date} />

      {/* -- MISSED SETUPS -------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Missed Setups / Replay
            </span>
            {missedTrades.length > 0 && (
              <Badge variant="outline" className="font-mono text-[10px] bg-muted/60 text-muted-foreground px-2 py-0 border-border/70">
                {missedTrades.length} Logged
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (isAddingMissed) resetMissedForm()
              else setIsAddingMissed(true)
            }}
            className="text-xs h-8 font-semibold"
          >
            {isAddingMissed ? (
              <><X className="w-3.5 h-3.5 mr-1.5" /> Cancel</>
            ) : (
              <><Plus className="w-3.5 h-3.5 mr-1.5" /> Log Missed Setup</>
            )}
          </Button>
        </div>

        {/* Inline Add Missed Setup Form */}
        {isAddingMissed && (
          <div className="rounded-xl border border-primary/30 bg-muted/20 p-4 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New Missed Setup
              </span>
              <span className="text-[11px] text-muted-foreground">Minimal inputs &bull; Auto-syncs to Weekly Review</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Setup Name */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold">Setup Name <span className="text-destructive">*</span></Label>
                <Input
                  className="h-9 text-sm bg-background/80"
                  placeholder="e.g. NQ 15m FVG Sweep, Trendline Break..."
                  value={draftSetup}
                  onChange={e => setDraftSetup(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Direction Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Direction</Label>
                <div className="grid grid-cols-2 gap-1.5 h-9">
                  <button
                    type="button"
                    onClick={() => setDraftDirection("long")}
                    className={cn(
                      "rounded-md text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1",
                      draftDirection === "long"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDirection("short")}
                    className={cn(
                      "rounded-md text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1",
                      draftDirection === "short"
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    Short
                  </button>
                </div>
              </div>

              {/* Outcome Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Outcome</Label>
                <div className="grid grid-cols-3 gap-1 h-9">
                  {(["win", "loss", "breakeven"] as const).map(out => (
                    <button
                      key={out}
                      type="button"
                      onClick={() => setDraftOutcome(out)}
                      className={cn(
                        "rounded-md text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center",
                        draftOutcome === out
                          ? out === "win"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : out === "loss"
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/50"
                          : "border-border/60 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      {out === "breakeven" ? "BE" : out}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Potential R */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Potential R</Label>
                <Input
                  className="h-9 text-sm font-mono font-bold bg-background/80"
                  placeholder="e.g. +2.5R"
                  value={draftPotentialR}
                  onChange={e => setDraftPotentialR(e.target.value)}
                />
              </div>

              {/* Why Missed / Reason */}
              <div className="space-y-1.5 md:col-span-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Why was it missed?</Label>
                  <span className="text-[10px] text-muted-foreground">Quick chips or type:</span>
                </div>
                {/* Reason Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    "Hesitated",
                    "Away from desk",
                    "Second guessing",
                    "Spread / Execution",
                    "News upcoming",
                    "Not in session",
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (draftReason.includes(chip)) {
                          setDraftReason(draftReason.replace(chip, "").replace(/^,\s*|,\s*$/g, "").trim())
                        } else {
                          setDraftReason(draftReason ? `${draftReason}, ${chip}` : chip)
                        }
                      }}
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                        draftReason.includes(chip)
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "bg-muted/40 text-muted-foreground border-border/60 hover:border-primary/40"
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <Input
                  className="h-9 text-sm bg-background/80"
                  placeholder="Reason or notes..."
                  value={draftReason}
                  onChange={e => setDraftReason(e.target.value)}
                />
              </div>
            </div>

            {/* Screenshots Multi-Upload */}
            <div className="space-y-2 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /> Screenshots (Multi-upload)
                </Label>
                <span className="text-[10px] text-muted-foreground">Upload multiple chart views</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {draftScreenshots.map((url, idx) => (
                  <div key={idx} className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20">
                    <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setViewImage(url)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftScreenshots(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-destructive text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <label className="flex flex-col items-center justify-center gap-1 border border-dashed border-border/70 rounded-lg p-2 text-center cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-colors aspect-video">
                  {uploadingMissedImg ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">Upload Charts</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUploadMissedScreenshot}
                    disabled={uploadingMissedImg}
                  />
                </label>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="ghost" size="sm" onClick={resetMissedForm} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddMissed}
                disabled={!draftSetup.trim() || uploadingMissedImg}
                className="text-xs font-semibold"
              >
                Add Missed Setup
              </Button>
            </div>
          </div>
        )}

        {/* Existing Missed Trades List */}
        {missedTrades.length === 0 && !isAddingMissed ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-5 text-center space-y-1">
            <p className="text-xs text-muted-foreground italic">No missed setups logged for {date}.</p>
            <p className="text-[11px] text-muted-foreground/60">If you skipped a valid trade, log it here to track in your Weekly Review replay.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {missedTrades.map((m, idx) => (
              <div
                key={m.id || idx}
                className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 transition-all hover:border-border"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{m.setup}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0",
                        m.direction === "long"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      )}
                    >
                      {m.direction}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0",
                        m.outcome === "win"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : m.outcome === "loss"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {m.outcome}
                    </Badge>
                    {m.potentialR && (
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {m.potentialR}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMissedTrades(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Remove missed setup"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {m.reason && (
                  <div className="text-xs text-muted-foreground leading-relaxed pl-0.5">
                    <span className="font-semibold text-foreground/80">Reason: </span>
                    {m.reason}
                  </div>
                )}

                {/* Screenshots Gallery for this item */}
                {m.screenshots && m.screenshots.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.screenshots.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setViewImage(imgUrl)}
                        className="group relative w-24 h-16 rounded-md overflow-hidden border border-border bg-muted/20 cursor-pointer"
                      >
                        <img src={imgUrl} alt={`Chart ${imgIdx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionHeader title="Red-Day Checklist" />
      <JournalField title="Was today a negative / red day?" className={cn("transition-colors", isRedDay ? "border-destructive/30" : "border-border/60")}>
        <label className="flex items-center gap-3 cursor-pointer py-1">
          <input type="checkbox" className="w-4 h-4 accent-destructive" checked={isRedDay} onChange={e => setIsRedDay(e.target.checked)} />
          <span className="text-sm font-medium">Yes, today was a red day</span>
        </label>
        
        {isRedDay && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Am I losing more than my last profitable day?", val: redQ1, set: setRedQ1 },
                { label: "Did I execute the setups following the model?", val: redQ2, set: setRedQ2 },
                { label: "Can I blame myself for risk management?", val: redQ3, set: setRedQ3 },
                { label: "Am I able to sleep calm?", val: redQ4, set: setRedQ4 },
              ].map(({ label, val, set }) => (
                <div key={label} className="bg-muted/10 p-3 rounded-lg border border-border/40 flex flex-col">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">{label}</Label>
                  <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={val} onChange={e => set(e.target.value)} placeholder="Your answer..." />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
              <div className="bg-muted/10 p-3 rounded-lg border border-border/40 flex flex-col justify-center">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Verdict</Label>
                <div className="flex gap-2">
                  {["Good process", "Bad process"].map(v => (
                    <button key={v} type="button" onClick={() => setRedVerdict(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${redVerdict === v ? (v === "Good process" ? "bg-green-500/20 text-green-500 border-green-500/50" : "bg-destructive/20 text-destructive border-destructive/50") : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-muted/10 p-3 rounded-lg border border-border/40 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-destructive/70 block mb-2">Corrective Action</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={redCorrectiveAction} onChange={e => setRedCorrectiveAction(e.target.value)} placeholder="What will you change tomorrow?" />
              </div>
            </div>
          </div>
        )}
      </JournalField>

      <SectionHeader title="Post-Session Notes" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JournalField title="Plan Accuracy (1 ... 10)">
            <div className="flex items-start gap-4 h-full">
              <Input type="number" min={1} max={10} className="w-16 border-0 bg-transparent focus-visible:ring-0 text-2xl font-bold font-mono h-auto" value={planAccuracy} onChange={e => setPlanAccuracy(e.target.value)} placeholder="-" />
              <div className="w-px self-stretch bg-border/40" />
              <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm flex-1" placeholder="Why?" value={planAccuracyWhy} onChange={e => setPlanAccuracyWhy(e.target.value)} />
            </div>
          </JournalField>
          <JournalField title="Plan Adherence (1 ... 10)">
            <div className="flex items-start gap-4 h-full">
              <Input type="number" min={1} max={10} className="w-16 border-0 bg-transparent focus-visible:ring-0 text-2xl font-bold font-mono h-auto" value={planAdherence} onChange={e => setPlanAdherence(e.target.value)} placeholder="-" />
              <div className="w-px self-stretch bg-border/40" />
              <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm flex-1" placeholder="Why?" value={planAdherenceWhy} onChange={e => setPlanAdherenceWhy(e.target.value)} />
            </div>
          </JournalField>
        </div>

        <JournalField title="Overall Thought Process" colorClass="bg-blue-400">
          <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={overallThoughtProcess} onChange={e => setOverallThoughtProcess(e.target.value)} placeholder="How did the session go overall?" />
        </JournalField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Tomorrow ... ADD", val: tomorrowAdd, set: setTomorrowAdd, color: "bg-green-400" },
            { label: "Tomorrow ... REMOVE", val: tomorrowRemove, set: setTomorrowRemove, color: "bg-destructive" },
            { label: "Tomorrow ... CONSIDER", val: tomorrowConsider, set: setTomorrowConsider, color: "bg-amber-400" },
          ].map(({ label, val, set, color }) => (
            <JournalField key={label} title={label} colorClass={color}>
              <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={val} onChange={e => set(e.target.value)} placeholder="..." />
            </JournalField>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-4 min-w-0">
          <JournalField title="Net R (Total R-Multiple)" colorClass="bg-cyan-400">
            <div className="flex items-center gap-2">
              <Input
                className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-2xl font-bold font-mono h-auto text-cyan-400 flex-1"
                value={netR !== "" ? netR : dayTotalNetR !== 0 ? `${dayTotalNetR >= 0 ? "+" : ""}${dayTotalNetR.toFixed(2)}` : "0.00"}
                onChange={e => setNetR(e.target.value)}
                placeholder="0.00"
              />
              <Badge variant="outline" className="font-mono text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shrink-0 uppercase font-bold">
                Auto
              </Badge>
            </div>
          </JournalField>
          <JournalField title="Rules Broken" className="md:col-span-1 min-w-0 overflow-hidden" colorClass="bg-rose-400">
            <div className="space-y-3 min-w-0">
              {/* Active Selected Rule Chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] min-w-0 max-w-full">
                {rulesBrokenList.length === 0 ? (
                  <span className="text-xs text-muted-foreground/60 italic">No rules flagged yet. Select below or mark clean:</span>
                ) : (
                  rulesBrokenList.map((rule, idx) => {
                    const badgeInfo = getRuleBadgeText(rule)
                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={cn(
                          "pl-2.5 pr-1.5 py-1 text-xs font-medium flex items-center gap-1.5 rounded-lg border transition-all max-w-full min-w-0 cursor-default",
                          badgeInfo.isClean
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                        )}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[260px] sm:max-w-[340px] cursor-help">
                              {badgeInfo.isClean ? "🎯 " + badgeInfo.title : "⚠️ " + badgeInfo.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs font-sans whitespace-pre-wrap">
                            {badgeInfo.fullText}
                          </TooltipContent>
                        </Tooltip>
                        <button
                          type="button"
                          onClick={() => setRulesBrokenList(list => list.filter((_, i) => i !== idx))}
                          className="hover:bg-background/40 rounded p-0.5 transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )
                  })
                )}
              </div>

              {/* Quick Controls: Followed All Rules Toggle + Rule Book Selector Toggle */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (rulesBrokenList.some(r => r.toUpperCase() === "NO")) {
                      setRulesBrokenList(list => list.filter(r => r.toUpperCase() !== "NO"))
                    } else {
                      setRulesBrokenList(["NO"])
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 transition-all",
                    rulesBrokenList.some(r => r.toUpperCase() === "NO")
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : "bg-muted/20 text-muted-foreground border-border hover:border-emerald-500/40 hover:text-emerald-400"
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  Followed All Rules (NO)
                </button>

                {ruleBookRules.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRuleSelector(!showRuleSelector)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 transition-all",
                      showRuleSelector
                        ? "bg-primary/20 text-primary border-primary/50"
                        : "bg-muted/20 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Select from Rule Book ({ruleBookRules.length})
                    {showRuleSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Expandable Rule Book Selection Menu */}
              {showRuleSelector && (
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Click rule to toggle:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {ruleBookRules.map((rb, rIdx) => {
                      const ruleIdentifier = rb.title ? rb.title : `WHEN ${rb.condition} THEN ${rb.action}`
                      const isSelected = rulesBrokenList.some(r => 
                        r === ruleIdentifier || 
                        (rb.title && r.toLowerCase() === rb.title.toLowerCase()) ||
                        r === `WHEN ${rb.condition} THEN ${rb.action}` ||
                        r.toLowerCase().includes(rb.condition.toLowerCase())
                      )
                      const ruleNum = rb.stableIndex || (rIdx + 1)
                      return (
                        <Tooltip key={rb.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRulesBrokenList(list => list.filter(r => 
                                    r !== ruleIdentifier && 
                                    !(rb.title && r.toLowerCase() === rb.title.toLowerCase()) &&
                                    r !== `WHEN ${rb.condition} THEN ${rb.action}` &&
                                    !r.toLowerCase().includes(rb.condition.toLowerCase())
                                  ))
                                } else {
                                  setRulesBrokenList(list => [...list.filter(r => r.toUpperCase() !== "NO"), ruleIdentifier])
                                }
                              }}
                              className={cn(
                                "text-left p-2.5 rounded-md text-xs border transition-all flex flex-col gap-1 min-w-0 overflow-hidden cursor-pointer",
                                isSelected
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                  : "bg-card/60 text-muted-foreground border-border hover:border-rose-500/40 hover:text-foreground hover:bg-card"
                              )}
                            >
                              <div className="flex items-center gap-1.5 w-full min-w-0">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", isSelected ? "bg-rose-500" : "bg-muted-foreground/40")} />
                                <span className="font-bold text-foreground truncate">
                                  {rb.title ? (
                                    <span>Rule #{ruleNum}: {rb.title}</span>
                                  ) : (
                                    <span>Rule #{ruleNum}</span>
                                  )}
                                </span>
                              </div>
                              <span className="line-clamp-2 text-[11px] opacity-80 pl-3.5 leading-snug">
                                WHEN {rb.condition} &rarr; THEN {rb.action}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            align="center" 
                            sideOffset={6}
                            className="w-80 sm:w-96 p-3.5 space-y-2.5 text-xs border border-border/80 shadow-2xl bg-popover/95 backdrop-blur-md rounded-xl z-[9999]"
                          >
                            <div className="font-bold text-foreground flex items-center justify-between border-b border-border/40 pb-1.5">
                              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                Rule #{ruleNum}{rb.title ? `: ${rb.title}` : ""}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                                Full Rule
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-xs font-sans">
                              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                <div className="font-bold text-rose-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> WHEN (Trigger / Condition):
                                </div>
                                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{rb.condition}</p>
                              </div>

                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="font-bold text-emerald-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> THEN (Action / Constraint):
                                </div>
                                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{rb.action}</p>
                              </div>

                              {rb.fromMistake && (
                                <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
                                  <span className="font-semibold text-muted-foreground/80">Origin:</span>
                                  <span className="truncate">{rb.fromMistake}</span>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom Free-Text Input Row */}
              <div className="flex items-center gap-2 pt-0.5">
                <Input
                  value={customRuleInput}
                  onChange={e => setCustomRuleInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && customRuleInput.trim()) {
                      e.preventDefault()
                      const val = customRuleInput.trim()
                      if (!rulesBrokenList.includes(val)) {
                        setRulesBrokenList(list => [...list.filter(r => r.toUpperCase() !== "NO"), val])
                      }
                      setCustomRuleInput("")
                    }
                  }}
                  placeholder="Type custom rule or note..."
                  className="h-8 text-xs bg-muted/20 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs font-semibold px-3"
                  onClick={() => {
                    const val = customRuleInput.trim()
                    if (val && !rulesBrokenList.includes(val)) {
                      setRulesBrokenList(list => [...list.filter(r => r.toUpperCase() !== "NO"), val])
                      setCustomRuleInput("")
                    }
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </JournalField>
        </div>

        <JournalField title="Post-Session Charts" colorClass="bg-purple-400">
          <ScreenshotGallery 
            screenshots={postSessionScreenshots} 
            onUpload={(e) => handleUploadScreenshot(e, 'post')} 
            onView={setViewImage} 
            onDelete={(idx) => setPostSessionScreenshots(s => s.filter((_, i) => i !== idx))}
          />
        </JournalField>
      </div>

      <Dialog open={!!viewImage} onOpenChange={(o) => {
        if (!o) { setIsZoomed(false); setViewImage(null) }
      }}>
        <DialogContent 
          className="sm:max-w-[95vw] !max-w-[95vw] w-full max-h-[95vh] p-2 bg-black/95 border-border flex flex-col"
        >
          <div 
            className="flex-1 flex items-center justify-center overflow-auto p-2"
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {viewImage && (
              <img
                src={viewImage}
                alt="Expanded screenshot"
                className={cn("rounded object-contain transition-all duration-300", isZoomed ? "max-h-none w-auto min-w-[150vw] cursor-zoom-out" : "max-h-[85vh] w-auto cursor-zoom-in")}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DailyJournalPage() {
  return (
    <TooltipProvider delayDuration={150}>
      <Suspense fallback={<div className="p-12 text-center text-muted-foreground text-sm">Loading daily journal...</div>}>
        <DailyJournalContent />
      </Suspense>
    </TooltipProvider>
  )
}

