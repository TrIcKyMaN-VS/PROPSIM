import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"

const ctx: Worker = self as any

ctx.onmessage = (event: MessageEvent) => {
  const { type, inputs } = event.data

  if (type === "run") {
    try {
      const stats = runPropFirmModel(inputs)
      ctx.postMessage({ type: "complete", stats })
    } catch (error: any) {
      ctx.postMessage({ type: "error", error: error.message || String(error) })
    }
  }
}

// ─── Exported so the service can run it synchronously as a fallback ───────────
export function runPropFirmModel(inputs: MonteCarloInputs): MonteCarloStats {
  const { account, challengeRules, riskPerTradePctOfAccount, dayModel, dayMix, withinDay, simulations } = inputs

  // ── Phase-appropriate risk getter ────────────────────────────────────────────
  const getRiskPct = (phase: string): number => {
    if (phase === "p1") return riskPerTradePctOfAccount.phase1
    if (phase === "p2") return riskPerTradePctOfAccount.phase2
    return riskPerTradePctOfAccount.funded
  }

  let passedPhase1Count  = 0
  let getFundedCount     = 0
  let blowUpCount        = 0

  const daysToFundedList: number[] = []
  const drawdownsRList:   number[] = []
  const payoutsUsdList:   number[] = []

  let totalEdgePerDayR  = 0
  let totalEdgeDaysCount = 0

  for (let s = 0; s < simulations; s++) {
    // Progress heartbeat every 10 %
    if (s > 0 && s % Math.floor(simulations / 10) === 0) {
      ctx.postMessage({ type: "progress", progress: Math.round((s / simulations) * 100) })
    }

    // ── Per-simulation state ─────────────────────────────────────────────────
    let currentPhase = account.currentPhase
    let daysLeft     = account.tradingDaysLeftThisYear
    let ruined       = false

    // Convert the starting equity-in-phase (%) to R for the current phase
    const startRiskPct = getRiskPct(currentPhase)
    let currentR       = startRiskPct > 0 ? account.currentNetPctInPhase / startRiskPct : 0

    // FIX BUG 3 – track drawdown across the ENTIRE journey (not just current phase).
    // We keep a single global peak-to-trough tracker that never resets.
    let globalPeakR    = currentR
    let maxDrawdownR   = 0

    let daysTaken          = 0
    let didPassP1ThisRun   = false
    let didGetFundedThisRun = false

    // FIX BUG 7 – record funded-stage starting R so we can exclude it from payout.
    // If the account starts in funded, the opening currentR is already-earned equity
    // and must NOT be counted again as profit from this sim.
    let fundedStartR: number | null = currentPhase === "funded" ? currentR : null

    while (daysLeft > 0 && !ruined) {
      const phaseRiskPct = getRiskPct(currentPhase)
      if (phaseRiskPct <= 0) break

      // R-denominated challenge barriers for this phase
      const targetPct = currentPhase === "p1" ? challengeRules.phase1TargetPct :
                        currentPhase === "p2" ? challengeRules.phase2TargetPct : Infinity
      const targetR    = targetPct / phaseRiskPct

      // Overall max-loss floor (from phase-start balance — standard FTMO rules)
      const floorR    = -challengeRules.maxOverallLossPct / phaseRiskPct

      // Daily loss limit in R units for this phase
      const dailyLossR = -challengeRules.dailyLossLimitPct / phaseRiskPct

      // ── Simulate one day ──────────────────────────────────────────────────
      let dayPnLR = 0

      if (dayModel === "dayMix") {
        const rand = Math.random()
        if (rand < dayMix.probabilityGoodDay) {
          // FIX BUG 8 – honour bankGoodDays flag
          // ON  → bank the full goodDayTargetR (stop once target hit)
          // OFF → give back most of it; only keep ~1R ("no heroes")
          dayPnLR = dayMix.bankGoodDays ? dayMix.goodDayTargetR : 1.0
        } else if (rand < dayMix.probabilityGoodDay + dayMix.probabilityFlatDay) {
          dayPnLR = 0
        } else {
          dayPnLR = -dayMix.dailyStopR
        }

        // FIX BUG 1 – clamp dayMix PnL to the daily loss limit BEFORE adding to account
        if (dayPnLR < dailyLossR) dayPnLR = dailyLossR

      } else {
        // withinDay – trade-by-trade loop already enforces dailyLossR internally
        let dR     = 0
        let trades = 0
        const ceiling = withinDay.bankGoodDays ? withinDay.dailyCeilingR : 1.0

        while (dR < ceiling && dR > -withinDay.dailyFloorR && trades < 100) {
          if (Math.random() * 100 < withinDay.winRate) {
            dR += withinDay.rewardRisk
          } else {
            dR -= 1
          }
          // Inner daily loss clamp
          if (dR <= dailyLossR) {
            dR = dailyLossR
            break
          }
          trades++
        }
        // FIX BUG 1 – no outer clamp needed; inner loop already clamped
        dayPnLR = dR
      }

      currentR  += dayPnLR
      daysLeft--
      daysTaken++

      totalEdgePerDayR += dayPnLR
      totalEdgeDaysCount++

      // FIX BUG 3 – track global high-water mark & deepest drawdown across ALL phases
      if (currentR > globalPeakR) globalPeakR = currentR
      const dd = globalPeakR - currentR
      if (dd > maxDrawdownR) maxDrawdownR = dd

      // ── Check ruin ────────────────────────────────────────────────────────
      if (currentR <= floorR) {
        ruined = true
        blowUpCount++
        break
      }

      // ── Check phase-advancement targets ───────────────────────────────────
      if (currentR >= targetR && currentPhase !== "funded") {
        if (currentPhase === "p1") {
          didPassP1ThisRun = true
          currentPhase = "p2"
          currentR = 0
          // Note: globalPeakR intentionally NOT reset – we track whole-journey DD
        } else if (currentPhase === "p2") {
          didGetFundedThisRun = true
          currentPhase = "funded"
          currentR = 0
          fundedStartR = 0 // started fresh in funded this run
          daysToFundedList.push(daysTaken)
        }
      }
    } // end while

    // ── FIX BUG 4 & 5 & 6 – Counters are mutually exclusive ─────────────────
    // blowUpCount already incremented inside the loop if ruined.
    // Only count pass/funded if NOT ruined.

    if (!ruined) {
      // Pass Phase 1: either passed it this run, OR started beyond P1 (and didn't blow up)
      if (didPassP1ThisRun || account.currentPhase !== "p1") {
        passedPhase1Count++
      }

      // Get Funded: either got funded this run, OR already started funded (and survived)
      if (didGetFundedThisRun || (account.currentPhase === "funded" && !ruined)) {
        getFundedCount++
      }
    } else {
      // Even if account started in funded/p2, a blow-up voids both counters
      // (blowUpCount already incremented — no additional counting)
    }

    // ── Payout at Dec 31 ─────────────────────────────────────────────────────
    if (currentPhase === "funded" && !ruined) {
      const fundedRiskPct = riskPerTradePctOfAccount.funded

      // FIX BUG 7 – subtract the R we started the funded stage with so we only
      // count profit GENERATED during this simulation, not pre-existing equity.
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
  } // end simulation loop

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

  // FIX BUG 9 – correct breakeven formula: stop / (target + stop)
  // This is the fraction of days that must be good days just for the expectancy to be 0.
  // Flat days don't affect the calculation – they contribute 0 to both sides.
  const breakevenGoodDayFractionPct = dayModel === "dayMix" && (dayMix.goodDayTargetR + dayMix.dailyStopR) > 0
    ? Math.round((dayMix.dailyStopR / (dayMix.goodDayTargetR + dayMix.dailyStopR)) * 100)
    : 0

  return {
    simulations,
    passPhase1Pct:           Math.round((passedPhase1Count / simulations) * 100),
    getFundedPerAccountPct:  Math.round((getFundedCount    / simulations) * 100),
    blowUpRiskPct:           Math.round((blowUpCount       / simulations) * 100),
    avgTradingDaysToFunded:  avgDaysToFunded,
    edgePerDayR,
    edgePerDayUsdPhase1,
    medianDeepestDrawdownR:  Math.round(getPercentile(sortedDrawdowns, 50) * 10) / 10,
    takeHomeByDec31Usd: {
      p25:    Math.round(getPercentile(sortedPayouts, 25)),
      median: Math.round(getPercentile(sortedPayouts, 50)),
      p75:    Math.round(getPercentile(sortedPayouts, 75)),
      note:   "funded-stage profit only, after the trader's payout split",
    },
    breakevenGoodDayFractionPct,
  }
}
