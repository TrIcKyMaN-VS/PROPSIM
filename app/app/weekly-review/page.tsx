"use client"

import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BrainCircuit, Target, TrendingUp, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useState, useEffect } from "react"

export default function WeeklyReviewPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades).filter(t => t.accountId === activeAccountId)
  const psychology = usePropStore(s => s.tradePsychology)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  // Naive week key calculation (e.g. "2026-W23")
  const getWeekKey = () => {
    const d = new Date()
    const year = d.getFullYear()
    const oneJan = new Date(year, 0, 1)
    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
    const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7)
    return `${year}-W${week}`
  }

  // Filter trades by the current week (past 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklyTrades = trades.filter(t => Number(t.timestamp) >= oneWeekAgo)
  
  const pnl = weeklyTrades.reduce((s, t) => s + t.pnl, 0)
  const wins = weeklyTrades.filter(t => t.pnl > 0)
  const winRate = weeklyTrades.length > 0 ? (wins.length / weeklyTrades.length) * 100 : 0
  
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(weeklyTrades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0)

  const bestTrade = [...weeklyTrades].sort((a, b) => b.pnl - a.pnl)[0]
  const worstTrade = [...weeklyTrades].sort((a, b) => a.pnl - b.pnl)[0]

  // Count rule breaks
  const ruleBreaks = weeklyTrades.map(t => psychology.find(p => p.tradeId === t.id)?.brokeRules).filter(Boolean).length

  useEffect(() => {
    async function loadCached() {
      try {
        const { getAiReviewAction } = await import("@/app/actions/ai-actions")
        const review = await getAiReviewAction("WEEKLY", getWeekKey())
        if (review) {
          setAnalysis(JSON.parse(review.summary))
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadCached()
  }, [])

  const handleTalkToTherapist = async () => {
    if (weeklyTrades.length === 0) {
      toast.error("You need at least one trade this week to generate an analysis.")
      return
    }
    setLoading(true)
    try {
      const { generateWeeklyReviewAction } = await import("@/app/actions/ai-actions")
      const payloadTrades = weeklyTrades.map(t => ({
        id: t.id,
        instrument: t.instrument,
        pnl: t.pnl,
        direction: t.direction,
        session: t.session
      }))
      const payloadPsychology = psychology.filter(p => weeklyTrades.some(t => t.id === p.tradeId))
      
      const res = await generateWeeklyReviewAction(payloadTrades, payloadPsychology, getWeekKey())
      setAnalysis(res)
      toast.success("AI Therapist analysis complete!")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate analysis.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Review Center</h1>
          <p className="text-muted-foreground">End of week performance and psychological reflection.</p>
        </div>
        <Button onClick={handleTalkToTherapist} disabled={loading}>
          <BrainCircuit className="w-4 h-4 mr-2" /> 
          {loading ? "AI Therapist is analyzing..." : "Talk to AI Therapist"}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Weekly P&L</CardTitle></CardHeader>
          <CardContent><div className={`text-3xl font-bold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>${pnl.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{winRate.toFixed(0)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Profit Factor</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{profitFactor.toFixed(2)}</div></CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Rule Violations</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{ruleBreaks}</div></CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Best Trade</CardTitle></CardHeader>
          <CardContent>
            {bestTrade ? (
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>{bestTrade.instrument}</span>
                  <span className="text-success">+${bestTrade.pnl.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground">Session: {bestTrade.session}</div>
              </div>
            ) : <span className="text-muted-foreground">No trades this week.</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Worst Trade</CardTitle></CardHeader>
          <CardContent>
            {worstTrade ? (
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>{worstTrade.instrument}</span>
                  <span className="text-destructive">-${Math.abs(worstTrade.pnl).toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground">Session: {worstTrade.session}</div>
              </div>
            ) : <span className="text-muted-foreground">No trades this week.</span>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader><CardTitle>AI Therapist Weekly Summary</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {analysis ? (
            <>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
                "{analysis.summary}"
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground text-[10px]">Execution Score</span>
                  <div className="text-xl font-bold text-primary">{analysis.executionScore} / 100</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground text-[10px]">Psychology Score</span>
                  <div className="text-xl font-bold text-primary">{analysis.psychologyScore} / 100</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground text-[10px]">Common Emotion</span>
                  <div className="text-lg font-bold text-foreground capitalize">{analysis.mostCommonEmotion || "N/A"}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground text-[10px]">Common Mistake</span>
                  <div className="text-lg font-bold text-destructive capitalize">{analysis.mostCommonMistake || "None"}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="p-3 rounded border bg-card">
                  <span className="text-xs font-bold uppercase text-muted-foreground text-[10px]">Profitable Behavior</span>
                  <p className="text-sm text-success font-medium mt-1">{analysis.mostProfitableBehavior || "N/A"}</p>
                </div>
                <div className="p-3 rounded border bg-card">
                  <span className="text-xs font-bold uppercase text-muted-foreground text-[10px]">Actionable Focus Goal</span>
                  <p className="text-sm text-warning font-medium mt-1">{analysis.recommendedFocus || "N/A"}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground italic mb-4">"Click 'Talk to AI Therapist' to generate your personalized weekly breakdown."</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
