"use client"

import { useState, useMemo, useEffect } from "react"
import { usePropStore } from "@/lib/store"
import { analyzeTraderDnaAction, getHistoricalAiReviewsAction } from "@/app/actions/ai-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
  Activity,
  Clock,
  Award,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  ChevronDown,
  Bookmark,
  CalendarDays,
  ListFilter
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Trade } from "@/lib/types"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { evaluate } from "@/lib/rule-engine"
import { AiCoachChat } from "@/components/app/ai-coach-chat"

// ── Circular Progress Gauge for Survival Score ──────────────────────────────

function CircularGauge({ score, label, colorClass }: { score: number; label: string; colorClass: string }) {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-muted/20"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="72"
            cy="72"
            r={radius}
            className={cn("transition-all duration-1000 ease-out", colorClass.replace("text-", "stroke-"))}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tight">{score}%</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Pass Probability</span>
        </div>
      </div>
      <span className={cn("text-sm font-semibold mt-3 text-center", colorClass)}>{label}</span>
    </div>
  )
}

// ── Main UI Component ────────────────────────────────────────────────────────

export function CoachView() {
  const accounts = usePropStore((s) => s.accounts)
  const activeAccountId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)
  const tradePsychology = usePropStore((s) => s.tradePsychology)

  const account = accounts.find((a) => a.id === activeAccountId)
  const accountTrades = useMemo(() => {
    return trades.filter((t) => t.accountId === activeAccountId)
  }, [trades, activeAccountId])

  // UI state
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [historicalReports, setHistoricalReports] = useState<any[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"chat" | "coach" | "insights" | "leaderboard">("chat")

  // Load historical reviews
  const loadHistory = async () => {
    try {
      const history = await getHistoricalAiReviewsAction()
      setHistoricalReports(history)
      if (history.length > 0 && !selectedReportId) {
        // Automatically default to showing latest cached analysis if available
        setAnalysis(JSON.parse(history[0].summary))
        setSelectedReportId(history[0].id)
      }
    } catch {}
  }

  useEffect(() => {
    if (activeAccountId) {
      loadHistory()
    }
  }, [activeAccountId])

  const handleSelectReport = (reportId: string) => {
    setSelectedReportId(reportId)
    const report = historicalReports.find(r => r.id === reportId)
    if (report) {
      setAnalysis(JSON.parse(report.summary))
      toast.success("Loaded historical report")
    }
  }

  const handleAnalyze = async () => {
    if (accountTrades.length < 1) {
      toast.error("Log at least one trade to generate an AI analysis.")
      return
    }
    setLoading(true)
    try {
      const result = await analyzeTraderDnaAction(accountTrades)
      setAnalysis(result)
      toast.success("AI Analysis Complete")
      await loadHistory()
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze trades.")
    } finally {
      setLoading(false)
    }
  }

  // ── Deterministic Calculations ──────────────────────────────────────────

  const totalTrades = accountTrades.length
  
  // Averages quality scores
  const avgSetup = totalTrades ? Math.round(accountTrades.reduce((s, t) => s + (t.setupQualityScore ?? 70), 0) / totalTrades) : 0
  const avgEntry = totalTrades ? Math.round(accountTrades.reduce((s, t) => s + (t.entryQualityScore ?? 80), 0) / totalTrades) : 0
  const avgExit = totalTrades ? Math.round(accountTrades.reduce((s, t) => s + (t.exitQualityScore ?? 80), 0) / totalTrades) : 0
  const avgRisk = totalTrades ? Math.round(accountTrades.reduce((s, t) => s + (t.riskScore ?? 85), 0) / totalTrades) : 0
  const avgDiscipline = totalTrades ? Math.round(accountTrades.reduce((s, t) => s + (t.disciplineScore ?? 90), 0) / totalTrades) : 0

  // Session Intelligence calculations
  const sessionStats = useMemo(() => {
    const sessions = ["New York AM", "New York PM", "London", "Asia"]
    const results = sessions.map(s => {
      const sTrades = accountTrades.filter(t => t.session === s)
      const wins = sTrades.filter(t => t.pnl > 0)
      const losses = sTrades.filter(t => t.pnl < 0)
      const winRate = sTrades.length ? (wins.length / sTrades.length) * 100 : 0
      
      const grossWins = wins.reduce((sum, t) => sum + t.pnl, 0)
      const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))
      const profitFactor = grossLosses ? grossWins / grossLosses : (grossWins > 0 ? 99 : 0)
      
      const totalPnL = sTrades.reduce((sum, t) => sum + t.pnl, 0)
      
      // Calculate Average R
      const avgLossVal = grossLosses / Math.max(1, losses.length) || 100
      const getTradeRValue = (t: Trade) => {
        const risk = t.stopLoss && Math.abs(t.entry - t.stopLoss) > 0 
          ? Math.abs(t.entry - t.stopLoss) 
          : (avgLossVal || 1)
        return t.pnl / (risk * (t.contracts || 1))
      }
      
      const avgR = sTrades.length 
        ? sTrades.reduce((sum, t) => sum + getTradeRValue(t), 0) / sTrades.length
        : 0

      return { session: s, trades: sTrades.length, winRate, profitFactor, avgR, pnl: totalPnL }
    })

    const activeSessions = results.filter(r => r.trades > 0)
    const best = activeSessions.length ? [...activeSessions].sort((a, b) => b.pnl - a.pnl)[0] : null
    const worst = activeSessions.length ? [...activeSessions].sort((a, b) => a.pnl - b.pnl)[0] : null

    return { results, best, worst }
  }, [accountTrades])

  // Playbook Setup Rankings
  const playbookStats = useMemo(() => {
    const playbooksMap: Record<string, Trade[]> = {}
    accountTrades.forEach(t => {
      const name = t.playbookName || "Unlinked"
      if (!playbooksMap[name]) playbooksMap[name] = []
      playbooksMap[name].push(t)
    })

    const results = Object.entries(playbooksMap).map(([name, pTrades]) => {
      const wins = pTrades.filter(t => t.pnl > 0)
      const losses = pTrades.filter(t => t.pnl < 0)
      const winRate = pTrades.length ? (wins.length / pTrades.length) * 100 : 0
      
      const grossWins = wins.reduce((sum, t) => sum + t.pnl, 0)
      const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))
      const profitFactor = grossLosses ? grossWins / grossLosses : (grossWins > 0 ? 99 : 0)
      
      const totalPnL = pTrades.reduce((sum, t) => sum + t.pnl, 0)
      const expectancy = pTrades.length ? totalPnL / pTrades.length : 0

      // Calculate Average R
      const avgLossVal = grossLosses / Math.max(1, losses.length) || 100
      const getTradeRValue = (t: Trade) => {
        const risk = t.stopLoss && Math.abs(t.entry - t.stopLoss) > 0 
          ? Math.abs(t.entry - t.stopLoss) 
          : (avgLossVal || 1)
        return t.pnl / (risk * (t.contracts || 1))
      }
      const avgR = pTrades.reduce((sum, t) => sum + getTradeRValue(t), 0) / pTrades.length

      return { name, trades: pTrades.length, winRate, profitFactor, expectancy, avgR, pnl: totalPnL }
    })

    const best = results.length ? [...results].sort((a, b) => b.expectancy - a.expectancy)[0] : null
    const worst = results.length ? [...results].sort((a, b) => a.expectancy - b.expectancy)[0] : null

    return { results, best, worst }
  }, [accountTrades])

  // Circular survival score calculation
  const survivalData = useMemo(() => {
    if (!account) return { score: 50, label: "Unknown Status", color: "text-muted-foreground" }
    
    // Evaluate active status
    const status = evaluate(account.rules, accountTrades)
    if (status.status === "failed") {
      return { score: 0, label: "Failed Challenge Rules", color: "text-destructive" }
    }
    
    let score = 75 // baseline
    
    // 1. Drawdown usage penalty
    score -= (status.drawdownUsedPct || 0) * 0.4
    
    // 2. Daily loss usage penalty
    score -= (status.dailyLossUsedPct || 0) * 0.3
    
    // 3. Win rate adjustment
    const wr = totalTrades ? (accountTrades.filter(t => t.pnl > 0).length / totalTrades) * 100 : 0
    if (totalTrades > 0) {
      if (wr < 40) score -= 15
      else if (wr > 55) score += 10
    }
    
    // 4. Profit factor adjustment
    const wins = accountTrades.filter(t => t.pnl > 0)
    const losses = accountTrades.filter(t => t.pnl < 0)
    const grossW = wins.reduce((s, t) => s + t.pnl, 0)
    const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    const pf = grossL ? grossW / grossL : (grossW > 0 ? 3.0 : 1.0)
    if (totalTrades > 0) {
      if (pf < 1.0) score -= 20
      else if (pf > 1.8) score += 12
    }
    
    // 5. Rule violation warnings (soft violations)
    if (status.violations.length > 0) {
      score -= status.violations.length * 10
    }
    
    // 6. Discipline/Risk scores impact
    if (totalTrades > 0) {
      score += (avgDiscipline - 80) * 0.15
      score += (avgRisk - 80) * 0.15
    }
    
    const finalScore = Math.min(100, Math.max(0, Math.round(score)))
    
    let label = "Stable Progress"
    let color = "text-amber-500"
    if (finalScore >= 90) { label = "Elite Trader profile"; color = "text-violet-500" }
    else if (finalScore >= 75) { label = "High Survival Probability"; color = "text-emerald-500" }
    else if (finalScore >= 50) { label = "Stable Progress"; color = "text-amber-500" }
    else if (finalScore >= 30) { label = "Vulnerable Account"; color = "text-orange-500" }
    else { label = "Critical Breach Risk"; color = "text-destructive" }
    
    return { score: finalScore, label, color }
  }, [account, accountTrades, totalTrades, avgDiscipline, avgRisk])

  // Deterministic Mistake Analytics & Expectancy improvement calculation
  const programmaticMistakes = useMemo(() => {
    if (totalTrades === 0) return []
    
    const list = [
      {
        type: "FOMO Entries",
        filter: (t: Trade, p: any) => p?.preFeeling?.toLowerCase().includes("fomo") || p?.hesitated
      },
      {
        type: "Revenge Trading",
        filter: (t: Trade, p: any) => p?.emotionAffected && p?.brokeRules
      },
      {
        type: "Chasing",
        filter: (t: Trade, p: any) => p?.hesitated || (t.entryQualityScore && t.entryQualityScore < 60)
      },
      {
        type: "Overtrading",
        filter: (t: Trade, p: any) => {
          const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York" })
          const targetDate = fmt.format(new Date(Number(t.timestamp)))
          const dayTrades = accountTrades.filter(x => fmt.format(new Date(Number(x.timestamp))) === targetDate)
          return dayTrades.length > 5
        }
      },
      {
        type: "Early Exits",
        filter: (t: Trade, p: any) => p?.exitReason?.toLowerCase().includes("early") || (t.exitQualityScore && t.exitQualityScore < 60)
      },
      {
        type: "Late Exits",
        filter: (t: Trade, p: any) => p?.exitReason?.toLowerCase().includes("late") || p?.movedStop
      },
      {
        type: "Rule Violations",
        filter: (t: Trade, p: any) => p?.brokeRules
      },
      {
        type: "Trading During Low Edge Conditions",
        filter: (t: Trade, p: any) => {
          const sessionPnl = accountTrades.filter(x => x.session === t.session).reduce((s, x) => s + x.pnl, 0)
          return sessionPnl < 0
        }
      }
    ]
    
    const results = []
    const baseExpectancy = accountTrades.reduce((s, t) => s + t.pnl, 0) / totalTrades
    
    for (const item of list) {
      const matchingTrades = accountTrades.filter(t => {
        const p = tradePsychology.find(x => x.tradeId === t.id)
        return item.filter(t, p)
      })
      
      if (matchingTrades.length > 0) {
        const totalCost = matchingTrades.reduce((s, t) => s + (t.pnl < 0 ? Math.abs(t.pnl) : 0), 0)
        const frequency = matchingTrades.length
        
        // Remove matching trades and calculate new expectancy
        const nonMatchingTrades = accountTrades.filter(t => !matchingTrades.includes(t))
        const newExpectancy = nonMatchingTrades.length > 0
          ? nonMatchingTrades.reduce((s, t) => s + t.pnl, 0) / nonMatchingTrades.length
          : 0
        
        const expectancyImprovement = baseExpectancy !== 0
          ? ((newExpectancy - baseExpectancy) / Math.abs(baseExpectancy)) * 100
          : 0
          
        results.push({
          type: item.type,
          cost: totalCost,
          frequency,
          pctOfTotal: Math.round((frequency / totalTrades) * 100),
          improvement: expectancyImprovement > 0 ? Math.round(expectancyImprovement) : 0
        })
      }
    }
    
    return results.sort((a, b) => b.cost - a.cost)
  }, [accountTrades, tradePsychology, totalTrades])

  // Leaderboard data
  const leaderboard = useMemo(() => {
    const bestTrades = [...accountTrades].sort((a, b) => b.pnl - a.pnl).slice(0, 3)
    const worstTrades = [...accountTrades].sort((a, b) => a.pnl - b.pnl).slice(0, 3)
    const highestSetup = [...accountTrades].sort((a, b) => (b.setupQualityScore ?? 0) - (a.setupQualityScore ?? 0)).slice(0, 3)
    const lowestExit = [...accountTrades].sort((a, b) => (a.exitQualityScore ?? 100) - (b.exitQualityScore ?? 100)).slice(0, 3)
    
    return { bestTrades, worstTrades, highestSetup, lowestExit }
  }, [accountTrades])

  if (!account) {
    return (
      <div className="mx-auto max-w-5xl py-12">
        <h1 className="text-2xl font-semibold tracking-tight">AI Coach</h1>
        <div className="mt-6 rounded-xl border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          No active challenge. Select or start a challenge to launch the AI Trade Intelligence Coach.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Page Header & Select ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" /> AI Coach &amp; Trade Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Deterministic trade intelligence scoring, mistakes cost analyzer, and weekly AI coaching reviews.
          </p>
        </div>
        
        {activeTab === "coach" && (
          <div className="flex items-center gap-2">
            {historicalReports.length > 0 && (
              <select
                value={selectedReportId}
                onChange={(e) => handleSelectReport(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="" disabled>-- Select Historical Report --</option>
                {historicalReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    Report: {new Date(report.createdAt).toLocaleDateString()} ({report.score1 ? `Survival: ${report.score1}%` : "No Score"}){report.source ? ` [${report.source.toUpperCase()}]` : ""}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={handleAnalyze} disabled={loading || totalTrades < 1}>
              {loading ? "Analyzing Engine..." : "Generate AI Report"}
              <Brain className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Source Indicator & Fallback Warning Banner */}
      {analysis && activeTab === "coach" && (
        <div className="flex flex-col gap-3">
          {(analysis.isFallback || (analysis.metadata?.provider || analysis.source) === "PROGRAMMATIC") && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3.5 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
              <span>AI temporarily unavailable. Showing programmatic analysis.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {(() => {
              const provider = (analysis.metadata?.provider || analysis.source || "PROGRAMMATIC").toUpperCase()
              if (provider === "GEMINI") {
                return (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold px-2.5 py-1 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI Powered (Gemini)
                  </Badge>
                )
              }
              if (provider === "OPENAI") {
                return (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold px-2.5 py-1 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI Powered (OpenAI)
                  </Badge>
                )
              }
              return (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 font-semibold px-2.5 py-1 text-xs flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Programmatic Analysis
                </Badge>
              )
            })()}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto scrollbar-none">
        {(["chat", "coach", "insights", "leaderboard"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors shrink-0 flex items-center gap-2",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "chat" ? (
              <>
                <Brain className="w-4 h-4 text-primary animate-pulse" />
                <span>AI Coach Chat</span>
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono uppercase font-black">
                  Live
                </span>
              </>
            ) : tab === "coach" ? (
              "AI Coaching Report"
            ) : tab === "insights" ? (
              "Trade Intelligence Insights"
            ) : (
              "Leaderboard"
            )}
          </button>
        ))}
      </div>

      {/* ── Tab 0: AI Coach Chat (Live Interactive Assistant) ─────────────── */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          <AiCoachChat accountId={activeAccountId || undefined} />
        </div>
      )}

      {/* ── Tab 1: AI Coach ──────────────────────────────────────────────── */}
      {activeTab === "coach" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Circular Pass Probability Gauge */}
          <Card className="md:col-span-1 border-border/80 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Pass Probability Index
              </CardTitle>
              <CardDescription>Estimated metrics from drawdown, win-rate, and risk discipline</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center py-6">
              <CircularGauge
                score={analysis ? analysis.monthlyCoachReport.propFirmSurvivalScore : survivalData.score}
                label={analysis ? `AI Coach Grade: ${analysis.monthlyCoachReport.monthlyGrade}` : survivalData.label}
                colorClass={analysis ? "text-primary" : survivalData.color}
              />
            </CardContent>
          </Card>

          {/* DNA & Aggregate Metrics */}
          <Card className="md:col-span-2 border-primary/20 bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" /> 
                  Trader DNA: {analysis ? analysis.traderDna.style : "Evaluating..."}
                </div>
                {analysis && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    Confidence: {analysis.traderDna.confidenceScore}%
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Classification determined from trading frequencies and quality scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {analysis && (
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{analysis.traderDna.explanation}&rdquo;
                </p>
              )}

              {/* Five Quality Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3 border rounded-lg bg-card/40 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Setup</span>
                  <div className="text-xl font-bold mt-1 text-primary">{avgSetup}%</div>
                </div>
                <div className="p-3 border rounded-lg bg-card/40 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Entry</span>
                  <div className="text-xl font-bold mt-1 text-emerald-500">{avgEntry}%</div>
                </div>
                <div className="p-3 border rounded-lg bg-card/40 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Exit</span>
                  <div className="text-xl font-bold mt-1 text-sky-500">{avgExit}%</div>
                </div>
                <div className="p-3 border rounded-lg bg-card/40 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Risk Mgmt</span>
                  <div className="text-xl font-bold mt-1 text-orange-500">{avgRisk}%</div>
                </div>
                <div className="p-3 border rounded-lg bg-card/40 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Discipline</span>
                  <div className="text-xl font-bold mt-1 text-rose-500">{avgDiscipline}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI report output */}
          {analysis ? (
            <>
              {/* Weekly Review Summary */}
              <Card className="md:col-span-2 border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /> AI Coach Weekly Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-emerald-500 mb-1.5">Observed Strengths</h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
                        {analysis.weeklyCoachReport.strengths.map((str: string, i: number) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-destructive mb-1.5">Observed Weaknesses</h4>
                      <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground">
                        {analysis.weeklyCoachReport.weaknesses.map((weak: string, i: number) => (
                          <li key={i}>{weak}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <span className="text-xs uppercase font-bold text-muted-foreground">Biggest Mistake</span>
                      <p className="font-semibold text-foreground mt-0.5">{analysis.weeklyCoachReport.biggestMistake}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-bold text-muted-foreground">Best Playbook Setup</span>
                      <p className="font-semibold text-primary mt-0.5">{analysis.weeklyCoachReport.bestSetup}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-bold text-muted-foreground">Worst Trading Habit</span>
                      <p className="font-semibold text-orange-500 mt-0.5">{analysis.weeklyCoachReport.worstHabit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Improvement Plan Checklist */}
              <Card className="md:col-span-1 border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Bookmark className="w-5 h-5 text-primary" /> Improvement Plan</CardTitle>
                  <CardDescription>Actionable goals for the next sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.weeklyCoachReport.improvementPlan.map((action: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{action}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Psychology Flags */}
              <Card className="md:col-span-3 border-border/80">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-rose-500" /> Behavioral &amp; Psychology Cycles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={analysis.psychology.tiltDetected ? "destructive" : "outline"} className="px-3 py-1">
                      Tilt: {analysis.psychology.tiltDetected ? "DETECTED" : "No signs"}
                    </Badge>
                    <Badge variant={analysis.psychology.emotionalTradingDetected ? "destructive" : "outline"} className="px-3 py-1">
                      Emotional Trading: {analysis.psychology.emotionalTradingDetected ? "DETECTED" : "No signs"}
                    </Badge>
                    <Badge variant={analysis.psychology.inconsistentRiskDetected ? "destructive" : "outline"} className="px-3 py-1">
                      Inconsistent Risk: {analysis.psychology.inconsistentRiskDetected ? "DETECTED" : "No signs"}
                    </Badge>
                    <Badge variant={analysis.psychology.impulsiveEntriesDetected ? "destructive" : "outline"} className="px-3 py-1">
                      Impulsive Entries: {analysis.psychology.impulsiveEntriesDetected ? "DETECTED" : "No signs"}
                    </Badge>
                    <Badge variant={analysis.psychology.revengeTradingCyclesDetected ? "destructive" : "outline"} className="px-3 py-1">
                      Revenge Cycles: {analysis.psychology.revengeTradingCyclesDetected ? "DETECTED" : "No signs"}
                    </Badge>
                    <Badge variant={analysis.psychology.lossChasingDetected ? "destructive" : "outline"} className="px-3 py-1">
                      Loss Chasing: {analysis.psychology.lossChasingDetected ? "DETECTED" : "No signs"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground border-t pt-3 mt-2">
                    {analysis.psychology.analysis}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="md:col-span-3 border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-bold">No AI Coaching Analysis Generated</h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  Select a past report from the dropdown above or click &quot;Generate AI Report&quot; to compile your weekly coach report.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab 2: Deterministic Insights ────────────────────────────────── */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Systematic Mistakes Impact Analyzer */}
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Mistakes Cost &amp; Expectancy Analyzer</CardTitle>
              <CardDescription>Deterministic calculations showing if specific mistake trades were removed from your records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {programmaticMistakes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="p-3">Mistake Type</th>
                        <th className="p-3">Frequency</th>
                        <th className="p-3 text-right">Estimated Cost</th>
                        <th className="p-3 text-right">Expectancy Boost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {programmaticMistakes.map((m, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold text-foreground">{m.type}</td>
                          <td className="p-3 text-muted-foreground">{m.frequency} trades ({m.pctOfTotal}%)</td>
                          <td className="p-3 text-right font-bold text-destructive">{fmtCurrency(m.cost)}</td>
                          <td className="p-3 text-right font-bold text-success">
                            {m.improvement > 0 ? `+${m.improvement}%` : "0%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Excellent discipline! No mistake patterns detected in your trade logs.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Intelligence Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Session Intelligence</CardTitle>
                <CardDescription>Programmatic metrics calculated across major market sessions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="p-3">Session</th>
                        <th className="p-3">Trades</th>
                        <th className="p-3 text-right">Win Rate</th>
                        <th className="p-3 text-right">PF</th>
                        <th className="p-3 text-right">Avg R</th>
                        <th className="p-3 text-right">PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessionStats.results.map((r, idx) => (
                        <tr key={idx} className={cn("hover:bg-muted/20", 
                          sessionStats.best?.session === r.session && "bg-emerald-500/5",
                          sessionStats.worst?.session === r.session && "bg-destructive/5"
                        )}>
                          <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                            {r.session}
                            {sessionStats.best?.session === r.session && <Badge className="bg-emerald-500 text-white border-none text-[8px] px-1 py-0 h-4">Best</Badge>}
                            {sessionStats.worst?.session === r.session && <Badge className="bg-destructive text-white border-none text-[8px] px-1 py-0 h-4 font-semibold">Worst</Badge>}
                          </td>
                          <td className="p-3 text-muted-foreground">{r.trades}</td>
                          <td className="p-3 text-right">{r.trades ? `${r.winRate.toFixed(0)}%` : "—"}</td>
                          <td className="p-3 text-right">{r.trades ? r.profitFactor.toFixed(2) : "—"}</td>
                          <td className="p-3 text-right">{r.trades ? `${r.avgR.toFixed(1)}R` : "—"}</td>
                          <td className={cn("p-3 text-right font-bold", r.pnl >= 0 ? "text-success" : "text-destructive")}>
                            {fmtCurrency(r.pnl, { sign: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Playbook Setup Ranking */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2"><ListFilter className="w-5 h-5 text-primary" /> Playbook Setup Ranking</CardTitle>
                <CardDescription>Sortable setup ranking and expectancy statistics</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {playbookStats.results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="p-3">Playbook / Tag</th>
                          <th className="p-3">Trades</th>
                          <th className="p-3 text-right">Win Rate</th>
                          <th className="p-3 text-right">PF</th>
                          <th className="p-3 text-right">Expectancy</th>
                          <th className="p-3 text-right">Avg R</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {playbookStats.results.map((r, idx) => (
                          <tr key={idx} className={cn("hover:bg-muted/20",
                            playbookStats.best?.name === r.name && "bg-emerald-500/5",
                            playbookStats.worst?.name === r.name && "bg-destructive/5"
                          )}>
                            <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                              {r.name}
                              {playbookStats.best?.name === r.name && <Badge className="bg-emerald-500 text-white border-none text-[8px] px-1 py-0 h-4">Best</Badge>}
                              {playbookStats.worst?.name === r.name && <Badge className="bg-destructive text-white border-none text-[8px] px-1 py-0 h-4 font-semibold">Worst</Badge>}
                            </td>
                            <td className="p-3 text-muted-foreground">{r.trades}</td>
                            <td className="p-3 text-right">{r.winRate.toFixed(0)}%</td>
                            <td className="p-3 text-right">{r.profitFactor.toFixed(2)}</td>
                            <td className={cn("p-3 text-right font-semibold", r.expectancy >= 0 ? "text-success" : "text-destructive")}>
                              {fmtCurrency(r.expectancy)}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">{r.avgR.toFixed(1)}R</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No linked playbooks found. Assign setups to your trades to view expectancy rankings.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab 3: AI Leaderboard ────────────────────────────────────────── */}
      {activeTab === "leaderboard" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Best Trades vs Worst Trades */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-success"><Award className="w-5 h-5" /> Best Trades (By P&amp;L)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.bestTrades.length > 0 ? (
                <div className="divide-y divide-border text-sm">
                  {leaderboard.bestTrades.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-muted/10">
                      <div>
                        <div className="font-semibold">{t.instrument} · {t.direction.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">Day {t.day} · Session: {t.session}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-success">+${t.pnl.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold">Setup: {t.setupQualityScore ?? "—"}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">No trades logged yet</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-destructive"><TrendingDown className="w-5 h-5" /> Worst Trades (By P&amp;L)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.worstTrades.length > 0 ? (
                <div className="divide-y divide-border text-sm">
                  {leaderboard.worstTrades.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-muted/10">
                      <div>
                        <div className="font-semibold">{t.instrument} · {t.direction.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">Day {t.day} · Session: {t.session}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">${t.pnl.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold">Setup: {t.setupQualityScore ?? "—"}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">No trades logged yet</div>
              )}
            </CardContent>
          </Card>

          {/* Highest Quality Setup vs Lowest Quality Exit */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary"><Star className="w-5 h-5" /> Highest Quality Setup Scores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.highestSetup.length > 0 ? (
                <div className="divide-y divide-border text-sm">
                  {leaderboard.highestSetup.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-muted/10">
                      <div>
                        <div className="font-semibold">{t.instrument} · {t.direction.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">Setup Quality: {t.setupQualityScore}% · Day {t.day}</div>
                      </div>
                      <div className={cn("text-right font-semibold", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                        {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">No trades logged yet</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-500"><XCircle className="w-5 h-5" /> Lowest Quality Exit Scores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.lowestExit.length > 0 ? (
                <div className="divide-y divide-border text-sm">
                  {leaderboard.lowestExit.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-muted/10">
                      <div>
                        <div className="font-semibold">{t.instrument} · {t.direction.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">Exit Quality: {t.exitQualityScore}% · Day {t.day}</div>
                      </div>
                      <div className={cn("text-right font-semibold", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                        {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">No trades logged yet</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
