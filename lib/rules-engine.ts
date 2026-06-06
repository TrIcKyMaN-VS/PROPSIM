import { Trade, ChallengeAccount } from "./types"

export interface RuleViolation {
  id: string
  ruleName: string
  violationText: string
  severity: "warning" | "hard_stop" | "fail"
  timestamp: number
}

// Simulated active rules context for a given account
export interface ActiveRulesContext {
  dailyLossLimit: number
  maxDrawdown: number
  profitTarget: number
  maxContracts: number
  tradingHoursStart?: string // e.g., "09:30"
  tradingHoursEnd?: string   // e.g., "16:00"
  maxTradesPerDay?: number
  consecutiveLossesLimit?: number
  restrictedInstruments?: string[]
}

/**
 * Validates a trade against the active rules context and returns any violations.
 * In a real backend, this would evaluate the React Flow nodes logic directly.
 */
export function evaluateTradeAgainstRules(
  trade: Partial<Trade>, 
  context: ActiveRulesContext, 
  dailyStats: { currentLoss: number, currentTrades: number, consecutiveLosses: number }
): RuleViolation[] {
  
  const violations: RuleViolation[] = []

  // 1. Daily Loss Limit
  if (trade.pnl !== undefined && trade.pnl < 0) {
    const projectedLoss = dailyStats.currentLoss + Math.abs(trade.pnl)
    if (projectedLoss > context.dailyLossLimit) {
      violations.push({
        id: Math.random().toString(),
        ruleName: "Daily Loss Limit",
        violationText: `Trade resulted in exceeding the daily loss limit of $${context.dailyLossLimit}. Projected loss: $${projectedLoss}`,
        severity: "fail",
        timestamp: Date.now()
      })
    }
  }

  // 2. Max Contracts
  if (trade.contracts !== undefined && trade.contracts > context.maxContracts) {
    violations.push({
      id: Math.random().toString(),
      ruleName: "Max Contracts Exceeded",
      violationText: `Traded ${trade.contracts} contracts, which exceeds the limit of ${context.maxContracts}.`,
      severity: "hard_stop",
      timestamp: Date.now()
    })
  }

  // 3. Max Trades Per Day
  if (context.maxTradesPerDay !== undefined && dailyStats.currentTrades >= context.maxTradesPerDay) {
    violations.push({
      id: Math.random().toString(),
      ruleName: "Max Trades Limit",
      violationText: `Traded ${dailyStats.currentTrades + 1} times today. Limit is ${context.maxTradesPerDay}.`,
      severity: "warning",
      timestamp: Date.now()
    })
  }

  // 4. Consecutive Losses (Tilt Protection)
  if (context.consecutiveLossesLimit !== undefined && trade.pnl !== undefined && trade.pnl < 0) {
    if (dailyStats.consecutiveLosses + 1 >= context.consecutiveLossesLimit) {
      violations.push({
        id: Math.random().toString(),
        ruleName: "Tilt Protection Active",
        violationText: `Hit ${context.consecutiveLossesLimit} consecutive losses. Account locked for the day.`,
        severity: "hard_stop",
        timestamp: Date.now()
      })
    }
  }

  // 5. Restricted Instruments
  if (context.restrictedInstruments && trade.instrument) {
    if (context.restrictedInstruments.includes(trade.instrument)) {
      violations.push({
        id: Math.random().toString(),
        ruleName: "Restricted Instrument",
        violationText: `Traded ${trade.instrument}, which is not allowed under the current rule template.`,
        severity: "warning",
        timestamp: Date.now()
      })
    }
  }

  return violations
}

/**
 * Pre-defined Official Prop Firm Rules
 */
export const OFFICIAL_FIRM_TEMPLATES: Record<string, Record<string, ActiveRulesContext>> = {
  "Apex": {
    "25K": { dailyLossLimit: 1500, maxDrawdown: 1500, profitTarget: 1500, maxContracts: 2 },
    "50K": { dailyLossLimit: 2500, maxDrawdown: 2500, profitTarget: 3000, maxContracts: 10 },
    "100K": { dailyLossLimit: 3000, maxDrawdown: 3000, profitTarget: 6000, maxContracts: 14 }
  },
  "Topstep": {
    "25K": { dailyLossLimit: 500, maxDrawdown: 1000, profitTarget: 1500, maxContracts: 3 },
    "50K": { dailyLossLimit: 1000, maxDrawdown: 2000, profitTarget: 3000, maxContracts: 5 },
    "100K": { dailyLossLimit: 2000, maxDrawdown: 3000, profitTarget: 6000, maxContracts: 10 },
    "150K": { dailyLossLimit: 3000, maxDrawdown: 4500, profitTarget: 9000, maxContracts: 15 }
  },
  "Lucid": {
    "25K": { dailyLossLimit: 1000, maxDrawdown: 1500, profitTarget: 1500, maxContracts: 2 },
    "50K": { dailyLossLimit: 2000, maxDrawdown: 2500, profitTarget: 3000, maxContracts: 5 },
    "100K": { dailyLossLimit: 3000, maxDrawdown: 4000, profitTarget: 6000, maxContracts: 10 }
  }
}
