import type { ChallengeAccount, ChallengeRules, Trade } from "./types"

export interface RuleStatus {
  // balances
  balance: number
  equity: number
  totalPnl: number
  dailyPnl: number
  // drawdown
  highestEquity: number
  drawdownFloor: number // equity level that triggers failure
  remainingDrawdown: number
  drawdownUsedPct: number
  // daily loss
  remainingDailyLoss: number
  dailyLossUsedPct: number
  // profit target
  profitTargetProgress: number // 0-100
  profitRemaining: number
  // contracts
  maxContractsUsed: number
  contractUsagePct: number
  // days
  tradingDays: number
  tradingDaysProgress: number // 0-100 toward min days
  // consistency
  consistencyPct: number // largest day / total profit
  consistencyOk: boolean
  largestWinningDay: number
  // status
  status: "active" | "passed" | "failed"
  violations: Violation[]
  // completion across all gates
  completionPct: number
}

export interface Violation {
  type:
    | "daily_loss"
    | "max_drawdown"
    | "trailing_drawdown"
    | "consistency"
    | "max_contracts"
    | "max_days"
  label: string
  detail: string
}

function groupByDay(trades: Trade[]): Map<number, Trade[]> {
  const m = new Map<number, Trade[]>()
  for (const t of trades) {
    const arr = m.get(t.day) ?? []
    arr.push(t)
    m.set(t.day, arr)
  }
  return m
}

/**
 * Core evaluation engine. Replays trades in order and applies all configured
 * rules. Nothing is hardcoded per firm — everything reads from ChallengeRules.
 */
export function evaluate(rules: ChallengeRules, trades: Trade[]): RuleStatus {
  const ordered = [...trades].sort((a, b) => a.timestamp - b.timestamp || a.day - b.day)

  const start = rules.startingBalance
  let balance = start
  let highestEquity = start
  const violations: Violation[] = []
  let failed = false

  const isTrailing = rules.drawdownType === "trailing" || rules.drawdownType === "intraday"
  const isHybrid = rules.drawdownType === "hybrid"

  // running drawdown floor
  // static/eod: floor fixed relative to start (eod recomputed at day close below)
  let trailingFloor = start - rules.maxDrawdown
  let staticFloor = start - rules.maxDrawdown

  // per-day accounting
  const byDay = groupByDay(ordered)
  const days = [...byDay.keys()].sort((a, b) => a - b)

  let maxContractsUsed = 0
  for (const t of ordered) maxContractsUsed = Math.max(maxContractsUsed, t.contracts)
  if (rules.maxContracts > 0 && maxContractsUsed > rules.maxContracts) {
    violations.push({
      type: "max_contracts",
      label: "Max contracts exceeded",
      detail: `Used ${maxContractsUsed} contracts, limit is ${rules.maxContracts}.`,
    })
    failed = true
  }

  let lastDayBalance = start

  for (const day of days) {
    const dayTrades = byDay.get(day)!
    let dayPnl = 0
    for (const t of dayTrades) {
      dayPnl += t.pnl
      balance += t.pnl
      const equityNow = balance
      if (equityNow > highestEquity) {
        highestEquity = equityNow
        if (isTrailing || isHybrid) {
          if (isHybrid) {
            trailingFloor = Math.min(start, highestEquity - rules.maxDrawdown)
          } else {
            const lockReached =
              rules.trailingLockProfit && rules.trailingLockProfit > 0 && highestEquity - start >= rules.trailingLockProfit
            trailingFloor = lockReached
              ? start // locked at breakeven once threshold met
              : highestEquity - rules.maxDrawdown
          }
        }
      }
      // intraday/trailing failure check after each trade
      if ((isTrailing || isHybrid) && balance <= trailingFloor && !failed) {
        violations.push({
          type: "trailing_drawdown",
          label: "Trailing drawdown breached",
          detail: `Equity fell to $${balance.toLocaleString()} on day ${day}, below trailing floor $${trailingFloor.toLocaleString()}.`,
        })
        failed = true
      }
      if (!isTrailing && !isHybrid && balance <= staticFloor && !failed) {
        violations.push({
          type: "max_drawdown",
          label: "Max drawdown breached",
          detail: `Equity fell to $${balance.toLocaleString()} on day ${day}, below floor $${staticFloor.toLocaleString()}.`,
        })
        failed = true
      }
    }

    // daily loss limit (checked on the day's net)
    if (rules.dailyLossLimit > 0 && dayPnl <= -rules.dailyLossLimit && !failed) {
      violations.push({
        type: "daily_loss",
        label: "Daily loss limit hit",
        detail: `Day ${day} lost $${Math.abs(dayPnl).toLocaleString()}, limit is $${rules.dailyLossLimit.toLocaleString()}.`,
      })
      failed = true
    }

    // EOD trailing: floor advances at day close based on end-of-day balance high
    if (rules.drawdownType === "eod") {
      const eodHigh = Math.max(lastDayBalance, balance)
      if (eodHigh > start) {
        staticFloor = Math.max(staticFloor, eodHigh - rules.maxDrawdown)
      }
    }
    lastDayBalance = balance
  }

  const totalPnl = balance - start
  const equity = balance

  // drawdown floor presented to UI
  const drawdownFloor = (isTrailing || isHybrid) ? trailingFloor : staticFloor
  const remainingDrawdown = Math.max(0, equity - drawdownFloor)
  const drawdownUsedPct = clampPct(100 - (remainingDrawdown / rules.maxDrawdown) * 100)

  // today's pnl = last day net
  const lastDay = days.length ? days[days.length - 1] : 0
  const dailyPnl = lastDay ? byDay.get(lastDay)!.reduce((s, t) => s + t.pnl, 0) : 0
  const remainingDailyLoss = rules.dailyLossLimit > 0 ? Math.max(0, rules.dailyLossLimit + Math.min(0, dailyPnl)) : 0
  const dailyLossUsedPct =
    rules.dailyLossLimit > 0 ? clampPct((Math.max(0, -dailyPnl) / rules.dailyLossLimit) * 100) : 0

  // profit target
  const profitTargetProgress = clampPct((totalPnl / rules.profitTarget) * 100)
  const profitRemaining = Math.max(0, rules.profitTarget - totalPnl)

  // consistency: largest winning day vs total profit
  let largestWinningDay = 0
  for (const day of days) {
    const net = byDay.get(day)!.reduce((s, t) => s + t.pnl, 0)
    if (net > largestWinningDay) largestWinningDay = net
  }
  const consistencyPct = totalPnl > 0 ? clampPct((largestWinningDay / totalPnl) * 100) : 0
  const consistencyOk = rules.consistencyPct === 0 || totalPnl <= 0 || consistencyPct <= rules.consistencyPct

  const tradingDays = days.length
  const tradingDaysProgress = rules.minTradingDays > 0 ? clampPct((tradingDays / rules.minTradingDays) * 100) : 100

  if (rules.maxTradingDays && tradingDays > rules.maxTradingDays && !failed) {
    violations.push({
      type: "max_days",
      label: "Max trading days exceeded",
      detail: `Used ${tradingDays} days, limit is ${rules.maxTradingDays}.`,
    })
    failed = true
  }

  // determine pass: target met, min days met, consistency ok, not failed
  const targetMet = totalPnl >= rules.profitTarget
  const daysMet = tradingDays >= rules.minTradingDays
  let status: RuleStatus["status"] = "active"
  if (failed) status = "failed"
  else if (targetMet && daysMet && consistencyOk) status = "passed"

  if (!consistencyOk && targetMet) {
    violations.push({
      type: "consistency",
      label: "Consistency rule not met",
      detail: `Largest day is ${consistencyPct.toFixed(0)}% of profit, max allowed is ${rules.consistencyPct}%.`,
    })
  }

  const contractUsagePct = rules.maxContracts > 0 ? clampPct((maxContractsUsed / rules.maxContracts) * 100) : 0

  // overall completion: weighted blend of the gates
  const completionPct = clampPct(
    profitTargetProgress * 0.6 + tradingDaysProgress * 0.25 + (consistencyOk ? 100 : 60) * 0.15,
  )

  return {
    balance,
    equity,
    totalPnl,
    dailyPnl,
    highestEquity,
    drawdownFloor,
    remainingDrawdown,
    drawdownUsedPct,
    remainingDailyLoss,
    dailyLossUsedPct,
    profitTargetProgress,
    profitRemaining,
    maxContractsUsed,
    contractUsagePct,
    tradingDays,
    tradingDaysProgress,
    consistencyPct,
    consistencyOk,
    largestWinningDay,
    status,
    violations,
    completionPct,
  }
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/** Build the equity curve points for charts (one point per trade + start). */
export function equityCurve(account: ChallengeAccount, trades: Trade[]) {
  const ordered = [...trades].sort((a, b) => a.timestamp - b.timestamp)
  let bal = account.rules.startingBalance
  let high = bal
  const points: { idx: number; balance: number; floor: number; label: string }[] = [
    { idx: 0, balance: bal, floor: bal - account.rules.maxDrawdown, label: "Start" },
  ]
  const isTrailing = account.rules.drawdownType === "trailing" || account.rules.drawdownType === "intraday"
  const isHybrid = account.rules.drawdownType === "hybrid"
  ordered.forEach((t, i) => {
    bal += t.pnl
    if (bal > high) high = bal
    let floor = account.rules.startingBalance - account.rules.maxDrawdown
    if (isTrailing) floor = high - account.rules.maxDrawdown
    if (isHybrid) floor = Math.min(account.rules.startingBalance, high - account.rules.maxDrawdown)
    points.push({ idx: i + 1, balance: Math.round(bal), floor: Math.round(floor), label: `#${i + 1}` })
  })
  return points
}
