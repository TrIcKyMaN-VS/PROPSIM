"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { usePropStore } from "@/lib/store"
import { FIRMS } from "@/lib/firms"
import { MonteCarloInputs, MonteCarloStats, SavedSimulation } from "@/lib/simulation/monte-carlo-types"
import { MonteCarloService } from "@/lib/simulation/monte-carlo-service"
import { MonteCarloCharts } from "./monte-carlo-charts"
import { exportToCsv, exportToPrint } from "@/lib/simulation/monte-carlo-export"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  Play,
  Save,
  Download,
  Printer,
  Trash2,
  Settings,
  ShieldCheck,
  TrendingUp,
  Percent,
  Activity,
  History,
  Info,
  ChevronRight,
  TrendingDown,
  RotateCcw,
  Sliders,
  Sparkles,
} from "lucide-react"

// Create a persistent service instance
const monteCarloService = new MonteCarloService()

export default function MonteCarloView() {
  const { accounts, trades } = usePropStore()

  // Tabs: "manual" | "historical" | "saved"
  const [activeTab, setActiveTab] = useState<"manual" | "historical" | "saved">("manual")

  // Manual Inputs
  const [manualInputs, setManualInputs] = useState<MonteCarloInputs>({
    startingBalance: 10000,
    winRate: 50,
    avgRR: 1.5,
    riskPct: 1,
    numTrades: 100,
    simCount: 5000,
    dailyLossLimit: 0,
    maxDrawdownLimit: 0,
    profitTarget: 0,
    commission: 0,
    slippage: 0,
  })

  // Selected Account for Trade History Mode
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [historyRange, setHistoryRange] = useState<string>("all")
  const [customDateStart, setCustomDateStart] = useState<string>("")
  const [customDateEnd, setCustomDateEnd] = useState<string>("")

  // Simulation Type: "standard" | "prop"
  const [simType, setSimType] = useState<"standard" | "prop">("standard")
  const [selectedFirmId, setSelectedFirmId] = useState<string>("")
  const [selectedSizeLabel, setSelectedSizeLabel] = useState<string>("")

  // Custom Rules (when Prop Firm Custom is selected)
  const [customRules, setCustomRules] = useState({
    profitTarget: 0,
    dailyLossLimit: 0,
    maxDrawdownLimit: 0,
    minTradingDays: 0,
    consistencyPct: 0,
  })

  // Saved simulations state
  const [savedSims, setSavedSims] = useState<SavedSimulation[]>([])

  // Running Simulation state
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<MonteCarloStats | null>(null)
  const [currentSimInputs, setCurrentSimInputs] = useState<MonteCarloInputs | null>(null)

  // Risk Optimizer desired survival probability
  const [desiredSurvival, setDesiredSurvival] = useState<number>(95)

  // Load saved simulations from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("propsim-monte-carlo-simulations")
      if (stored) {
        try {
          setSavedSims(JSON.parse(stored))
        } catch (e) {
          console.error("Failed to parse saved simulations", e)
        }
      }
    }
  }, [])

  // Auto-select current active account on mount
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      // Find active account
      const active = accounts.find((a) => a.archivedAt === null) || accounts[0]
      setSelectedAccountId(active.id)
    }
  }, [accounts, selectedAccountId])

  // Filter historical trades based on selection
  const historicalTrades = useMemo(() => {
    if (!selectedAccountId) return []
    let list = trades.filter((t) => t.accountId === selectedAccountId)

    // Sort by timestamp asc
    list = [...list].sort((a, b) => a.timestamp - b.timestamp)

    if (historyRange === "last_30") {
      list = list.slice(-30)
    } else if (historyRange === "last_50") {
      list = list.slice(-50)
    } else if (historyRange === "last_100") {
      list = list.slice(-100)
    } else if (historyRange === "last_6m") {
      const cutoff = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
      list = list.filter((t) => t.timestamp >= cutoff)
    } else if (historyRange === "custom" && customDateStart && customDateEnd) {
      const start = new Date(customDateStart).getTime()
      const end = new Date(customDateEnd).getTime()
      list = list.filter((t) => t.timestamp >= start && t.timestamp <= end)
    }

    return list
  }, [trades, selectedAccountId, historyRange, customDateStart, customDateEnd])

  // Compute stats of selected historical trades
  const historicalStats = useMemo(() => {
    if (historicalTrades.length === 0) return null

    const wins = historicalTrades.filter((t) => t.pnl > 0)
    const losses = historicalTrades.filter((t) => t.pnl < 0)
    const winRate = (wins.length / historicalTrades.length) * 100

    const totalWin = wins.reduce((sum, t) => sum + t.pnl, 0)
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))

    const avgWin = wins.length > 0 ? totalWin / wins.length : 0
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 1.5 : 0

    // Reconstruct account balance timeline to find historical drawdown
    const account = accounts.find((a) => a.id === selectedAccountId)
    const startBal = account?.rules.startingBalance || 10000
    let bal = startBal
    let peak = startBal
    let maxDrawdownAbs = 0

    // Streaks
    let currentWinStreak = 0
    let currentLossStreak = 0
    let maxWinStreak = 0
    let maxLossStreak = 0

    historicalTrades.forEach((t) => {
      bal += t.pnl
      if (bal > peak) peak = bal
      const dd = peak - bal
      if (dd > maxDrawdownAbs) maxDrawdownAbs = dd

      if (t.pnl > 0) {
        currentWinStreak++
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak)
        currentLossStreak = 0
      } else {
        currentLossStreak++
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
        currentWinStreak = 0
      }
    })
    maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
    maxLossStreak = Math.max(maxLossStreak, currentLossStreak)

    // Average holding time (minutes)
    let totalDuration = 0
    let durationCount = 0
    historicalTrades.forEach((t) => {
      if (t.exitTime) {
        totalDuration += (t.exitTime - t.timestamp) / (60 * 1000)
        durationCount++
      }
    })
    const avgHoldingTime = durationCount > 0 ? totalDuration / durationCount : 0

    // Average risk size in percent
    // If stopLoss is logged, we calculate risk per trade. Otherwise we assume average loss pct.
    const avgLossPct = startBal > 0 ? (avgLoss / startBal) * 100 : 1

    return {
      winRate,
      avgRR,
      avgWin,
      avgLoss,
      expectancy: (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss,
      largestWin: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0,
      largestLoss: losses.length > 0 ? Math.max(...losses.map((t) => Math.abs(t.pnl))) : 0,
      maxDrawdownAbs,
      maxWinStreak,
      maxLossStreak,
      avgHoldingTime,
      riskPct: Math.min(Math.max(avgLossPct, 0.1), 5), // default risk recommendation from average loss
      tradeCount: historicalTrades.length,
    }
  }, [historicalTrades, selectedAccountId, accounts])

  // Populate inputs when Firm or Size changes
  useEffect(() => {
    if (simType === "prop" && selectedFirmId && selectedSizeLabel) {
      if (selectedFirmId === "custom") {
        // use custom rules state
        if (activeTab === "manual") {
          setManualInputs((prev) => ({
            ...prev,
            profitTarget: customRules.profitTarget,
            dailyLossLimit: customRules.dailyLossLimit,
            maxDrawdownLimit: customRules.maxDrawdownLimit,
            minTradingDays: customRules.minTradingDays,
            consistencyPct: customRules.consistencyPct,
          }))
        }
      } else {
        const firm = FIRMS.find((f) => f.id === selectedFirmId)
        const size = firm?.sizes.find((s) => s.label === selectedSizeLabel)
        if (size) {
          const rules = size.rules
          const start = rules.startingBalance
          if (activeTab === "manual") {
            setManualInputs((prev) => ({
              ...prev,
              startingBalance: start,
              profitTarget: rules.profitTarget,
              dailyLossLimit: rules.dailyLossLimit,
              maxDrawdownLimit: rules.maxDrawdown,
              minTradingDays: rules.minTradingDays,
              consistencyPct: rules.consistencyPct,
            }))
          }
        }
      }
    }
  }, [simType, selectedFirmId, selectedSizeLabel, customRules, activeTab])

  // Handle Prop Firm Toggle
  const handleSimTypeChange = (val: "standard" | "prop") => {
    setSimType(val)
    if (val === "standard") {
      // Clear prop firm rules from manual inputs
      setManualInputs((prev) => ({
        ...prev,
        profitTarget: 0,
        dailyLossLimit: 0,
        maxDrawdownLimit: 0,
        minTradingDays: 0,
        consistencyPct: 0,
      }))
    } else {
      // Default to first firm
      setSelectedFirmId(FIRMS[0].id)
      setSelectedSizeLabel(FIRMS[0].sizes[0].label)
    }
  }

  // Handle running simulation
  const handleRunSimulation = async () => {
    let inputs: MonteCarloInputs
    let pnlPcts: number[] | undefined
    let pnlDollars: number[] | undefined

    let drawdownType = "static"
    if (simType === "prop") {
      if (selectedFirmId === "custom") {
        drawdownType = "static"
      } else {
        const firm = FIRMS.find((f) => f.id === selectedFirmId)
        drawdownType = firm?.drawdownType || "static"
      }
    }

    if (activeTab === "manual") {
      inputs = { ...manualInputs, drawdownType }
    } else {
      // Historical tab
      if (!selectedAccountId) {
        toast.error("Please select a trading account")
        return
      }
      if (!historicalStats || historicalTrades.length === 0) {
        toast.error("No trades found in selected range")
        return
      }

      const account = accounts.find((a) => a.id === selectedAccountId)
      const start = account?.rules.startingBalance || 10000

      // Reconstruct historical balance curve to convert absolute dollar P&Ls to percentages
      let bal = start
      pnlPcts = historicalTrades.map((t) => {
        const currentPnlPct = t.pnl / bal
        bal += t.pnl
        return currentPnlPct
      })

      // BUG #13 FIX: Collect actual dollar P&Ls for accurate profit factor calculation
      pnlDollars = historicalTrades.map((t) => t.pnl)

      // BUG #11 FIX: Compute actual trades-per-day from real trade timestamps
      const tradeDatesSet = new Set(historicalTrades.map((t) => new Date(Number(t.timestamp)).toDateString()))
      const uniqueTradingDays = tradeDatesSet.size
      const computedTradesPerDay = Math.max(1, Math.round(historicalTrades.length / Math.max(uniqueTradingDays, 1)))

      // BUG #6 FIX: Compute actual trades-per-month from real date range
      const timestamps = historicalTrades.map((t) => Number(t.timestamp))
      const dateRangeMs = Math.max(...timestamps) - Math.min(...timestamps)
      // Use at least 1 day as minimum range to avoid division issues
      const dateRangeMonths = Math.max(dateRangeMs / (30 * 24 * 60 * 60 * 1000), 1 / 30)
      const computedTradesPerMonth = historicalTrades.length / dateRangeMonths

      // Load prop firm parameters if prop firm mode active
      let dailyLoss = 0
      let maxDD = 0
      let target = 0
      let minDays = 0
      let consistency = 0

      if (simType === "prop") {
        if (selectedFirmId === "custom") {
          dailyLoss = customRules.dailyLossLimit
          maxDD = customRules.maxDrawdownLimit
          target = customRules.profitTarget
          minDays = customRules.minTradingDays
          consistency = customRules.consistencyPct
        } else {
          const firm = FIRMS.find((f) => f.id === selectedFirmId)
          const size = firm?.sizes.find((s) => s.label === selectedSizeLabel)
          if (size) {
            dailyLoss = size.rules.dailyLossLimit
            maxDD = size.rules.maxDrawdown
            target = size.rules.profitTarget
            minDays = size.rules.minTradingDays
            consistency = size.rules.consistencyPct
          }
        }
      }

      inputs = {
        startingBalance: start,
        winRate: historicalStats.winRate,
        avgRR: historicalStats.avgRR,
        riskPct: historicalStats.riskPct,
        numTrades: historicalTrades.length,
        simCount: manualInputs.simCount, // use selected trials count
        dailyLossLimit: dailyLoss,
        maxDrawdownLimit: maxDD,
        profitTarget: target,
        minTradingDays: minDays,
        consistencyPct: consistency,
        drawdownType,
        tradesPerDay: computedTradesPerDay,
        tradesPerMonth: computedTradesPerMonth,
      }
    }

    // Validation
    if (inputs.startingBalance <= 0) {
      toast.error("Starting balance must be greater than 0")
      return
    }
    if (inputs.winRate < 0 || inputs.winRate > 100) {
      toast.error("Win Rate must be between 0 and 100")
      return
    }
    if (inputs.avgRR <= 0) {
      toast.error("Average Risk:Reward must be greater than 0")
      return
    }
    if (inputs.riskPct < 0 || inputs.riskPct > 10) {
      toast.error("Risk Per Trade must be between 0% and 10%")
      return
    }
    if (inputs.numTrades <= 0) {
      toast.error("Number of trades must be greater than 0")
      return
    }
    if (inputs.simCount < 1000) {
      toast.error("Simulation count must be at least 1,000 runs")
      return
    }

    setLoading(true)
    setProgress(0)
    setCurrentSimInputs(inputs)

    try {
      if (historicalTrades.length > 0 && historicalTrades.length < 30 && activeTab === "historical") {
        toast.info("Monte Carlo simulations become significantly more reliable with 100+ historical trades. Still running...")
      }

      const results = await monteCarloService.run(inputs, pnlPcts, pnlDollars, (p) => {
        setProgress(p)
      })

      setStats(results)
      toast.success("Monte Carlo simulation completed successfully!")
    } catch (e: any) {
      toast.error(e.message || "Simulation failed")
    } finally {
      setLoading(false)
    }
  }

  // Handle Cancel Simulation
  const handleCancelSimulation = () => {
    monteCarloService.cancel()
    setLoading(false)
    setProgress(0)
    toast.info("Simulation cancelled")
  }

  // Handle Save Simulation
  const handleSaveSimulation = () => {
    if (!stats || !currentSimInputs) return
    const name = window.prompt("Enter a name for this simulation:")
    if (!name) return

    const newSim: SavedSimulation = {
      id: Date.now().toString(),
      name,
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: activeTab === "saved" ? "manual" : activeTab,
      inputs: currentSimInputs,
      stats,
    }

    const updated = [newSim, ...savedSims]
    setSavedSims(updated)
    localStorage.setItem("propsim-monte-carlo-simulations", JSON.stringify(updated))
    toast.success("Simulation saved successfully!")
  }

  // Handle Delete Simulation
  const handleDeleteSimulation = (id: string) => {
    if (window.confirm("Are you sure you want to delete this saved simulation?")) {
      const updated = savedSims.filter((s) => s.id !== id)
      setSavedSims(updated)
      localStorage.setItem("propsim-monte-carlo-simulations", JSON.stringify(updated))
      toast.success("Simulation deleted")
    }
  }

  // Handle Load Saved Simulation
  const handleLoadSavedSimulation = (sim: SavedSimulation) => {
    setStats(sim.stats)
    setCurrentSimInputs(sim.inputs)
    setSimType(sim.inputs.profitTarget || sim.inputs.maxDrawdownLimit ? "prop" : "standard")
    toast.info(`Loaded simulation: ${sim.name}`)
  }

  // Get active recommendation based on desired survival probability slider
  const recommendedRisk = useMemo(() => {
    if (!stats || !stats.riskRecommendations || stats.isNegativeEdge) return null
    if (currentSimInputs && currentSimInputs.maxDrawdownLimit === 0 && currentSimInputs.dailyLossLimit === 0) return null
    // Find the highest riskPct where survivalProb >= desiredSurvival
    const match = [...stats.riskRecommendations]
      .reverse() // check from high to low
      .find((r) => r.survivalProb >= desiredSurvival)
    return match || stats.riskRecommendations[0]
  }, [stats, desiredSurvival, currentSimInputs])

  const passingLabel = useMemo(() => {
    if (!currentSimInputs) return "Passing Probability"
    if (simType === "prop") {
      return selectedFirmId === "custom" ? "Passing Custom Rules" : "Passing Prop Challenge"
    }
    return currentSimInputs.profitTarget && currentSimInputs.profitTarget > 0 ? "Passing Profit Target" : "Passing Probability"
  }, [simType, selectedFirmId, currentSimInputs])

  const hasProfitTarget = useMemo(() => {
    return !!(currentSimInputs && currentSimInputs.profitTarget && currentSimInputs.profitTarget > 0)
  }, [currentSimInputs])


  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Monte Carlo Simulator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institutional-grade statistical stress testing, risk optimization, and drawdown projection for prop trading.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSaveSimulation}
              >
                <Save className="w-4 h-4" /> Save Sim
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportToCsv(stats, currentSimInputs!)}
              >
                <Download className="w-4 h-4" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={exportToPrint}
              >
                <Printer className="w-4 h-4" /> Print
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button
                  variant={activeTab === "manual" ? "default" : "ghost"}
                  className="justify-start gap-3 w-full"
                  onClick={() => setActiveTab("manual")}
                >
                  <Sliders className="w-4 h-4" /> Manual Setup
                </Button>
                <Button
                  variant={activeTab === "historical" ? "default" : "ghost"}
                  className="justify-start gap-3 w-full"
                  onClick={() => setActiveTab("historical")}
                >
                  <History className="w-4 h-4" /> Trade History
                </Button>
                <Button
                  variant={activeTab === "saved" ? "default" : "ghost"}
                  className="justify-start gap-3 w-full"
                  onClick={() => setActiveTab("saved")}
                >
                  <Save className="w-4 h-4" /> Saved Runs
                  {savedSims.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {savedSims.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Config Controls based on tab */}
          {activeTab === "manual" && (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Inputs Configuration</CardTitle>
                <CardDescription>Manually configure statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startingBalance">Starting Balance ($)</Label>
                  <Input
                    type="number"
                    id="startingBalance"
                    value={manualInputs.startingBalance}
                    onChange={(e) =>
                      setManualInputs({ ...manualInputs, startingBalance: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="winRate">Win Rate (%)</Label>
                    <Input
                      type="number"
                      id="winRate"
                      min="0"
                      max="100"
                      value={manualInputs.winRate}
                      onChange={(e) =>
                        setManualInputs({ ...manualInputs, winRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avgRR">Average RR</Label>
                    <Input
                      type="number"
                      id="avgRR"
                      min="0.1"
                      step="0.1"
                      value={manualInputs.avgRR}
                      onChange={(e) =>
                        setManualInputs({ ...manualInputs, avgRR: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="riskPct">Risk Per Trade (%)</Label>
                    <Input
                      type="number"
                      id="riskPct"
                      min="0.05"
                      max="10"
                      step="0.05"
                      value={manualInputs.riskPct}
                      onChange={(e) =>
                        setManualInputs({ ...manualInputs, riskPct: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numTrades">Trades Count</Label>
                    <Input
                      type="number"
                      id="numTrades"
                      min="1"
                      value={manualInputs.numTrades}
                      onChange={(e) =>
                        setManualInputs({ ...manualInputs, numTrades: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="simCount">Simulations (Trials)</Label>
                  <Select
                    value={manualInputs.simCount.toString()}
                    onValueChange={(v) => v && setManualInputs({ ...manualInputs, simCount: parseInt(v) })}
                  >
                    <SelectTrigger id="simCount">
                      <SelectValue placeholder="Select Trials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1,000 runs (Fast)</SelectItem>
                      <SelectItem value="5000">5,000 runs (Standard)</SelectItem>
                      <SelectItem value="10000">10,000 runs (High accuracy)</SelectItem>
                      <SelectItem value="50000">50,000 runs (Heavy stress-test)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "historical" && (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Account History</CardTitle>
                <CardDescription>Resample from actual journal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account">Select Account</Label>
                  <Select value={selectedAccountId} onValueChange={v => v && setSelectedAccountId(v)}>
                    <SelectTrigger id="account">
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => {
                        const firm = FIRMS.find((f) => f.id === acc.firmId)
                        return (
                          <SelectItem key={acc.id} value={acc.id}>
                            {firm?.shortName || "Official"} ({acc.sizeLabel}){" "}
                            {acc.archivedAt ? "[Archived]" : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="range">History Range</Label>
                  <Select value={historyRange} onValueChange={v => v && setHistoryRange(v)}>
                    <SelectTrigger id="range">
                      <SelectValue placeholder="Select Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All trades</SelectItem>
                      <SelectItem value="last_30">Last 30 trades</SelectItem>
                      <SelectItem value="last_50">Last 50 trades</SelectItem>
                      <SelectItem value="last_100">Last 100 trades</SelectItem>
                      <SelectItem value="last_6m">Last 6 months</SelectItem>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {historyRange === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Historical stats summary */}
                {historicalStats && (
                  <div className="pt-2 border-t border-border/40 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Historical Trades:</span>
                      <span className="font-semibold">{historicalStats.tradeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-semibold">{historicalStats.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average R:R:</span>
                      <span className="font-semibold">{historicalStats.avgRR.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Win:</span>
                      <span className="font-semibold text-success">{fmtCurrency(historicalStats.avgWin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Loss:</span>
                      <span className="font-semibold text-destructive">{fmtCurrency(historicalStats.avgLoss)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/20 pt-1 mt-1 font-medium">
                      <span>Trade Expectancy:</span>
                      <span className={historicalStats.expectancy >= 0 ? "text-success" : "text-destructive"}>
                        {fmtCurrency(historicalStats.expectancy)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prop Firm Simulation Mode Toggle */}
          {activeTab !== "saved" && (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Rules Type</CardTitle>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSimTypeChange("standard")}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                        simType === "standard"
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:bg-secondary/40"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => handleSimTypeChange("prop")}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                        simType === "prop"
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:bg-secondary/40"
                      }`}
                    >
                      Prop Firm
                    </button>
                  </div>
                </div>
              </CardHeader>
              {simType === "prop" && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="firm">Select Firm</Label>
                    <Select value={selectedFirmId} onValueChange={v => v && setSelectedFirmId(v)}>
                      <SelectTrigger id="firm">
                        <SelectValue placeholder="Select Firm" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIRMS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">-- Custom Rules --</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedFirmId !== "custom" && selectedFirmId && (
                    <div className="space-y-2">
                      <Label htmlFor="size">Challenge Size</Label>
                      <Select value={selectedSizeLabel} onValueChange={v => v && setSelectedSizeLabel(v)}>
                        <SelectTrigger id="size">
                          <SelectValue placeholder="Select Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIRMS.find((f) => f.id === selectedFirmId)?.sizes.map((s) => (
                            <SelectItem key={s.label} value={s.label}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedFirmId === "custom" && (
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="space-y-1">
                        <Label className="text-xs">Profit Target ($)</Label>
                        <Input
                          type="number"
                          value={customRules.profitTarget}
                          onChange={(e) =>
                            setCustomRules({ ...customRules, profitTarget: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Daily Drawdown ($)</Label>
                          <Input
                            type="number"
                            value={customRules.dailyLossLimit}
                            onChange={(e) =>
                              setCustomRules({ ...customRules, dailyLossLimit: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max Drawdown ($)</Label>
                          <Input
                            type="number"
                            value={customRules.maxDrawdownLimit}
                            onChange={(e) =>
                              setCustomRules({ ...customRules, maxDrawdownLimit: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Min Trading Days</Label>
                          <Input
                            type="number"
                            value={customRules.minTradingDays}
                            onChange={(e) =>
                              setCustomRules({ ...customRules, minTradingDays: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Consistency Rule (%)</Label>
                          <Input
                            type="number"
                            value={customRules.consistencyPct}
                            onChange={(e) =>
                              setCustomRules({ ...customRules, consistencyPct: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Trigger button */}
          {activeTab !== "saved" && (
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground animate-pulse">Simulating curves...</span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <Button variant="destructive" className="w-full gap-2" onClick={handleCancelSimulation}>
                    <RotateCcw className="w-4 h-4" /> Cancel Simulation
                  </Button>
                </div>
              ) : (
                <Button className="w-full gap-2" onClick={handleRunSimulation}>
                  <Play className="w-4 h-4" /> Run Monte Carlo
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right Column Results / Saved Simulations */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "saved" ? (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Saved Simulations</CardTitle>
                <CardDescription>View, load, or delete historical runs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {savedSims.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                    <Save className="w-10 h-10 mb-2 stroke-1" />
                    <span>No saved simulations yet</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {savedSims.map((sim) => (
                      <div key={sim.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">{sim.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Saved: {sim.date}</span>
                            <span>•</span>
                            <span className="capitalize">Type: {sim.type}</span>
                            <span>•</span>
                            <span>Trades: {sim.inputs.numTrades}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleLoadSavedSimulation(sim)}>
                            Load Sim
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSimulation(sim.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : stats ? (
            <div className="space-y-6">
              {/* Statistical Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border/40 bg-card/40">
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Expected Return</div>
                    <div className={`text-2xl font-bold ${stats.expectedReturn >= 0 ? "text-success" : "text-destructive"}`}>
                      {fmtCurrency(stats.expectedReturn)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {fmtPct((stats.expectedReturn / currentSimInputs!.startingBalance) * 100, 1)} expected growth
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/40">
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Expected Drawdown</div>
                    <div className="text-2xl font-bold text-destructive">
                      {stats.expectedDrawdown.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Max: {stats.maxDrawdown.toFixed(1)}% of starting
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/40">
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{passingLabel}</div>
                    <div className="text-2xl font-bold text-success">
                      {hasProfitTarget ? `${stats.probPassing.toFixed(1)}%` : "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {hasProfitTarget ? `Ruin Rate: ${stats.probRuin.toFixed(1)}%` : "No profit target set"}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/40">
                  <CardContent className="pt-6">
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Trade Expectancy</div>
                    <div className={`text-2xl font-bold ${stats.tradeExpectancy >= 0 ? "text-success" : "text-destructive"}`}>
                      {fmtCurrency(stats.tradeExpectancy)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Profit Factor: {stats.profitFactor.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Extended Metrics Table Card */}
              <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Simulated Parameters Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Median Return:</span>
                    <span className="font-semibold">{fmtCurrency(stats.medianReturn)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Recovery Factor:</span>
                    <span className="font-semibold">{stats.recoveryFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Best Case (95% Pct):</span>
                    <span className="font-semibold text-success">{fmtCurrency(stats.bestCaseReturn)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Worst Case (5% Pct):</span>
                    <span className="font-semibold text-destructive">{fmtCurrency(stats.worstCaseReturn)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Probability of Profit:</span>
                    <span className="font-semibold text-success">{stats.probProfit.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Probability of Loss:</span>
                    <span className="font-semibold text-destructive">{stats.probLoss.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Longest Win Streak:</span>
                    <span className="font-semibold text-success">{stats.longestWinningStreak} wins</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2">
                    <span className="text-muted-foreground">Longest Loss Streak:</span>
                    <span className="font-semibold text-destructive">{stats.longestLosingStreak} losses</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2 md:border-none">
                    <span className="text-muted-foreground">Average Monthly Return:</span>
                    <span className="font-semibold">{fmtCurrency(stats.averageMonthlyReturn)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/20 pb-2 md:border-none">
                    <span className="text-muted-foreground">Risk of Ruin:</span>
                    <span className="font-semibold text-destructive">{stats.riskOfRuin.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Optimizer Widget */}
              <Card className="border-border/40 bg-gradient-to-r from-success/5 via-transparent to-transparent">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-success" /> Risk Size Optimizer
                  </CardTitle>
                  <CardDescription>Adjust your desired survival rate (no account blowouts) to find optimal trade sizing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {stats.isNegativeEdge ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      Improving the trading edge is required before changing risk.
                    </div>
                  ) : currentSimInputs && currentSimInputs.maxDrawdownLimit === 0 && currentSimInputs.dailyLossLimit === 0 ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500 font-medium flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      Drawdown or Daily Loss limits must be set to run the Risk Optimizer.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Label htmlFor="survival-slider">Desired Survival Probability: <span className="font-bold text-success">{desiredSurvival}%</span></Label>
                          <span className="text-xs text-muted-foreground">Allows max {(100 - desiredSurvival)}% chance of blow-up</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            id="survival-slider"
                            min="70"
                            max="99"
                            step="1"
                            value={desiredSurvival}
                            onChange={(e) => setDesiredSurvival(parseInt(e.target.value))}
                            className="flex-1 accent-success h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      {recommendedRisk && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border/40 text-sm">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Recommended Sizing</div>
                            <div className="text-lg font-bold text-success flex items-center gap-1">
                              {recommendedRisk.riskPct.toFixed(2)}% <span className="text-xs font-normal text-muted-foreground">per trade</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Current: {currentSimInputs!.riskPct.toFixed(2)}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Expected Return</div>
                            <div className="text-lg font-semibold">
                              {fmtCurrency(recommendedRisk.expectedReturn)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Growth: {((recommendedRisk.expectedReturn / currentSimInputs!.startingBalance) * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Expected Drawdown</div>
                            <div className="text-lg font-semibold text-destructive">
                              {recommendedRisk.expectedDrawdown.toFixed(1)}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Passing Probability</div>
                            <div className="text-lg font-semibold text-success">
                              {recommendedRisk.passProb.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Survival: {recommendedRisk.survivalProb.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Charts Display */}
              <MonteCarloCharts stats={stats} />
            </div>
          ) : (
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm min-h-[400px] flex flex-col items-center justify-center text-muted-foreground p-6">
              <Activity className="w-16 h-16 mb-4 stroke-1 text-primary/40 animate-pulse" />
              <h3 className="font-semibold text-lg text-foreground">Monte Carlo Simulation</h3>
              <p className="text-sm max-w-md text-center mt-2">
                Configure your setup inputs on the left, select standard or prop rules, and click **Run Monte Carlo** to generate statistical distributions.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
