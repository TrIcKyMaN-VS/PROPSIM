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
  drawdownLimit: number
  drawdownUsed: number
  drawdownRemaining: number
  // daily loss
  remainingDailyLoss: number
  dailyLossUsedPct: number
  dailyLossUsed: number
  // profit target
  profitTargetProgress: number // 0-100
  profitRemaining: number
  // contracts
  maxContractsUsed: number
  contractUsagePct: number
  maxAllowedContracts: number
  maxConcurrentContracts: number
  currentOpenContracts: number
  largestPositionSizeReached: number
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
    | "news"
    | "trading_hours"
  label: string
  detail: string
  tradeId?: string
  accountId?: string
  allowedValue?: number
  actualValue?: number
  timestamp?: number
  severity?: "SOFT" | "HARD"
  dataSource?: "REAL_TIMESTAMPS" | "ESTIMATED_TIMESTAMPS"
}

/**
 * Groups trades by their EST calendar date, derived from t.timestamp.
 * We deliberately avoid using t.day because the NinjaTrader sync route
 * defaults every imported trade to day:1 until reindexTradeDays corrects it.
 * Grouping by timestamp makes the rule engine robust to stale t.day values.
 */
function groupByDay(trades: Trade[]): Map<string, Trade[]> {
  const m = new Map<string, Trade[]>()
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  for (const t of trades) {
    const dateStr = fmt.format(new Date(t.timestamp))
    const arr = m.get(dateStr) ?? []
    arr.push(t)
    m.set(dateStr, arr)
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

  // per-day accounting — keyed by EST date string for correctness
  const byDay = groupByDay(ordered)
  const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b))

  // Timeline event sweep for overlapping contracts
  const timelineEvents: { time: number; type: "entry" | "exit"; contracts: number; trade: Trade }[] = []
  for (const t of ordered) {
    const entryTime = Number(t.timestamp)
    // If exitTime is missing, do not fabricate a 60s duration. Set exitTime to entryTime.
    const exitTime = t.exitTime ? Number(t.exitTime) : entryTime
    timelineEvents.push({ time: entryTime, type: "entry", contracts: t.contracts, trade: t })
    timelineEvents.push({ time: exitTime, type: "exit", contracts: t.contracts, trade: t })
  }

  // Sort events: exit events processed first if times are identical
  timelineEvents.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time
    return a.type === "exit" ? -1 : 1
  })

  let currentOpenContracts = 0
  let maxConcurrentContracts = 0
  let triggeringTradeForContracts: Trade | null = null
  let maxContractsUsed = 0
  let peakHasEstimated = false
  const activeTradesMap = new Map<string, Trade>()

  for (const ev of timelineEvents) {
    if (ev.type === "entry") {
      currentOpenContracts += ev.contracts
      maxContractsUsed = Math.max(maxContractsUsed, ev.contracts)
      activeTradesMap.set(ev.trade.id, ev.trade)
      
      if (currentOpenContracts > maxConcurrentContracts) {
        maxConcurrentContracts = currentOpenContracts
        peakHasEstimated = false
        for (const t of activeTradesMap.values()) {
          if (!t.exitTime || t.timingIncomplete) {
            peakHasEstimated = true
          }
        }
      }

      if (rules.maxContracts > 0 && currentOpenContracts > rules.maxContracts && !triggeringTradeForContracts) {
        triggeringTradeForContracts = ev.trade
      }
    } else {
      currentOpenContracts -= ev.contracts
      activeTradesMap.delete(ev.trade.id)
    }
  }

  currentOpenContracts = Math.max(0, currentOpenContracts)

  // Enforce contract size limits
  if (rules.maxContracts > 0 && maxConcurrentContracts > rules.maxContracts) {
    const dataSource = peakHasEstimated ? "ESTIMATED_TIMESTAMPS" : "REAL_TIMESTAMPS"
    
    // Safeguard: contract-limit failures must never be generated from estimated durations
    if (dataSource === "REAL_TIMESTAMPS") {
      violations.push({
        type: "max_contracts",
        label: "Contracts limit exceeded",
        detail: `Active position size reached ${maxConcurrentContracts} contracts (max concurrent limit: ${rules.maxContracts}). Data Source: ${dataSource}.`,
        tradeId: triggeringTradeForContracts?.id,
        allowedValue: rules.maxContracts,
        actualValue: maxConcurrentContracts,
        timestamp: triggeringTradeForContracts ? Number(triggeringTradeForContracts.timestamp) : Date.now(),
        severity: "HARD",
        dataSource
      })
      failed = true
    } else {
      violations.push({
        type: "max_contracts",
        label: "Contracts limit warning",
        detail: `Active position size reached ${maxConcurrentContracts} contracts (max concurrent limit: ${rules.maxContracts}) but calculation contains estimated durations. Data Source: ${dataSource}.`,
        tradeId: triggeringTradeForContracts?.id,
        allowedValue: rules.maxContracts,
        actualValue: maxConcurrentContracts,
        timestamp: triggeringTradeForContracts ? Number(triggeringTradeForContracts.timestamp) : Date.now(),
        severity: "SOFT",
        dataSource
      })
    }
  }

  let lastDayBalance = start

  for (const day of days) {
    const dayTrades = byDay.get(day)!
    let dayPnl = 0
    for (const t of dayTrades) {
      // 1. Intraday open equity trailing drawdown simulation
      // MAE/MFE excursions fallback to trade close pnl if not logged
      const mfe = (t as any).favorableExcursion ?? (t.pnl > 0 ? t.pnl : 0)
      const mae = (t as any).adverseExcursion ?? (t.pnl < 0 ? t.pnl : 0)

      const peakOpenEquity = balance + mfe
      if (peakOpenEquity > highestEquity) {
        highestEquity = peakOpenEquity
        if (isTrailing || isHybrid) {
          if (isHybrid) {
            trailingFloor = Math.min(start, highestEquity - rules.maxDrawdown)
          } else {
            const lockReached =
              rules.trailingLockProfit && rules.trailingLockProfit > 0 && highestEquity - start >= rules.trailingLockProfit
            trailingFloor = lockReached
              ? start
              : highestEquity - rules.maxDrawdown
          }
        }
      }

      const worstOpenEquity = balance + mae
      if ((isTrailing || isHybrid) && worstOpenEquity <= trailingFloor && !failed) {
        violations.push({
          type: "trailing_drawdown",
          label: "Intraday Trailing Drawdown breached",
          detail: `Open equity fell to $${worstOpenEquity.toLocaleString()} (MAE: $${mae.toLocaleString()}) on day ${day}, below trailing floor $${trailingFloor.toLocaleString()}.`,
          tradeId: t.id,
          allowedValue: rules.maxDrawdown,
          actualValue: Math.round(highestEquity - worstOpenEquity),
          timestamp: Number(t.timestamp),
          severity: "HARD"
        })
        failed = true
      }
      if (!isTrailing && !isHybrid && worstOpenEquity <= staticFloor && !failed) {
        violations.push({
          type: "max_drawdown",
          label: "Max drawdown breached (Intraday)",
          detail: `Open equity fell to $${worstOpenEquity.toLocaleString()} (MAE: $${mae.toLocaleString()}) on day ${day}, below floor $${staticFloor.toLocaleString()}.`,
          tradeId: t.id,
          allowedValue: rules.maxDrawdown,
          actualValue: Math.round(highestEquity - worstOpenEquity),
          timestamp: Number(t.timestamp),
          severity: "HARD"
        })
        failed = true
      }

      // 2. Realize closing PnL
      dayPnl += t.pnl
      balance += t.pnl

      // 3. Post-close peak updates
      if (balance > highestEquity) {
        highestEquity = balance
        if (isTrailing || isHybrid) {
          if (isHybrid) {
            trailingFloor = Math.min(start, highestEquity - rules.maxDrawdown)
          } else {
            const lockReached =
              rules.trailingLockProfit && rules.trailingLockProfit > 0 && highestEquity - start >= rules.trailingLockProfit
            trailingFloor = lockReached
              ? start
              : highestEquity - rules.maxDrawdown
          }
        }
      }

      // 4. Executable Node Rules flow graph interpreter
      const customRuleSet = (rules as any).customRuleSet
      if (customRuleSet && customRuleSet.nodes) {
        const nodes = customRuleSet.nodes
        const edges = customRuleSet.edges
        const conditionNodes = nodes.filter((n: any) => n.data?.config?.type)
        const actionNodes = nodes.filter((n: any) => n.data?.config?.action)

        const evalOp = (a: number, op: string, b: number) => {
          if (op === ">") return a > b
          if (op === "<") return a < b
          if (op === "=" || op === "==") return a === b
          if (op === ">=") return a >= b
          if (op === "<=") return a <= b
          return false
        }

        for (const condNode of conditionNodes) {
          const config = condNode.data.config
          const paramType = config.type
          const op = config.operator || ">"
          const val = Number(config.value) || 0

          let triggered = false

          if (paramType === "Daily Loss") {
            triggered = evalOp(Math.abs(Math.min(0, dayPnl)), op, val)
          } else if (paramType === "Total Drawdown") {
            const dd = highestEquity - balance
            triggered = evalOp(dd, op, val)
          } else if (paramType === "Profit Target") {
            const profit = balance - start
            triggered = evalOp(profit, op, val)
          } else if (paramType === "Max Contracts") {
            triggered = evalOp(t.contracts, op, val)
          } else if (paramType === "Max Trades") {
            triggered = evalOp(dayTrades.length, op, val)
          } else if (paramType === "Trading Hours") {
            const date = new Date(Number(t.timestamp))
            const estTimeStr = date.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false })
            if (config.value && config.value.includes("-")) {
              const [startStr, endStr] = config.value.split("-")
              const isInside = estTimeStr >= startStr.trim() && estTimeStr <= endStr.trim()
              triggered = op === "<" || op === "!=" ? isInside : !isInside
            }
          } else if (paramType === "News Event") {
            const newsEvents = (rules as any).newsEvents || []
            const tradeTime = Number(t.timestamp)
            const closeEvent = newsEvents.find((ne: any) => {
              const neTime = new Date(ne.timestamp).getTime()
              return Math.abs(tradeTime - neTime) <= 2 * 60 * 1000
            })
            triggered = !!closeEvent
          }

          if (triggered) {
            const connectedEdges = edges.filter((e: any) => e.source === condNode.id)
            for (const edge of connectedEdges) {
              const actNode = actionNodes.find((n: any) => n.id === edge.target)
              if (actNode) {
                const action = actNode.data.config.action
                if (action === "Fail Challenge") {
                  violations.push({
                    type: "trailing_drawdown",
                    label: "Custom Node Breach: Fail Challenge",
                    detail: `Triggered by "${condNode.data.label}" -> "${actNode.data.label}" on day ${day}.`,
                    tradeId: t.id,
                    timestamp: Number(t.timestamp),
                    severity: "HARD"
                  })
                  failed = true
                } else if (action === "Warning") {
                  violations.push({
                    type: "consistency",
                    label: "Custom Node Warning",
                    detail: `Triggered by "${condNode.data.label}" -> "${actNode.data.label}" on day ${day}.`,
                    tradeId: t.id,
                    timestamp: Number(t.timestamp),
                    severity: "SOFT"
                  })
                } else if (action === "Block Trade" || action === "Lock Account") {
                  violations.push({
                    type: "max_contracts",
                    label: `Custom Node Violation: ${action}`,
                    detail: `Triggered by "${condNode.data.label}" on day ${day}.`,
                    tradeId: t.id,
                    timestamp: Number(t.timestamp),
                    severity: "HARD"
                  })
                  failed = true
                } else if (action === "Reduce Position Size") {
                  violations.push({
                    type: "max_contracts",
                    label: "Custom Node: Size Reduction Warning",
                    detail: `Triggered by "${condNode.data.label}" on day ${day}.`,
                    tradeId: t.id,
                    timestamp: Number(t.timestamp),
                    severity: "SOFT"
                  })
                }
              }
            }
          }
        }
      }
    }

    // Intraday daily loss limit breach check
    if (rules.dailyLossLimit > 0 && !failed) {
      let runningDayPnl = 0
      for (const dt of dayTrades) {
        runningDayPnl += dt.pnl
        if (runningDayPnl <= -rules.dailyLossLimit) {
          violations.push({
            type: "daily_loss",
            label: "Intraday Daily Loss Limit hit",
            detail: `Intraday day loss reached $${Math.abs(runningDayPnl).toLocaleString()}, breaching daily loss limit of $${rules.dailyLossLimit.toLocaleString()}.`,
            tradeId: dt.id,
            allowedValue: rules.dailyLossLimit,
            actualValue: Math.abs(runningDayPnl),
            timestamp: Number(dt.timestamp),
            severity: "HARD"
          })
          failed = true
          break
        }
      }
    }

    // EOD trailing: floor advances at day close based on end-of-day balance high
    if (rules.drawdownType === "eod") {
      const eodHigh = Math.max(lastDayBalance, balance)
      if (eodHigh > start) {
        staticFloor = Math.max(staticFloor, eodHigh - rules.maxDrawdown)
      }
      // EOD Drawdown failure post-check evaluation
      if (balance <= staticFloor && !failed) {
        violations.push({
          type: "max_drawdown",
          label: "EOD Drawdown breached at day close",
          detail: `Day close balance $${balance.toLocaleString()} fell below updated EOD drawdown floor $${staticFloor.toLocaleString()}.`,
          allowedValue: rules.maxDrawdown,
          actualValue: Math.round(eodHigh - balance),
          severity: "HARD"
        })
        failed = true
      }
    }
    lastDayBalance = balance
  }

  const totalPnl = balance - start
  const equity = balance

  // drawdown floor presented to UI
  const drawdownFloor = (isTrailing || isHybrid) ? trailingFloor : staticFloor
  const remainingDrawdown = Math.max(0, equity - drawdownFloor)
  const maxDD = rules.maxDrawdown || 1 // Avoid division by zero
  const drawdownUsedPct = clampPct(100 - (remainingDrawdown / maxDD) * 100)

  // today's pnl = last day net (days are EST date strings like "08/12/2026")
  const lastDay = days.length ? days[days.length - 1] : null
  const dailyPnl = lastDay ? byDay.get(lastDay)!.reduce((s, t) => s + t.pnl, 0) : 0
  const remainingDailyLoss = rules.dailyLossLimit > 0 ? Math.max(0, rules.dailyLossLimit + dailyPnl) : 0
  const dailyLossLimitVal = rules.dailyLossLimit || 1 // Avoid division by zero
  const dailyLossUsedPct =
    rules.dailyLossLimit > 0 ? clampPct((Math.max(0, -dailyPnl) / dailyLossLimitVal) * 100) : 0

  const drawdownLimit = drawdownFloor
  const drawdownUsed = Math.max(0, highestEquity - balance)
  const dailyLossUsed = Math.max(0, -dailyPnl)

  // profit target
  const profitTargetVal = rules.profitTarget || 1 // Avoid division by zero
  const profitTargetProgress = clampPct((totalPnl / profitTargetVal) * 100)
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
  const minTradingDaysVal = rules.minTradingDays || 1 // Avoid division by zero
  const tradingDaysProgress = rules.minTradingDays > 0 ? clampPct((tradingDays / minTradingDaysVal) * 100) : 100

  // determine pass: target met, min days met, consistency ok, not failed
  const hasHardViolation = violations.some(v => v.severity === "HARD")
  const targetMet = totalPnl >= rules.profitTarget
  const daysMet = tradingDays >= rules.minTradingDays
  let status: RuleStatus["status"] = "active"
  if (hasHardViolation) status = "failed"
  else if (targetMet && daysMet && consistencyOk) status = "passed"

  const maxContractsVal = rules.maxContracts || 1 // Avoid division by zero
  const contractUsagePct = rules.maxContracts > 0 ? clampPct((maxContractsUsed / maxContractsVal) * 100) : 0

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
    drawdownLimit,
    drawdownUsed,
    drawdownRemaining: remainingDrawdown,
    remainingDailyLoss,
    dailyLossUsedPct,
    dailyLossUsed,
    profitTargetProgress,
    profitRemaining,
    maxContractsUsed,
    contractUsagePct,
    maxAllowedContracts: rules.maxContracts,
    maxConcurrentContracts,
    currentOpenContracts,
    largestPositionSizeReached: maxContractsUsed,
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
    if (isTrailing) {
      const lockReached = account.rules.trailingLockProfit && account.rules.trailingLockProfit > 0 && high - account.rules.startingBalance >= account.rules.trailingLockProfit
      floor = lockReached ? account.rules.startingBalance : high - account.rules.maxDrawdown
    }
    if (isHybrid) floor = Math.min(account.rules.startingBalance, high - account.rules.maxDrawdown)
    points.push({ idx: i + 1, balance: Math.round(bal), floor: Math.round(floor), label: `#${i + 1}` })
  })
  return points
}
