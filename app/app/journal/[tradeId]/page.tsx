"use client"

import { usePropStore } from "@/lib/store"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Target, ShieldAlert, Brain, FileCheck, Eye, Trash2, Upload, Sparkles, BookOpen, ChevronRight } from "lucide-react"
import { toast } from "sonner"

export default function TradeDetailsPage() {
  const { tradeId } = useParams()
  const router = useRouter()
  const trades = usePropStore(s => s.trades)
  const tradePsychology = usePropStore(s => s.tradePsychology)
  const playbooks = usePropStore(s => s.playbooks)
  const updateTrade = usePropStore(s => s.updateTrade)
  const addScreenshot = usePropStore(s => s.addScreenshot)
  const deleteScreenshot = usePropStore(s => s.deleteScreenshot)
  
  const trade = trades.find(t => t.id === tradeId)
  const psyc = tradePsychology.find(p => p.tradeId === tradeId) || {}

  const saveTradePsychology = usePropStore(s => s.saveTradePsychology)

  // State Hooks
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(trade?.playbookChecklist || {})
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [expandedStage, setExpandedStage] = useState<string>("")

  // Form State for Psychology
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
    riskGrade: psyc.riskGrade || "",
    complianceGrade: psyc.complianceGrade || "",
    decisionScore: psyc.decisionScore || 50
  })

  // Core Trade Form State + Pre/Post analysis
  const [tradeForm, setTradeForm] = useState({
    instrument: "",
    direction: "long",
    entry: "",
    exit: "",
    contracts: "",
    pnl: "",
    session: "",
    notes: "",
    tags: "",
    playbookId: "",
    playbookName: "",
    
    // Pre-Trade
    tradeIdea: "",
    marketBias: "Neutral",
    reasonForEntry: "",
    expectedRR: "",

    // Post-Trade
    outcome: "",
    mistakes: "",
    lessonsLearned: "",
    psychologyNotes: ""
  })

  const playbook = tradeForm.playbookId ? playbooks.find(p => p.id === tradeForm.playbookId) : null

  useEffect(() => {
    if (trade) {
      setTradeForm({
        instrument: trade.instrument || "",
        direction: trade.direction || "long",
        entry: trade.entry?.toString() || "",
        exit: trade.exit?.toString() || "",
        contracts: trade.contracts?.toString() || "1",
        pnl: trade.pnl?.toString() || "",
        session: trade.session || "New York AM",
        notes: trade.notes || "",
        tags: (trade.tags || []).join(", "),
        playbookId: trade.playbookId || "",
        playbookName: trade.playbookName || "",
        
        // Pre-Trade
        tradeIdea: trade.tradeIdea || "",
        marketBias: trade.marketBias || "Neutral",
        reasonForEntry: trade.reasonForEntry || "",
        expectedRR: trade.expectedRR || "",

        // Post-Trade
        outcome: trade.outcome || "",
        mistakes: trade.mistakes || "",
        lessonsLearned: trade.lessonsLearned || "",
        psychologyNotes: trade.psychologyNotes || ""
      })
      setCheckedItems(trade.playbookChecklist || {})
    }
  }, [trade])

  const update = (key: string, val: any) => setForm((s: any) => ({ ...s, [key]: val }))

  const handleSave = async () => {
    saveTradePsychology(form)
    if (trade && trade.id) {
      const entryVal = parseFloat(tradeForm.entry)
      const exitVal = tradeForm.exit ? parseFloat(tradeForm.exit) : entryVal
      const pnlVal = tradeForm.pnl ? parseFloat(tradeForm.pnl) : 0.0

      await updateTrade(trade.id, {
        instrument: tradeForm.instrument,
        direction: tradeForm.direction as any,
        entry: entryVal,
        exit: exitVal,
        contracts: parseFloat(tradeForm.contracts),
        pnl: pnlVal,
        session: tradeForm.session,
        notes: tradeForm.notes,
        tags: tradeForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        playbookId: tradeForm.playbookId || null,
        playbookName: tradeForm.playbookName || null,
        playbookChecklist: checkedItems,
        
        tradeIdea: tradeForm.tradeIdea,
        marketBias: tradeForm.marketBias,
        reasonForEntry: tradeForm.reasonForEntry,
        expectedRR: tradeForm.expectedRR,
        
        outcome: tradeForm.outcome,
        mistakes: tradeForm.mistakes,
        lessonsLearned: tradeForm.lessonsLearned,
        psychologyNotes: tradeForm.psychologyNotes
      })
    }
    toast.success("Trade review saved!")
  }

  const handleUploadScreenshot = (stage: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && trade) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        await addScreenshot(trade.id, stage, base64String)
        toast.success(`${stage} screenshot uploaded successfully`)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteScreenshot = async (stage: string, screenshotId: string) => {
    if (confirm(`Are you sure you want to delete the ${stage} screenshot?`)) {
      if (trade) {
        await deleteScreenshot(trade.id, screenshotId)
        toast.success(`${stage} screenshot deleted`)
      }
    }
  }

  if (!trade) return <div className="p-12 text-center text-muted-foreground">Trade not found</div>

  const getScreenshotForStage = (stage: string) => {
    return (trade.screenshots || []).find((s: any) => s.stage === stage)
  }

  // Common screenshot slot renderer
  const renderScreenshotSlot = (stage: string, title: string) => {
    const sc = getScreenshotForStage(stage)
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="py-3.5">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center min-h-[200px] relative">
          {sc ? (
            <div className="group relative w-full h-full min-h-[180px] rounded-lg overflow-hidden border">
              <img src={sc.url} alt={`${stage} screenshot`} className="object-cover w-full h-full max-h-[220px]" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    setExpandedImage(sc.url)
                    setExpandedStage(stage)
                  }}
                >
                  <Eye className="w-4 h-4 mr-1.5" /> View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-background text-foreground hover:bg-muted"
                  onClick={() => document.getElementById(`gallery-upload-${stage}`)?.click()}
                >
                  Replace
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleDeleteScreenshot(stage, sc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="w-full h-full min-h-[160px] border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById(`gallery-upload-${stage}`)?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold">Upload {title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Image files only</p>
            </div>
          )}
          <input 
            id={`gallery-upload-${stage}`}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleUploadScreenshot(stage)}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 justify-between">
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
            <p className="text-muted-foreground mt-1 text-sm">
              Session: {trade.session} • Contracts: {trade.contracts} • Playbook: {trade.playbookName || "None"}
            </p>
          </div>
        </div>
        
        <Button onClick={handleSave} className="shadow-sm">
          Save Journal Entry
        </Button>
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
          {/* Editable Trade Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Execution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Instrument</Label>
                <Input value={tradeForm.instrument} onChange={e => setTradeForm({...tradeForm, instrument: e.target.value})} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Session</Label>
                <select className="flex h-9 mt-1 w-full rounded-md border bg-background px-3 py-1 text-sm" value={tradeForm.session} onChange={e => setTradeForm({...tradeForm, session: e.target.value})}>
                  <option>London</option>
                  <option>New York AM</option>
                  <option>New York PM</option>
                  <option>Asia</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <select className="flex h-9 mt-1 w-full rounded-md border bg-background px-3 py-1 text-sm" value={tradeForm.direction} onChange={e => setTradeForm({...tradeForm, direction: e.target.value})}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Contracts</Label>
                <Input type="number" step="0.01" value={tradeForm.contracts} onChange={e => setTradeForm({...tradeForm, contracts: e.target.value})} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Entry Price</Label>
                <Input type="number" step="any" value={tradeForm.entry} onChange={e => setTradeForm({...tradeForm, entry: e.target.value})} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Exit Price</Label>
                <Input type="number" step="any" value={tradeForm.exit} onChange={e => setTradeForm({...tradeForm, exit: e.target.value})} className="h-9 mt-1" />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Net PnL ($)</Label>
                <Input type="number" step="0.01" value={tradeForm.pnl} onChange={e => setTradeForm({...tradeForm, pnl: e.target.value})} className="h-9 mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Linked Playbook</Label>
                <select 
                  className="flex h-9 mt-1 w-full rounded-md border bg-background px-3 py-1 text-sm" 
                  value={tradeForm.playbookId} 
                  onChange={e => {
                    const selectedId = e.target.value
                    const pb = playbooks.find(p => p.id === selectedId)
                    setTradeForm({
                      ...tradeForm,
                      playbookId: selectedId,
                      playbookName: pb ? pb.name : ""
                    })
                  }}
                >
                  <option value="">None</option>
                  {playbooks.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Tags (comma separated)</Label>
                <Input placeholder="Tags..." value={tradeForm.tags} onChange={e => setTradeForm({...tradeForm, tags: e.target.value})} className="h-9 mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Pre-Trade Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Pre-Trade Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Trade Idea</Label>
                      <Textarea value={tradeForm.tradeIdea} onChange={e => setTradeForm({...tradeForm, tradeIdea: e.target.value})} placeholder="Describe setup rules, key levels..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Reason For Entry</Label>
                      <Textarea value={tradeForm.reasonForEntry} onChange={e => setTradeForm({...tradeForm, reasonForEntry: e.target.value})} placeholder="What triggered the entry?" className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Market Bias</Label>
                      <select className="flex h-9 mt-1 w-full rounded-md border bg-background px-3 py-1 text-sm" value={tradeForm.marketBias} onChange={e => setTradeForm({...tradeForm, marketBias: e.target.value})}>
                        <option value="Bullish">Bullish</option>
                        <option value="Bearish">Bearish</option>
                        <option value="Neutral">Neutral</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Expected RR</Label>
                      <Input value={tradeForm.expectedRR} onChange={e => setTradeForm({...tradeForm, expectedRR: e.target.value})} placeholder="e.g. 2.5 or 1:3" className="h-9 mt-1" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-1">
                  {renderScreenshotSlot("Pre-Trade", "Pre-Trade Screenshot")}
                </div>
              </div>
            </CardContent>
          </Card>

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
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="col-span-1">
              {renderScreenshotSlot("During-Trade", "During Trade Screenshot")}
            </div>
          </div>
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

          {/* Post-Trade Review Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" /> Post-Trade Review
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Trade Outcome</Label>
                <Textarea value={tradeForm.outcome} onChange={e => setTradeForm({...tradeForm, outcome: e.target.value})} placeholder="e.g. Target reached but had some drawdowns..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Mistakes Made</Label>
                <Textarea value={tradeForm.mistakes} onChange={e => setTradeForm({...tradeForm, mistakes: e.target.value})} placeholder="e.g. Sized up too quickly, revenge trading..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Lessons Learned</Label>
                <Textarea value={tradeForm.lessonsLearned} onChange={e => setTradeForm({...tradeForm, lessonsLearned: e.target.value})} placeholder="What will you do next time?" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Psychology Notes</Label>
                <Textarea value={tradeForm.psychologyNotes} onChange={e => setTradeForm({...tradeForm, psychologyNotes: e.target.value})} placeholder="Any cognitive bias or emotional response notes?" className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GRADES & SCREENSHOTS */}
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
                value={tradeForm.notes}
                onChange={e => setTradeForm({...tradeForm, notes: e.target.value})}
                placeholder="What went well? What could be improved? Did you follow your rules?" 
                className="flex min-h-[250px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              />
            </CardContent>
          </Card>

          {/* Screenshot Gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Screenshot Gallery</CardTitle>
              <CardDescription>Upload setup, execution, and exit screenshots.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {renderScreenshotSlot("Pre-Trade", "Pre-Trade Screenshot")}
                {renderScreenshotSlot("During-Trade", "During Trade Screenshot")}
                {renderScreenshotSlot("Post-Trade", "Post-Trade Screenshot")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lightbox / Expanded Image Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-4 flex flex-col justify-center items-center">
          <DialogHeader className="mb-2 w-full text-left">
            <DialogTitle className="text-base font-semibold">{expandedStage} Screenshot</DialogTitle>
          </DialogHeader>
          <div className="relative overflow-auto max-h-[75vh] w-full flex items-center justify-center bg-muted/30 rounded-lg p-2">
            {expandedImage && (
              <img src={expandedImage} alt="Expanded Setup" className="max-w-full max-h-[70vh] object-contain rounded" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
