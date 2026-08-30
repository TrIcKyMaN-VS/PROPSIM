"use client"

import { useState } from "react"
import { usePropStore } from "@/lib/store"
import { INSTRUMENTS, SESSIONS } from "@/lib/firms"
import type { ChallengeAccount, Trade, TradeDirection } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Zap, CalendarPlus } from "lucide-react"

export function QuickTrade({ account }: { account: ChallengeAccount }) {
  const addTrade = usePropStore((s) => s.addTrade)
  const tradesFor = usePropStore((s) => s.tradesFor)
  const [instrument, setInstrument] = useState("ES")
  const [direction, setDirection] = useState<TradeDirection>("long")
  const [contracts, setContracts] = useState("2")
  const [pnl, setPnl] = useState("")
  const [session, setSession] = useState("New York AM")
  const [dayOffset, setDayOffset] = useState(0)

  const existing = tradesFor(account.id)
  const maxDay = existing.reduce((m, t) => Math.max(m, t.day), 0)
  const currentDay = Math.max(1, maxDay) + dayOffset

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const pnlNum = Number(pnl)
    if (Number.isNaN(pnlNum) || pnl === "") {
      toast.error("Enter a valid P&L value")
      return
    }
    const c = Number(contracts) || 1
    const priceDelta = pnlNum / (c * 50 || 1)
    const exitPrice = direction === "short" ? 5000 - priceDelta : 5000 + priceDelta
    addTrade({
      accountId: account.id,
      instrument,
      direction,
      entry: 5000,
      exit: exitPrice,
      contracts: c,
      pnl: pnlNum,
      day: currentDay,
      session: session as Trade["session"],
      tags: pnlNum >= 0 ? ["win"] : ["loss"],
    })
    toast.success(`Logged ${direction} ${instrument} · ${pnlNum >= 0 ? "+" : ""}$${pnlNum} (day ${currentDay})`)
    setPnl("")
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Simulate a trade</h3>
        <span className="ml-auto rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          Day {currentDay}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Instrument</Label>
          <Select value={instrument} onValueChange={(v) => setInstrument(v || "")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INSTRUMENTS.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Session</Label>
          <Select value={session} onValueChange={(v) => setSession(v || "")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection((v || "long") as TradeDirection)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Contracts</Label>
          <Input type="number" min="1" value={contracts} onChange={(e) => setContracts(e.target.value)} />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <Label className="text-xs">Profit / Loss ($)</Label>
        <Input
          type="number"
          placeholder="e.g. 250 or -180"
          value={pnl}
          onChange={(e) => setPnl(e.target.value)}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="submit" className="flex-1">Log trade</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDayOffset((d) => d + 1)
            toast.info(`Advanced to day ${Math.max(1, maxDay) + dayOffset + 1}`)
          }}
          title="Start a new trading day"
        >
          <CalendarPlus className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
