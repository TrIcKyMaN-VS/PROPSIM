"use client"

import { useState, useEffect } from "react"
import { usePropStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { TradeDirection } from "@/lib/types"
import { calculatePnl } from "@/lib/pnl-calculator"
import { cn } from "@/lib/utils"

export default function NewManualTradePage() {
  const router = useRouter()
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const addTrade = usePropStore(s => s.addTrade)

  const [loading, setLoading] = useState(false)
  const [pnlMode, setPnlMode] = useState<"AUTO" | "MANUAL">("AUTO")
  const [calculatedPnlState, setCalculatedPnlState] = useState<number | null>(null)

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

  // Auto calculation effect
  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAccountId) {
      toast.error("No active account selected")
      return
    }
    
    setLoading(true)
    try {
      const timestamp = new Date(`${form.date}T${form.time}`).getTime()
      
      await addTrade({
        accountId: activeAccountId,
        instrument: form.instrument,
        direction: form.direction,
        entry: parseFloat(form.entry),
        exit: parseFloat(form.exit),
        contracts: parseFloat(form.contracts), // support fractional sizes
        pnl: parseFloat(form.pnl),
        calculatedPnl: calculatedPnlState,
        pnlMode: pnlMode,
        session: form.session,
        day: 1, // Optional mock mapping
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        timestamp
      })
      
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

      <Card>
        <CardHeader>
          <CardTitle>Trade Details</CardTitle>
          <CardDescription>Enter execution details and performance outcomes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
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
                <Label>Exit Price</Label>
                <Input type="number" step="any" value={form.exit} onChange={e => setForm({...form, exit: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label>Net PnL ($)</Label>
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
                    placeholder="e.g., 250.50 or -150.00" 
                    value={form.pnl} 
                    onChange={handleManualPnlChange} 
                    className={cn(
                      "font-semibold transition-colors duration-200",
                      isPnlPositive && "text-success focus-visible:ring-success/50",
                      isPnlNegative && "text-destructive focus-visible:ring-destructive/50"
                    )}
                    required 
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

            <div className="flex justify-end gap-2 pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save Trade"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
