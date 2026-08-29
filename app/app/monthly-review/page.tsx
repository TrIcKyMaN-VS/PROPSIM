"use client"

import { useState, useEffect } from "react"
import { getMonthlyRecap, saveMonthlyRecap } from "@/app/actions/journal-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePropStore } from "@/lib/store"

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const textCls = "min-h-[90px] text-sm mt-1"
const inputCls = "h-9 text-sm mt-1"
const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground"

export default function MonthlyRecapPage() {
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeAccountId = usePropStore(s => s.activeAccountId)
  const allTrades = usePropStore(s => s.tradesFor(activeAccountId!))
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100

  const monthTotalNetR = allTrades.filter(t => {
    const d = new Date(t.timestamp)
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    return mStr === month
  }).reduce((sum, t) => sum + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0)

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
      toast.success("Monthly recap saved!")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Recap</h1>
          <p className="text-muted-foreground text-sm">End-of-month performance review</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Input
            className="h-9 text-sm w-28"
            type="number"
            placeholder="Days traded"
            value={daysTradedCount}
            onChange={e => setDaysTradedCount(e.target.value)}
          />
          <Input
            className="h-9 text-sm w-32 bg-muted/50 cursor-not-allowed"
            placeholder="Net R"
            value={`${monthTotalNetR > 0 ? "+" : ""}${monthTotalNetR.toFixed(2)}R`}
            readOnly
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {/* ── WINNING TRADES ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">— Winning Trades —</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Which setups made the most impact? Are they repeatable?</Label>
            <Textarea className={textCls} value={winsImpactfulSetups} onChange={e => setWinsImpactfulSetups(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Did I maximise winning days over losing days?</Label>
            <Textarea className={textCls} value={winsMaximisedDays} onChange={e => setWinsMaximisedDays(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>What did my best trades have in common?</Label>
            <Textarea className={textCls} value={winsBestTradesCommon} onChange={e => setWinsBestTradesCommon(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>How did these wins affect my confidence and process?</Label>
            <Textarea className={textCls} value={winsAffectedConfidence} onChange={e => setWinsAffectedConfidence(e.target.value)} placeholder="…" />
          </div>
        </CardContent>
      </Card>

      {/* ── LOSING TRADES ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">— Losing Trades —</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Were my losses within planned risk? Did I oversize or overtrade?</Label>
            <Textarea className={textCls} value={lossesWithinRisk} onChange={e => setLossesWithinRisk(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Did I follow my rules on losing trades?</Label>
            <Textarea className={textCls} value={lossesFollowedRules} onChange={e => setLossesFollowedRules(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>What patterns show up in my losing trades?</Label>
            <Textarea className={textCls} value={lossesPatterns} onChange={e => setLossesPatterns(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Did I learn from my losses, or repeat the same mistakes?</Label>
            <Textarea className={textCls} value={lossesLearnedOrRepeated} onChange={e => setLossesLearnedOrRepeated(e.target.value)} placeholder="…" />
          </div>
        </CardContent>
      </Card>

      {/* ── OVERALL ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">— Overall —</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Did my discipline, consistency and mindset improve vs last month?</Label>
            <Textarea className={textCls} value={overallDisciplineImproved} onChange={e => setOverallDisciplineImproved(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Did I follow my rules more than last month? (rule breaks: X vs Y)</Label>
            <Textarea className={textCls} value={overallFollowedRulesMore} onChange={e => setOverallFollowedRulesMore(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Was I consistent with journaling and weekly reviews?</Label>
            <Input className={inputCls} value={overallConsistentJournaling} onChange={e => setOverallConsistentJournaling(e.target.value)} placeholder="Yes / No / Partially" />
          </div>
          <div>
            <Label className={labelCls}>What 1–2 changes will I commit to next month?</Label>
            <Textarea className={textCls} value={overallCommitNextMonth} onChange={e => setOverallCommitNextMonth(e.target.value)} placeholder="…" />
          </div>
        </CardContent>
      </Card>

      {/* ── MONTH VS MONTH ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">— Month vs Month —</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div>
            <Label className={labelCls}>Repeated mistakes found vs previous month</Label>
            <Textarea className={textCls} value={monthVsMonthRepeatedMistakes} onChange={e => setMonthVsMonthRepeatedMistakes(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Commitments from last month I actually kept</Label>
            <Textarea className={textCls} value={monthVsMonthCommitmentsKept} onChange={e => setMonthVsMonthCommitmentsKept(e.target.value)} placeholder="…" />
          </div>
          <div>
            <Label className={labelCls}>Highest-leverage change for next month</Label>
            <Textarea className={textCls} value={monthVsMonthHighestLeverage} onChange={e => setMonthVsMonthHighestLeverage(e.target.value)} placeholder="…" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
