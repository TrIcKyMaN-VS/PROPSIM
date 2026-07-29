"use client"

import { useState, useEffect } from "react"
import { usePropStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, RefreshCw, BookOpen, Sparkles, Image as ImageIcon, X } from "lucide-react"
import { toast } from "sonner"
import type { TradeDirection } from "@/lib/types"
import { calculatePnl } from "@/lib/pnl-calculator"
import { cn } from "@/lib/utils"

export default function NewManualTradePage() {
  const router = useRouter()
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const addTrade = usePropStore(s => s.addTrade)
  const playbooks = (usePropStore(s => s.playbooks) || []).filter(p => !p.deletedAt)
  const addScreenshot = usePropStore(s => s.addScreenshot)

  const [loading, setLoading] = useState(false)
  const [pnlMode, setPnlMode] = useState<"AUTO" | "MANUAL">("AUTO")
  const [calculatedPnlState, setCalculatedPnlState] = useState<number | null>(null)

  const [selectedPlaybookId, setSelectedPlaybookId] = useState("")
  const [preScreenshot, setPreScreenshot] = useState<string | null>(null)
  const [playbookChecklist, setPlaybookChecklist] = useState<Record<string, boolean>>({})

  const [preForm, setPreForm] = useState({
    tradeIdea: "",
    marketBias: "Neutral",
    reasonForEntry: "",
    expectedRR: ""
  })

  const [form, setForm] = useState({
    instrument: "ES",
    direction: "long" as TradeDirection,
    entry: "",
    exit: "",
    contracts: "1",
    pnl: "",
    session: "New York AM",
    date: new Date().toISOString().split("T")[0],
    time: "09:30",
    tags: "",
    notes: ""
  })

  const selectedPlaybook = playbooks.find(p => p.id === selectedPlaybookId)

  // Reset/populate checklist when playbook selection changes
  useEffect(() => {
    if (selectedPlaybook) {
      const initialChecklist: Record<string, boolean> = {}
      selectedPlaybook.checklist.forEach((item: any, idx: number) => {
        const id = item.id || idx.toString()
        initialChecklist[id] = false
      })
      setPlaybookChecklist(initialChecklist)
      
      // Auto load details into form if not set
      setForm(f => ({
        ...f,
        instrument: selectedPlaybook.instrument || f.instrument,
        session: selectedPlaybook.session || f.session
      }))
    } else {
      setPlaybookChecklist({})
    }
  }, [selectedPlaybookId])

  // Auto calculation effect
  useEffect(() => {
    if (!form.entry || !form.exit) {
      setCalculatedPnlState(null)
      return
    }
    const calc = calculatePnl(form.instrument, form.direction, form.entry, form.exit, form.contracts)
    setCalculatedPnlState(calc)

    if (pnlMode === "AUTO" && calc !== null) {
      setForm(f => ({ ...f, pnl: calc.toString() }))
    }
  }, [form.instrument, form.direction, form.entry, form.exit, form.contracts, pnlMode])

  const handleManualPnlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPnlMode("MANUAL")
    setForm(f => ({ ...f, pnl: e.target.value }))
  }

  const resetToAuto = () => {
    setPnlMode("AUTO")
    if (calculatedPnlState !== null) {
      setForm(f => ({ ...f, pnl: calculatedPnlState.toString() }))
      toast.success("Reset to auto-calculated PnL")
    } else {
      toast.error("Missing fields or unknown instrument for auto calculation")
    }
  }

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreScreenshot(reader.result as string)
        toast.success("Pre-trade screenshot attached successfully")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAccountId) {
      toast.error("No active account selected")
      return
    }
    if (!form.entry) {
      toast.error("Entry price is required")
      return
    }
    
    setLoading(true)
    try {
      const timestamp = new Date(`${form.date}T${form.time}`).getTime()
      const entryVal = parseFloat(form.entry)
      // If open trade, default exit to entry and pnl to 0
      const exitVal = form.exit ? parseFloat(form.exit) : entryVal
      const pnlVal = form.pnl ? parseFloat(form.pnl) : 0.0
      
      const createdTrade = await addTrade({
        accountId: activeAccountId,
        playbookId: selectedPlaybookId || undefined,
        playbookName: selectedPlaybook ? selectedPlaybook.name : undefined,
        instrument: form.instrument,
        direction: form.direction,
        entry: entryVal,
        exit: exitVal,
        contracts: parseFloat(form.contracts),
        pnl: pnlVal,
        calculatedPnl: calculatedPnlState,
        pnlMode: pnlMode,
        session: form.session as any,
        day: 1,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        timestamp,
        playbookChecklist: selectedPlaybook ? playbookChecklist : undefined,
        notes: form.notes || "",
        // Pre-Trade Analysis fields
        tradeIdea: preForm.tradeIdea,
        marketBias: preForm.marketBias,
        reasonForEntry: preForm.reasonForEntry,
        expectedRR: preForm.expectedRR
      })
      
      // Upload screenshot if present
      if (preScreenshot) {
        await addScreenshot(createdTrade.id, "Pre-Trade", preScreenshot)
      }
      
      toast.success("Trade recorded manually")
      router.push("/app/journal")
    } catch (err: any) {
      toast.error(err.message || "Failed to add trade")
    } finally {
      setLoading(false)
    }
  }

  const pnlNum = parseFloat(form.pnl)
  const isPnlPositive = !isNaN(pnlNum) && pnlNum > 0
  const isPnlNegative = !isNaN(pnlNum) && pnlNum < 0

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/journal')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual Trade Entry</h1>
          <p className="text-muted-foreground">Record trades executed outside of integrated platforms.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Playbook Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Playbook Selection
            </CardTitle>
            <CardDescription>Link this trade to one of your active playbooks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Playbook Used</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedPlaybookId} 
                onChange={e => setSelectedPlaybookId(e.target.value)}
              >
                <option value="">-- No Playbook --</option>
                {playbooks.map(pb => (
                  <option key={pb.id} value={pb.id}>{pb.name}</option>
                ))}
              </select>
            </div>

            {selectedPlaybook && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/20 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-muted-foreground">Category:</span>{" "}
                    <span className="font-medium">{selectedPlaybook.category}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Instrument:</span>{" "}
                    <span className="font-medium">{selectedPlaybook.instrument}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                  <div>
                    <div className="font-semibold text-muted-foreground mb-1">Entry Rules</div>
                    <p className="text-xs whitespace-pre-wrap">{selectedPlaybook.entryRules || "None specified"}</p>
                  </div>
                  <div>
                    <div className="font-semibold text-muted-foreground mb-1">Exit Rules</div>
                    <p className="text-xs whitespace-pre-wrap">{selectedPlaybook.exitRules || "None specified"}</p>
                  </div>
                </div>

                {selectedPlaybook.checklist && selectedPlaybook.checklist.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="font-semibold text-muted-foreground text-sm mb-2">Confluence Checklist</div>
                    <div className="space-y-2">
                      {selectedPlaybook.checklist.map((item: any, idx: number) => {
                        const text = typeof item === 'string' ? item : item.text
                        const id = item.id || idx.toString()
                        return (
                          <label key={idx} className="flex items-start gap-2.5 cursor-pointer text-xs font-medium">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded accent-primary mt-0.5"
                              checked={!!playbookChecklist[id]}
                              onChange={e => setPlaybookChecklist({ ...playbookChecklist, [id]: e.target.checked })}
                            />
                            <span>{text}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-Trade Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Pre-Trade Analysis
            </CardTitle>
            <CardDescription>Formulate your thesis and setup rules before logging execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trade Idea / Setup</Label>
                <Textarea 
                  placeholder="e.g. Breakout of morning range after liquidity grab" 
                  value={preForm.tradeIdea}
                  onChange={e => setPreForm({...preForm, tradeIdea: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason For Entry</Label>
                <Textarea 
                  placeholder="e.g. Bullish engulfing bar on 5m chart at key support level" 
                  value={preForm.reasonForEntry}
                  onChange={e => setPreForm({...preForm, reasonForEntry: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Market Bias</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={preForm.marketBias} 
                  onChange={e => setPreForm({...preForm, marketBias: e.target.value})}
                >
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Expected R:R</Label>
                <Input 
                  placeholder="e.g. 2.5 or 1:3" 
                  value={preForm.expectedRR}
                  onChange={e => setPreForm({...preForm, expectedRR: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pre-Trade Screenshot</Label>
              <div className="flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById("pre-screenshot-upload")?.click()}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                <input 
                  id="pre-screenshot-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                />
                {preScreenshot && (
                  <span className="text-xs text-muted-foreground truncate max-w-xs">
                    Screenshot attached (Base64)
                  </span>
                )}
              </div>
              {preScreenshot && (
                <div className="mt-2 relative rounded-lg border overflow-hidden max-h-48 max-w-sm">
                  <img src={preScreenshot} alt="Pre-Trade Preview" className="object-cover w-full h-full" />
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm" 
                    className="absolute top-2 right-2 h-7 w-7 p-0" 
                    onClick={() => setPreScreenshot(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trade Details */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Details</CardTitle>
            <CardDescription>Enter execution details and performance outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instrument (Ticker)</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.instrument} onChange={e => setForm({...form, instrument: e.target.value})} required>
                  <option value="" disabled>Select Instrument...</option>
                  <optgroup label="Indices">
                    <option value="ES">ES - E-mini S&P 500</option>
                    <option value="MES">MES - Micro E-mini S&P 500</option>
                    <option value="NQ">NQ - E-mini Nasdaq-100</option>
                    <option value="MNQ">MNQ - Micro E-mini Nasdaq-100</option>
                    <option value="YM">YM - E-mini Dow</option>
                    <option value="MYM">MYM - Micro E-mini Dow</option>
                    <option value="RTY">RTY - E-mini Russell 2000</option>
                    <option value="M2K">M2K - Micro E-mini Russell 2000</option>
                  </optgroup>
                  <optgroup label="Commodities">
                    <option value="CL">CL - Crude Oil</option>
                    <option value="GC">GC - Gold</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="OTHER">Other / Custom</option>
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.session} onChange={e => setForm({...form, session: e.target.value})} required>
                  <option>London</option>
                  <option>New York AM</option>
                  <option>New York PM</option>
                  <option>Asia</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1">
                <Label>Direction</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={form.direction} onChange={e => setForm({...form, direction: e.target.value as any})} required>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Contracts / Lots</Label>
                <Input type="number" step="0.01" value={form.contracts} onChange={e => setForm({...form, contracts: e.target.value})} required />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Entry Price</Label>
                <Input type="number" step="any" value={form.entry} onChange={e => setForm({...form, entry: e.target.value})} required />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Exit Price (Optional)</Label>
                <Input type="number" step="any" value={form.exit} onChange={e => setForm({...form, exit: e.target.value})} placeholder="Open trade" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label>Net PnL ($) (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      pnlMode === "AUTO" ? "bg-primary/10 text-primary" : "bg-warning/20 text-warning"
                    )}>
                      {pnlMode}
                    </span>
                    {pnlMode === "MANUAL" && calculatedPnlState !== null && (
                      <Button type="button" variant="ghost" size="icon-sm" className="h-5 w-5 hover:bg-muted" onClick={resetToAuto} title="Reset to auto-calculated">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Open trade" 
                    value={form.pnl} 
                    onChange={handleManualPnlChange} 
                    className={cn(
                      "font-semibold transition-colors duration-200",
                      isPnlPositive && "text-success focus-visible:ring-success/50",
                      isPnlNegative && "text-destructive focus-visible:ring-destructive/50"
                    )}
                  />
                  {calculatedPnlState === null && form.instrument && form.entry && form.exit && (
                    <p className="text-[10px] text-destructive absolute -bottom-5 left-0">
                      Cannot auto-calculate. Unknown instrument.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input placeholder="e.g., A+ Setup, FOMO, Tilt" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Trade Notes</Label>
              <Textarea 
                placeholder="Log thoughts during or after the trade..."
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2 pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save Trade"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
