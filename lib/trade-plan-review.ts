import type { Trade } from "./types"

export function parseDurationToMinutes(durationStr?: string | null): number | null {
  if (!durationStr || typeof durationStr !== "string") return null
  const clean = durationStr.trim().toLowerCase()
  if (!clean) return null

  // Check for "X hour(s)" or "X h" or "X.Y hr"
  const hourMatch = clean.match(/^([\d.]+)\s*(h|hr|hrs|hour|hours)$/)
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1])
    return isNaN(hours) ? null : Math.round(hours * 60)
  }

  // Check for "X min(s)" or "X m"
  const minMatch = clean.match(/^([\d.]+)\s*(m|min|mins|minute|minutes)$/)
  if (minMatch) {
    const mins = parseFloat(minMatch[1])
    return isNaN(mins) ? null : Math.round(mins)
  }

  // Check for "Xh Ym" or "Xh Ymin"
  const comboMatch = clean.match(/^(\d+)\s*(?:h|hr|hrs|hour|hours)\s*(\d+)\s*(?:m|min|mins|minute|minutes)?$/)
  if (comboMatch) {
    const h = parseInt(comboMatch[1], 10)
    const m = parseInt(comboMatch[2], 10)
    return (h * 60) + m
  }

  // If just a raw number, assume minutes
  const rawNum = parseFloat(clean)
  if (!isNaN(rawNum) && rawNum > 0) {
    return Math.round(rawNum)
  }

  return null
}

export function formatMinutes(mins?: number | null): string {
  if (mins == null || isNaN(mins) || mins <= 0) return "--"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

export interface PlanVsActualEvaluation {
  hasPlan: boolean
  targetReached: boolean | null
  stopLossHit: boolean | null
  exitedBeforeTarget: boolean | null
  exitedBeforeDuration: boolean | null
  manuallyClosed: boolean
  movedStopLoss: boolean
  movedTarget: boolean
  actualDurationMinutes: number | null
  plannedDurationMinutes: number | null
  plannedRR: number | null
  actualR: number | null
  rDelta: number | null
  plannedRisk: number | null
  realizedPnl: number
  commission: number
  grossPnl: number
}

export function evaluatePlanVsActual(trade: Trade): PlanVsActualEvaluation {
  const isLong = trade.direction === "long"
  const entry = Number(trade.entry)
  const exit = Number(trade.exit)
  const grossPnl = Number(trade.grossPnl ?? (trade.pnl + (trade.commission ?? 0)))
  const commission = Number(trade.commission ?? 0)
  const netPnl = Number(trade.pnl)
  const plannedRisk = trade.plannedRisk != null && trade.plannedRisk > 0 ? trade.plannedRisk : null

  const plannedStop = trade.plannedStopLoss ?? trade.stopLoss ?? null
  const plannedTarget = trade.plannedTarget ?? trade.takeProfit ?? null
  const plannedDurationMin = parseDurationToMinutes(trade.plannedDuration)

  let actualDurationMin: number | null = null
  if (trade.timestamp && trade.exitTime && Number(trade.exitTime) > Number(trade.timestamp)) {
    actualDurationMin = Math.round((Number(trade.exitTime) - Number(trade.timestamp)) / 60000)
  }

  const hasPlan = Boolean(
    plannedStop != null ||
    plannedTarget != null ||
    plannedRisk != null ||
    plannedDurationMin != null ||
    trade.plannedExitRules ||
    trade.plannedTargetUsd != null ||
    trade.plannedRR != null
  )

  const exitType = trade.exitType || ""
  const isTpHit = exitType === "Take Profit Hit (TP)"
  const isSlHit = exitType === "Stop Loss Hit (SL)"
  const isManual = exitType === "Manual Exit" || exitType === "Early Profit Exit" || exitType === "Early Loss Exit"

  // 1. Target reached?
  let targetReached: boolean | null = null
  if (isTpHit) {
    targetReached = true
  } else if (plannedTarget != null && !isNaN(entry) && !isNaN(exit)) {
    if (isLong) {
      targetReached = exit >= plannedTarget
    } else {
      targetReached = exit <= plannedTarget
    }
  }

  // 2. Stop loss hit?
  let stopLossHit: boolean | null = null
  if (isSlHit) {
    stopLossHit = true
  } else if (plannedStop != null && !isNaN(entry) && !isNaN(exit)) {
    if (isLong) {
      stopLossHit = exit <= plannedStop
    } else {
      stopLossHit = exit >= plannedStop
    }
  }

  // 3. Exited before target?
  let exitedBeforeTarget: boolean | null = null
  if (plannedTarget != null) {
    if (targetReached === true) {
      exitedBeforeTarget = false
    } else if (netPnl > 0 && (exitType === "Early Profit Exit" || exitType === "Manual Exit" || exitType === "Breakeven (BE)")) {
      exitedBeforeTarget = true
    } else if (isLong && exit < plannedTarget) {
      exitedBeforeTarget = true
    } else if (!isLong && exit > plannedTarget) {
      exitedBeforeTarget = true
    }
  }

  // 4. Exited before holding duration?
  let exitedBeforeDuration: boolean | null = null
  if (plannedDurationMin != null && actualDurationMin != null) {
    exitedBeforeDuration = actualDurationMin < (plannedDurationMin * 0.85) // at least 15% shorter
  }

  // 5. Moved stop or target
  const movedStopLoss = Boolean(trade.psychology?.movedStop)
  const movedTarget = Boolean(trade.psychology?.movedTarget)

  // 6. R-Multiples
  const plannedRR = trade.plannedRR ?? (
    plannedStop && plannedTarget && Math.abs(entry - plannedStop) > 0
      ? Number((Math.abs(plannedTarget - entry) / Math.abs(entry - plannedStop)).toFixed(2))
      : null
  )
  const actualR = plannedRisk && plannedRisk > 0 ? Number((netPnl / plannedRisk).toFixed(2)) : (trade.netR ?? null)
  const rDelta = actualR != null && plannedRR != null ? Number((actualR - plannedRR).toFixed(2)) : null

  return {
    hasPlan,
    targetReached,
    stopLossHit,
    exitedBeforeTarget,
    exitedBeforeDuration,
    manuallyClosed: isManual,
    movedStopLoss,
    movedTarget,
    actualDurationMinutes: actualDurationMin,
    plannedDurationMinutes: plannedDurationMin,
    plannedRR,
    actualR,
    rDelta,
    plannedRisk,
    realizedPnl: netPnl,
    commission,
    grossPnl,
  }
}

/**
 * Formats structured trade data for Gemini AI review.
 */
export function buildGeminiTradePrompt(trade: Trade, accountName?: string): string {
  const evalData = evaluatePlanVsActual(trade)
  const estDate = new Date(Number(trade.timestamp)).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  })
  const exitEstDate = trade.exitTime
    ? new Date(Number(trade.exitTime)).toLocaleString("en-US", {
        timeZone: "America/New_York",
        timeStyle: "short",
      })
    : "N/A"

  const tradeData = {
    account: accountName || "Prop Account",
    tradeId: trade.id,
    date: estDate,
    exitTime: exitEstDate,
    instrument: trade.instrument,
    direction: trade.direction.toUpperCase(),
    contracts: trade.contracts,
    setupModel: trade.playbookName || "Discretionary / Unassigned",
    preTradePlan: {
      plannedStopLoss: trade.plannedStopLoss ?? trade.stopLoss ?? "Unavailable",
      plannedTarget: trade.plannedTarget ?? trade.takeProfit ?? "Unavailable",
      plannedTargetUsd: trade.plannedTargetUsd ?? "Unavailable",
      plannedRiskUsd: evalData.plannedRisk ?? "Unavailable",
      plannedRR: evalData.plannedRR ?? trade.expectedRR ?? "Unavailable",
      plannedDuration: trade.plannedDuration || "Unavailable",
      plannedExitRules: trade.plannedExitRules || "Unavailable",
    },
    actualExecution: {
      entryPrice: trade.entry,
      exitPrice: trade.exit,
      exitType: trade.exitType || "Unavailable",
      actualDuration: formatMinutes(evalData.actualDurationMinutes),
      grossPnlUsd: `$${evalData.grossPnl.toFixed(2)}`,
      commissionUsd: `$${evalData.commission.toFixed(2)}`,
      realizedNetPnlUsd: `$${evalData.realizedPnl.toFixed(2)}`,
      actualRMultiple: evalData.actualR != null ? `${evalData.actualR >= 0 ? "+" : ""}${evalData.actualR}R` : "Unavailable",
    },
    planVsActualFacts: {
      targetReached: evalData.targetReached === null ? "Unavailable" : evalData.targetReached ? "Yes" : "No",
      stopLossHit: evalData.stopLossHit === null ? "Unavailable" : evalData.stopLossHit ? "Yes" : "No",
      exitedBeforeTarget: evalData.exitedBeforeTarget === null ? "Unavailable" : evalData.exitedBeforeTarget ? "Yes" : "No",
      exitedBeforePlannedDuration: evalData.exitedBeforeDuration === null ? "Unavailable" : evalData.exitedBeforeDuration ? "Yes" : "No",
      manuallyClosed: evalData.manuallyClosed ? "Yes" : "No",
      movedStopLossDuringTrade: evalData.movedStopLoss ? "Yes" : "No",
      movedTargetDuringTrade: evalData.movedTarget ? "Yes" : "No",
    },
    journalNotes: {
      reasonForEntry: trade.reasonForEntry || "N/A",
      resultVsExpectation: trade.resultVsExpectation || "N/A",
      mistakes: trade.mistakes || "N/A",
      executionImprovement: trade.executionImprovement || "N/A",
      processGrade: trade.psychology?.executionGrade || "N/A",
    },
  }

  return `Please review the following trade execution data against its trade plan:

\`\`\`json
${JSON.stringify(tradeData, null, 2)}
\`\`\`

Analyze the trade with an objective, disciplined prop trader perspective:
1. **Plan Adherence**: Did I follow my initial pre-trade plan and parameters?
2. **Exit Evaluation**: Was the exit planned or premature based on the facts?
3. **Risk Management**: Were dollar risk and stop-loss rules strictly honored?
4. **Execution Assessment**: Identify any execution deviations or emotional trade management (e.g. moving stop, cutting winners early).
5. **Concrete Action Item**: Provide 1-2 high-leverage process improvements supported by the data for my next trade.`
}
