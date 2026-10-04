"use client"
import { uploadImageFormData } from "@/app/actions/journal-actions";

import { useState, useEffect } from "react"
import { usePropStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, Sparkles, Image as ImageIcon, Trash2, Upload } from "lucide-react"
import { SetupCombobox } from "@/components/app/setup-combobox"
import { toast } from "sonner"
import type { TradeDirection } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <DebouncedTextarea 
      {...props} 
      onInput={(e) => {
        e.currentTarget.style.height = 'auto'
        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
        if (props.onInput) props.onInput(e)
      }}
      className={props.className}
      style={{ overflow: 'hidden', minHeight: '60px', ...props.style }}
    />
  )
}

function DebouncedTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || '')
  useEffect(() => { setVal(props.value || '') }, [props.value])
  return (
    <Textarea 
      {...props} 
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={e => {
        if (props.onChange) props.onChange(e as any)
        if (props.onBlur) props.onBlur(e)
      }}
    />
  )
}
export default function NewManualTradePage() {
  const router = useRouter()
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const addTrade = usePropStore(s => s.addTrade)
  const saveTradePsychology = usePropStore(s => s.saveTradePsychology)
  const addScreenshot = usePropStore(s => s.addScreenshot)
  const addCustomSetup = usePropStore(s => s.addCustomSetup)
  const playbooks = (usePropStore(s => s.playbooks) || []).filter(p => !p.deletedAt)

  const [loading, setLoading] = useState(false)
  const [playbookId, setPlaybookId] = useState("")
  const [deleteScreenshotIdx, setDeleteScreenshotIdx] = useState<number | null>(null)

  const [form, setForm] = useState({
    instrument: "ES",
    direction: "long" as TradeDirection,
    date: new Date().toISOString().split("T")[0],
    time: "09:30",
    session: "New York AM",
    contracts: "1",
    entry: "",
    exit: "",
    pnl: "",
    netR: "",
    setupName: "",
    reasoning: "",
    resultVsExpectation: "",
    mistakes: "",
    processGrade: ""
  })

  const [screenshots, setScreenshots] = useState<string[]>([])
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100

  // Auto-calculate Net R when PnL changes
  useEffect(() => {
    const pnlNum = parseFloat(form.pnl)
    if (!isNaN(pnlNum) && pnlNum !== 0) {
      const calcR = (pnlNum / defaultPlannedRisk).toFixed(2)
      setForm(f => ({ ...f, netR: calcR }))
    }
  }, [form.pnl, defaultPlannedRisk])
  
  useEffect(() => {
      const handlePaste = async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        let hasImage = false
        for (const item of Array.from(items)) {
          if (item.type.indexOf("image") !== -1) hasImage = true
        }
        if (hasImage) e.preventDefault()
        
        for (const item of Array.from(items)) {
          if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile()
            if (!file) continue
            setUploadingImg(true)
            try {
              const formData = new FormData()
              formData.append("file", file)
              formData.append("prefix", "new_trade_paste")
              const url = await uploadImageFormData(formData)
              setScreenshots(s => [...s, url])
              toast.success("Screenshot pasted!")
            } catch {
              toast.error("Paste upload failed")
            } finally {
              setUploadingImg(false)
            }
          }
        }
      }
      
    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [])

  const [uploadingImg, setUploadingImg] = useState(false)
  
  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "new_trade_upload")
        const url = await uploadImageFormData(formData)
        setScreenshots(s => [...s, url])
      }
      toast.success("Screenshots uploaded!")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }

  const handleSave = async () => {
    if (!activeAccountId) return toast.error("No active account selected")
    if (!form.instrument || !form.date || !form.time || !form.entry || !form.pnl) {
      return toast.error("Please fill the required execution details (Instrument, Date, Time, Entry, PnL)")
    }

    setLoading(true)
    try {
      const [year, month, day] = form.date.split("-").map(Number)
      const [hour, minute] = form.time.split(":").map(Number)
      const timestamp = new Date(year, month - 1, day, hour, minute).getTime()
      
      const pnlNum = parseFloat(form.pnl) || 0
      const netRNum = form.netR ? parseFloat(form.netR) : null

      const trimmedSetup = form.setupName.trim()
      if (trimmedSetup) {
        addCustomSetup(trimmedSetup)
      }
      const matchingPb = playbooks.find((p: any) => p.name?.toLowerCase() === trimmedSetup.toLowerCase())

      const createdTrade = await addTrade({
        accountId: activeAccountId,
        playbookId: matchingPb?.id || playbookId || undefined,
        playbookName: trimmedSetup || undefined,
        instrument: form.instrument,
        direction: form.direction,
        entry: parseFloat(form.entry) || 0,
        exit: parseFloat(form.exit) || 0,
        contracts: parseFloat(form.contracts) || 1,
        pnl: pnlNum,
        netR: netRNum,
        session: form.session as any,
        day: 1,
        timestamp,
        reasonForEntry: form.reasoning,
        resultVsExpectation: form.resultVsExpectation,
        mistakes: form.mistakes,
      })

      if (form.processGrade) {
        await saveTradePsychology({
          tradeId: createdTrade.id,
          executionGrade: form.processGrade
        })
      }

      if (screenshots.length > 0) {
        for (let i = 0; i < screenshots.length; i++) {
          await addScreenshot(createdTrade.id, "entry_" + i, screenshots[i])
        }
      }

      toast.success("Trade recorded manually")
      router.push(`/app/journal/${createdTrade.id}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to log trade")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.push('/app/journal')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual Trade Entry</h1>
          <p className="text-muted-foreground text-sm">Record trades based on the Trade Breakdown journal system.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Part B · Trade breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Setup Name</Label>
              <SetupCombobox 
                value={form.setupName}
                onChange={(val) => setForm(f => ({ ...f, setupName: val }))}
                placeholder="Select or enter setup..."
                className="h-10 bg-muted/20"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Result (R-Multiple)</Label>
                <Badge variant="outline" className="font-mono text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30 uppercase font-bold">
                  Auto
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.01" className="bg-muted/20 flex-1 font-mono font-bold text-cyan-400" value={form.netR} onChange={e => setForm({...form, netR: e.target.value})} placeholder="e.g. 2.50" />
                <span className="text-sm font-bold font-mono text-cyan-400">R</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Chart Screenshots</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Entry, stop, target and the level that justified them.</p>
            {screenshots.length === 0 ? (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Upload Images</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} disabled={uploadingImg} />
              </label>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((sc, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border aspect-video">
                    <img src={sc} alt="Screenshot" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        setDeleteScreenshotIdx(idx)
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-destructive text-white rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-12 text-center cursor-pointer hover:bg-muted/10 transition-colors group aspect-video">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Add More</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Reasoning & logic</Label>
            <AutoTextarea 
              className="bg-muted/20 text-sm border-0 focus-visible:ring-1" 
              placeholder="What was the setup, and what confirmed it? Context, level, order flow, effort vs result..." 
              value={form.reasoning} onChange={e => setForm({...form, reasoning: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Result vs expectation</Label>
            <AutoTextarea 
              className="bg-muted/20 text-sm border-0 focus-visible:ring-1" 
              placeholder="What actually happened, and did it behave the way the model says it should?" 
              value={form.resultVsExpectation} onChange={e => setForm({...form, resultVsExpectation: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Mistakes & improvement</Label>
            <AutoTextarea 
              className="bg-muted/20 text-sm border-0 focus-visible:ring-1" 
              placeholder="Entry timing, sizing, management, exit. Could this execution have been better?" 
              value={form.mistakes} onChange={e => setForm({...form, mistakes: e.target.value})}
            />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Grade every trade on process, not P&L</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { grade: "A", desc: "By the model, well executed." },
                { grade: "B", desc: "By the model, sloppy entry or exit." },
                { grade: "C", desc: "Marginal setup, forced." },
                { grade: "D", desc: "Outside the model entirely." }
              ].map(g => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => setForm({...form, processGrade: g.grade})}
                  className={`text-left p-3 rounded-lg border text-sm transition-all flex items-start gap-3 ${form.processGrade === g.grade ? "bg-primary/10 border-primary text-foreground" : "bg-muted/10 border-border/40 text-muted-foreground hover:border-primary/40 hover:bg-muted/20"}`}
                >
                  <span className={`font-black text-lg ${form.processGrade === g.grade ? "text-primary" : "text-muted-foreground/60"}`}>{g.grade}</span>
                  <span className="mt-1 leading-snug">{g.desc}</span>
                </button>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Execution Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />
            </div>
            <div className="space-y-2">
              <Label>Time *</Label>
              <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label>Instrument *</Label>
              <Input value={form.instrument} onChange={e => setForm({...form, instrument: e.target.value})} className="bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background" value={form.session} onChange={e => setForm({...form, session: e.target.value})}>
                <option>New York AM</option><option>New York PM</option><option>London</option><option>Asia</option><option>Overnight</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background" value={form.direction} onChange={e => setForm({...form, direction: e.target.value as TradeDirection})}>
                <option value="long">Long</option><option value="short">Short</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Contracts / Lots</Label>
              <Input type="number" value={form.contracts} onChange={e => setForm({...form, contracts: e.target.value})} className="bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label>Entry Price *</Label>
              <Input type="number" step="0.00001" value={form.entry} onChange={e => setForm({...form, entry: e.target.value})} className="bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label>Exit Price</Label>
              <Input type="number" step="0.00001" value={form.exit} onChange={e => setForm({...form, exit: e.target.value})} className="bg-muted/20" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Net PnL ($) *</Label>
              <Input type="number" step="0.01" value={form.pnl} onChange={e => setForm({...form, pnl: e.target.value})} className="bg-muted/20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.push('/app/journal')}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading && <Sparkles className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" /> Save Trade Breakdown
        </Button>
      </div>

      {/* Delete Screenshot Confirmation Dialog */}
      <AlertDialog open={deleteScreenshotIdx !== null} onOpenChange={(open) => !open && setDeleteScreenshotIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this screenshot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteScreenshotIdx(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteScreenshotIdx !== null) {
                  setScreenshots(s => s.filter((_, i) => i !== deleteScreenshotIdx))
                  setDeleteScreenshotIdx(null)
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}






