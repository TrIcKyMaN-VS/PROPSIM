"use client"

import { useState } from "react"
import { usePropStore } from "@/lib/store"
import { analyzeTraderDnaAction } from "@/app/actions/ai-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, AlertTriangle, TrendingUp, Zap } from "lucide-react"
import { toast } from "sonner"

export function CoachView() {
  const trades = usePropStore(s => s.trades)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const handleAnalyze = async () => {
    if (trades.length < 5) {
      toast.error("You need at least 5 trades to generate an AI analysis.")
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Coach & DNA</h1>
          <p className="text-muted-foreground">Identify systematic mistakes and determine your trader profile.</p>
        </div>
        <Button onClick={handleAnalyze} disabled={loading || trades.length < 5}>
          {loading ? "Analyzing..." : "Generate AI Report"}
          <Brain className="ml-2 w-4 h-4" />
        </Button>
      </div>

      {!analysis && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium">No Analysis Available</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Run the AI Mistake Detector to find out what's holding you back. You need at least 5 journaled trades.
            </p>
          </CardContent>
        </Card>
      )}

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
                  {analysis.traderDna.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 text-destructive">Weaknesses</h4>
                <ul className="list-disc pl-4 text-sm space-y-1">
                  {analysis.traderDna.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
              <div className="col-span-2 flex gap-4 mt-2">
                <Badge variant="outline">Best Session: {analysis.traderDna.bestSession}</Badge>
                <Badge variant="outline">Recommended Size: {analysis.traderDna.recommendedAccountSize}</Badge>
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
                    <p className="text-xs font-medium mt-3 text-muted-foreground">Detected {m.occurrences} times</p>
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
