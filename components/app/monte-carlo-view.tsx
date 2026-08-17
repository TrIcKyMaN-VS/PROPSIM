"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { usePropStore } from "@/lib/store"
import { MonteCarloInputs, MonteCarloStats } from "@/lib/simulation/monte-carlo-types"
import { MonteCarloService } from "@/lib/simulation/monte-carlo-service"
import { fmtCurrency } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Copy, Download, Check, X } from "lucide-react"

const monteCarloService = new MonteCarloService()

export default function MonteCarloView() {
  const { accounts, trades } = usePropStore()

  const [dataSource, setDataSource] = useState<"manual" | "history">("manual")
  const [selectedAccountId, setSelectedAccountId] = useState("")

  const [inputs, setInputs] = useState<MonteCarloInputs>({
    account: {
      accountSizeUsd: 50000,
      currentPhase: "p1",
      currentNetPctInPhase: 0,
      tradingDaysLeftThisYear: 98,
      numberOfAccounts: 1
    },
    challengeRules: {
      phase1TargetPct: 8,
      phase2TargetPct: 5,
      maxOverallLossPct: 10,
      dailyLossLimitPct: 5,
      payoutSplitToTrader: 0.8
    },
    riskPerTradePctOfAccount: {
      phase1: 0.3,
      phase2: 0.3,
      funded: 0.3
    },
    dayModel: "dayMix",
    dayMix: {
      goodDayTargetR: 3,
      dailyStopR: 2,
      probabilityGoodDay: 0.45,
      probabilityFlatDay: 0.3,
      probabilityBadDay: 0.25,
      bankGoodDays: true
    },
    withinDay: {
      winRate: 50,
      rewardRisk: 1.5,
      dailyCeilingR: 3,
      dailyFloorR: 2,
      bankGoodDays: true
    },
    simulations: 40000
  })

  const [stats, setStats] = useState<MonteCarloStats | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // Auto-select account for history mode
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  // Derive historical stats
  const historicalStats = useMemo(() => {
    if (dataSource !== "history" || !selectedAccountId) return null
    const accTrades = trades.filter(t => t.accountId === selectedAccountId)
    if (accTrades.length === 0) return null

    const wins = accTrades.filter(t => t.pnl > 0)
    const losses = accTrades.filter(t => t.pnl <= 0)
    
    const winRate = accTrades.length > 0 ? (wins.length / accTrades.length) * 100 : 50
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
    const rewardRisk = avgLoss > 0 ? avgWin / avgLoss : 1.5

    // Estimate day mix (simplified grouping by timestamp day string)
    const dailyPnls = new Map<string, number>()
    accTrades.forEach(t => {
      const d = new Date(t.timestamp).toLocaleDateString()
      dailyPnls.set(d, (dailyPnls.get(d) || 0) + t.pnl)
    })

    let good = 0, flat = 0, bad = 0
    dailyPnls.forEach(pnl => {
      if (pnl > avgWin) good++
      else if (pnl < -avgLoss) bad++
      else flat++
    })
    
    const totalDays = dailyPnls.size || 1
    
    return {
      winRate,
      rewardRisk,
      probabilityGoodDay: good / totalDays,
      probabilityFlatDay: flat / totalDays,
      probabilityBadDay: bad / totalDays,
      avgLoss
    }
  }, [trades, selectedAccountId, dataSource])

  // Sync historical stats to inputs if in history mode
  useEffect(() => {
    if (dataSource === "history" && historicalStats) {
      setInputs(prev => {
        const avgRiskPct = prev.account.accountSizeUsd > 0 ? (historicalStats.avgLoss / prev.account.accountSizeUsd) * 100 : 0
        const safeRiskPct = avgRiskPct > 0 ? Number(avgRiskPct.toFixed(2)) : prev.riskPerTradePctOfAccount.phase1

        return {
          ...prev,
          riskPerTradePctOfAccount: {
            phase1: safeRiskPct,
            phase2: safeRiskPct,
            funded: safeRiskPct
          },
          withinDay: {
            ...prev.withinDay,
            winRate: Math.round(historicalStats.winRate),
            rewardRisk: Number(historicalStats.rewardRisk.toFixed(2))
          },
          dayMix: {
            ...prev.dayMix,
            probabilityGoodDay: Number(historicalStats.probabilityGoodDay.toFixed(2)),
            probabilityFlatDay: Number(historicalStats.probabilityFlatDay.toFixed(2)),
            probabilityBadDay: Number(historicalStats.probabilityBadDay.toFixed(2))
          }
        }
      })
    }
  }, [historicalStats, dataSource])

  const runSimulation = useCallback(async () => {
    setIsRunning(true)
    try {
      const results = await monteCarloService.run(inputs)
      setStats(results)
    } catch (e: any) {
      toast.error("Simulation failed: " + e.message)
    } finally {
      setIsRunning(false)
    }
  }, [inputs])

  // Debounced run
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation()
    }, 300)
    return () => clearTimeout(timer)
  }, [inputs, runSimulation])

  const copyPrompt = () => {
    const payload = {
      schema: "thebullpit.prop-firm-pass-model/v1",
      generatedAt: new Date().toISOString(),
      prompt: "You are an expert prop-firm trading coach and quantitative risk analyst. The JSON below was exported from 'Learn Orderflow' Prop-firm pass model — a Monte-Carlo simulator of an FTMO-style two-step funded-trader challenge. `howItWorks` explains the model, `inputs` are my current settings, `results` are the simulated outcomes (from 40,000 runs), and `glossary` defines the terms. Use only the data provided. Explain my odds in plain language, point out which inputs are helping or hurting the outcome, and tell me concretely how changing specific inputs would likely move the results and what the trade-offs are. Reference the actual numbers. My questions: <write your questions here>",
      howItWorks: [
        "A Monte-Carlo simulation runs 40,000 independent journeys through the remaining trading days of the year and reports the distribution of outcomes — so every figure is a probability or a percentile, not a single forecast.",
        "Each journey starts from the account's CURRENT state, not always a fresh Phase 1: `currentPhase` (p1 / p2 / funded) sets the starting stage and `currentNetPctInPhase` sets the starting equity within it (signed % of the initial balance — positive is up/closer to the target, negative is in drawdown). So an account already up in Phase 1 starts closer to passing, and one already funded skips straight to the funded run.",
        "Each journey walks three stages with absorbing barriers: Phase 1 (reach the Phase-1 profit target), Phase 2 / verification (reach the Phase-2 target), then Funded. Hitting the overall max-loss floor at any stage blows the account and ends the journey. The max-loss floor is static — measured from each stage's initial balance — so being up does not move the floor; it only shortens the distance to the target.",
        "Trading days left this year is auto-counted as US market weekdays (Mon–Fri) from today through Dec 31, minus Cboe exchange holidays, in America/New_York; it can be overridden manually.",
        "All profit and loss is measured in R, where 1R = your risk-per-trade as a percent of the account. Risk can differ by stage (phase1 / phase2 / funded). Targets and the floor are converted to R for each stage — e.g. a 10% Phase-1 target taken at 1% risk needs +10R to pass.",
        "Days are generated by the chosen day model. 'withinDay' builds each day trade-by-trade from your per-trade win rate and reward:risk, banking the day at a ceiling (+R) or stopping it at a floor (−R); above a comfort band the win rate decays (edge decay / give-back), which is what makes an optimal daily ceiling exist. 'dayMix' instead draws each day from a fixed good / flat / bad distribution.",
        "Funded stage has no profit target: the simulation accumulates profit day by day until the static floor. Take-home = funded-stage profit × dollars-per-R(funded) × 0.80 (the 80% payout split). Phase 1/2 profits only get you funded — they are not paid out. The day that blows the account is not banked.",
        "Two accounts can be modelled as 'mirror' (identical trades — shared fate, both pass or both blow together) or 'separate' (independent trades — smooths the worst case and is more optimistic).",
        "The −5% daily loss limit is FTMO-standard and held fixed; the tool flags whether your daily stop × stage risk would breach it. The overall floor is the max-loss %."
      ],
      glossary: {
        "R": "One unit of risk = your risk-per-trade as a percent of the account. Dollar value of 1R = accountSize × stageRisk% ÷ 100.",
        "edgePerDayR": "Average expected value per trading day, in R (the engine's per-day mean). Positive = a profitable process.",
        "dailyCeilingR": "In the within-day model, the +R level at which you bank the day and stop trading.",
        "comfortBandR": "The +R level above which your win rate starts to decay (modelled give-back / overtrading).",
        "optimalCeiling": "The within-day sweep's bank-and-stop level that maximises edge per day; compare it to your current ceiling.",
        "takeHomeByDec31Usd": "Funded-stage profit converted to dollars and multiplied by the 0.80 payout split, as percentiles (p25 / median / p75) across the 40,000 runs.",
        "medianDeepestDrawdownR": "Median peak-to-trough drawdown across a journey, in R.",
        "blowUpRiskPct": "Probability the account hits the overall max-loss floor (blows up) at some stage before year-end, simulated from the current state.",
        "breakevenGoodDayFractionPct": "For the day-mix model, the fraction of good days needed just to break even.",
        "derivedDayMixFromWithinDay": "The good / flat / bad day distribution that the within-day settings actually produce — check it against your real recent history."
      },
      inputs,
      results: stats
    }

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    toast.success("LLM Prompt copied to clipboard!")
  }

  const updateNestedInput = (category: keyof MonteCarloInputs, field: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [field]: value
      }
    }))
  }

  // Derived weekly targets
  const goodDaysPerWeek = inputs.dayModel === "dayMix" ? inputs.dayMix.probabilityGoodDay * 5 : 2.5
  const weeklyTargetR = inputs.dayModel === "dayMix" 
    ? (inputs.dayMix.probabilityGoodDay * inputs.dayMix.goodDayTargetR + inputs.dayMix.probabilityBadDay * -inputs.dayMix.dailyStopR) * 5
    : 0 // Simplification for within-day
  const weeklyTargetP1 = weeklyTargetR * (inputs.riskPerTradePctOfAccount.phase1 / 100) * inputs.account.accountSizeUsd
  const weeklyTargetFunded = weeklyTargetR * (inputs.riskPerTradePctOfAccount.funded / 100) * inputs.account.accountSizeUsd

  return (
    <div className="max-w-[1400px] mx-auto py-8 space-y-6 text-slate-300">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Prop-firm pass model</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl">
            Match the dials to how you actually trade. It runs 40,000 simulated journeys through Phase 1 → Phase 2 → funded and tells you the odds, the payout, your optimal daily ceiling, and your weekly target — in plain words.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Label className="text-sm font-semibold text-slate-400">Data Source:</Label>
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-md">
            <button 
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-colors ${dataSource === "manual" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              onClick={() => setDataSource("manual")}
            >
              Manual
            </button>
            <button 
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-colors ${dataSource === "history" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              onClick={() => setDataSource("history")}
            >
              Trade History
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* A. DAY MODEL */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0f111a] space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
              <span className="text-blue-500">▲</span> A. DAY MODEL
            </h3>
            <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800">
              <button 
                className={`flex-1 py-2 text-xs font-bold rounded-sm transition-colors ${inputs.dayModel === "withinDay" ? "bg-slate-800 text-white border border-slate-700 shadow" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setInputs({...inputs, dayModel: "withinDay"})}
              >
                Within-day (per-trade)
              </button>
              <button 
                className={`flex-1 py-2 text-xs font-bold rounded-sm transition-colors ${inputs.dayModel === "dayMix" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setInputs({...inputs, dayModel: "dayMix"})}
              >
                Simple (day-mix)
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {inputs.dayModel === "dayMix" 
                ? "Days are drawn directly from a fixed good/flat/bad mix you set. Faster and matches the validated v2 reference, but a higher ceiling always looks better - it can't find the optimum." 
                : "Simulates each day trade-by-trade based on win rate and R:R."}
            </p>
          </div>

          {/* B. YOUR ACCOUNT */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0f111a] space-y-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
              <span className="text-blue-500">▲</span> B. YOUR ACCOUNT
            </h3>
            
            {dataSource === "history" && (
              <div className="space-y-1.5 pb-4 border-b border-slate-800">
                <Label className="text-xs text-slate-400">Linked Account Stats</Label>
                <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || "")}>
                  <SelectTrigger className="h-9 bg-slate-900 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account Size */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold text-white">Account size</Label>
                <span className="text-sm font-bold text-white">${inputs.account.accountSizeUsd.toLocaleString()}</span>
              </div>
              <Slider 
                min={10000} max={200000} step={10000} 
                value={[inputs.account.accountSizeUsd]} 
                onValueChange={(val: any) => updateNestedInput("account", "accountSizeUsd", val[0])}
                className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-blue-600"
              />
            </div>

            {/* Where are you now */}
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-sm font-bold text-white">Where are you now?</Label>
                <p className="text-[11px] text-slate-500 mt-1">the stage your account sits in today - the model starts here</p>
              </div>
              <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800">
                {["p1", "p2", "funded"].map(phase => (
                  <button 
                    key={phase}
                    className={`flex-1 py-2 text-xs font-bold rounded-sm capitalize transition-colors ${inputs.account.currentPhase === phase ? "bg-slate-800 text-blue-400 border border-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                    onClick={() => updateNestedInput("account", "currentPhase", phase)}
                  >
                    {phase === "p1" ? "Phase 1" : phase === "p2" ? "Phase 2" : "Funded"}
                  </button>
                ))}
              </div>
            </div>

            {/* Account right now */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-start">
                <div>
                  <Label className="text-sm font-bold text-white">Account right now</Label>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    where you stand in {inputs.account.currentPhase === "p1" ? "Phase 1" : inputs.account.currentPhase === "p2" ? "Phase 2" : "Funded"} now: + toward the {inputs.account.currentPhase === "p1" ? `+${inputs.challengeRules.phase1TargetPct}% target` : inputs.account.currentPhase === "p2" ? `+${inputs.challengeRules.phase2TargetPct}% target` : "payout"}, - in drawdown
                  </p>
                </div>
                <span className="text-sm font-bold text-white shrink-0">
                  {inputs.account.currentNetPctInPhase === 0 ? "flat" : `${inputs.account.currentNetPctInPhase > 0 ? "+" : ""}${inputs.account.currentNetPctInPhase}%`}
                </span>
              </div>
              <Slider 
                min={-inputs.challengeRules.maxOverallLossPct} 
                max={inputs.account.currentPhase === "p1" ? inputs.challengeRules.phase1TargetPct : inputs.account.currentPhase === "p2" ? inputs.challengeRules.phase2TargetPct : 20} 
                step={0.5} 
                value={[inputs.account.currentNetPctInPhase]} 
                onValueChange={(val: any) => updateNestedInput("account", "currentNetPctInPhase", Array.isArray(val) ? val[0] : val)}
                className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.bg-primary]:bg-slate-800"
              />
            </div>
            
            {/* Trading days left */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-start">
                <div>
                  <Label className="text-sm font-bold text-white">Trading days left in 2026</Label>
                  <p className="text-[11px] text-slate-500 mt-1">work today (2026-08-10) - Dec 31 minus exchange holidays</p>
                </div>
                <span className="text-sm font-bold text-white">{inputs.account.tradingDaysLeftThisYear}</span>
              </div>
              <Slider 
                min={1} max={250} step={1} 
                value={[inputs.account.tradingDaysLeftThisYear]} 
                onValueChange={(val: any) => updateNestedInput("account", "tradingDaysLeftThisYear", Array.isArray(val) ? val[0] : val)}
                className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-slate-800"
              />
            </div>

            {/* How many accounts */}
            <div className="flex items-center justify-between pt-2">
              <Label className="text-sm font-bold text-white">How many accounts</Label>
              <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800 w-48">
                <button 
                  className={`flex-1 py-2 text-xs font-bold rounded-sm transition-colors ${inputs.account.numberOfAccounts === 1 ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm" : "text-slate-500"}`}
                  onClick={() => updateNestedInput("account", "numberOfAccounts", 1)}
                >
                  1 account
                </button>
                <button 
                  className={`flex-1 py-2 text-xs font-bold rounded-sm transition-colors ${inputs.account.numberOfAccounts === 2 ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm" : "text-slate-500"}`}
                  onClick={() => updateNestedInput("account", "numberOfAccounts", 2)}
                >
                  2 accounts
                </button>
              </div>
            </div>
          </div>

          {/* C. CHALLENGE TARGETS */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0f111a] space-y-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
              <span className="text-blue-500">▲</span> C. CHALLENGE TARGETS
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Label className="text-sm font-bold text-white">Phase 1 profit target</Label>
                    <p className="text-[11px] text-slate-500 mt-1">FTMO uses 10%, some firms use 8%</p>
                  </div>
                  <span className="text-sm font-bold text-white">+{inputs.challengeRules.phase1TargetPct}%</span>
                </div>
                <Slider 
                  min={4} max={12} step={1} 
                  value={[inputs.challengeRules.phase1TargetPct]} 
                  onValueChange={(val: any) => updateNestedInput("challengeRules", "phase1TargetPct", Array.isArray(val) ? val[0] : val)}
                  className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.bg-primary]:bg-slate-800"
                />
              </div>
              <div className="space-y-3 pt-2 border-t border-slate-800/50">
                <div className="flex justify-between items-start">
                  <div>
                    <Label className="text-sm font-bold text-white">Phase 2 profit target</Label>
                    <p className="text-[11px] text-slate-500 mt-1">verification target</p>
                  </div>
                  <span className="text-sm font-bold text-white">+{inputs.challengeRules.phase2TargetPct}%</span>
                </div>
                <Slider 
                  min={2} max={8} step={1} 
                  value={[inputs.challengeRules.phase2TargetPct]} 
                  onValueChange={(val: any) => updateNestedInput("challengeRules", "phase2TargetPct", Array.isArray(val) ? val[0] : val)}
                  className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.bg-primary]:bg-slate-800"
                />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 pt-2">
                A lower Phase 1 target means fewer R to clear - it passes faster and more often. The -{inputs.challengeRules.maxOverallLossPct}% overall floor and -{inputs.challengeRules.dailyLossLimitPct}% daily limit are FTMO-standard and hold fixed here.
              </p>
            </div>
          </div>

          {/* D. RISK PER TRADE */}
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0f111a] space-y-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
              <span className="text-blue-500">▲</span> D. RISK PER TRADE - BY PHASE
            </h3>
            
            <div className="space-y-6">
              {[
                { key: "phase1", label: "Phase 1 risk", sub: "aggressive = faster but lower odds" },
                { key: "phase2", label: "Phase 2 risk", sub: "verification" },
                { key: "funded", label: "Funded risk", sub: "protect the real account" }
              ].map(p => (
                <div key={p.key} className="space-y-3 border-b border-slate-800/50 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-sm font-bold text-white">{p.label}</Label>
                      <p className="text-[11px] text-slate-500 mt-1">{p.sub}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{inputs.riskPerTradePctOfAccount[p.key as keyof typeof inputs.riskPerTradePctOfAccount]}%</span>
                      <span className="text-xs text-slate-400 ml-2">${((inputs.riskPerTradePctOfAccount[p.key as keyof typeof inputs.riskPerTradePctOfAccount]/100) * inputs.account.accountSizeUsd).toLocaleString()}/R</span>
                    </div>
                  </div>
                  <Slider 
                    min={0.1} max={2.0} step={0.1} 
                    value={[inputs.riskPerTradePctOfAccount[p.key as keyof typeof inputs.riskPerTradePctOfAccount]]} 
                    onValueChange={(val: any) => updateNestedInput("riskPerTradePctOfAccount", p.key, Array.isArray(val) ? val[0] : val)}
                    className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.bg-primary]:bg-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* E. YOUR DAILY RULES */}
          {inputs.dayModel === "dayMix" && (
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0f111a] space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                <span className="text-blue-500">▲</span> E. YOUR DAILY RULES
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-3 border-b border-slate-800/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-sm font-bold text-white">Good-day target</Label>
                      <p className="text-[11px] text-slate-500 mt-1">you hit this, bank it, stop</p>
                    </div>
                    <span className="text-sm font-bold text-white">+{inputs.dayMix.goodDayTargetR}R</span>
                  </div>
                  <Slider 
                    min={1} max={10} step={0.5} 
                    value={[inputs.dayMix.goodDayTargetR]} 
                    onValueChange={(val: any) => updateNestedInput("dayMix", "goodDayTargetR", Array.isArray(val) ? val[0] : val)}
                    className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.bg-primary]:bg-slate-800"
                  />
                </div>
                
                <div className="space-y-3 border-b border-slate-800/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-sm font-bold text-white">Daily stop - floor</Label>
                      <p className="text-[11px] text-slate-500 mt-1">down this much, you're done for the day</p>
                    </div>
                    <span className="text-sm font-bold text-white">-{inputs.dayMix.dailyStopR}R</span>
                  </div>
                  <Slider 
                    min={1} max={Math.max(1, Math.floor(inputs.challengeRules.dailyLossLimitPct / (Math.max(0.1, ...Object.values(inputs.riskPerTradePctOfAccount).map(Number)) || 1)))} step={0.5} 
                    value={[inputs.dayMix.dailyStopR]} 
                    onValueChange={(val: any) => updateNestedInput("dayMix", "dailyStopR", Array.isArray(val) ? val[0] : val)}
                    className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between pb-2">
                  <div>
                    <Label className="text-sm font-bold text-white">Bank your good days?</Label>
                    <p className="text-[11px] text-slate-500 mt-1">ON = stop at target. OFF = give it back to ~+1R (no heroes).</p>
                  </div>
                  <Switch 
                    checked={inputs.dayMix.bankGoodDays} 
                    onCheckedChange={(c) => updateNestedInput("dayMix", "bankGoodDays", c)} 
                  />
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  Set the target where you actually stop (~+1.5 for the 1.0, ~+2.5 for the 1.5) and tune the day-mix to match each level's hit-rate.
                </p>
              </div>
            </div>
          )}

          {/* F. HOW OFTEN DOES EACH KIND OF DAY HAPPEN? */}
          {inputs.dayModel === "dayMix" && (
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0f111a] space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                <span className="text-blue-500">▲</span> F. HOW OFTEN DOES EACH KIND OF DAY HAPPEN?
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-3 border-b border-slate-800/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-sm font-bold text-green-500">Good days</Label>
                      <p className="text-[11px] text-slate-500 mt-1">finish at your target</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{Math.round(inputs.dayMix.probabilityGoodDay * 100)}%</span>
                      <span className="text-xs text-slate-400 ml-2">~ {Math.round(inputs.dayMix.probabilityGoodDay * inputs.account.tradingDaysLeftThisYear)} days</span>
                    </div>
                  </div>
                  <Slider 
                    min={0} max={1} step={0.01}
                    value={[inputs.dayMix.probabilityGoodDay]} 
                    onValueChange={(val: any) => updateNestedInput("dayMix", "probabilityGoodDay", Array.isArray(val) ? val[0] : val)}
                    className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.bg-primary]:bg-slate-800"
                  />
                </div>
                
                <div className="space-y-3 border-b border-slate-800/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-sm font-bold text-yellow-500">Flat / breakeven days</Label>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{Math.round(inputs.dayMix.probabilityFlatDay * 100)}%</span>
                      <span className="text-xs text-slate-400 ml-2">~ {Math.round(inputs.dayMix.probabilityFlatDay * inputs.account.tradingDaysLeftThisYear)} days</span>
                    </div>
                  </div>
                  <Slider 
                    min={0} max={1} step={0.01}
                    value={[inputs.dayMix.probabilityFlatDay]} 
                    onValueChange={(val: any) => updateNestedInput("dayMix", "probabilityFlatDay", Array.isArray(val) ? val[0] : val)}
                    className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-slate-800"
                  />
                </div>
                
                <div className="space-y-3 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Label className="text-sm font-bold text-red-500">Bad days</Label>
                      <p className="text-[11px] text-slate-500 mt-1">you hit your stop - out automatically</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{Math.round(inputs.dayMix.probabilityBadDay * 100)}%</span>
                      <span className="text-xs text-slate-400 ml-2">~ {Math.round(inputs.dayMix.probabilityBadDay * inputs.account.tradingDaysLeftThisYear)} days</span>
                    </div>
                  </div>
                  <Slider 
                    min={0} max={1} step={0.01}
                    value={[inputs.dayMix.probabilityBadDay]} 
                    onValueChange={(val: any) => updateNestedInput("dayMix", "probabilityBadDay", Array.isArray(val) ? val[0] : val)}
                    className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-slate-800"
                  />
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  Count 'em out of your trading days left. Get these from your real last 30-60 days - they're the dials the whole answer hangs on.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* HERO WIDGET */}
          <div className={`p-6 rounded-xl border border-slate-800 bg-[#0f111a] space-y-8 transition-opacity duration-300 ${isRunning ? "opacity-50" : "opacity-100"}`}>
            
            <h2 className="text-lg leading-relaxed text-slate-300 font-medium">
              With days like these you get funded <strong className="text-green-500 font-extrabold text-xl">~{stats?.getFundedPerAccountPct.toFixed(0)}%</strong> of the time, 
              usually in <strong className="text-white font-extrabold text-xl">~{stats?.avgTradingDaysToFunded}</strong> trading days, 
              finishing the year with roughly <strong className="text-blue-500 font-extrabold text-xl">{fmtCurrency(stats?.takeHomeByDec31Usd.median || 0)}</strong> in your pocket.
            </h2>
            
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                <div className="bg-blue-600 h-full" style={{ width: `${stats?.getFundedPerAccountPct || 0}%` }} />
                <div className="bg-red-500/50 h-full" style={{ width: `${stats?.blowUpRiskPct || 0}%` }} />
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <span>chances you get funded</span>
                <span>{stats?.getFundedPerAccountPct.toFixed(0)}%</span>
              </div>
            </div>
            
          </div>

          {/* STAT GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0f111a] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Edge Per Day</div>
              <div className={`text-3xl font-extrabold ${stats && stats.edgePerDayR > 0 ? "text-green-500" : "text-red-500"}`}>
                {stats && stats.edgePerDayR > 0 ? "+" : ""}{stats?.edgePerDayR.toFixed(2)}R
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">
                {stats && stats.edgePerDayR > 0 ? "+" : ""}{fmtCurrency(stats?.edgePerDayUsdPhase1 || 0)}/day in P1
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-[#0f111a] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Pass Phase 1</div>
              <div className="text-3xl font-extrabold text-white">
                {stats?.passPhase1Pct.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">reach +{inputs.challengeRules.phase1TargetPct}% per acct</div>
            </div>
            
            <div className="p-4 rounded-xl bg-[#0f111a] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Get Funded</div>
              <div className="text-3xl font-extrabold text-white">
                {stats?.getFundedPerAccountPct.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">pass both phases</div>
            </div>
            
            <div className="p-4 rounded-xl bg-[#0f111a] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Time to Funded</div>
              <div className="text-3xl font-extrabold text-white">
                {stats?.avgTradingDaysToFunded}
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">~ trades from now</div>
            </div>
            
            <div className="p-4 rounded-xl bg-[#0f111a] border border-slate-800 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Deepest Hole [Median]</div>
              <div className="text-3xl font-extrabold text-red-500">
                -{stats?.medianDeepestDrawdownR.toFixed(1)}R
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">
                ~ -{((stats?.medianDeepestDrawdownR || 0) * inputs.riskPerTradePctOfAccount.phase1).toFixed(0)}% in P1
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-[#0f111a] border border-slate-800 flex flex-col justify-center">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-3">Daily Limit Safety</div>
              <div className="space-y-2 text-xs font-bold font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-green-500">P1 {-(inputs.riskPerTradePctOfAccount.phase1 * (inputs.dayModel === "dayMix" ? inputs.dayMix.dailyStopR : inputs.withinDay.dailyFloorR)).toFixed(1)}%</span>
                  {inputs.riskPerTradePctOfAccount.phase1 * (inputs.dayModel === "dayMix" ? inputs.dayMix.dailyStopR : inputs.withinDay.dailyFloorR) <= inputs.challengeRules.dailyLossLimitPct ? <Check className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-500">P2 {-(inputs.riskPerTradePctOfAccount.phase2 * (inputs.dayModel === "dayMix" ? inputs.dayMix.dailyStopR : inputs.withinDay.dailyFloorR)).toFixed(1)}%</span>
                  {inputs.riskPerTradePctOfAccount.phase2 * (inputs.dayModel === "dayMix" ? inputs.dayMix.dailyStopR : inputs.withinDay.dailyFloorR) <= inputs.challengeRules.dailyLossLimitPct ? <Check className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-500">Fd {-(inputs.riskPerTradePctOfAccount.funded * (inputs.dayModel === "dayMix" ? inputs.dayMix.dailyStopR : inputs.withinDay.dailyFloorR)).toFixed(1)}%</span>
                  {inputs.riskPerTradePctOfAccount.funded * (inputs.dayModel === "dayMix" ? inputs.dayMix.dailyStopR : inputs.withinDay.dailyFloorR) <= inputs.challengeRules.dailyLossLimitPct ? <Check className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-red-500"/>}
                </div>
              </div>
              <div className="text-[9px] text-slate-500 mt-3 leading-tight">each phase's daily stop vs the 5% limit</div>
            </div>
          </div>

          {/* PAYOUT WIDGET */}
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0f111a] flex flex-col justify-between items-start">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Take-Home by Dec 31 (Your {inputs.challengeRules.payoutSplitToTrader * 100}% — Funded Stage Only)</div>
            <div className="text-5xl font-extrabold text-blue-500">
              {fmtCurrency(stats?.takeHomeByDec31Usd.median || 0)}
            </div>
            <div className="text-sm text-slate-400 mt-2 font-medium">
              likely range {fmtCurrency(stats?.takeHomeByDec31Usd.p25 || 0)} - {fmtCurrency(stats?.takeHomeByDec31Usd.p75 || 0)}
            </div>
          </div>

          {inputs.dayModel === "dayMix" && (
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0f111a] text-sm text-slate-400 font-medium">
              you need <strong className="text-white">{stats?.breakevenGoodDayFractionPct}%</strong> good days just to break even
            </div>
          )}

          {/* WEEKLY TARGET */}
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0f111a] space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2 mb-4">
              <span className="text-blue-500">▲</span> YOUR WEEKLY TARGET - WHEN TO STOP
            </h3>
            
            <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-800/50">
              <div>
                <div className="text-[10px] text-slate-500 font-bold mb-1">Good days / week</div>
                <div className="text-2xl font-extrabold text-green-500">{goodDaysPerWeek.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold mb-1">Weekly target</div>
                <div className="text-2xl font-extrabold text-white">+{weeklyTargetR.toFixed(1)}R</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold mb-1">$ / week - Phase 1</div>
                <div className="text-2xl font-extrabold text-blue-500">{fmtCurrency(weeklyTargetP1)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold mb-1">$ / week - Funded</div>
                <div className="text-2xl font-extrabold text-blue-500">{fmtCurrency(weeklyTargetFunded)}</div>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              On a normal 5-day week expect about <strong className="text-green-500">{goodDaysPerWeek.toFixed(1)} good days</strong> and <strong className="text-white">+{weeklyTargetR.toFixed(1)}R</strong>. 
              Once you've banked that, pushing for more is where you historically give it back — <strong className="text-white">end the week or switch to the other account</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* FOOTER: LLM PROMPT EXPORT */}
      <div className="mt-8 p-4 rounded-xl border border-slate-800 bg-[#0f111a] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span className="text-yellow-500 font-serif italic text-lg">Ask an LLM about this setup</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Copy a JSON prompt — the model explained, plus your current inputs and results — and paste it into Claude or any LLM to ask questions.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={copyPrompt} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 rounded-md">
            <Copy className="w-4 h-4" /> Copy LLM prompt
          </Button>
          <Button variant="outline" className="h-10 w-10 p-0 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* FOOTER: DISCLAIMER */}
      <div className="pt-4 mt-8 border-t border-slate-800/50">
        <p className="text-[10px] text-slate-500 leading-relaxed text-center max-w-4xl mx-auto">
          Simulation is not a promise. The funded payout is real Phase 1/2 profits only get you funded. High pass rates assume your inputs are real — stress them by dragging your edge down. FTMO accounts and limits are used as a standard reference; actual firm rules may vary.
        </p>
      </div>

    </div>
  )
}
