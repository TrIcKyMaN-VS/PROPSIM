// PROPSIM core types — challenge rule engine model

export type DrawdownType = "trailing" | "static" | "eod" | "intraday" | "hybrid"

export type Difficulty = "Easy" | "Moderate" | "Advanced" | "Expert"

export interface ChallengeRules {
  startingBalance: number
  profitTarget: number
  /** max loss allowed in a single trading day (absolute $) */
  dailyLossLimit: number
  /** total drawdown allowance (absolute $) */
  maxDrawdown: number
  drawdownType: DrawdownType
  /** trailing drawdown stops trailing once locked at this profit (0 = never locks) */
  trailingLockProfit?: number
  maxContracts: number
  minTradingDays: number
  maxTradingDays?: number
  /** highest winning day cannot exceed this % of total profit (0 = no rule) */
  consistencyPct: number
}

export interface ChallengeSize {
  label: string
  rules: ChallengeRules
  price: number
}

export interface PropFirm {
  id: string
  name: string
  shortName: string
  tagline: string
  color: string
  drawdownType: DrawdownType
  difficulty: Difficulty
  difficultyScore: number
  successRate: number
  payoutSpeed: string
  pros: string[]
  cons: string[]
  challengeTypes: string[]
  sizes: ChallengeSize[]
}

export type TradeDirection = "long" | "short"

export interface Trade {
  id: string
  accountId: string
  instrument: string
  direction: TradeDirection
  entry: number
  exit: number
  stopLoss?: number
  takeProfit?: number
  riskAmount?: number
  contracts: number
  pnl: number
  calculatedPnl?: number | null
  pnlMode?: string
  day: number // trading day index (1-based)
  timestamp: number
  exitTime?: number
  timingIncomplete?: boolean
  session: "Asia" | "London" | "New York AM" | "New York PM"
  notes?: string
  tags?: string[]
  playbookId?: string
  playbookName?: string
  playbookChecklist?: Record<string, boolean>
  tradeIdea?: string
  marketBias?: string
  reasonForEntry?: string
  expectedRR?: string
  outcome?: string
  mistakes?: string
  lessonsLearned?: string
  psychologyNotes?: string
  setupQualityScore?: number
  entryQualityScore?: number
  exitQualityScore?: number
  riskScore?: number
  disciplineScore?: number
  screenshots?: any[]
}

export type AccountStatus = "active" | "passed" | "failed"

export interface ChallengeAccount {
  id: string
  firmId: string
  sizeLabel: string
  rules: ChallengeRules
  createdAt: number
  status: AccountStatus
  failReason?: string
  challengeType?: "OFFICIAL" | "CUSTOM"
  customOverrides?: Record<string, any> | null
  baseRules?: ChallengeRules | null
  name?: string | null
  brokerAccountName?: string | null
  failureAt?: number | string | Date | null
  failureSnapshot?: string | null
  archivedAt?: number | string | Date | null
}
