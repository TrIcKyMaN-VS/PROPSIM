// Monte Carlo Simulator Web Worker
import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"

const ctx: Worker = self as any

ctx.onmessage = (event: MessageEvent) => {
  const { type, inputs, historicalTradePnlPcts } = event.data

  if (type === "run") {
    try {
      const stats = runMonteCarlo(inputs, historicalTradePnlPcts)
      ctx.postMessage({ type: "complete", stats })
    } catch (error: any) {
      ctx.postMessage({ type: "error", error: error.message || String(error) })
    }
  }
}

function runMonteCarlo(
  inputs: MonteCarloInputs,
  historicalTradePnlPcts?: number[]
): MonteCarloStats {
  const {
    startingBalance,
    winRate,
    avgRR,
    riskPct,
    numTrades,
    simCount,
    dailyLossLimit = 0,
    maxDrawdownLimit = 0,
    profitTarget = 0,
    commission = 0,
    slippage = 0,
    minTradingDays = 0,
    consistencyPct = 0,
    drawdownType = "static",
  } = inputs

  const isBootstrap = !!(historicalTradePnlPcts && historicalTradePnlPcts.length > 0)
  const runs: {
    finalBalance: number
    maxDrawdownPct: number
    maxDrawdownAbsolute: number
    ruined: boolean
    passed: boolean
    winningStreak: number
    losingStreak: number
    equityCurve: number[]
    drawdownCurve: number[]
  }[] = []

  // Estimate trades per day from history or default to 2
  const tradesPerDay = 2

  for (let s = 0; s < simCount; s++) {
    // Send progress report every 10%
    if (s > 0 && s % Math.floor(simCount / 10) === 0) {
      ctx.postMessage({ type: "progress", progress: Math.round((s / simCount) * 100) })
    }

    let balance = startingBalance
    let peakBalance = startingBalance
    let maxDrawdownAbs = 0
    let maxDrawdownP = 0
    let ruined = false
    let passed = false

    const equityCurve = [startingBalance]
    const drawdownCurve = [0]

    let currentWinStreak = 0
    let currentLossStreak = 0
    let maxWinStreak = 0
    let maxLossStreak = 0

    // To check daily loss limit, we group trades by day
    let currentDayPnl = 0
    let currentDayTrades = 0
    let tradingDaysCompleted = 0

    // Drawdown floors
    let drawdownFloor = maxDrawdownLimit > 0 ? startingBalance - maxDrawdownLimit : 0
    let lastDayBalance = startingBalance

    // Track daily payouts to check consistency rule
    const dailyPnls: number[] = []

    for (let t = 0; t < numTrades; t++) {
      if (ruined) {
        equityCurve.push(balance)
        drawdownCurve.push(drawdownCurve[drawdownCurve.length - 1])
        continue
      }

      let pnl = 0

      if (isBootstrap && historicalTradePnlPcts) {
        // Bootstrap: resample a trade PnL percentage
        const randIdx = Math.floor(Math.random() * historicalTradePnlPcts.length)
        const pnlPct = historicalTradePnlPcts[randIdx]
        pnl = balance * pnlPct
      } else {
        // Manual mode: simulate based on winRate and RR
        const isWin = Math.random() * 100 < winRate
        if (isWin) {
          pnl = balance * (riskPct / 100) * avgRR
        } else {
          pnl = -balance * (riskPct / 100)
        }
      }

      // Apply slippage and commission
      pnl -= (commission + slippage)

      balance += pnl
      currentDayPnl += pnl
      currentDayTrades++

      // Streaks
      if (pnl > 0) {
        currentWinStreak++
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak)
        currentLossStreak = 0
      } else {
        currentLossStreak++
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
        currentWinStreak = 0
      }

      // Track Peak and Drawdowns
      if (balance > peakBalance) {
        peakBalance = balance
      }

      const drawdownAbs = Math.max(0, peakBalance - balance)
      const drawdownP = peakBalance > 0 ? (drawdownAbs / peakBalance) * 100 : 0

      maxDrawdownAbs = Math.max(maxDrawdownAbs, drawdownAbs)
      maxDrawdownP = Math.max(maxDrawdownP, drawdownP)

      equityCurve.push(balance)
      drawdownCurve.push(drawdownP)

      // Update drawdown floor dynamically based on drawdownType (trailing cap start balance)
      if (maxDrawdownLimit > 0) {
        if (drawdownType === "trailing" || drawdownType === "intraday") {
          const currentFloor = peakBalance - maxDrawdownLimit
          drawdownFloor = Math.max(drawdownFloor, Math.min(startingBalance, currentFloor))
        }
      }

      // Day End logic
      if (currentDayTrades >= tradesPerDay || t === numTrades - 1) {
        tradingDaysCompleted++
        dailyPnls.push(currentDayPnl)

        // Check Daily Loss Limit
        if (dailyLossLimit > 0 && currentDayPnl <= -dailyLossLimit) {
          ruined = true
        }

        // Update EOD drawdown floor
        if (maxDrawdownLimit > 0 && drawdownType === "eod") {
          const eodHigh = Math.max(lastDayBalance, balance)
          if (eodHigh > startingBalance) {
            drawdownFloor = Math.max(drawdownFloor, Math.min(startingBalance, eodHigh - maxDrawdownLimit))
          }
        }

        // Reset day counters
        currentDayPnl = 0
        currentDayTrades = 0
        lastDayBalance = balance
      }

      // Check drawdown ruin
      if (maxDrawdownLimit > 0 && balance <= drawdownFloor) {
        ruined = true
      }
    }

    // Capture final streaks
    maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
    maxLossStreak = Math.max(maxLossStreak, currentLossStreak)

    // Check challenge completion (Pass/Fail)
    const netReturn = balance - startingBalance
    const passedTarget = profitTarget > 0 && netReturn >= profitTarget
    const respectedMinDays = minTradingDays > 0 ? tradingDaysCompleted >= minTradingDays : true

    // Consistency rule check: largest daily profit cannot exceed X% of total profit
    let consistencyOk = true
    if (consistencyPct > 0 && netReturn > 0) {
      const maxDailyProfit = Math.max(0, ...dailyPnls)
      const pct = (maxDailyProfit / netReturn) * 100
      if (pct > consistencyPct) {
        consistencyOk = false
      }
    }

    if (passedTarget && respectedMinDays && consistencyOk && !ruined) {
      passed = true
    }

    runs.push({
      finalBalance: balance,
      maxDrawdownPct: maxDrawdownP,
      maxDrawdownAbsolute: maxDrawdownAbs,
      ruined,
      passed,
      winningStreak: maxWinStreak,
      losingStreak: maxLossStreak,
      equityCurve,
      drawdownCurve,
    })
  }

  // Compile statistics
  const finalBalances = runs.map((r) => r.finalBalance)
  const returns = finalBalances.map((b) => b - startingBalance)
  const drawdowns = runs.map((r) => r.maxDrawdownPct)
  const drawdownsAbs = runs.map((r) => r.maxDrawdownAbsolute)
  const winStreaks = runs.map((r) => r.winningStreak)
  const lossStreaks = runs.map((r) => r.losingStreak)

  // Sort helper for percentiles
  const sortAsc = (arr: number[]) => [...arr].sort((a, b) => a - b)
  const sortedReturns = sortAsc(returns)
  const sortedDrawdowns = sortAsc(drawdowns)

  const getPercentile = (sortedArr: number[], p: number) => {
    const idx = Math.floor((sortedArr.length - 1) * (p / 100))
    return sortedArr[idx]
  }

  const average = (arr: number[]) => arr.reduce((sum, v) => sum + v, 0) / arr.length
  const median = (sortedArr: number[]) => getPercentile(sortedArr, 50)

  const ruinedRuns = runs.filter((r) => r.ruined)
  const passedRuns = runs.filter((r) => r.passed)
  const profitableRuns = runs.filter((r) => r.finalBalance > startingBalance)

  // Calculate Median/Percentile Equity and Drawdown Curves across all simulations at each trade index
  const expectedEquityCurve: number[] = []
  const confidenceInterval95Lower: number[] = []
  const confidenceInterval95Upper: number[] = []
  const medianDrawdownCurve: number[] = []

  for (let t = 0; t <= numTrades; t++) {
    const tradeBalances = runs.map((r) => r.equityCurve[t])
    const sortedTradeBalances = sortAsc(tradeBalances)
    expectedEquityCurve.push(getPercentile(sortedTradeBalances, 50))
    // 95% Confidence Interval uses 2.5% and 97.5% bounds
    confidenceInterval95Lower.push(getPercentile(sortedTradeBalances, 2.5))
    confidenceInterval95Upper.push(getPercentile(sortedTradeBalances, 97.5))

    const tradeDrawdowns = runs.map((r) => r.drawdownCurve[t])
    const sortedTradeDrawdowns = sortAsc(tradeDrawdowns)
    medianDrawdownCurve.push(getPercentile(sortedTradeDrawdowns, 50))
  }

  // Create return histogram (20 bins)
  const minReturn = sortedReturns[0]
  const maxReturn = sortedReturns[sortedReturns.length - 1]
  const binWidth = (maxReturn - minReturn) / 20 || 1
  const returnHistogram: { bin: string; count: number; countPct: number }[] = []

  for (let i = 0; i < 20; i++) {
    const binStart = minReturn + i * binWidth
    const binEnd = binStart + binWidth
    const count = returns.filter((r) => r >= binStart && r < binEnd).length
    const label = `${Math.round(binStart / 100) * 100} to ${Math.round(binEnd / 100) * 100}`
    returnHistogram.push({
      bin: label,
      count,
      countPct: (count / simCount) * 100,
    })
  }

  // Create streak probability distributions (up to 15)
  const winningStreakDistribution: { length: number; probability: number }[] = []
  const losingStreakDistribution: { length: number; probability: number }[] = []

  for (let i = 1; i <= 15; i++) {
    const wCount = winStreaks.filter((s) => s >= i).length
    const lCount = lossStreaks.filter((s) => s >= i).length
    winningStreakDistribution.push({ length: i, probability: (wCount / simCount) * 100 })
    losingStreakDistribution.push({ length: i, probability: (lCount / simCount) * 100 })
  }

  const avgRet = average(returns)
  const avgDd = average(drawdowns)
  const avgDdAbs = average(drawdownsAbs)

  // Recovery factor = Average Return / Average Max Drawdown Absolute
  const recoveryFactor = avgRet / (avgDdAbs || 1)

  // Trade Expectancy
  let tradeExpectancy = 0
  if (isBootstrap && historicalTradePnlPcts) {
    tradeExpectancy = startingBalance * average(historicalTradePnlPcts)
  } else {
    const winProb = winRate / 100
    const lossProb = 1 - winProb
    const winAmt = startingBalance * (riskPct / 100) * avgRR
    const lossAmt = -startingBalance * (riskPct / 100)
    tradeExpectancy = (winProb * winAmt) + (lossProb * lossAmt)
  }

  // Profit Factor
  let profitFactor = 0
  if (isBootstrap && historicalTradePnlPcts) {
    const wins = historicalTradePnlPcts.filter((p) => p > 0)
    const losses = historicalTradePnlPcts.filter((p) => p < 0)
    const sumWins = wins.reduce((sum, v) => sum + v, 0)
    const sumLosses = Math.abs(losses.reduce((sum, v) => sum + v, 0))
    profitFactor = sumLosses > 0 ? sumWins / sumLosses : sumWins
  } else {
    const winProb = winRate / 100
    const lossProb = 1 - winProb
    const grossProfit = winProb * avgRR
    const grossLoss = lossProb * 1
    profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit
  }

  // 40 trades = 1 month (assuming 2 trades/day * 20 trading days/month)
  const averageMonthlyReturn = (avgRet / (numTrades / 40)) || 0

  const isNegativeEdge = tradeExpectancy <= 0 || profitFactor < 1

  return {
    expectedReturn: avgRet, // Statistical mean of all simulations
    medianReturn: median(sortedReturns), // Median kept separate
    averageReturn: avgRet,
    bestCaseReturn: getPercentile(sortedReturns, 97.5), // 97.5th percentile for 95% confidence bounds
    worstCaseReturn: getPercentile(sortedReturns, 2.5), // 2.5th percentile for 95% confidence bounds
    expectedDrawdown: median(sortedDrawdowns),
    maxDrawdown: sortedDrawdowns[sortedDrawdowns.length - 1],
    averageDrawdown: avgDd,
    probProfit: (profitableRuns.length / simCount) * 100,
    probLoss: ((simCount - profitableRuns.length) / simCount) * 100,
    probPassing: (passedRuns.length / simCount) * 100,
    probFailure: ((simCount - passedRuns.length) / simCount) * 100,
    probRuin: (ruinedRuns.length / simCount) * 100,
    longestLosingStreak: Math.max(...lossStreaks),
    longestWinningStreak: Math.max(...winStreaks),
    averageMonthlyReturn,
    recoveryFactor,
    profitFactor,
    expectedEquityCurve,
    confidenceInterval95Lower,
    confidenceInterval95Upper,
    tradeExpectancy,
    riskOfRuin: (ruinedRuns.length / simCount) * 100,
    drawdownCurve: medianDrawdownCurve,
    returnHistogram,
    winningStreakDistribution,
    losingStreakDistribution,
    isNegativeEdge,
    riskRecommendations: [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0].map(
      (r) => runSingleRiskSimulation(inputs, r, historicalTradePnlPcts, 300)
    ),
  }
}

function runSingleRiskSimulation(
  inputs: MonteCarloInputs,
  riskPct: number,
  historicalTradePnlPcts?: number[],
  simCount = 300
) {
  const {
    startingBalance,
    winRate,
    avgRR,
    numTrades,
    dailyLossLimit = 0,
    maxDrawdownLimit = 0,
    profitTarget = 0,
    commission = 0,
    slippage = 0,
    minTradingDays = 0,
    consistencyPct = 0,
    drawdownType = "static",
  } = inputs

  const isBootstrap = !!(historicalTradePnlPcts && historicalTradePnlPcts.length > 0)
  let ruinedCount = 0
  let passedCount = 0
  const returns: number[] = []
  const drawdowns: number[] = []

  const tradesPerDay = 2

  for (let s = 0; s < simCount; s++) {
    let balance = startingBalance
    let peakBalance = startingBalance
    let maxDrawdownP = 0
    let ruined = false

    let currentDayPnl = 0
    let currentDayTrades = 0
    let tradingDaysCompleted = 0
    const dailyPnls: number[] = []

    // Drawdown floors
    let drawdownFloor = maxDrawdownLimit > 0 ? startingBalance - maxDrawdownLimit : 0
    let lastDayBalance = startingBalance

    for (let t = 0; t < numTrades; t++) {
      if (ruined) break

      let pnl = 0
      if (isBootstrap && historicalTradePnlPcts) {
        const randIdx = Math.floor(Math.random() * historicalTradePnlPcts.length)
        const pnlPct = historicalTradePnlPcts[randIdx]
        const scaledPnlPct = pnlPct * (riskPct / (inputs.riskPct || 1))
        pnl = balance * scaledPnlPct
      } else {
        const isWin = Math.random() * 100 < winRate
        if (isWin) {
          pnl = balance * (riskPct / 100) * avgRR
        } else {
          pnl = -balance * (riskPct / 100)
        }
      }

      pnl -= (commission + slippage)
      balance += pnl
      currentDayPnl += pnl
      currentDayTrades++

      if (balance > peakBalance) {
        peakBalance = balance
      }

      const drawdownP = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0
      maxDrawdownP = Math.max(maxDrawdownP, drawdownP)

      // Update drawdown floor dynamically based on drawdownType (trailing cap start balance)
      if (maxDrawdownLimit > 0) {
        if (drawdownType === "trailing" || drawdownType === "intraday") {
          const currentFloor = peakBalance - maxDrawdownLimit
          drawdownFloor = Math.max(drawdownFloor, Math.min(startingBalance, currentFloor))
        }
      }

      if (currentDayTrades >= tradesPerDay || t === numTrades - 1) {
        tradingDaysCompleted++
        dailyPnls.push(currentDayPnl)
        if (dailyLossLimit > 0 && currentDayPnl <= -dailyLossLimit) {
          ruined = true
        }

        // Update EOD drawdown floor
        if (maxDrawdownLimit > 0 && drawdownType === "eod") {
          const eodHigh = Math.max(lastDayBalance, balance)
          if (eodHigh > startingBalance) {
            drawdownFloor = Math.max(drawdownFloor, Math.min(startingBalance, eodHigh - maxDrawdownLimit))
          }
        }

        currentDayPnl = 0
        currentDayTrades = 0
        lastDayBalance = balance
      }

      if (maxDrawdownLimit > 0 && balance <= drawdownFloor) {
        ruined = true
      }
    }

    if (ruined) {
      ruinedCount++
    }

    const netReturn = balance - startingBalance
    const passedTarget = profitTarget > 0 && netReturn >= profitTarget
    const respectedMinDays = minTradingDays > 0 ? tradingDaysCompleted >= minTradingDays : true
    
    let consistencyOk = true
    if (consistencyPct > 0 && netReturn > 0) {
      const maxDailyProfit = Math.max(0, ...dailyPnls)
      const pct = (maxDailyProfit / netReturn) * 100
      if (pct > consistencyPct) {
        consistencyOk = false
      }
    }

    if (passedTarget && respectedMinDays && consistencyOk && !ruined) {
      passedCount++
    }

    returns.push(netReturn)
    drawdowns.push(maxDrawdownP)
  }

  const sortedReturns = [...returns].sort((a, b) => a - b)
  const sortedDrawdowns = [...drawdowns].sort((a, b) => a - b)

  const medianVal = (sortedArr: number[]) => {
    const idx = Math.floor((sortedArr.length - 1) * 0.50)
    return sortedArr[idx]
  }

  return {
    riskPct,
    survivalProb: ((simCount - ruinedCount) / simCount) * 100,
    expectedReturn: medianVal(sortedReturns),
    expectedDrawdown: medianVal(sortedDrawdowns),
    passProb: (passedCount / simCount) * 100,
  }
}
