"use client"

import { useState, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { evaluate, equityCurve } from "@/lib/rule-engine"
import { getFirm } from "@/lib/firms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import { Label } from "@/components/ui/label"
import dynamic from 'next/dynamic'
const EquityChart = dynamic(() => import("@/components/app/equity-chart").then(m => m.EquityChart), { ssr: false })
import { fmtCurrency, fmtPct } from "@/lib/format"
import { Beaker, TrendingUp, TrendingDown } from "lucide-react"

export default function SimulatorPage() {
  const accounts = usePropStore(s => s.accounts)
  const activeId = usePropStore(s => s.activeAccountId)
  const allTrades = usePropStore(s => s.trades)

  const [toggles, setToggles] = useState({
    noFridays: false,
    onlyAplus: false,
    halfRisk: false,
    noRevenge: false
  })

  const account = accounts.find(a => a.id === activeId)
  
  if (!account) {
    return <div className="text-center p-12">No active account found.</div>
  }

  const originalTrades = allTrades.filter(t => t.accountId === account.id)
  const firm = getFirm(account.firmId)!

  // Apply What-If Filters
  const simulatedTrades = useMemo(() => {
    let filtered = [...originalTrades]

    if (toggles.noFridays) {
      // Simplistic check assuming day % 5 == 0 is Friday in trading days
      filtered = filtered.filter(t => t.day % 5 !== 0)
    }

    if (toggles.onlyAplus) {
      filtered = filtered.filter(t => t.tags && t.tags.includes("A+ setup"))
    }

    if (toggles.noRevenge) {
      // Filter out trades taken within 5 minutes of a loss
      let lastLossTime = 0
      filtered = filtered.filter(t => {
        if (t.timestamp - lastLossTime < 5 * 60 * 1000) return false
        if (t.pnl < 0) lastLossTime = t.timestamp
        return true
      })
    }

    if (toggles.halfRisk) {
      filtered = filtered.map(t => ({
        ...t,
        pnl: t.pnl / 2,
        contracts: Math.max(1, Math.floor(t.contracts / 2))
      }))
    }

    return filtered
  }, [originalTrades, toggles])

  const originalStatus = evaluate(account.rules, originalTrades)
  const simulatedStatus = evaluate(account.rules, simulatedTrades)
  const originalCurve = equityCurve(account, originalTrades)
  const simulatedCurve = equityCurve(account, simulatedTrades)

  const diffPnl = simulatedStatus.totalPnl - originalStatus.totalPnl
  const diffWinRate = 
    (simulatedTrades.filter(t => t.pnl > 0).length / simulatedTrades.length || 0) * 100 -
    (originalTrades.filter(t => t.pnl > 0).length / originalTrades.length || 0) * 100

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Beaker className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">What-If Simulator</h1>
          <p className="text-muted-foreground">Toggle alternate realities and see how your challenge would have played out.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5 h-fit">
          <CardHeader>
            <CardTitle>Alternate Scenarios</CardTitle>
            <CardDescription>Enable rules to reconstruct the past.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer" htmlFor="no-friday">Skip Fridays</Label>
              <input type="checkbox" id="no-friday" className="w-5 h-5 accent-primary" checked={toggles.noFridays} onChange={e => setToggles({...toggles, noFridays: e.target.checked})} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer" htmlFor="half-risk">50% Risk Size</Label>
              <input type="checkbox" id="half-risk" className="w-5 h-5 accent-primary" checked={toggles.halfRisk} onChange={e => setToggles({...toggles, halfRisk: e.target.checked})} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer" htmlFor="no-revenge">No Revenge Trades</Label>
              <input type="checkbox" id="no-revenge" className="w-5 h-5 accent-primary" checked={toggles.noRevenge} onChange={e => setToggles({...toggles, noRevenge: e.target.checked})} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer" htmlFor="aplus">A+ Setups Only</Label>
              <input type="checkbox" id="aplus" className="w-5 h-5 accent-primary" checked={toggles.onlyAplus} onChange={e => setToggles({...toggles, onlyAplus: e.target.checked})} />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground text-sm font-medium mb-2">Simulated P&L</div>
                <div className="text-2xl font-bold">{fmtCurrency(simulatedStatus.totalPnl)}</div>
                <div className={`text-sm mt-1 flex items-center ${diffPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {diffPnl >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {diffPnl > 0 ? "+" : ""}{fmtCurrency(diffPnl)} vs actual
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground text-sm font-medium mb-2">Win Rate</div>
                <div className="text-2xl font-bold">{fmtPct((simulatedTrades.filter(t => t.pnl > 0).length / Math.max(simulatedTrades.length, 1)) * 100, 1)}</div>
                <div className={`text-sm mt-1 flex items-center ${diffWinRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {diffWinRate >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {diffWinRate > 0 ? "+" : ""}{diffWinRate.toFixed(1)}% vs actual
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground text-sm font-medium mb-2">Status</div>
                <div className={`text-2xl font-bold capitalize ${simulatedStatus.status === 'passed' ? 'text-success' : simulatedStatus.status === 'failed' ? 'text-destructive' : 'text-primary'}`}>
                  {simulatedStatus.status}
                </div>
                <div className="text-sm mt-1 text-muted-foreground">
                  Actual: <span className="capitalize">{originalStatus.status}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alternate Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <EquityChart data={simulatedCurve} target={account.rules.startingBalance + account.rules.profitTarget} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
