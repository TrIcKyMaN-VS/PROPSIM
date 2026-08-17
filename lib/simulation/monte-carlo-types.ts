export interface AccountInputs {
  accountSizeUsd: number
  currentPhase: "p1" | "p2" | "funded"
  currentNetPctInPhase: number
  tradingDaysLeftThisYear: number
  numberOfAccounts: 1 | 2
}

export interface ChallengeRulesInputs {
  phase1TargetPct: number
  phase2TargetPct: number
  maxOverallLossPct: number
  dailyLossLimitPct: number
  payoutSplitToTrader: number
}

export interface RiskPerTradeInputs {
  phase1: number
  phase2: number
  funded: number
}

export interface DayMixInputs {
  goodDayTargetR: number
  dailyStopR: number
  probabilityGoodDay: number
  probabilityFlatDay: number
  probabilityBadDay: number
  bankGoodDays: boolean
}

export interface WithinDayInputs {
  winRate: number
  rewardRisk: number
  dailyCeilingR: number
  dailyFloorR: number
  bankGoodDays: boolean
}

export interface MonteCarloInputs {
  account: AccountInputs
  challengeRules: ChallengeRulesInputs
  riskPerTradePctOfAccount: RiskPerTradeInputs
  dayModel: "dayMix" | "withinDay"
  dayMix: DayMixInputs
  withinDay: WithinDayInputs
  // Internals for the worker
  simulations: number
}

export interface SavedSimulation {
  id: string
  name: string
  date: string
  type: "manual" | "historical"
  inputs: MonteCarloInputs
  stats: MonteCarloStats
}

export interface TakeHomeUsd {
  p25: number
  median: number
  p75: number
  note: string
}

export interface MonteCarloStats {
  simulations: number
  passPhase1Pct: number
  getFundedPerAccountPct: number
  blowUpRiskPct: number
  avgTradingDaysToFunded: number
  edgePerDayR: number
  edgePerDayUsdPhase1: number
  medianDeepestDrawdownR: number
  takeHomeByDec31Usd: TakeHomeUsd
  breakevenGoodDayFractionPct: number
}

