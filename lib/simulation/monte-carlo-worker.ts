import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"

const ctx: Worker = self as any

ctx.onmessage = (event: MessageEvent) => {
  const { type, inputs } = event.data

  if (type === "run") {
    try {
      // Pass the postMessage callback so the pure model function stays free of
      // any Worker-specific globals (fixes the main-thread crash when running
      // as a synchronous fallback).
      const onProgress = (pct: number) =>
        ctx.postMessage({ type: "progress", progress: pct })
      const stats = runPropFirmModel(inputs, onProgress)
      ctx.postMessage({ type: "complete", stats })
    } catch (error: any) {
      ctx.postMessage({ type: "error", error: error.message || String(error) })
    }
  }
}

// ─── Pure model function — no Worker globals ──────────────────────────────────
// The optional `onProgress` callback keeps this safe to call from the main
// thread (synchronous fallback) without crashing due to `window.postMessage`.
export function runPropFirmModel(
  inputs: MonteCarloInputs,
  onProgress?: (pct: number) => void
): MonteCarloStats {
  const { account, challengeRules, riskPerTradePctOfAccount, dayModel, dayMix, withinDay, simulations } = inputs

  // ── Phase-appropriate risk getter ────────────────────────────────────────────
  const getRiskPct = (phase: string): number => {
    if (phase === "p1") return riskPerTradePctOfAccount.phase1
    if (phase === "p2") return riskPerTradePctOfAccount.phase2
    return riskPerTradePctOfAccount.funded
  }

  let passedPhase1Count   = 0
  let getFundedCount      = 0
  let blowUpCount         = 0

  const daysToFundedList: number[] = []
  const drawdownsRList:   number[] = []
  const payoutsUsdList:   number[] = []

  let totalEdgePerDayR   = 0
  let totalEdgeDaysCount = 0

  const progressStep = Math.max(1, Math.floor(simulations / 10))

  for (let s = 0; s < simulations; s++) {
    // Progress heartbeat every 10% — safe regardless of execution context
    if (s > 0 && s % progressStep === 0 && onProgress) {
      onProgress(Math.round((s / simulations) * 100))
    }

    // ── Per-simulation state ─────────────────────────────────────────────────
    let currentPhase = account.currentPhase
    let daysLeft     = account.tradingDaysLeftThisYear
    let ruined       = false

    // Convert the starting equity-in-phase (%) to R for the current phase
    const startRiskPct = getRiskPct(currentPhase)
    let currentR       = startRiskPct > 0 ? account.currentNetPctInPhase / startRiskPct : 0

    // Track drawdown across the ENTIRE journey (not just current phase)
    let globalPeakR  = currentR
    let maxDrawdownR = 0

    let daysTaken           = 0
    let didPassP1ThisRun    = false
    let didGetFundedThisRun = false

    // Record funded-stage starting R so we only count profit GENERATED this sim
    let fundedStartR: number | null = currentPhase === "funded" ? currentR : null

    while (daysLeft > 0 && !ruined) {
      const phaseRiskPct = getRiskPct(currentPhase)
      if (phaseRiskPct <= 0) break

      // R-denominated challenge barriers for this phase
      const targetPct = currentPhase === "p1" ? challengeRules.phase1TargetPct :
                        currentPhase === "p2" ? challengeRules.phase2TargetPct : Infinity
      const targetR    = targetPct / phaseRiskPct

      // Overall max-loss floor (from phase-start balance)
      const floorR     = -challengeRules.maxOverallLossPct / phaseRiskPct

      // Daily loss limit in R units for this phase
      const dailyLossR = -challengeRules.dailyLossLimitPct / phaseRiskPct

      // ── Simulate one day ──────────────────────────────────────────────────
      let dayPnLR = 0

      if (dayModel === "dayMix") {
        const rand = Math.random()
        if (rand < dayMix.probabilityGoodDay) {
          // bankGoodDays ON → full target; OFF → give most back, keep ~1R
          dayPnLR = dayMix.bankGoodDays ? dayMix.goodDayTargetR : 1.0
        } else if (rand < dayMix.probabilityGoodDay + dayMix.probabilityFlatDay) {
          dayPnLR = 0
        } else {
          dayPnLR = -dayMix.dailyStopR
        }
        // Clamp to daily loss limit before adding to account equity
        if (dayPnLR < dailyLossR) dayPnLR = dailyLossR

      } else {
        // withinDay – trade-by-trade; inner loop enforces dailyLossR
        let dR     = 0
        let trades = 0
        const ceiling = withinDay.bankGoodDays ? withinDay.dailyCeilingR : 1.0

        while (dR < ceiling && dR > -withinDay.dailyFloorR && trades < 100) {
          if (Math.random() * 100 < withinDay.winRate) {
            dR += withinDay.rewardRisk
          } else {
            dR -= 1
          }
          if (dR <= dailyLossR) { dR = dailyLossR; break }
          trades++
        }
        dayPnLR = dR
      }

      currentR += dayPnLR
      daysLeft--
      daysTaken++

      totalEdgePerDayR += dayPnLR
      totalEdgeDaysCount++

      // Global high-water mark & deepest drawdown across ALL phases
      if (currentR > globalPeakR) globalPeakR = currentR
      const dd = globalPeakR - currentR
      if (dd > maxDrawdownR) maxDrawdownR = dd

      // ── Check ruin ────────────────────────────────────────────────────────
      if (currentR <= floorR) {
        ruined = true
        blowUpCount++
        break
      }

      // ── Phase-advancement ─────────────────────────────────────────────────
      if (currentR >= targetR && currentPhase !== "funded") {
        if (currentPhase === "p1") {
          didPassP1ThisRun = true
          currentPhase = "p2"
          currentR = 0
        } else if (currentPhase === "p2") {
          didGetFundedThisRun = true
          currentPhase = "funded"
          currentR = 0
          fundedStartR = 0
          daysToFundedList.push(daysTaken)
        }
      }
    }

    // ── Mutually exclusive counters (blowUp already incremented in loop) ──────
    if (!ruined) {
      if (didPassP1ThisRun || account.currentPhase !== "p1") passedPhase1Count++
      if (didGetFundedThisRun || account.currentPhase === "funded") getFundedCount++
    }

    // ── Payout at end of year ─────────────────────────────────────────────────
    if (currentPhase === "funded" && !ruined) {
      const fundedRiskPct = riskPerTradePctOfAccount.funded
      const profitR = currentR - (fundedStartR ?? 0)
      if (profitR > 0) {
        const usdProfit = profitR * (fundedRiskPct / 100) * account.accountSizeUsd
        payoutsUsdList.push(usdProfit * challengeRules.payoutSplitToTrader)
      } else {
        payoutsUsdList.push(0)
      }
    } else {
      payoutsUsdList.push(0)
    }

    drawdownsRList.push(maxDrawdownR)
  }

  // ── Aggregate statistics ──────────────────────────────────────────────────
  const sortAsc = (arr: number[]) => [...arr].sort((a, b) => a - b)
  const sortedPayouts   = sortAsc(payoutsUsdList)
  const sortedDrawdowns = sortAsc(drawdownsRList)

  const getPercentile = (sortedArr: number[], p: number): number => {
    if (sortedArr.length === 0) return 0
    const idx = Math.floor((sortedArr.length - 1) * (p / 100))
    return sortedArr[idx]
  }

  const avgDaysToFunded = daysToFundedList.length > 0
    ? Math.round(daysToFundedList.reduce((a, b) => a + b, 0) / daysToFundedList.length)
    : 0

  const edgePerDayR = totalEdgeDaysCount > 0
    ? Number((totalEdgePerDayR / totalEdgeDaysCount).toFixed(2))
    : 0

  const edgePerDayUsdPhase1 = Math.round(
    edgePerDayR * (riskPerTradePctOfAccount.phase1 / 100) * account.accountSizeUsd
  )

  const breakevenGoodDayFractionPct = dayModel === "dayMix" && (dayMix.goodDayTargetR + dayMix.dailyStopR) > 0
    ? Math.round((dayMix.dailyStopR / (dayMix.goodDayTargetR + dayMix.dailyStopR)) * 100)
    : 0

  return {
    simulations,
    passPhase1Pct:          Math.round((passedPhase1Count / simulations) * 100),
    getFundedPerAccountPct: Math.round((getFundedCount    / simulations) * 100),
    blowUpRiskPct:          Math.round((blowUpCount       / simulations) * 100),
    avgTradingDaysToFunded: avgDaysToFunded,
    edgePerDayR,
    edgePerDayUsdPhase1,
    medianDeepestDrawdownR: Math.round(getPercentile(sortedDrawdowns, 50) * 10) / 10,
    takeHomeByDec31Usd: {
      p25:    Math.round(getPercentile(sortedPayouts, 25)),
      median: Math.round(getPercentile(sortedPayouts, 50)),
      p75:    Math.round(getPercentile(sortedPayouts, 75)),
      note:   "funded-stage profit only, after the trader's payout split",
    },
    breakevenGoodDayFractionPct,
  }
}
