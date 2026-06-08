"use client"

import { useState, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { analyzeTraderDnaAction } from "@/app/actions/ai-actions"
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
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Trade } from "@/lib/types"

// ── helpers ────────────────────────────────────────────────────────────────

function winRate(trades: Trade[]) {
  if (!trades.length) return 0
  return (trades.filter((t) => t.pnl > 0).length / trades.length) * 100
}

function bestSession(trades: Trade[]) {
  if (!trades.length) return null
  const map: Record<string, number> = {}
  for (const t of trades) {
    map[t.session] = (map[t.session] ?? 0) + t.pnl
  }
  return Object.entries(map).sort(([, a], [, b]) => b - a)[0]
}

function worstSession(trades: Trade[]) {
  if (!trades.length) return null
  const map: Record<string, number> = {}
  for (const t of trades) {
    map[t.session] = (map[t.session] ?? 0) + t.pnl
  }
  return Object.entries(map).sort(([, a], [, b]) => a - b)[0]
}

function avgWinLoss(trades: Trade[]) {
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl < 0)
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  return { avgWin, avgLoss }
}

function topMistake(tradePsychology: any[]) {
  if (!tradePsychology.length) return null
  const counts: Record<string, number> = {}
  for (const tp of tradePsychology) {
    const behaviors: string[] = tp.flaggedBehaviors ?? []
    for (const b of behaviors) {
      counts[b] = (counts[b] ?? 0) + 1
    }
  }
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
  return sorted[0] ?? null
}

// ── Quick Insight Card ─────────────────────────────────────────────────────

interface InsightCardProps {
  icon: React.ReactNode
  title: string
  value: React.ReactNode
  description: string
  valueClass?: string
}

function InsightCard({ icon, title, value, description, valueClass }: InsightCardProps) {
  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", valueClass)}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function CoachView() {
  const trades = usePropStore((s) => s.trades)
  const tradePsychology = usePropStore((s) => s.tradePsychology)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const handleAnalyze = async () => {
    if (trades.length < 1) {
      toast.error("Log at least one trade to generate an AI analysis.")
      return
    }
    setLoading(true)
    try {
      const result = await analyzeTraderDnaAction(trades)
      setAnalysis(result)
      toast.success("AI Analysis Complete")
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze trades.")
    } finally {
      setLoading(false)
    }
  }

  // ── computed quick insights ────────────────────────────────────────────
  const insights = useMemo(() => {
    const wins = trades.filter((t) => t.pnl > 0)
    const losses = trades.filter((t) => t.pnl < 0)
    const wr = winRate(trades)
    const best = bestSession(trades)
    const worst = worstSession(trades)
    const { avgWin, avgLoss } = avgWinLoss(trades)
    const mistake = topMistake(tradePsychology)

    return { wins, losses, wr, best, worst, avgWin, avgLoss, mistake }
  }, [trades, tradePsychology])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Coach &amp; DNA</h1>
          <p className="text-muted-foreground">
            Identify systematic mistakes and determine your trader profile.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={handleAnalyze} disabled={loading || trades.length < 1}>
            {loading ? "Analyzing…" : "Generate AI Report"}
            <Brain className="ml-2 w-4 h-4" />
          </Button>
          {trades.length > 0 && trades.length < 10 && (
            <p className="text-xs text-muted-foreground">
              For best results, log 10+ trades
            </p>
          )}
        </div>
      </div>

      {/* ── Quick Insights ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Quick Insights
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {/* Total Trades */}
          <InsightCard
            icon={<Target className="w-4 h-4 text-primary" />}
            title="Total Trades"
            value={trades.length}
            description={
              trades.length === 0
                ? "No trades logged yet"
                : `${insights.wins.length}W · ${insights.losses.length}L`
            }
          />

          {/* Win Rate */}
          <InsightCard
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            title="Win Rate"
            value={trades.length === 0 ? "—" : `${insights.wr.toFixed(1)}%`}
            description={
              trades.length === 0
                ? "Start logging trades"
                : insights.wr >= 50
                ? "Above 50% – solid edge"
                : "Below 50% – needs review"
            }
            valueClass={
              trades.length === 0
                ? ""
                : insights.wr >= 50
                ? "text-emerald-500"
                : "text-red-500"
            }
          />

          {/* Best Session */}
          <InsightCard
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            title="Best Session"
            value={insights.best ? insights.best[0] : "—"}
            description={
              insights.best
                ? `+$${insights.best[1].toFixed(0)} total PnL`
                : "No session data yet"
            }
            valueClass={insights.best ? "text-emerald-500 text-base" : ""}
          />

          {/* Worst Session */}
          <InsightCard
            icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
            title="Worst Session"
            value={insights.worst ? insights.worst[0] : "—"}
            description={
              insights.worst
                ? `$${insights.worst[1].toFixed(0)} total PnL`
                : "No session data yet"
            }
            valueClass={insights.worst ? "text-red-500 text-base" : ""}
          />

          {/* Avg Win vs Avg Loss – only when there are trades */}
          {trades.length > 0 && (
            <InsightCard
              icon={<Activity className="w-4 h-4 text-sky-400" />}
              title="Avg Win vs Loss"
              value={
                <span className="text-base leading-tight">
                  <span className="text-emerald-500">${insights.avgWin.toFixed(0)}</span>
                  {" / "}
                  <span className="text-red-500">${insights.avgLoss.toFixed(0)}</span>
                </span>
              }
              description={
                insights.avgLoss > 0
                  ? `RR ratio: ${(insights.avgWin / insights.avgLoss).toFixed(2)}`
                  : "No losses yet – great!"
              }
            />
          )}

          {/* Top Mistake – only when psychology data exists */}
          {insights.mistake && (
            <InsightCard
              icon={<Clock className="w-4 h-4 text-orange-400" />}
              title="Top Mistake"
              value={
                <span className="text-sm font-semibold leading-tight">
                  {insights.mistake[0]}
                </span>
              }
              description={`Flagged ${insights.mistake[1]} time${insights.mistake[1] !== 1 ? "s" : ""} in psychology logs`}
              valueClass="text-orange-500"
            />
          )}
        </div>
      </div>

      {/* ── No Analysis Placeholder ──────────────────────────────────────── */}
      {!analysis && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium">No Analysis Available</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Run the AI Mistake Detector to find out what&apos;s holding you back.
              {trades.length === 0
                ? " Log at least one trade to get started."
                : ' Click "Generate AI Report" above.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── AI Analysis Results ──────────────────────────────────────────── */}
      {analysis && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trader DNA */}
          <Card className="md:col-span-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Trader DNA: {analysis.traderDna.style}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-success">Strengths</h4>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  {analysis.traderDna.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 text-destructive">Weaknesses</h4>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  {analysis.traderDna.weaknesses.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 flex gap-4 mt-2">
                <Badge variant="outline">Best Session: {analysis.traderDna.bestSession}</Badge>
                <Badge variant="outline">
                  Recommended Size: {analysis.traderDna.recommendedAccountSize}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mistakes */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Detected Systematic Mistakes
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.mistakes.map((m: any, i: number) => (
                <Card key={i} className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base text-destructive">{m.type}</CardTitle>
                      <Badge variant="destructive">${m.estimatedCost} Cost</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                    <p className="text-xs font-medium mt-3 text-muted-foreground">
                      Detected {m.occurrences} times
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
