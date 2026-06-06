"use client"

import { usePropStore } from "@/lib/store"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Target, ShieldAlert, Brain, FileCheck } from "lucide-react"
import { toast } from "sonner"

export default function TradeDetailsPage() {
  const { tradeId } = useParams()
  const router = useRouter()
  const trades = usePropStore(s => s.trades)
  const tradePsychology = usePropStore(s => s.tradePsychology)
  const playbooks = usePropStore(s => s.playbooks)
  const updateTrade = usePropStore(s => s.updateTrade)
  
  const trade = trades.find(t => t.id === tradeId)
  const psyc = tradePsychology.find(p => p.tradeId === tradeId) || {}

  const playbook = trade?.playbookId ? playbooks.find(p => p.id === trade.playbookId) : null
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(trade?.playbookChecklist || {})

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

  const handleSave = async () => {
    saveTradePsychology(form)
    if (trade && trade.id) {
      await updateTrade(trade.id, { playbookChecklist: checkedItems })
    }
    toast.success("Trade review saved!")
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

          {playbook && playbook.checklist && playbook.checklist.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Execution Checklist: {playbook.name}</CardTitle>
                  <Badge variant="outline" className="font-mono">{Math.round((Object.values(checkedItems).filter(Boolean).length / playbook.checklist.length) * 100)}% Compliance</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {playbook.checklist.map((item: any, idx: number) => {
                  const text = typeof item === 'string' ? item : item.text
                  const id = item.id || idx.toString()
                  return (
                    <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-primary mt-0.5 rounded border-muted-foreground/30 focus:ring-primary focus:ring-offset-background" 
                        checked={!!checkedItems[id]} 
                        onChange={e => {
                          const newChecked = { ...checkedItems, [id]: e.target.checked }
                          setCheckedItems(newChecked)
                        }} 
                      />
                      <span className={`text-sm ${checkedItems[id] ? "text-muted-foreground line-through" : "font-medium"}`}>{text}</span>
                    </label>
                  )
                })}
              </CardContent>
            </Card>
          )}
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

          <Card>
            <CardHeader className="border-b pb-4 bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle>Trade Review Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <textarea 
                value={form.preNotes}
                onChange={e => update("preNotes", e.target.value)}
                placeholder="What went well? What could be improved? Did you follow your rules?" 
                className="flex min-h-[250px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screenshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('screenshot-upload')?.click()}
              >
                <input 
                  id="screenshot-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Mock upload
                      alert("Screenshot attached: " + file.name);
                    }
                  }}
                />
                <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">+</span>
                </div>
                <p className="font-medium">Click to Upload</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop allowed</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>Save Review</Button>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
