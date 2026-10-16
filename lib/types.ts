// PROPSIM core types — challenge rule engine model

export type DrawdownType = "trailing" | "static" | "eod" | "intraday" | "hybrid"

export type Difficulty = "Easy" | "Moderate" | "Advanced" | "Expert"

export type TradeDirection = "long" | "short"

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

export const EXIT_TYPES = [
  "Take Profit Hit (TP)",
  "Stop Loss Hit (SL)",
  "Breakeven (BE)",
  "Early Profit Exit",
  "Early Loss Exit",
  "Trailing Stop Loss Hit",
  "Partial Profit Exit",
  "Manual Exit",
  "Time-Based Exit",
  "Other",
] as const

export type ExitType = (typeof EXIT_TYPES)[number]

export const POST_EXIT_RESULTS = [
  "Saved Me (Hit SL)",
  "Cost Me (Hit TP)",
  "Neutral",
] as const

export type PostExitResult = (typeof POST_EXIT_RESULTS)[number]

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
  plannedRisk?: number | null
  contracts: number
  pnl: number
  grossPnl?: number | null
  commission?: number
  plannedStopLoss?: number | null
  plannedTarget?: number | null
  plannedTargetUsd?: number | null
  plannedRR?: number | null
  plannedDuration?: string | null
  plannedExitRules?: string | null
  exitType?: ExitType | string | null
  postExitResult?: string | null
  netR?: number | null
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
  resultVsExpectation?: string
  expectedRR?: string
  outcome?: string
  mistakes?: string
  executionImprovement?: string
  lessonsLearned?: string
  psychologyNotes?: string
  setupQualityScore?: number
  entryQualityScore?: number
  exitQualityScore?: number
  riskScore?: number
  disciplineScore?: number
  confidenceScore?: number
  adverseExcursion?: number
  favorableExcursion?: number
  psychology?: {
    preFeeling?: string
    preNotes?: string
    checklistScore?: number
    convictionScore?: number
    riskAmount?: number
    rewardAmount?: number
    expectedValue?: number
    hesitated?: boolean
    movedStop?: boolean
    movedTarget?: boolean
    addedSize?: boolean
    emotionAffected?: boolean
    brokeRules?: boolean
    exitReason?: string
    executionGrade?: string
    psychologyGrade?: string
    riskGrade?: string
    complianceGrade?: string
    decisionScore?: number
  }
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

