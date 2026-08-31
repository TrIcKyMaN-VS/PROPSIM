"use client"

import { useState, useEffect, useMemo } from "react"
import { getMonthlyRecap, saveMonthlyRecap } from "@/app/actions/journal-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Save, Loader2, Trophy, AlertTriangle, ShieldCheck, TrendingUp, Sparkles, Calendar } from "lucide-react"
import { toast } from "sonner"
import { usePropStore } from "@/lib/store"
import { cn } from "@/lib/utils"

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

  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades) || []
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100

  const allTrades = useMemo(() => {
    if (!activeAccountId) return trades
    return trades.filter(t => t.accountId === activeAccountId)
  }, [trades, activeAccountId])

  const monthTotalNetR = useMemo(() => {
    return allTrades.filter(t => {
      if (!t.timestamp) return false
      const ts = Number(t.timestamp)
      if (isNaN(ts)) return false
      const d = new Date(ts)
      if (isNaN(d.getTime())) return false
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      return mStr === month
    }).reduce((sum, t) => sum + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0)
  }, [allTrades, month, defaultPlannedRisk])

  // Header
  const [daysTradedCount, setDaysTradedCount] = useState("")
  const [netR, setNetR] = useState("")

  // Winning Trades
  const [winsImpactfulSetups, setWinsImpactfulSetups] = useState("")
  const [winsMaximisedDays, setWinsMaximisedDays] = useState("")
  const [winsBestTradesCommon, setWinsBestTradesCommon] = useState("")
  const [winsAffectedConfidence, setWinsAffectedConfidence] = useState("")

  // Losing Trades
  const [lossesWithinRisk, setLossesWithinRisk] = useState("")
  const [lossesFollowedRules, setLossesFollowedRules] = useState("")
  const [lossesPatterns, setLossesPatterns] = useState("")
  const [lossesLearnedOrRepeated, setLossesLearnedOrRepeated] = useState("")

  // Overall
  const [overallDisciplineImproved, setOverallDisciplineImproved] = useState("")
  const [overallFollowedRulesMore, setOverallFollowedRulesMore] = useState("")
  const [overallConsistentJournaling, setOverallConsistentJournaling] = useState("")
  const [overallCommitNextMonth, setOverallCommitNextMonth] = useState("")

  // Month vs Month
  const [monthVsMonthRepeatedMistakes, setMonthVsMonthRepeatedMistakes] = useState("")
  const [monthVsMonthCommitmentsKept, setMonthVsMonthCommitmentsKept] = useState("")
  const [monthVsMonthHighestLeverage, setMonthVsMonthHighestLeverage] = useState("")

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
        setDaysTradedCount(""); setNetR("")
        setWinsImpactfulSetups(""); setWinsMaximisedDays(""); setWinsBestTradesCommon(""); setWinsAffectedConfidence("")
        setLossesWithinRisk(""); setLossesFollowedRules(""); setLossesPatterns(""); setLossesLearnedOrRepeated("")
        setOverallDisciplineImproved(""); setOverallFollowedRulesMore(""); setOverallConsistentJournaling(""); setOverallCommitNextMonth("")
        setMonthVsMonthRepeatedMistakes(""); setMonthVsMonthCommitmentsKept(""); setMonthVsMonthHighestLeverage("")
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [month])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveMonthlyRecap(month, {
        daysTradedCount: daysTradedCount ? parseInt(daysTradedCount) : null,
        netR,
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      
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
            Comprehensive end-of-month execution review and strategic behavioral audit.
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
              className={cn("h-10 text-xs font-black font-mono w-36 bg-card/80 border-border/80 cursor-not-allowed pr-12", monthTotalNetR >= 0 ? "text-cyan-400" : "text-rose-400")}
              placeholder="Net R"
              value={`${monthTotalNetR >= 0 ? "+" : ""}${monthTotalNetR.toFixed(2)}R`}
              readOnly
            />
            <Badge variant="outline" className="absolute right-2 top-2.5 font-mono text-[9px] px-1 py-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 uppercase font-bold">
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

      {/* ── WINNING TRADES ───────────────────────────────────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.04)]">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-emerald-400">
            <Trophy className="w-4 h-4" /> Winning Trades Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
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
        </CardContent>
      </Card>

      {/* ── LOSING TRADES ────────────────────────────────────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.04)]">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" /> Losing Trades Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
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
        </CardContent>
      </Card>

      {/* ── OVERALL DISCIPLINE ────────────────────────────────────────────── */}
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

      {/* ── MONTH VS MONTH COMPARISON ───────────────────────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-amber-500/20">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-amber-400">
            <TrendingUp className="w-4 h-4" /> Month-Over-Month Progression
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Did I repeat any mistakes from last month?</Label>
            <Textarea className={textCls} value={monthVsMonthRepeatedMistakes} onChange={e => setMonthVsMonthRepeatedMistakes(e.target.value)} placeholder="..." />
          </div>
          <div>
            <Label className={labelCls}>Which previous commitments were successfully kept?</Label>
            <Textarea className={textCls} value={monthVsMonthCommitmentsKept} onChange={e => setMonthVsMonthCommitmentsKept(e.target.value)} placeholder="..." />
          </div>
          <div>
            <Label className={labelCls}>Highest-leverage adjustment for the upcoming month</Label>
            <Textarea className={textCls} value={monthVsMonthHighestLeverage} onChange={e => setMonthVsMonthHighestLeverage(e.target.value)} placeholder="..." />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
