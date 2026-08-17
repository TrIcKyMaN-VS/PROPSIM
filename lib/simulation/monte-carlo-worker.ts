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

function runPropFirmModel(inputs: MonteCarloInputs): MonteCarloStats {
  const { account, challengeRules, riskPerTradePctOfAccount, dayModel, dayMix, withinDay, simulations } = inputs

  let passedPhase1Count = 0
  let getFundedCount = 0
  let blowUpCount = 0
  
  const daysToFundedList: number[] = []
  const drawdownsRList: number[] = []
  const payoutsUsdList: number[] = []

  let totalEdgePerDayR = 0
  let totalEdgeDaysCount = 0

  for (let s = 0; s < simulations; s++) {
    if (s > 0 && s % Math.floor(simulations / 10) === 0) {
      ctx.postMessage({ type: "progress", progress: Math.round((s / simulations) * 100) })
    }

    let currentPhase = account.currentPhase
    let daysLeft = account.tradingDaysLeftThisYear
    let ruined = false

    // Initial R state
    const getRiskPct = (phase: string) => {
      if (phase === "p1") return riskPerTradePctOfAccount.phase1
      if (phase === "p2") return riskPerTradePctOfAccount.phase2
      return riskPerTradePctOfAccount.funded
    }

    let initialRiskPct = getRiskPct(currentPhase)
    let currentR = initialRiskPct > 0 ? account.currentNetPctInPhase / initialRiskPct : 0

    let peakR = currentR
    let maxDrawdownR = 0
    let daysTaken = 0
    let didPassP1ThisRun = false
    let didGetFundedThisRun = false

    while (daysLeft > 0 && !ruined) {
      const phaseRiskPct = getRiskPct(currentPhase)
      if (phaseRiskPct <= 0) break

      const targetPct = currentPhase === "p1" ? challengeRules.phase1TargetPct :
                        currentPhase === "p2" ? challengeRules.phase2TargetPct : Infinity
      const targetR = targetPct / phaseRiskPct
      
      const maxLossPct = challengeRules.maxOverallLossPct
      const floorR = -maxLossPct / phaseRiskPct

      const dailyLossLimitPct = challengeRules.dailyLossLimitPct
      const dailyLossR = -dailyLossLimitPct / phaseRiskPct

      let dayPnLR = 0

      if (dayModel === "dayMix") {
        const rand = Math.random()
        if (rand < dayMix.probabilityGoodDay) {
          dayPnLR = dayMix.goodDayTargetR
        } else if (rand < dayMix.probabilityGoodDay + dayMix.probabilityFlatDay) {
          dayPnLR = 0
        } else {
          dayPnLR = -dayMix.dailyStopR
        }
      } else {
        // withinDay
        let dR = 0
        let trades = 0
        while (dR < withinDay.dailyCeilingR && dR > -withinDay.dailyFloorR && trades < 100) {
          if (Math.random() * 100 < withinDay.winRate) {
            dR += withinDay.rewardRisk
          } else {
            dR -= 1
          }
          if (dR <= dailyLossR) {
            dR = dailyLossR
            break
          }
          trades++
        }
        dayPnLR = dR
      }

      // Hard clamp daily loss limit if enforced
      if (dayPnLR < dailyLossR) {
        dayPnLR = dailyLossR
      }

      currentR += dayPnLR
      daysLeft--
      daysTaken++

      totalEdgePerDayR += dayPnLR
      totalEdgeDaysCount++

      if (currentR > peakR) peakR = currentR
      const dd = peakR - currentR
      if (dd > maxDrawdownR) maxDrawdownR = dd

      // Check Ruin
      if (currentR <= floorR) {
        ruined = true
        blowUpCount++
        break
      }

      // Check Targets
      if (currentR >= targetR && currentPhase !== "funded") {
        if (currentPhase === "p1") {
          didPassP1ThisRun = true
          currentPhase = "p2"
          currentR = 0
          peakR = 0
        } else if (currentPhase === "p2") {
          didGetFundedThisRun = true
          currentPhase = "funded"
          currentR = 0
          peakR = 0
          daysToFundedList.push(daysTaken)
        }
      }
    }

    if (currentPhase === "funded" && !ruined) {
      if (!didGetFundedThisRun && account.currentPhase === "funded") {
        didGetFundedThisRun = true // Started funded
      }
    }

    if (didPassP1ThisRun || account.currentPhase !== "p1") {
      passedPhase1Count++
    }
    
    if (didGetFundedThisRun || account.currentPhase === "funded") {
      getFundedCount++
    }

    // Payout calculation at Dec 31
    if (currentPhase === "funded" && !ruined) {
      const fundedRiskPct = riskPerTradePctOfAccount.funded
      const usdProfit = currentR * (fundedRiskPct / 100) * account.accountSizeUsd
      if (usdProfit > 0) {
        payoutsUsdList.push(usdProfit * challengeRules.payoutSplitToTrader)
      } else {
        payoutsUsdList.push(0)
      }
    } else {
      payoutsUsdList.push(0)
    }

    drawdownsRList.push(maxDrawdownR)
  }

  // Calculate stats
  const sortAsc = (arr: number[]) => [...arr].sort((a, b) => a - b)
  const sortedPayouts = sortAsc(payoutsUsdList)
  const sortedDrawdowns = sortAsc(drawdownsRList)

  const getPercentile = (sortedArr: number[], p: number) => {
    if (sortedArr.length === 0) return 0
    const idx = Math.floor((sortedArr.length - 1) * (p / 100))
    return sortedArr[idx]
  }

  const avgDaysToFunded = daysToFundedList.length > 0 
    ? Math.round(daysToFundedList.reduce((a, b) => a + b, 0) / daysToFundedList.length)
    : 0

  const edgePerDayR = totalEdgeDaysCount > 0 ? Number((totalEdgePerDayR / totalEdgeDaysCount).toFixed(2)) : 0
  const edgePerDayUsdPhase1 = Math.round(edgePerDayR * (riskPerTradePctOfAccount.phase1 / 100) * account.accountSizeUsd)

  const breakevenGoodDayFractionPct = dayModel === "dayMix" 
    ? Math.round(((dayMix.dailyStopR * (1 - dayMix.probabilityFlatDay)) / (dayMix.goodDayTargetR + dayMix.dailyStopR)) * 100)
    : 0 // Only relevant for dayMix

  return {
    simulations,
    passPhase1Pct: Math.round((passedPhase1Count / simulations) * 100),
    getFundedPerAccountPct: Math.round((getFundedCount / simulations) * 100),
    blowUpRiskPct: Math.round((blowUpCount / simulations) * 100),
    avgTradingDaysToFunded: avgDaysToFunded,
    edgePerDayR,
    edgePerDayUsdPhase1,
    medianDeepestDrawdownR: Math.round(getPercentile(sortedDrawdowns, 50) * 10) / 10,
    takeHomeByDec31Usd: {
      p25: Math.round(getPercentile(sortedPayouts, 25)),
      median: Math.round(getPercentile(sortedPayouts, 50)),
      p75: Math.round(getPercentile(sortedPayouts, 75)),
      note: "funded-stage profit only, after the 80% split",
    },
    breakevenGoodDayFractionPct
  }
}
