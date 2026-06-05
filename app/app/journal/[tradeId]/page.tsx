"use client"

import { usePropStore } from "@/lib/store"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Target, ShieldAlert, Brain, FileCheck } from "lucide-react"

export default function TradeDetailsPage() {
  const { tradeId } = useParams()
  const router = useRouter()
  const trades = usePropStore(s => s.trades)
  const tradePsychology = usePropStore(s => s.tradePsychology)
  
  const trade = trades.find(t => t.id === tradeId)
  const psyc = tradePsychology.find(p => p.tradeId === tradeId) || {}

  const saveTradePsychology = usePropStore(s => s.saveTradePsychology)

  const [form, setForm] = useState<any>({
    tradeId: tradeId,
    preFeeling: psyc.preFeeling || "",
    preNotes: psyc.preNotes || "",
    checklistScore: psyc.checklistScore || 0,
    convictionScore: psyc.convictionScore || 5,
    riskAmount: psyc.riskAmount || 0,
    rewardAmount: psyc.rewardAmount || 0,
    expectedValue: psyc.expectedValue || 0,
    hesitated: psyc.hesitated || false,
    movedStop: psyc.movedStop || false,
    movedTarget: psyc.movedTarget || false,
    addedSize: psyc.addedSize || false,
    emotionAffected: psyc.emotionAffected || false,
    brokeRules: psyc.brokeRules || false,
    exitReason: psyc.exitReason || "",
    executionGrade: psyc.executionGrade || "",
    psychologyGrade: psyc.psychologyGrade || "",
    decisionScore: psyc.decisionScore || 50
  })

  const update = (key: string, val: any) => setForm((s: any) => ({ ...s, [key]: val }))

  const handleSave = () => {
    saveTradePsychology(form)
    // Show toast
  }

  if (!trade) return <div className="p-12 text-center">Trade not found</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {trade.instrument}
            <Badge variant={trade.direction === "long" ? "default" : "destructive"}>{trade.direction.toUpperCase()}</Badge>
            <span className={`text-xl ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
              ${trade.pnl.toFixed(2)}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Session: {trade.session} • Contracts: {trade.contracts}
          </p>
        </div>
      </div>

      <Tabs defaultValue="pre" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pre"><FileCheck className="w-4 h-4 mr-2"/> Pre-Trade</TabsTrigger>
          <TabsTrigger value="during"><Target className="w-4 h-4 mr-2"/> During Trade</TabsTrigger>
          <TabsTrigger value="exit"><ShieldAlert className="w-4 h-4 mr-2"/> Exit & Review</TabsTrigger>
          <TabsTrigger value="grades"><Brain className="w-4 h-4 mr-2"/> Grades & Screenshots</TabsTrigger>
        </TabsList>
        
        {/* PRE TRADE */}
        <TabsContent value="pre" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Pre-Trade Psychology</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">How do you feel?</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" value={form.preFeeling} onChange={e => update("preFeeling", e.target.value)}>
                  <option value="">Select Emotion</option>
                  <option value="Calm">Calm</option>
                  <option value="Confident">Confident</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Fearful">Fearful</option>
                  <option value="Frustrated">Frustrated</option>
                  <option value="Greedy">Greedy</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Entry Conviction Score ({form.convictionScore}/10)</label>
                <input type="range" min="1" max="10" value={form.convictionScore} onChange={e => update("convictionScore", parseInt(e.target.value))} className="w-full mt-2 accent-primary" />
              </div>
              <div>
                <label className="text-sm font-medium">Pre-trade Thoughts</label>
                <textarea className="flex w-full rounded-md border bg-background px-3 py-2 text-sm mt-1 min-h-[100px]" value={form.preNotes} onChange={e => update("preNotes", e.target.value)} placeholder="What are you thinking before entering?" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Risk / Reward Planner</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Risk Amount ($)</label>
                <input type="number" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" value={form.riskAmount} onChange={e => update("riskAmount", parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium">Reward Amount ($)</label>
                <input type="number" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" value={form.rewardAmount} onChange={e => update("rewardAmount", parseFloat(e.target.value))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DURING TRADE */}
        <TabsContent value="during" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Execution Tracking</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.hesitated} onChange={e => update("hesitated", e.target.checked)} />
                <span className="text-sm font-medium">Did you hesitate?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.movedStop} onChange={e => update("movedStop", e.target.checked)} />
                <span className="text-sm font-medium">Did you move your stop loss?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.movedTarget} onChange={e => update("movedTarget", e.target.checked)} />
                <span className="text-sm font-medium">Did you move your target?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.addedSize} onChange={e => update("addedSize", e.target.checked)} />
                <span className="text-sm font-medium">Did you add to a losing position?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.brokeRules} onChange={e => update("brokeRules", e.target.checked)} />
                <span className="text-sm font-medium">Did you break any trading rules?</span>
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXIT REVIEW */}
        <TabsContent value="exit" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Exit Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Why did you exit?</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" value={form.exitReason} onChange={e => update("exitReason", e.target.value)}>
                  <option value="">Select Reason</option>
                  <option value="Target Hit">Target Hit</option>
                  <option value="Stop Hit">Stop Hit</option>
                  <option value="Manual Exit">Manual Exit</option>
                  <option value="Fear Exit">Fear Exit (Early)</option>
                  <option value="Greed Exit">Greed Exit (Late)</option>
                  <option value="Rule Violation">Rule Violation</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Decision Quality Score ({form.decisionScore}/100)</label>
                <p className="text-xs text-muted-foreground mb-2">Separate good decisions from good outcomes.</p>
                <input type="range" min="0" max="100" value={form.decisionScore} onChange={e => update("decisionScore", parseInt(e.target.value))} className="w-full accent-primary" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GRADES */}
        <TabsContent value="grades" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Trade Grade Engine</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Execution Grade</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" value={form.executionGrade} onChange={e => update("executionGrade", e.target.value)}>
                  <option value="">Ungraded</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Psychology Grade</label>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" value={form.psychologyGrade} onChange={e => update("psychologyGrade", e.target.value)}>
                  <option value="">Ungraded</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>Save Trade Psychology</Button>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
