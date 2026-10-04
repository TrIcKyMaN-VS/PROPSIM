"use client"

import { useState, useEffect, useMemo } from "react"
import { getMonthlyRecap, saveMonthlyRecap } from "@/app/actions/journal-actions"
import { generateMonthComparisonAction } from "@/app/actions/ai-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  Save, 
  Loader2, 
  Trophy, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  Sparkles, 
  Calendar,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Zap,
  Maximize2,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { usePropStore } from "@/lib/store"
import { fmtPnl, fmtCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Trade } from "@/lib/types"

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const textCls = "min-h-[90px] text-sm mt-1.5 bg-muted/20 border-border/80 focus:border-primary resize-none rounded-xl"
const labelCls = "text-xs font-bold uppercase tracking-wider text-muted-foreground"

export default function MonthlyRecapPage() {
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningAI, setRunningAI] = useState(false)

  // Drawer expansion states
  const [showWinningTrades, setShowWinningTrades] = useState(true)
  const [showLosingTrades, setShowLosingTrades] = useState(true)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [activeSetupFilter, setActiveSetupFilter] = useState<string | null>(null)
  const [activeMistakeFilter, setActiveMistakeFilter] = useState<string | null>(null)

  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades) || []
  const accounts = usePropStore(s => s.accounts) || []
  const tradePsychology = usePropStore(s => s.tradePsychology) || []
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100
  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)

  const account = useMemo(() => accounts.find(a => a.id === activeAccountId), [accounts, activeAccountId])
  const accountBalance = account?.rules?.startingBalance ?? 100000

  const allTrades = useMemo(() => {
    if (!activeAccountId) return trades
    return trades.filter(t => t.accountId === activeAccountId)
  }, [trades, activeAccountId])

  // Filter all trades for this month
  const monthTrades = useMemo(() => {
    return allTrades.filter(t => {
      if (!t.timestamp) return false
      const ts = Number(t.timestamp)
      if (isNaN(ts)) return false
      const d = new Date(ts)
      if (isNaN(d.getTime())) return false
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      return mStr === month
    }).sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [allTrades, month])

  const monthTotalNetR = useMemo(() => {
    return monthTrades.reduce((sum, t) => sum + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0)
  }, [monthTrades, defaultPlannedRisk])

  const monthTotalPnl = useMemo(() => {
    return monthTrades.reduce((sum, t) => sum + t.pnl, 0)
  }, [monthTrades])

  // Winning trades sorted by biggest profit first
  const winningTrades = useMemo(() => {
    return monthTrades.filter(t => t.pnl > 0).sort((a, b) => b.pnl - a.pnl)
  }, [monthTrades])

  // Losing trades sorted by biggest loss first
  const losingTrades = useMemo(() => {
    return monthTrades.filter(t => t.pnl < 0).sort((a, b) => a.pnl - b.pnl)
  }, [monthTrades])

  const totalWinR = useMemo(() => {
    return winningTrades.reduce((sum, t) => sum + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0)
  }, [winningTrades, defaultPlannedRisk])

  const totalLossR = useMemo(() => {
    return losingTrades.reduce((sum, t) => sum + Math.abs(t.netR ?? (t.pnl / defaultPlannedRisk)), 0)
  }, [losingTrades, defaultPlannedRisk])

  // Winning setups breakdown
  const winningSetupsBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalPnl: number; totalR: number }> = {}
    winningTrades.forEach(t => {
      const name = t.playbookName || "Discretionary / Unnamed"
      if (!map[name]) map[name] = { count: 0, totalPnl: 0, totalR: 0 }
      map[name].count++
      map[name].totalPnl += t.pnl
      map[name].totalR += (t.netR ?? (t.pnl / defaultPlannedRisk))
    })
    return Object.entries(map).sort((a, b) => b[1].totalR - a[1].totalR)
  }, [winningTrades, defaultPlannedRisk])

  // Losing mistakes / reasons breakdown
  const losingMistakesBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalLossPnl: number; totalLossR: number }> = {}
    losingTrades.forEach(t => {
      const psych = t.psychology || tradePsychology.find(p => p.tradeId === t.id)
      const mistake = t.mistakes?.trim() || psych?.exitReason?.trim() || (psych?.brokeRules ? "Rule Breach" : "Normal Stop-Out")
      if (!map[mistake]) map[mistake] = { count: 0, totalLossPnl: 0, totalLossR: 0 }
      map[mistake].count++
      map[mistake].totalLossPnl += Math.abs(t.pnl)
      map[mistake].totalLossR += Math.abs(t.netR ?? (t.pnl / defaultPlannedRisk))
    })
    return Object.entries(map).sort((a, b) => b[1].totalLossR - a[1].totalLossR)
  }, [losingTrades, tradePsychology, defaultPlannedRisk])

  // Unique trading days count
  const distinctDaysTraded = useMemo(() => {
    const set = new Set<string>()
    monthTrades.forEach(t => {
      const d = new Date(Number(t.timestamp))
      set.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    })
    return set.size
  }, [monthTrades])

  // Header State
  const [daysTradedCount, setDaysTradedCount] = useState("")
  const [netR, setNetR] = useState("")

  // Winning Trades State
  const [winsImpactfulSetups, setWinsImpactfulSetups] = useState("")
  const [winsMaximisedDays, setWinsMaximisedDays] = useState("")
  const [winsBestTradesCommon, setWinsBestTradesCommon] = useState("")
  const [winsAffectedConfidence, setWinsAffectedConfidence] = useState("")

  // Losing Trades State
  const [lossesWithinRisk, setLossesWithinRisk] = useState("")
  const [lossesFollowedRules, setLossesFollowedRules] = useState("")
  const [lossesPatterns, setLossesPatterns] = useState("")
  const [lossesLearnedOrRepeated, setLossesLearnedOrRepeated] = useState("")

  // Overall State
  const [overallDisciplineImproved, setOverallDisciplineImproved] = useState("")
  const [overallFollowedRulesMore, setOverallFollowedRulesMore] = useState("")
  const [overallConsistentJournaling, setOverallConsistentJournaling] = useState("")
  const [overallCommitNextMonth, setOverallCommitNextMonth] = useState("")

  // Month vs Month State
  const [monthVsMonthRepeatedMistakes, setMonthVsMonthRepeatedMistakes] = useState("")
  const [monthVsMonthCommitmentsKept, setMonthVsMonthCommitmentsKept] = useState("")
  const [monthVsMonthHighestLeverage, setMonthVsMonthHighestLeverage] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const m = params.get("month")
      if (m && /^\d{4}-\d{2}$/.test(m)) {
        setMonth(m)
      }
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    getMonthlyRecap(month).then(data => {
      if (data) {
        setDaysTradedCount(data.daysTradedCount?.toString() ?? "")
        setNetR(data.netR ?? "")
        setWinsImpactfulSetups(data.winsImpactfulSetups ?? "")
        setWinsMaximisedDays(data.winsMaximisedDays ?? "")
        setWinsBestTradesCommon(data.winsBestTradesCommon ?? "")
        setWinsAffectedConfidence(data.winsAffectedConfidence ?? "")
        setLossesWithinRisk(data.lossesWithinRisk ?? "")
        setLossesFollowedRules(data.lossesFollowedRules ?? "")
        setLossesPatterns(data.lossesPatterns ?? "")
        setLossesLearnedOrRepeated(data.lossesLearnedOrRepeated ?? "")
        setOverallDisciplineImproved(data.overallDisciplineImproved ?? "")
        setOverallFollowedRulesMore(data.overallFollowedRulesMore ?? "")
        setOverallConsistentJournaling(data.overallConsistentJournaling ?? "")
        setOverallCommitNextMonth(data.overallCommitNextMonth ?? "")
        setMonthVsMonthRepeatedMistakes(data.monthVsMonthRepeatedMistakes ?? "")
        setMonthVsMonthCommitmentsKept(data.monthVsMonthCommitmentsKept ?? "")
        setMonthVsMonthHighestLeverage(data.monthVsMonthHighestLeverage ?? "")
      } else {
        setDaysTradedCount(distinctDaysTraded > 0 ? distinctDaysTraded.toString() : "")
        setNetR(`${monthTotalNetR >= 0 ? "+" : ""}${monthTotalNetR.toFixed(2)}R`)
        setWinsImpactfulSetups(""); setWinsMaximisedDays(""); setWinsBestTradesCommon(""); setWinsAffectedConfidence("")
        setLossesWithinRisk(""); setLossesFollowedRules(""); setLossesPatterns(""); setLossesLearnedOrRepeated("")
        setOverallDisciplineImproved(""); setOverallFollowedRulesMore(""); setOverallConsistentJournaling(""); setOverallCommitNextMonth("")
        setMonthVsMonthRepeatedMistakes(""); setMonthVsMonthCommitmentsKept(""); setMonthVsMonthHighestLeverage("")
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month, distinctDaysTraded, monthTotalNetR])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveMonthlyRecap(month, {
        daysTradedCount: daysTradedCount ? parseInt(daysTradedCount) : (distinctDaysTraded || null),
        netR: `${monthTotalNetR >= 0 ? "+" : ""}${monthTotalNetR.toFixed(2)}R`,
        winsImpactfulSetups, winsMaximisedDays, winsBestTradesCommon, winsAffectedConfidence,
        lossesWithinRisk, lossesFollowedRules, lossesPatterns, lossesLearnedOrRepeated,
        overallDisciplineImproved, overallFollowedRulesMore, overallConsistentJournaling, overallCommitNextMonth,
        monthVsMonthRepeatedMistakes, monthVsMonthCommitmentsKept, monthVsMonthHighestLeverage,
      })
      toast.success("Monthly recap saved successfully!")
    } catch {
      toast.error("Failed to save recap")
    } finally {
      setSaving(false)
    }
  }

  const handleExtractWinPatterns = () => {
    if (winningTrades.length === 0) {
      toast.info("No winning trades logged for this month.")
      return
    }

    const topSetupsText = winningSetupsBreakdown
      .map(([name, s]) => `${name} (${s.count} trade${s.count > 1 ? "s" : ""}, +${s.totalR.toFixed(2)}R)`)
      .slice(0, 3)
      .join("; ")
    
    if (topSetupsText) {
      setWinsImpactfulSetups(`Top performing setups: ${topSetupsText}. These setups showed clean edge and high conviction.`)
    }

    const bestWin = winningTrades[0]
    const bestWinR = (bestWin.netR ?? (bestWin.pnl / defaultPlannedRisk))
    const commonGradeCount = winningTrades.filter(t => {
      const psych = t.psychology || tradePsychology.find(p => p.tradeId === t.id)
      return psych?.executionGrade === "A" || psych?.executionGrade === "B"
    }).length
    
    setWinsBestTradesCommon(`Largest win was +${bestWinR.toFixed(2)}R on ${bestWin.instrument} (${bestWin.playbookName || "Discretionary"}). Across all ${winningTrades.length} wins, ${commonGradeCount} followed Grade A/B model execution without forced early entry.`)
    toast.success("Win patterns extracted from trades into reflection fields!")
  }

  const handleExtractLossPatterns = () => {
    if (losingTrades.length === 0) {
      toast.info("No losing trades logged for this month.")
      return
    }

    const worstLoss = losingTrades[0]
    const worstLossR = Math.abs(worstLoss.netR ?? (worstLoss.pnl / defaultPlannedRisk))
    const oversized = losingTrades.filter(t => Math.abs(t.netR ?? (t.pnl / defaultPlannedRisk)) > 1.25).length
    
    if (oversized > 0) {
      setLossesWithinRisk(`${oversized} trade(s) exceeded planned 1R risk threshold. Largest single loss was -${worstLossR.toFixed(2)}R on ${worstLoss.instrument}. Risk discipline requires hard stop enforcement.`)
    } else {
      setLossesWithinRisk(`All ${losingTrades.length} losses were maintained strictly within planned risk (max loss: -${worstLossR.toFixed(2)}R on ${worstLoss.instrument}). No catastrophic revenge sizing.`)
    }

    const topMistakesText = losingMistakesBreakdown
      .map(([m, s]) => `${m} (${s.count}x, -${s.totalLossR.toFixed(2)}R)`)
      .slice(0, 3)
      .join("; ")

    if (topMistakesText) {
      setLossesPatterns(`Recurring loss drivers: ${topMistakesText}. Stop-outs occurred mostly from entering without patience for model confirmation.`)
    }

    toast.success("Loss patterns extracted from trades into audit fields!")
  }

  const handleAIComparison = async () => {
    setRunningAI(true)
    try {
      const result = await generateMonthComparisonAction(month)

      if (result.status === "no_current_recap") {
        toast.error("Save at least some content in this month's recap before running the AI comparison.")
        return
      }

      if (result.status === "no_previous_recap") {
        const prev = (result as any).previousMonth ?? "the previous month"
        toast.error(`No recap found for ${prev}. Complete at least 2 monthly recaps to unlock AI comparison.`)
        return
      }

      if (result.repeatedMistakes) setMonthVsMonthRepeatedMistakes(result.repeatedMistakes)
      if (result.commitmentsKept) setMonthVsMonthCommitmentsKept(result.commitmentsKept)
      if (result.highestLeverage) setMonthVsMonthHighestLeverage(result.highestLeverage)

      if ((result as any).isFallback) {
        toast.warning("AI analysis completed using fallback. Check your API key in Settings → AI Settings.")
      } else {
        toast.success("AI Month-over-Month comparison complete — review and edit before saving.")
      }
    } catch (err: any) {
      toast.error(err?.message ?? "AI comparison failed. Please try again.")
    } finally {
      setRunningAI(false)
    }
  }

  // Filtered winning trades by selected setup chip
  const displayedWinningTrades = useMemo(() => {
    if (!activeSetupFilter) return winningTrades
    return winningTrades.filter(t => (t.playbookName || "Discretionary / Unnamed") === activeSetupFilter)
  }, [winningTrades, activeSetupFilter])

  // Filtered losing trades by selected mistake chip
  const displayedLosingTrades = useMemo(() => {
    if (!activeMistakeFilter) return losingTrades
    return losingTrades.filter(t => {
      const psych = t.psychology || tradePsychology.find(p => p.tradeId === t.id)
      const m = t.mistakes?.trim() || psych?.exitReason?.trim() || (psych?.brokeRules ? "Rule Breach" : "Normal Stop-Out")
      return m === activeMistakeFilter
    })
  }, [losingTrades, activeMistakeFilter, tradePsychology])

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Top Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Monthly Recap</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              EXECUTIVE SUMMARY
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive end-of-month trade audit, behavioral review, and pattern synthesis.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border/80 bg-card text-xs font-bold font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          />
          <Input
            className="h-10 text-xs font-bold font-mono w-28 bg-card border-border/80"
            type="number"
            placeholder="Days traded"
            value={daysTradedCount}
            onChange={e => setDaysTradedCount(e.target.value)}
          />
          <div className="relative">
            <Input
              className={cn("h-10 text-xs font-black font-mono w-36 bg-card/80 border-border/80 cursor-not-allowed pr-12", monthTotalNetR >= 0 ? "text-emerald-400" : "text-rose-400")}
              placeholder="Net R"
              value={`${monthTotalNetR >= 0 ? "+" : ""}${monthTotalNetR.toFixed(2)} R`}
              readOnly
            />
            <Badge variant="outline" className="absolute right-2 top-2.5 font-mono text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 uppercase font-bold">
              AUTO
            </Badge>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg shadow-primary/20 font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Recap
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm font-mono">Loading month data...</p>}

      {/* ── PRO SUMMARY RIBBON ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/70 border-border/60">
          <CardHeader className="pb-1 pt-3 px-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" /> Month Total
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className={`text-xl font-black ${monthTotalNetR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {monthTotalNetR >= 0 ? "+" : ""}{monthTotalNetR.toFixed(2)} R
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {fmtPnl(monthTotalPnl, pnlDisplayMode, accountBalance, { sign: true })} • {monthTrades.length} trades
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardHeader className="pb-1 pt-3 px-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Win / Loss Count
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="text-xl font-bold text-foreground">
              {winningTrades.length}W <span className="text-muted-foreground text-sm font-normal">/</span> {losingTrades.length}L
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {monthTrades.length > 0 ? `${Math.round((winningTrades.length / monthTrades.length) * 100)}% Win Rate` : "No trades"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardHeader className="pb-1 pt-3 px-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Best Setup
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="text-base font-bold text-foreground truncate" title={winningSetupsBreakdown[0]?.[0] || "None"}>
              {winningSetupsBreakdown[0]?.[0] || "No Wins Yet"}
            </div>
            <div className="text-xs text-emerald-400 font-medium mt-0.5">
              {winningSetupsBreakdown[0] ? `+${winningSetupsBreakdown[0][1].totalR.toFixed(1)}R (${winningSetupsBreakdown[0][1].count} wins)` : "--"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/60">
          <CardHeader className="pb-1 pt-3 px-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Main Leak
            </div>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="text-base font-bold text-foreground truncate" title={losingMistakesBreakdown[0]?.[0] || "None"}>
              {losingMistakesBreakdown[0]?.[0] || "No Losses"}
            </div>
            <div className="text-xs text-rose-400 font-medium mt-0.5">
              {losingMistakesBreakdown[0] ? `-${losingMistakesBreakdown[0][1].totalLossR.toFixed(1)}R (${losingMistakesBreakdown[0][1].count}x)` : "--"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 1: WINNING TRADES ANALYSIS & IN-PLACE LIST ─────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.04)]">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                <Trophy className="w-4 h-4" /> Winning Trades Analysis
              </CardTitle>
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold font-mono">
                {winningTrades.length} Trades • +{totalWinR.toFixed(2)} R
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExtractWinPatterns}
                disabled={winningTrades.length === 0}
                className="h-8 text-xs font-semibold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                title="Synthesize and auto-fill answers based on winning trades"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Auto-Extract Insights
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowWinningTrades(!showWinningTrades)}
                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {showWinningTrades ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Hide List</> : <><Eye className="w-3.5 h-3.5 mr-1" /> View Trades ({winningTrades.length})</>}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Review your winning trades right here without leaving the page. Inspect setup details and see what drove alpha.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          
          {/* Embedded Interactive Winning Trades Panel */}
          {showWinningTrades && (
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-background/50 space-y-3">
              {/* Setup Breakdown Filter Chips */}
              {winningSetupsBreakdown.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pb-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Filter Setup:</span>
                  <button
                    type="button"
                    onClick={() => setActiveSetupFilter(null)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                      activeSetupFilter === null ? "bg-emerald-500 text-black" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({winningTrades.length})
                  </button>
                  {winningSetupsBreakdown.map(([name, stat]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setActiveSetupFilter(activeSetupFilter === name ? null : name)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                        activeSetupFilter === name
                          ? "bg-emerald-500 text-black font-bold"
                          : "bg-muted/30 border border-border/40 text-muted-foreground hover:text-foreground hover:border-emerald-500/40"
                      )}
                    >
                      <span>{name}</span>
                      <span className="font-mono text-[10px] opacity-80">+{stat.totalR.toFixed(1)}R ({stat.count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Trades List */}
              {displayedWinningTrades.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                  {winningTrades.length === 0 ? "No winning trades found for this month." : "No winning trades match the selected setup filter."}
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {displayedWinningTrades.map((t, idx) => {
                    const tradeR = (t.netR ?? (t.pnl / defaultPlannedRisk))
                    const d = new Date(Number(t.timestamp))
                    const formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    const psych = t.psychology || tradePsychology.find(p => p.tradeId === t.id)
                    const grade = psych?.executionGrade || "A"

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTrade(t)}
                        className="p-3 rounded-lg border border-border/60 bg-card/60 hover:border-emerald-500/40 hover:bg-card transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">#{idx + 1}</span>
                          <span className="text-xs font-mono text-muted-foreground shrink-0">{formattedDate}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                            t.direction === "long" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {t.direction}
                          </span>
                          <span className="font-bold text-xs text-foreground shrink-0">{t.instrument}</span>
                          <span className="text-xs text-foreground font-medium truncate max-w-[160px] md:max-w-[240px]">
                            {t.playbookName || "Discretionary"}
                          </span>
                          {t.resultVsExpectation && (
                            <span className="text-[11px] text-muted-foreground italic truncate hidden lg:inline max-w-[200px]">
                              "{t.resultVsExpectation}"
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                            Grade {grade}
                          </Badge>
                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-400 font-mono">
                              +{tradeR.toFixed(2)} R
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {fmtPnl(t.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground group-hover:text-foreground">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Form Questions */}
          <div className="space-y-5 pt-2">
            <div>
              <Label className={labelCls}>Which setups made the most impact? Are they repeatable?</Label>
              <Textarea className={textCls} value={winsImpactfulSetups} onChange={e => setWinsImpactfulSetups(e.target.value)} placeholder="e.g. NQ Opening Range Breakouts after 9:30 AM open..." />
            </div>
            <div>
              <Label className={labelCls}>Did I maximise winning days over losing days?</Label>
              <Textarea className={textCls} value={winsMaximisedDays} onChange={e => setWinsMaximisedDays(e.target.value)} placeholder="e.g. Scaled size when daily trend aligned..." />
            </div>
            <div>
              <Label className={labelCls}>What did my best trades have in common?</Label>
              <Textarea className={textCls} value={winsBestTradesCommon} onChange={e => setWinsBestTradesCommon(e.target.value)} placeholder="e.g. High patience, waited for VWAP retest before entry..." />
            </div>
            <div>
              <Label className={labelCls}>How did these wins affect my confidence and process?</Label>
              <Textarea className={textCls} value={winsAffectedConfidence} onChange={e => setWinsAffectedConfidence(e.target.value)} placeholder="e.g. Maintained discipline without over-leveraging next trade..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: LOSING TRADES AUDIT & IN-PLACE LIST ─────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.04)]">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" /> Losing Trades Audit
              </CardTitle>
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-rose-500/30 text-rose-400 bg-rose-500/10 font-bold font-mono">
                {losingTrades.length} Trades • -{totalLossR.toFixed(2)} R
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExtractLossPatterns}
                disabled={losingTrades.length === 0}
                className="h-8 text-xs font-semibold border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                title="Synthesize and auto-fill answers based on losing trades"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Auto-Extract Insights
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowLosingTrades(!showLosingTrades)}
                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {showLosingTrades ? <><EyeOff className="w-3.5 h-3.5 mr-1" /> Hide List</> : <><Eye className="w-3.5 h-3.5 mr-1" /> Audit Trades ({losingTrades.length})</>}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Review all stop-outs and mistakes in-place. Identify discipline breaches, execution slippage, or model errors.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">

          {/* Embedded Interactive Losing Trades Panel */}
          {showLosingTrades && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-background/50 space-y-3">
              {/* Mistake Breakdown Filter Chips */}
              {losingMistakesBreakdown.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pb-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Filter Leak:</span>
                  <button
                    type="button"
                    onClick={() => setActiveMistakeFilter(null)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                      activeMistakeFilter === null ? "bg-rose-500 text-black font-black" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({losingTrades.length})
                  </button>
                  {losingMistakesBreakdown.map(([mistake, stat]) => (
                    <button
                      key={mistake}
                      type="button"
                      onClick={() => setActiveMistakeFilter(activeMistakeFilter === mistake ? null : mistake)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                        activeMistakeFilter === mistake
                          ? "bg-rose-500 text-black font-bold"
                          : "bg-muted/30 border border-border/40 text-muted-foreground hover:text-foreground hover:border-rose-500/40"
                      )}
                    >
                      <span>{mistake}</span>
                      <span className="font-mono text-[10px] text-rose-400">-{stat.totalLossR.toFixed(1)}R ({stat.count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Trades List */}
              {displayedLosingTrades.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                  {losingTrades.length === 0 ? "No losing trades found for this month." : "No losing trades match the selected mistake filter."}
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {displayedLosingTrades.map((t, idx) => {
                    const tradeR = Math.abs(t.netR ?? (t.pnl / defaultPlannedRisk))
                    const d = new Date(Number(t.timestamp))
                    const formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    const psych = t.psychology || tradePsychology.find(p => p.tradeId === t.id)
                    const grade = psych?.executionGrade || (psych?.brokeRules ? "D" : "C")
                    const mistakeLabel = t.mistakes?.trim() || psych?.exitReason?.trim() || (psych?.brokeRules ? "Rule Breach" : "Stop Out")

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTrade(t)}
                        className="p-3 rounded-lg border border-border/60 bg-card/60 hover:border-rose-500/40 hover:bg-card transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">#{idx + 1}</span>
                          <span className="text-xs font-mono text-muted-foreground shrink-0">{formattedDate}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                            t.direction === "long" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {t.direction}
                          </span>
                          <span className="font-bold text-xs text-foreground shrink-0">{t.instrument}</span>
                          <span className="text-xs text-foreground font-medium truncate max-w-[140px] md:max-w-[200px]">
                            {t.playbookName || "Discretionary"}
                          </span>
                          <span className="text-[10px] font-semibold text-rose-400/90 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded truncate max-w-[180px] hidden sm:inline">
                            ⚠️ {mistakeLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-[10px] font-mono border-rose-500/30 text-rose-400 bg-rose-500/5">
                            Grade {grade}
                          </Badge>
                          <div className="text-right">
                            <div className="text-xs font-bold text-rose-400 font-mono">
                              -{tradeR.toFixed(2)} R
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {fmtPnl(t.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground group-hover:text-foreground">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Form Questions */}
          <div className="space-y-5 pt-2">
            <div>
              <Label className={labelCls}>Were my losses within planned risk? Did I oversize or overtrade?</Label>
              <Textarea className={textCls} value={lossesWithinRisk} onChange={e => setLossesWithinRisk(e.target.value)} placeholder="e.g. Kept stop loss at 20 ticks, no revenge sizing..." />
            </div>
            <div>
              <Label className={labelCls}>Did I follow my rules on losing trades?</Label>
              <Textarea className={textCls} value={lossesFollowedRules} onChange={e => setLossesFollowedRules(e.target.value)} placeholder="e.g. Accepted stop loss gracefully without moving it..." />
            </div>
            <div>
              <Label className={labelCls}>What recurring loss patterns emerged this month?</Label>
              <Textarea className={textCls} value={lossesPatterns} onChange={e => setLossesPatterns(e.target.value)} placeholder="e.g. Chasing chop during 11:30 AM - 1:30 PM lunch hour..." />
            </div>
            <div>
              <Label className={labelCls}>Lessons learned vs repeated mistakes</Label>
              <Textarea className={textCls} value={lossesLearnedOrRepeated} onChange={e => setLossesLearnedOrRepeated(e.target.value)} placeholder="e.g. Eliminated FOMO entry after 10:30 AM..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: OVERALL DISCIPLINE & PROCESS SCORE ──────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-primary/20">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-primary">
            <ShieldCheck className="w-4 h-4" /> Overall Discipline &amp; Process Score
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Has overall discipline improved compared to last month?</Label>
            <Textarea className={textCls} value={overallDisciplineImproved} onChange={e => setOverallDisciplineImproved(e.target.value)} placeholder="e.g. Followed risk management 95% of trading days..." />
          </div>
          <div>
            <Label className={labelCls}>Did I follow prop firm rules strictly?</Label>
            <Textarea className={textCls} value={overallFollowedRulesMore} onChange={e => setOverallFollowedRulesMore(e.target.value)} placeholder="e.g. Zero daily loss limit breaches..." />
          </div>
          <div>
            <Label className={labelCls}>Consistency in journaling &amp; state checks</Label>
            <Textarea className={textCls} value={overallConsistentJournaling} onChange={e => setOverallConsistentJournaling(e.target.value)} placeholder="e.g. Logged 100% of trades with entry notes..." />
          </div>
          <div>
            <Label className={labelCls}>Non-negotiable commitment for next month</Label>
            <Textarea className={textCls} value={overallCommitNextMonth} onChange={e => setOverallCommitNextMonth(e.target.value)} placeholder="e.g. No trading during major 8:30 AM CPI / NFP news releases..." />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: MONTH VS MONTH COMPARISON ───────────────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-amber-500/20">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-amber-400">
              <TrendingUp className="w-4 h-4" /> Month-Over-Month Progression
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAIComparison}
                disabled={runningAI || loading}
                className="h-8 text-xs font-bold border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/60"
              >
                {runningAI
                  ? <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Comparing…</>
                  : <><Sparkles className="w-3 h-3 mr-1.5" />Run AI Comparison</>
                }
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            Reads your written recaps for this month and last month. Requires 2 saved monthly recaps.
            AI output fills the fields below — review and edit before saving.
          </p>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Did I repeat any mistakes from last month?</Label>
            <Textarea className={textCls} value={monthVsMonthRepeatedMistakes} onChange={e => setMonthVsMonthRepeatedMistakes(e.target.value)} placeholder="e.g. Entering before confirmation — same as last month's pattern..." />
          </div>
          <div>
            <Label className={labelCls}>Which previous commitments were successfully kept?</Label>
            <Textarea className={textCls} value={monthVsMonthCommitmentsKept} onChange={e => setMonthVsMonthCommitmentsKept(e.target.value)} placeholder="e.g. Stopped trading the lunch session as committed last month..." />
          </div>
          <div>
            <Label className={labelCls}>Highest-leverage adjustment for the upcoming month</Label>
            <Textarea className={textCls} value={monthVsMonthHighestLeverage} onChange={e => setMonthVsMonthHighestLeverage(e.target.value)} placeholder="e.g. Eliminate all entries between 11:30 AM–1 PM NY..." />
          </div>
        </CardContent>
      </Card>

      {/* ── IN-PLACE TRADE INSPECTOR DIALOG ─────────────────────────────────── */}
      <Dialog open={!!selectedTrade} onOpenChange={(open) => !open && setSelectedTrade(null)}>
        {selectedTrade && (
          <DialogContent className="w-full sm:max-w-3xl bg-card border-border/80 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader className="pb-3 border-b border-border/50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={cn(
                    "text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider",
                    selectedTrade.direction === "long" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                  )}>
                    {selectedTrade.direction}
                  </span>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    {selectedTrade.instrument} &mdash; {selectedTrade.playbookName || "Discretionary Trade"}
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "text-xs font-mono font-bold px-2.5 py-1",
                    selectedTrade.pnl >= 0 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                  )}>
                    {selectedTrade.pnl >= 0 ? "+" : ""}{(selectedTrade.netR ?? (selectedTrade.pnl / defaultPlannedRisk)).toFixed(2)} R
                    <span className="mx-1.5 opacity-40">&bull;</span>
                    {fmtPnl(selectedTrade.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                  </Badge>
                </div>
              </div>

              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{new Date(Number(selectedTrade.timestamp)).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span>&bull;</span>
                <span>Session: <strong className="text-foreground">{selectedTrade.session || "N/A"}</strong></span>
              </DialogDescription>
            </DialogHeader>

            {/* Financial Telemetry 4-Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Entry Price</span>
                <span className="font-mono text-sm font-bold text-foreground">{selectedTrade.entry}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Exit Price</span>
                <span className="font-mono text-sm font-bold text-foreground">{selectedTrade.exit}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Contracts / Size</span>
                <span className="font-mono text-sm font-bold text-foreground">{selectedTrade.contracts}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Net Outcome</span>
                <span className={cn("font-mono text-sm font-bold", selectedTrade.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {selectedTrade.pnl >= 0 ? "+" : ""}{(selectedTrade.netR ?? (selectedTrade.pnl / defaultPlannedRisk)).toFixed(2)} R
                </span>
              </div>
            </div>

            {/* Execution Quality & Psychology */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Execution Quality &amp; Psychology
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="border-border bg-card font-semibold px-2.5 py-1">
                  Grade: <strong className="ml-1 text-foreground">{selectedTrade.psychology?.executionGrade || "A"}</strong>
                </Badge>
                {selectedTrade.psychology?.exitReason && (
                  <Badge variant="outline" className="border-border bg-card font-semibold px-2.5 py-1">
                    Exit: <strong className="ml-1 text-foreground">{selectedTrade.psychology.exitReason}</strong>
                  </Badge>
                )}
                {selectedTrade.psychology?.brokeRules ? (
                  <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border-rose-500/40 font-semibold px-2.5 py-1">
                    Broke Trading Rules
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold px-2.5 py-1">
                    Followed Rules
                  </Badge>
                )}
                {selectedTrade.psychology?.emotionAffected && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold px-2.5 py-1">
                    Emotion-Affected
                  </Badge>
                )}
              </div>
            </div>

            {/* Qualitative Notes */}
            <div className="space-y-3">
              {selectedTrade.resultVsExpectation && (
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Result vs Expectation</div>
                  <div className="text-xs text-foreground leading-relaxed">{selectedTrade.resultVsExpectation}</div>
                </div>
              )}

              {(selectedTrade.mistakes || selectedTrade.executionImprovement) && (
                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/25 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Mistakes &amp; Execution Improvement</div>
                  <div className="text-xs text-foreground leading-relaxed">
                    {selectedTrade.mistakes || selectedTrade.executionImprovement}
                  </div>
                </div>
              )}

              {selectedTrade.notes && (
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trade Notes / Logic</div>
                  <div className="text-xs text-foreground leading-relaxed">{selectedTrade.notes}</div>
                </div>
              )}
            </div>

            {/* Screenshots */}
            {selectedTrade.screenshots && selectedTrade.screenshots.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Trade Screenshots ({selectedTrade.screenshots.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTrade.screenshots.map((s: any, idx: number) => {
                    const url = typeof s === "string" ? s : s?.url
                    if (!url) return null
                    return (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group block rounded-xl overflow-hidden border border-border/60 hover:border-primary/50 transition-all bg-black/40">
                        <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-44 object-contain group-hover:scale-[1.02] transition-transform" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => window.open(`/app/journal/${selectedTrade.id}`, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Full Trade in Journal
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedTrade(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
