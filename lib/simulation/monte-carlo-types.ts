export interface MonteCarloInputs {
  startingBalance: number
  winRate: number // 0 to 100
  avgRR: number
  riskPct: number // 0 to 10
  numTrades: number
  simCount: number
  // Optional / Prop Firm Rules
  dailyLossLimit?: number
  maxDrawdownLimit?: number
  profitTarget?: number
  commission?: number
  slippage?: number
  minTradingDays?: number
  consistencyPct?: number
  drawdownType?: string
}

export interface SavedSimulation {
  id: string
  name: string
  date: string
  type: "manual" | "historical"
  inputs: MonteCarloInputs
  stats: MonteCarloStats
}

export interface MonteCarloStats {
  expectedReturn: number
  medianReturn: number
  averageReturn: number
  bestCaseReturn: number
  worstCaseReturn: number
  expectedDrawdown: number
  maxDrawdown: number
  averageDrawdown: number
  probProfit: number
  probLoss: number
  probPassing: number
  probFailure: number
  probRuin: number
  longestLosingStreak: number
  longestWinningStreak: number
  averageMonthlyReturn: number
  recoveryFactor: number
  profitFactor: number
  expectedEquityCurve: number[] // median curve
  confidenceInterval95Lower: number[] // 5th percentile
  confidenceInterval95Upper: number[] // 95th percentile
  tradeExpectancy: number
  riskOfRuin: number
  drawdownCurve: number[] // median drawdown curve
  returnHistogram: { bin: string; count: number; countPct: number }[]
  winningStreakDistribution: { length: number; probability: number }[]
  losingStreakDistribution: { length: number; probability: number }[]
  riskRecommendations?: {
    riskPct: number
    survivalProb: number
    expectedReturn: number
    expectedDrawdown: number
    passProb: number
  }[]
  isNegativeEdge?: boolean
}
