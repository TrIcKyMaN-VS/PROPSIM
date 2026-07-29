"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  Coins,
  Layers,
  Plus,
  Minus,
  Trash2,
  Scale
} from "lucide-react"

// Instrument Specifications Database
export interface InstrumentSpec {
  symbol: string
  name: string
  pointValue: number
  tickSize: number
  tickValue: number
  defaultCommission: number // per side per contract
}

export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  NQ: { symbol: "NQ", name: "E-mini Nasdaq 100", pointValue: 20, tickSize: 0.25, tickValue: 5.0, defaultCommission: 2.25 },
  MNQ: { symbol: "MNQ", name: "Micro E-mini Nasdaq 100", pointValue: 2, tickSize: 0.25, tickValue: 0.5, defaultCommission: 0.62 },
  ES: { symbol: "ES", name: "E-mini S&P 500", pointValue: 50, tickSize: 0.25, tickValue: 12.5, defaultCommission: 2.25 },
  MES: { symbol: "MES", name: "Micro E-mini S&P 500", pointValue: 5, tickSize: 0.25, tickValue: 1.25, defaultCommission: 0.62 },
  YM: { symbol: "YM", name: "E-mini Dow Jones", pointValue: 5, tickSize: 1.0, tickValue: 5.0, defaultCommission: 2.25 },
  MYM: { symbol: "MYM", name: "Micro E-mini Dow", pointValue: 0.5, tickSize: 1.0, tickValue: 0.5, defaultCommission: 0.62 },
  RTY: { symbol: "RTY", name: "E-mini Russell 2000", pointValue: 50, tickSize: 0.1, tickValue: 5.0, defaultCommission: 2.25 },
  M2K: { symbol: "M2K", name: "Micro E-mini Russell 2000", pointValue: 5, tickSize: 0.1, tickValue: 0.5, defaultCommission: 0.62 },
  CL: { symbol: "CL", name: "Crude Oil", pointValue: 1000, tickSize: 0.01, tickValue: 10.0, defaultCommission: 2.5 },
  MCL: { symbol: "MCL", name: "Micro Crude Oil", pointValue: 100, tickSize: 0.01, tickValue: 1.0, defaultCommission: 0.75 },
  GC: { symbol: "GC", name: "Gold", pointValue: 100, tickSize: 0.1, tickValue: 10.0, defaultCommission: 2.5 },
  MGC: { symbol: "MGC", name: "Micro Gold", pointValue: 10, tickSize: 0.1, tickValue: 1.0, defaultCommission: 0.75 },
}

interface SimulatedTrade {
  id: string
  instrument: string
  direction: "long" | "short"
  points: number
  contracts: number
  pnl: number
  timestamp: string
}

export default function PnlCalculatorPage() {
  // Helper to safely step integer inputs
  const stepInt = (currentVal: string, delta: number, minVal = 1) => {
    const parsed = parseInt(currentVal, 10)
    const base = isNaN(parsed) ? minVal : parsed
    const next = Math.max(minVal, base + delta)
    return next.toString()
  }

  // Strict Sanitizers to block alphabets and non-numeric keystrokes
  const sanitizeDecimal = (val: string) => {
    let cleaned = val.replace(/[^0-9.-]/g, '')
    if (cleaned.startsWith('-')) {
      cleaned = '-' + cleaned.slice(1).replace(/-/g, '')
    } else {
      cleaned = cleaned.replace(/-/g, '')
    }
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }
    return cleaned
  }

  const sanitizeInteger = (val: string) => {
    return val.replace(/[^0-9]/g, '')
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: Single Trade P&L Calculator State
  // ---------------------------------------------------------------------------
  const [s1Symbol, setS1Symbol] = useState<string>("NQ")
  const [s1Mode, setS1Mode] = useState<"price" | "points">("price")
  const [s1Direction, setS1Direction] = useState<"long" | "short">("long")
  const [s1Entry, setS1Entry] = useState<string>("19500.00")
  const [s1Exit, setS1Exit] = useState<string>("19525.00")
  const [s1PointsInput, setS1PointsInput] = useState<string>("25.00")
  const [s1Contracts, setS1Contracts] = useState<string>("2")
  const [s1CommissionPerSide, setS1CommissionPerSide] = useState<string>(
    INSTRUMENT_SPECS["NQ"].defaultCommission.toString()
  )

  const s1Spec = INSTRUMENT_SPECS[s1Symbol] || INSTRUMENT_SPECS["NQ"]

  // Calculate Section 1 Metrics
  const s1Results = useMemo(() => {
    const contracts = Math.max(1, parseFloat(s1Contracts) || 1)
    const commPerSide = Math.max(0, parseFloat(s1CommissionPerSide) || 0)
    const totalComm = commPerSide * 2 * contracts

    let pointsGained = 0
    if (s1Mode === "price") {
      const entry = parseFloat(s1Entry) || 0
      const exit = parseFloat(s1Exit) || 0
      pointsGained = s1Direction === "long" ? exit - entry : entry - exit
    } else {
      const pts = parseFloat(s1PointsInput) || 0
      pointsGained = s1Direction === "long" ? pts : -pts
    }

    const ticksGained = Math.round(pointsGained / s1Spec.tickSize)
    const grossPnl = pointsGained * s1Spec.pointValue * contracts
    const netPnl = grossPnl - totalComm
    const breakevenPoints = (commPerSide * 2) / s1Spec.pointValue

    return {
      pointsGained,
      ticksGained,
      grossPnl,
      netPnl,
      totalComm,
      breakevenPoints,
      contracts
    }
  }, [s1Symbol, s1Mode, s1Direction, s1Entry, s1Exit, s1PointsInput, s1Contracts, s1CommissionPerSide, s1Spec])

  const handleS1SymbolChange = (sym: string) => {
    setS1Symbol(sym)
    const spec = INSTRUMENT_SPECS[sym]
    if (spec) {
      setS1CommissionPerSide(spec.defaultCommission.toString())
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Risk / Reward Calculator State
  // ---------------------------------------------------------------------------
  const [s2Symbol, setS2Symbol] = useState<string>("NQ")
  const [s2Direction, setS2Direction] = useState<"long" | "short">("long")
  const [s2Entry, setS2Entry] = useState<string>("19500.00")
  const [s2StopLoss, setS2StopLoss] = useState<string>("19480.00")
  const [s2Target, setS2Target] = useState<string>("19550.00")
  const [s2Contracts, setS2Contracts] = useState<string>("2")

  const s2Spec = INSTRUMENT_SPECS[s2Symbol] || INSTRUMENT_SPECS["NQ"]

  const s2Results = useMemo(() => {
    const entry = parseFloat(s2Entry) || 0
    const sl = parseFloat(s2StopLoss) || 0
    const target = parseFloat(s2Target) || 0
    const contracts = Math.max(1, parseFloat(s2Contracts) || 1)

    let riskPts = 0
    let rewardPts = 0

    if (s2Direction === "long") {
      riskPts = Math.max(0, entry - sl)
      rewardPts = Math.max(0, target - entry)
    } else {
      riskPts = Math.max(0, sl - entry)
      rewardPts = Math.max(0, entry - target)
    }

    const riskTicks = Math.round(riskPts / s2Spec.tickSize)
    const rewardTicks = Math.round(rewardPts / s2Spec.tickSize)

    const dollarRisk = riskPts * s2Spec.pointValue * contracts
    const dollarReward = rewardPts * s2Spec.pointValue * contracts

    const rrRatio = riskPts > 0 ? rewardPts / riskPts : 0
    const breakevenWinRate = rrRatio > 0 ? (1 / (1 + rrRatio)) * 100 : 0

    return {
      riskPts,
      rewardPts,
      riskTicks,
      rewardTicks,
      dollarRisk,
      dollarReward,
      rrRatio,
      breakevenWinRate,
      contracts
    }
  }, [s2Symbol, s2Direction, s2Entry, s2StopLoss, s2Target, s2Contracts, s2Spec])

  // ---------------------------------------------------------------------------
  // SECTION 3: Position Sizing Calculator State
  // ---------------------------------------------------------------------------
  const [s3Symbol, setS3Symbol] = useState<string>("NQ")
  const [s3AccountBalance, setS3AccountBalance] = useState<string>("50000")
  const [s3RiskPct, setS3RiskPct] = useState<string>("1.5")
  const [s3StopLossPoints, setS3StopLossPoints] = useState<string>("20")

  const s3Spec = INSTRUMENT_SPECS[s3Symbol] || INSTRUMENT_SPECS["NQ"]

  const s3Results = useMemo(() => {
    const balance = Math.max(0, parseFloat(s3AccountBalance) || 0)
    const pct = Math.max(0, parseFloat(s3RiskPct) || 0)
    const slPts = Math.max(0.01, parseFloat(s3StopLossPoints) || 0.01)

    const maxDollarRisk = (balance * pct) / 100
    const riskPerContract = slPts * s3Spec.pointValue

    const rawContracts = riskPerContract > 0 ? maxDollarRisk / riskPerContract : 0
    const recommendedContracts = Math.floor(rawContracts)
    const actualDollarRisk = recommendedContracts * riskPerContract

    return {
      maxDollarRisk,
      riskPerContract,
      rawContracts,
      recommendedContracts,
      actualDollarRisk
    }
  }, [s3Symbol, s3AccountBalance, s3RiskPct, s3StopLossPoints, s3Spec])

  // ---------------------------------------------------------------------------
  // SECTION 4: Commission Drag Analyzer State
  // ---------------------------------------------------------------------------
  const [s4Symbol, setS4Symbol] = useState<string>("NQ")
  const [s4CommPerSide, setS4CommPerSide] = useState<string>(
    INSTRUMENT_SPECS["NQ"].defaultCommission.toString()
  )
  const [s4TradesPerDay, setS4TradesPerDay] = useState<string>("5")
  const [s4TradingDaysPerMonth, setS4TradingDaysPerMonth] = useState<string>("20")
  const [s4ContractsPerTrade, setS4ContractsPerTrade] = useState<string>("2")

  const s4Spec = INSTRUMENT_SPECS[s4Symbol] || INSTRUMENT_SPECS["NQ"]

  const s4Results = useMemo(() => {
    const commPerSide = Math.max(0, parseFloat(s4CommPerSide) || 0)
    const tradesPerDay = Math.max(0, parseFloat(s4TradesPerDay) || 0)
    const daysPerMonth = Math.max(0, parseFloat(s4TradingDaysPerMonth) || 0)
    const contracts = Math.max(1, parseFloat(s4ContractsPerTrade) || 1)

    const commPerTrade = commPerSide * 2 * contracts
    const dailyComm = commPerTrade * tradesPerDay
    const monthlyComm = dailyComm * daysPerMonth
    const yearlyComm = monthlyComm * 12

    const pointsLostPerTrade = commPerSide * 2 / s4Spec.pointValue

    return {
      commPerTrade,
      dailyComm,
      monthlyComm,
      yearlyComm,
      pointsLostPerTrade
    }
  }, [s4Symbol, s4CommPerSide, s4TradesPerDay, s4TradingDaysPerMonth, s4ContractsPerTrade, s4Spec])

  // ---------------------------------------------------------------------------
  // SECTION 5: Multi-Trade Session Simulator State
  // ---------------------------------------------------------------------------
  const [simTrades, setSimTrades] = useState<SimulatedTrade[]>([
    { id: "1", instrument: "NQ", direction: "long", points: 25, contracts: 2, pnl: 1000, timestamp: "10:15 AM" },
    { id: "2", instrument: "NQ", direction: "short", points: -12, contracts: 2, pnl: -480, timestamp: "10:42 AM" },
    { id: "3", instrument: "NQ", direction: "long", points: 30, contracts: 2, pnl: 1200, timestamp: "11:20 AM" },
  ])

  const [simSymbol, setSimSymbol] = useState<string>("NQ")
  const [simDirection, setSimDirection] = useState<"long" | "short">("long")
  const [simPoints, setSimPoints] = useState<string>("15")
  const [simContracts, setSimContracts] = useState<string>("2")

  const handleAddSimTrade = () => {
    const pts = parseFloat(simPoints) || 0
    const cnt = Math.max(1, parseFloat(simContracts) || 1)
    const spec = INSTRUMENT_SPECS[simSymbol] || INSTRUMENT_SPECS["NQ"]

    const commPerSide = spec.defaultCommission
    const grossPnl = pts * spec.pointValue * cnt
    const netPnl = grossPnl - (commPerSide * 2 * cnt)

    const newTrade: SimulatedTrade = {
      id: Date.now().toString(),
      instrument: simSymbol,
      direction: simDirection,
      points: pts,
      contracts: cnt,
      pnl: netPnl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setSimTrades(prev => [...prev, newTrade])
  }

  const handleRemoveSimTrade = (id: string) => {
    setSimTrades(prev => prev.filter(t => t.id !== id))
  }

  const handleClearSimTrades = () => {
    setSimTrades([])
  }

  const simMetrics = useMemo(() => {
    const totalTrades = simTrades.length
    if (totalTrades === 0) {
      return {
        totalPnl: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        equityCurve: [0]
      }
    }

    const totalPnl = simTrades.reduce((sum, t) => sum + t.pnl, 0)
    const wins = simTrades.filter(t => t.pnl > 0)
    const losses = simTrades.filter(t => t.pnl <= 0)

    const winCount = wins.length
    const lossCount = losses.length
    const winRate = (winCount / totalTrades) * 100

    const totalWinDollar = wins.reduce((sum, t) => sum + t.pnl, 0)
    const totalLossDollar = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))

    const avgWin = winCount > 0 ? totalWinDollar / winCount : 0
    const avgLoss = lossCount > 0 ? totalLossDollar / lossCount : 0

    const profitFactor = totalLossDollar > 0 ? totalWinDollar / totalLossDollar : totalWinDollar > 0 ? 99 : 0
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss

    let currentEquity = 0
    const equityCurve = [0]
    for (const t of simTrades) {
      currentEquity += t.pnl
      equityCurve.push(currentEquity)
    }

    return {
      totalPnl,
      winCount,
      lossCount,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      equityCurve
    }
  }, [simTrades])

  // Helper number formatter
  const fmt = (num: number, dp = 2, sign = false) => {
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp
    })
    if (sign && num > 0) return `+${formatted}`
    return formatted
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced P&L Calculator</h1>
            <p className="text-muted-foreground">
              Institutional-grade futures P&L, position sizing, risk/reward & commission analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="trade-pnl" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-card/60 p-1 border border-border">
          <TabsTrigger value="trade-pnl" className="gap-2 text-xs font-semibold">
            <Calculator className="h-4 w-4" /> Trade P&L
          </TabsTrigger>
          <TabsTrigger value="risk-reward" className="gap-2 text-xs font-semibold">
            <Scale className="h-4 w-4" /> Risk / Reward
          </TabsTrigger>
          <TabsTrigger value="position-sizing" className="gap-2 text-xs font-semibold">
            <Percent className="h-4 w-4" /> Position Sizing
          </TabsTrigger>
          <TabsTrigger value="commission" className="gap-2 text-xs font-semibold">
            <Coins className="h-4 w-4" /> Commission Drag
          </TabsTrigger>
          <TabsTrigger value="session-sim" className="gap-2 text-xs font-semibold">
            <Layers className="h-4 w-4" /> Session Simulator
          </TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* TAB 1: SINGLE TRADE P&L CALCULATOR */}
        {/* ==================================================================== */}
        <TabsContent value="trade-pnl" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            {/* Input Controls */}
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" /> Trade Parameters
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {s1Spec.name} (${s1Spec.pointValue}/pt)
                  </Badge>
                </div>
                <CardDescription>
                  Calculate exact profit or loss using prices or direct points.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Instrument Selector */}
                <div className="space-y-2">
                  <Label>Futures Instrument</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => handleS1SymbolChange(sym)}
                        className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                          s1Symbol === sym
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation Mode & Direction */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Calculation Mode</Label>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1 bg-background/50">
                      <button
                        type="button"
                        onClick={() => setS1Mode("price")}
                        className={`rounded-md py-1 text-xs font-semibold transition-colors ${
                          s1Mode === "price" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        Price Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setS1Mode("points")}
                        className={`rounded-md py-1 text-xs font-semibold transition-colors ${
                          s1Mode === "points" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        Points Mode
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1 bg-background/50">
                      <button
                        type="button"
                        onClick={() => setS1Direction("long")}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-xs font-semibold transition-colors ${
                          s1Direction === "long" ? "bg-success/20 text-success" : "text-muted-foreground"
                        }`}
                      >
                        <TrendingUp className="h-3.5 w-3.5" /> Long
                      </button>
                      <button
                        type="button"
                        onClick={() => setS1Direction("short")}
                        className={`flex items-center justify-center gap-1 rounded-md py-1 text-xs font-semibold transition-colors ${
                          s1Direction === "short" ? "bg-destructive/20 text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        <TrendingDown className="h-3.5 w-3.5" /> Short
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dynamic Inputs based on Mode */}
                {s1Mode === "price" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="s1-entry">Entry Price</Label>
                      <Input
                        id="s1-entry"
                        type="text"
                        inputMode="decimal"
                        value={s1Entry}
                        onChange={(e) => setS1Entry(sanitizeDecimal(e.target.value))}
                        className="font-mono text-base bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s1-exit">Exit Price</Label>
                      <Input
                        id="s1-exit"
                        type="text"
                        inputMode="decimal"
                        value={s1Exit}
                        onChange={(e) => setS1Exit(sanitizeDecimal(e.target.value))}
                        className="font-mono text-base bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="s1-points">Points Gained / Lost (+ or -)</Label>
                    <Input
                      id="s1-points"
                      type="text"
                      inputMode="decimal"
                      value={s1PointsInput}
                      onChange={(e) => setS1PointsInput(sanitizeDecimal(e.target.value))}
                      placeholder="e.g. 25.00 or -15.00"
                      className="font-mono text-base bg-background"
                    />
                  </div>
                )}

                {/* Contracts & Commission */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s1-contracts">Number of Contracts</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setS1Contracts(stepInt(s1Contracts, -1, 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="s1-contracts"
                        type="text"
                        inputMode="numeric"
                        value={s1Contracts}
                        onChange={(e) => setS1Contracts(sanitizeInteger(e.target.value))}
                        className="font-mono text-base text-center bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setS1Contracts(stepInt(s1Contracts, 1, 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s1-comm">Commission ($/side/contract)</Label>
                    <Input
                      id="s1-comm"
                      type="text"
                      inputMode="decimal"
                      value={s1CommissionPerSide}
                      onChange={(e) => setS1CommissionPerSide(sanitizeDecimal(e.target.value))}
                      className="font-mono text-base bg-background"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md flex flex-col justify-between">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <span>P&L Output Summary</span>
                  <Badge
                    variant={s1Results.netPnl >= 0 ? "default" : "destructive"}
                    className={s1Results.netPnl >= 0 ? "bg-success text-success-foreground" : ""}
                  >
                    {s1Results.netPnl >= 0 ? "PROFITABLE" : "LOSS"}
                  </Badge>
                </CardTitle>
                <CardDescription>Comprehensive result breakdown for this trade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Highlight Big P&L Card */}
                <div
                  className={`rounded-xl border p-5 text-center transition-all ${
                    s1Results.netPnl >= 0
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Net Profit / Loss
                  </div>
                  <div className="text-4xl font-extrabold font-mono tracking-tight">
                    ${fmt(s1Results.netPnl, 2, true)}
                  </div>
                  <div className="text-xs font-medium mt-2 text-muted-foreground">
                    Gross P&L: <span className="font-mono font-semibold">${fmt(s1Results.grossPnl, 2, true)}</span> | Total Fees: <span className="font-mono text-destructive">${fmt(s1Results.totalComm, 2)}</span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Points Moved</div>
                    <div className="text-lg font-bold mt-1">
                      {fmt(s1Results.pointsGained, 2, true)} pts
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Ticks Moved</div>
                    <div className="text-lg font-bold mt-1">
                      {s1Results.ticksGained > 0 ? `+${s1Results.ticksGained}` : s1Results.ticksGained} ticks
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Commission Drag</div>
                    <div className="text-lg font-bold text-destructive mt-1">
                      -${fmt(s1Results.totalComm, 2)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Breakeven Points</div>
                    <div className="text-lg font-bold text-primary mt-1">
                      {fmt(s1Results.breakevenPoints, 2)} pts
                    </div>
                  </div>
                </div>

                {/* Instrument Specifications Summary */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1 font-sans">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>{s1Spec.name} ({s1Spec.symbol}) Specifications</span>
                    <span className="font-mono text-primary">${s1Spec.pointValue}/pt</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tick Size: <strong className="text-foreground">{s1Spec.tickSize}</strong></span>
                    <span>Tick Value: <strong className="text-foreground">${s1Spec.tickValue}</strong></span>
                    <span>Round-turn Comm: <strong className="text-foreground">${s1Spec.defaultCommission * 2}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: RISK / REWARD CALCULATOR */}
        {/* ==================================================================== */}
        <TabsContent value="risk-reward" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" /> Risk / Reward Setup
                </CardTitle>
                <CardDescription>
                  Determine your Risk-to-Reward ratio and minimum win rate needed to break even.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Instrument Selector */}
                <div className="space-y-2">
                  <Label>Futures Instrument</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setS2Symbol(sym)}
                        className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                          s2Symbol === sym
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direction Switcher */}
                <div className="space-y-2">
                  <Label>Trade Direction</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1 bg-background/50">
                    <button
                      type="button"
                      onClick={() => setS2Direction("long")}
                      className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        s2Direction === "long" ? "bg-success/20 text-success" : "text-muted-foreground"
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setS2Direction("short")}
                      className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        s2Direction === "short" ? "bg-destructive/20 text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      <TrendingDown className="h-3.5 w-3.5" /> Short
                    </button>
                  </div>
                </div>

                {/* Price Levels */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="s2-entry">Entry Price</Label>
                    <Input
                      id="s2-entry"
                      type="text"
                      inputMode="decimal"
                      value={s2Entry}
                      onChange={(e) => setS2Entry(sanitizeDecimal(e.target.value))}
                      className="font-mono text-sm bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s2-sl" className="text-destructive">Stop Loss</Label>
                    <Input
                      id="s2-sl"
                      type="text"
                      inputMode="decimal"
                      value={s2StopLoss}
                      onChange={(e) => setS2StopLoss(sanitizeDecimal(e.target.value))}
                      className="font-mono text-sm border-destructive/30 bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s2-target" className="text-success">Target Price</Label>
                    <Input
                      id="s2-target"
                      type="text"
                      inputMode="decimal"
                      value={s2Target}
                      onChange={(e) => setS2Target(sanitizeDecimal(e.target.value))}
                      className="font-mono text-sm border-success/30 bg-background"
                    />
                  </div>
                </div>

                {/* Contracts */}
                <div className="space-y-2">
                  <Label htmlFor="s2-contracts">Contracts</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setS2Contracts(stepInt(s2Contracts, -1, 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="s2-contracts"
                      type="text"
                      inputMode="numeric"
                      value={s2Contracts}
                      onChange={(e) => setS2Contracts(sanitizeInteger(e.target.value))}
                      className="font-mono text-sm text-center bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setS2Contracts(stepInt(s2Contracts, 1, 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md flex flex-col justify-between">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <span>Risk / Reward Metrics</span>
                  <Badge variant="outline" className="font-mono border-primary/30 text-primary">
                    1 : {fmt(s2Results.rrRatio, 2)} R:R
                  </Badge>
                </CardTitle>
                <CardDescription>Expectancy and win rate requirements.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Visual R:R Distribution Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-destructive">Risk: ${fmt(s2Results.dollarRisk, 2)} ({s2Results.riskPts} pts)</span>
                    <span className="text-success">Reward: ${fmt(s2Results.dollarReward, 2)} ({s2Results.rewardPts} pts)</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="h-full bg-destructive transition-all"
                      style={{
                        width: `${Math.max(10, Math.min(90, (s2Results.dollarRisk / (s2Results.dollarRisk + s2Results.dollarReward || 1)) * 100))}%`
                      }}
                    />
                    <div
                      className="h-full bg-success transition-all"
                      style={{
                        width: `${Math.max(10, Math.min(90, (s2Results.dollarReward / (s2Results.dollarRisk + s2Results.dollarReward || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                    <div className="text-xs font-sans text-muted-foreground">Dollar Risk</div>
                    <div className="text-xl font-extrabold text-destructive mt-1">
                      -${fmt(s2Results.dollarRisk, 2)}
                    </div>
                    <div className="text-xs font-sans text-muted-foreground mt-1">
                      {s2Results.riskPts} pts ({s2Results.riskTicks} ticks)
                    </div>
                  </div>

                  <div className="rounded-lg border border-success/20 bg-success/10 p-3">
                    <div className="text-xs font-sans text-muted-foreground">Dollar Reward</div>
                    <div className="text-xl font-extrabold text-success mt-1">
                      +${fmt(s2Results.dollarReward, 2)}
                    </div>
                    <div className="text-xs font-sans text-muted-foreground mt-1">
                      {s2Results.rewardPts} pts ({s2Results.rewardTicks} ticks)
                    </div>
                  </div>
                </div>

                {/* Breakeven Win Rate Box */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Minimum Required Win Rate
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                      {fmt(s2Results.breakevenWinRate, 1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Win rate needed to achieve 0 net loss with this 1:{fmt(s2Results.rrRatio, 2)} ratio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: POSITION SIZING CALCULATOR */}
        {/* ==================================================================== */}
        <TabsContent value="position-sizing" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" /> Risk-Based Position Sizer
                </CardTitle>
                <CardDescription>
                  Calculate the exact contract size based on your account size and stop loss.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Instrument Selector */}
                <div className="space-y-2">
                  <Label>Futures Instrument</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setS3Symbol(sym)}
                        className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                          s3Symbol === sym
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="s3-balance">Account Balance ($)</Label>
                  <Input
                    id="s3-balance"
                    type="text"
                    inputMode="decimal"
                    value={s3AccountBalance}
                    onChange={(e) => setS3AccountBalance(sanitizeDecimal(e.target.value))}
                    className="font-mono text-base bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s3-risk">Risk Per Trade (%)</Label>
                    <Input
                      id="s3-risk"
                      type="text"
                      inputMode="decimal"
                      value={s3RiskPct}
                      onChange={(e) => setS3RiskPct(sanitizeDecimal(e.target.value))}
                      className="font-mono text-base bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s3-sl">Stop Loss (Points)</Label>
                    <Input
                      id="s3-sl"
                      type="text"
                      inputMode="decimal"
                      value={s3StopLossPoints}
                      onChange={(e) => setS3StopLossPoints(sanitizeDecimal(e.target.value))}
                      className="font-mono text-base bg-background"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md flex flex-col justify-between">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Recommended Sizing</CardTitle>
                <CardDescription>Strict risk compliance sizing output.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-6 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Recommended Contracts
                  </div>
                  <div className="text-5xl font-extrabold font-mono text-primary">
                    {s3Results.recommendedContracts} <span className="text-xl font-normal text-muted-foreground">{s3Spec.symbol}</span>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-2">
                    Exact unrounded: {fmt(s3Results.rawContracts, 2)} contracts
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Max Allowed Risk</div>
                    <div className="text-lg font-bold text-destructive mt-1">
                      ${fmt(s3Results.maxDollarRisk, 2)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Actual Dollar Risk</div>
                    <div className="text-lg font-bold text-foreground mt-1">
                      ${fmt(s3Results.actualDollarRisk, 2)}
                    </div>
                  </div>
                </div>

                {s3Results.recommendedContracts === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Your stop loss is too wide for your allowed risk budget. Reduce stop loss points or switch to micro contracts ({s3Spec.symbol.startsWith("M") ? s3Spec.symbol : "M" + s3Spec.symbol}).</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: COMMISSION DRAG ANALYZER */}
        {/* ==================================================================== */}
        <TabsContent value="commission" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" /> Commission Impact Settings
                </CardTitle>
                <CardDescription>
                  Evaluate how broker & exchange fees eat into your net profit over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Futures Instrument</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          setS4Symbol(sym)
                          setS4CommPerSide(INSTRUMENT_SPECS[sym].defaultCommission.toString())
                        }}
                        className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                          s4Symbol === sym
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s4-comm">Commission ($/side/contract)</Label>
                    <Input
                      id="s4-comm"
                      type="text"
                      inputMode="decimal"
                      value={s4CommPerSide}
                      onChange={(e) => setS4CommPerSide(sanitizeDecimal(e.target.value))}
                      className="font-mono text-base bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s4-cnt">Contracts Per Trade</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setS4ContractsPerTrade(stepInt(s4ContractsPerTrade, -1, 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="s4-cnt"
                        type="text"
                        inputMode="numeric"
                        value={s4ContractsPerTrade}
                        onChange={(e) => setS4ContractsPerTrade(sanitizeInteger(e.target.value))}
                        className="font-mono text-base text-center bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setS4ContractsPerTrade(stepInt(s4ContractsPerTrade, 1, 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s4-tpd">Trades Per Day</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setS4TradesPerDay(stepInt(s4TradesPerDay, -1, 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="s4-tpd"
                        type="text"
                        inputMode="numeric"
                        value={s4TradesPerDay}
                        onChange={(e) => setS4TradesPerDay(sanitizeInteger(e.target.value))}
                        className="font-mono text-base text-center bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setS4TradesPerDay(stepInt(s4TradesPerDay, 1, 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s4-dpm">Trading Days / Month</Label>
                    <Input
                      id="s4-dpm"
                      type="text"
                      inputMode="numeric"
                      value={s4TradingDaysPerMonth}
                      onChange={(e) => setS4TradingDaysPerMonth(sanitizeInteger(e.target.value))}
                      className="font-mono text-base bg-background"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            <Card className="md:col-span-6 border-primary/10 bg-card/60 backdrop-blur-md flex flex-col justify-between">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Commission Cost Projections</CardTitle>
                <CardDescription>Total friction cost breakdown.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Projected Annual Commission Drag
                  </div>
                  <div className="text-4xl font-extrabold font-mono text-destructive">
                    -${fmt(s4Results.yearlyComm, 2)}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-2">
                    ${fmt(s4Results.monthlyComm, 2)} per month
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Fee Per Trade</div>
                    <div className="text-lg font-bold text-destructive mt-1">
                      -${fmt(s4Results.commPerTrade, 2)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Breakeven Points</div>
                    <div className="text-lg font-bold text-primary mt-1">
                      {fmt(s4Results.pointsLostPerTrade, 2)} pts / trade
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 5: MULTI-TRADE SESSION SIMULATOR */}
        {/* ==================================================================== */}
        <TabsContent value="session-sim" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            {/* Trade Entry Form */}
            <Card className="md:col-span-4 border-primary/10 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" /> Add Simulated Trade
                </CardTitle>
                <CardDescription>Log a trade to see session stats build up.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Instrument</Label>
                  <select
                    value={simSymbol}
                    onChange={(e) => setSimSymbol(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  >
                    {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                      <option key={sym} value={sym}>
                        {sym} - {INSTRUMENT_SPECS[sym].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Direction</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1 bg-background/50">
                    <button
                      type="button"
                      onClick={() => setSimDirection("long")}
                      className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        simDirection === "long" ? "bg-success/20 text-success" : "text-muted-foreground"
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimDirection("short")}
                      className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        simDirection === "short" ? "bg-destructive/20 text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      <TrendingDown className="h-3.5 w-3.5" /> Short
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="sim-pts">Points (+ or -)</Label>
                    <Input
                      id="sim-pts"
                      type="text"
                      inputMode="decimal"
                      value={simPoints}
                      onChange={(e) => setSimPoints(sanitizeDecimal(e.target.value))}
                      className="font-mono text-sm bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sim-cnt">Contracts</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setSimContracts(stepInt(simContracts, -1, 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="sim-cnt"
                        type="text"
                        inputMode="numeric"
                        value={simContracts}
                        onChange={(e) => setSimContracts(sanitizeInteger(e.target.value))}
                        className="font-mono text-sm text-center bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setSimContracts(stepInt(simContracts, 1, 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={handleAddSimTrade} className="w-full gap-2 mt-2">
                  <Plus className="h-4 w-4" /> Add Trade to Session
                </Button>
              </CardContent>
            </Card>

            {/* Session Stats & Trade Table */}
            <Card className="md:col-span-8 border-primary/10 bg-card/60 backdrop-blur-md">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Session Analytics</CardTitle>
                  <CardDescription>Real-time metrics for your simulated session.</CardDescription>
                </div>
                {simTrades.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearSimTrades} className="text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-mono">
                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Session Net P&L</div>
                    <div className={`text-xl font-extrabold mt-1 ${simMetrics.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                      ${fmt(simMetrics.totalPnl, 2, true)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Win Rate ({simMetrics.winCount}/{simTrades.length})</div>
                    <div className="text-xl font-extrabold text-foreground mt-1">
                      {fmt(simMetrics.winRate, 1)}%
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Profit Factor</div>
                    <div className="text-xl font-extrabold text-primary mt-1">
                      {fmt(simMetrics.profitFactor, 2)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 bg-background/50">
                    <div className="text-xs font-sans text-muted-foreground">Expectancy / Trade</div>
                    <div className={`text-xl font-extrabold mt-1 ${simMetrics.expectancy >= 0 ? "text-success" : "text-destructive"}`}>
                      ${fmt(simMetrics.expectancy, 2, true)}
                    </div>
                  </div>
                </div>

                {/* Session Trade Table */}
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground font-sans">
                      <tr>
                        <th className="px-3 py-2 text-left">Time</th>
                        <th className="px-3 py-2 text-left">Instrument</th>
                        <th className="px-3 py-2 text-left">Side</th>
                        <th className="px-3 py-2 text-right">Points</th>
                        <th className="px-3 py-2 text-right">Contracts</th>
                        <th className="px-3 py-2 text-right">Net P&L</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-xs">
                      {simTrades.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground font-sans">
                            No trades added yet. Use the form on the left to simulate trades.
                          </td>
                        </tr>
                      ) : (
                        simTrades.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-muted-foreground">{t.timestamp}</td>
                            <td className="px-3 py-2 font-bold">{t.instrument}</td>
                            <td className="px-3 py-2 uppercase">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.direction === "long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{t.points > 0 ? `+${t.points}` : t.points}</td>
                            <td className="px-3 py-2 text-right">{t.contracts}</td>
                            <td className={`px-3 py-2 text-right font-bold ${t.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                              ${fmt(t.pnl, 2, true)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleRemoveSimTrade(t.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
