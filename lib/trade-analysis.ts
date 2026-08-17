import { Trade } from "./types"

export interface PsychologyAnalysis {
  convictionVsOutcome: { conviction: string, avgPnl: number, winRate: number, trades: number }[] // 0-3, 4-6, 7-10
  emotionAffected: { yes: { winRate: number, avgPnl: number, count: number }, no: { winRate: number, avgPnl: number, count: number } }
  hesitated: { yes: { winRate: number, avgPnl: number, count: number }, no: { winRate: number, avgPnl: number, count: number } }
  brokeRules: { yes: { winRate: number, avgPnl: number, count: number }, no: { winRate: number, avgPnl: number, count: number } }
  exitReasonBreakdown: { exitReason: string, count: number, avgPnl: number, winRate: number }[]
  movedStop: { yes: { winRate: number, avgPnl: number, count: number }, no: { winRate: number, avgPnl: number, count: number } }
  gradeBreakdown: { grade: string, count: number, avgPnl: number, winRate: number }[]
  preFeelingBreakdown: { feeling: string, count: number, avgPnl: number, winRate: number }[]
}

export interface FailureAnalysis {
  byInstrument: { instrument: string, trades: number, wins: number, losses: number, winRate: number, netPnl: number, profitFactor: number, avgWin: number, avgLoss: number }[]
  byDirection: { direction: string, trades: number, winRate: number, netPnl: number, profitFactor: number }[]
  byDirectionAndSession: { direction: string, session: string, trades: number, winRate: number, netPnl: number }[]
  byPlaybook: { playbookName: string, trades: number, winRate: number, netPnl: number, profitFactor: number, avgR: number }[]
  stopHitTrades: { count: number, avgPnl: number, avgAdverseExcursion: number | null }
}

export interface TimeAnalysis {
  byHour: { hour: number, trades: number, wins: number, winRate: number, netPnl: number, profitFactor: number }[]
  bySession: { session: string, trades: number, wins: number, winRate: number, netPnl: number, profitFactor: number, avgPnl: number }[]
  byDayOfWeek: { day: string, trades: number, wins: number, winRate: number, netPnl: number }[]
  firstTradeOfDay: { win: { count: number, avgPnl: number }, loss: { count: number, avgPnl: number } }
  afterLossNextTrade: { winRate: number, count: number }
}

export interface DurationAnalysis {
  winners: { avgDurationMinutes: number, medianDurationMinutes: number, count: number }
  losers: { avgDurationMinutes: number, medianDurationMinutes: number, count: number }
  mfeStats: { avgMfe: number | null, avgMfeOnWinners: number | null, avgMfeOnLosers: number | null }
  maeStats: { avgMae: number | null, avgMaeOnWinners: number | null, avgMaeOnLosers: number | null }
  timingIncompleteCount: number
}

export interface PatternAnalysis {
  streaks: { longestWinStreak: number, longestLossStreak: number, currentStreak: { type: 'win' | 'loss' | 'none', count: number } }
  pnlDistribution: { buckets: { label: string, count: number }[], top10PctWinsContributionPct: number, bottom5PctLossesContributionPct: number }
  byContracts: { contracts: number, trades: number, winRate: number, netPnl: number, profitFactor: number }[]
  avgScores: { setupQuality: number | null, entryQuality: number | null, exitQuality: number | null, riskScore: number | null, disciplineScore: number | null }
  highVsLowDiscipline: { high: { threshold: number, winRate: number, avgPnl: number, count: number }, low: { winRate: number, avgPnl: number, count: number } }
}

export interface MCAlignmentAnalysis {
  actualDayMix: { goodDayPct: number, flatDayPct: number, badDayPct: number, avgGoodDayPnl: number, avgBadDayPnl: number, totalTradingDays: number }
  impliedRiskPct: { avg: number, min: number, max: number, stdDev: number }
  dailyPnlList: { date: string, pnl: number, type: 'good' | 'flat' | 'bad' }[]
  dailyLossLimitBreaches: { date: string, pnl: number, pct: number }[]
}

function calculateBasicStats(trades: Trade[]) {
  const count = trades.length
  const wins = trades.filter(t => t.pnl > 0).length
  const losses = trades.filter(t => t.pnl < 0).length
  const winRate = count > 0 ? (wins / count) * 100 : 0
  const netPnl = trades.reduce((acc, t) => acc + t.pnl, 0)
  const avgPnl = count > 0 ? netPnl / count : 0
  const grossWin = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0)
  const grossLoss = trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0)
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0)
  const avgWin = wins > 0 ? grossWin / wins : 0
  const avgLoss = losses > 0 ? grossLoss / losses : 0
  return { count, wins, losses, winRate, netPnl, avgPnl, profitFactor, avgWin, avgLoss }
}

function computeBoolStats(trades: Trade[], boolFn: (t: Trade) => boolean | undefined) {
  const yesTrades = trades.filter(t => boolFn(t) === true)
  const noTrades = trades.filter(t => boolFn(t) === false)
  const yesStats = calculateBasicStats(yesTrades)
  const noStats = calculateBasicStats(noTrades)
  return {
    yes: { winRate: yesStats.winRate, avgPnl: yesStats.avgPnl, count: yesStats.count },
    no: { winRate: noStats.winRate, avgPnl: noStats.avgPnl, count: noStats.count }
  }
}

export function analyzePsychology(trades: Trade[]): PsychologyAnalysis {
  // Conviction Vs Outcome
  const convictionBuckets = [
    { range: [0, 3], label: "0-3" },
    { range: [4, 6], label: "4-6" },
    { range: [7, 10], label: "7-10" }
  ].map(b => {
    const bucketTrades = trades.filter(t => t.psychology?.convictionScore !== undefined && t.psychology.convictionScore >= b.range[0] && t.psychology.convictionScore <= b.range[1])
    const stats = calculateBasicStats(bucketTrades)
    return { conviction: b.label, avgPnl: stats.avgPnl, winRate: stats.winRate, trades: stats.count }
  })

  // Group by exit reason
  const exitReasons = Array.from(new Set(trades.map(t => t.psychology?.exitReason).filter(Boolean))) as string[]
  const exitReasonBreakdown = exitReasons.map(reason => {
    const rTrades = trades.filter(t => t.psychology?.exitReason === reason)
    const stats = calculateBasicStats(rTrades)
    return { exitReason: reason, count: stats.count, avgPnl: stats.avgPnl, winRate: stats.winRate }
  }).sort((a, b) => b.count - a.count)

  const gradeBreakdown = (Array.from(new Set(trades.map(t => t.psychology?.executionGrade).filter(Boolean))) as string[])
    .map(grade => {
      const gTrades = trades.filter(t => t.psychology?.executionGrade === grade)
      const stats = calculateBasicStats(gTrades)
      return { grade, count: stats.count, avgPnl: stats.avgPnl, winRate: stats.winRate }
    }).sort((a, b) => b.count - a.count)

  const preFeelingBreakdown = (Array.from(new Set(trades.map(t => t.psychology?.preFeeling).filter(Boolean))) as string[])
    .map(feeling => {
      const fTrades = trades.filter(t => t.psychology?.preFeeling === feeling)
      const stats = calculateBasicStats(fTrades)
      return { feeling, count: stats.count, avgPnl: stats.avgPnl, winRate: stats.winRate }
    }).sort((a, b) => b.count - a.count)

  return {
    convictionVsOutcome: convictionBuckets,
    emotionAffected: computeBoolStats(trades, t => t.psychology?.emotionAffected),
    hesitated: computeBoolStats(trades, t => t.psychology?.hesitated),
    brokeRules: computeBoolStats(trades, t => t.psychology?.brokeRules),
    movedStop: computeBoolStats(trades, t => t.psychology?.movedStop),
    exitReasonBreakdown,
    gradeBreakdown,
    preFeelingBreakdown
  }
}

export function analyzeFailures(trades: Trade[]): FailureAnalysis {
  const instruments = Array.from(new Set(trades.map(t => t.instrument)))
  const byInstrument = instruments.map(inst => {
    const iTrades = trades.filter(t => t.instrument === inst)
    const stats = calculateBasicStats(iTrades)
    return { instrument: inst, trades: stats.count, wins: stats.wins, losses: stats.losses, winRate: stats.winRate, netPnl: stats.netPnl, profitFactor: stats.profitFactor, avgWin: stats.avgWin, avgLoss: stats.avgLoss }
  }).sort((a, b) => b.trades - a.trades)

  const directions = Array.from(new Set(trades.map(t => t.direction)))
  const byDirection = directions.map(dir => {
    const dTrades = trades.filter(t => t.direction === dir)
    const stats = calculateBasicStats(dTrades)
    return { direction: dir, trades: stats.count, winRate: stats.winRate, netPnl: stats.netPnl, profitFactor: stats.profitFactor }
  })

  const sessions = Array.from(new Set(trades.map(t => t.session)))
  const byDirectionAndSession: {direction: string, session: string, trades: number, winRate: number, netPnl: number}[] = []
  directions.forEach(dir => {
    sessions.forEach(sess => {
      const dsTrades = trades.filter(t => t.direction === dir && t.session === sess)
      if (dsTrades.length > 0) {
        const stats = calculateBasicStats(dsTrades)
        byDirectionAndSession.push({ direction: dir, session: sess, trades: stats.count, winRate: stats.winRate, netPnl: stats.netPnl })
      }
    })
  })

  const playbooks = Array.from(new Set(trades.map(t => t.playbookName).filter(Boolean))) as string[]
  const byPlaybook = playbooks.map(pb => {
    const pTrades = trades.filter(t => t.playbookName === pb)
    const stats = calculateBasicStats(pTrades)
    const avgR = stats.count > 0 ? (pTrades.reduce((acc, t) => acc + (t.riskAmount && t.riskAmount > 0 ? t.pnl / t.riskAmount : 0), 0) / stats.count) : 0
    return { playbookName: pb, trades: stats.count, winRate: stats.winRate, netPnl: stats.netPnl, profitFactor: stats.profitFactor, avgR }
  })

  const stopHitTradesList = trades.filter(t => t.psychology?.exitReason === 'Stop Hit' || t.pnl < 0)
  const avgPnlStop = stopHitTradesList.length > 0 ? stopHitTradesList.reduce((acc, t) => acc + t.pnl, 0) / stopHitTradesList.length : 0
  const validAdvEx = stopHitTradesList.filter(t => typeof t.adverseExcursion === 'number')
  const avgAdverseExcursion = validAdvEx.length > 0 ? validAdvEx.reduce((acc, t) => acc + (t.adverseExcursion || 0), 0) / validAdvEx.length : null

  return {
    byInstrument,
    byDirection,
    byDirectionAndSession,
    byPlaybook,
    stopHitTrades: { count: stopHitTradesList.length, avgPnl: avgPnlStop, avgAdverseExcursion }
  }
}

export function analyzeTime(trades: Trade[]): TimeAnalysis {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const byHour = hours.map(h => {
    const hTrades = trades.filter(t => new Date(t.timestamp).getHours() === h)
    if (hTrades.length === 0) return null
    const stats = calculateBasicStats(hTrades)
    return { hour: h, trades: stats.count, wins: stats.wins, winRate: stats.winRate, netPnl: stats.netPnl, profitFactor: stats.profitFactor }
  }).filter(Boolean) as { hour: number, trades: number, wins: number, winRate: number, netPnl: number, profitFactor: number }[]

  const sessions = Array.from(new Set(trades.map(t => t.session)))
  const bySession = sessions.map(sess => {
    const sTrades = trades.filter(t => t.session === sess)
    const stats = calculateBasicStats(sTrades)
    return { session: sess, trades: stats.count, wins: stats.wins, winRate: stats.winRate, netPnl: stats.netPnl, profitFactor: stats.profitFactor, avgPnl: stats.avgPnl }
  })

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDayOfWeek = days.map((day, idx) => {
    const dTrades = trades.filter(t => new Date(t.timestamp).getDay() === idx)
    if (idx === 0 || idx === 6) return null // Only Mon-Fri usually, but we keep it safe
    if (dTrades.length === 0) return null
    const stats = calculateBasicStats(dTrades)
    return { day, trades: stats.count, wins: stats.wins, winRate: stats.winRate, netPnl: stats.netPnl }
  }).filter(Boolean) as { day: string, trades: number, wins: number, winRate: number, netPnl: number }[]

  // first trade of day
  const tradesByDate = trades.reduce((acc, t) => {
    const date = new Date(t.timestamp).toLocaleDateString('en-CA', {timeZone: 'America/New_York'})
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {} as Record<string, Trade[]>)

  const firstTrades = Object.values(tradesByDate).map(dayTrades => {
    return [...dayTrades].sort((a, b) => a.timestamp - b.timestamp)[0]
  })
  
  const firstWins = firstTrades.filter(t => t.pnl > 0)
  const firstLosses = firstTrades.filter(t => t.pnl < 0)
  const firstTradeOfDay = {
    win: { count: firstWins.length, avgPnl: firstWins.length > 0 ? firstWins.reduce((acc, t) => acc + t.pnl, 0) / firstWins.length : 0 },
    loss: { count: firstLosses.length, avgPnl: firstLosses.length > 0 ? firstLosses.reduce((acc, t) => acc + t.pnl, 0) / firstLosses.length : 0 }
  }

  // after loss next trade
  let afterLossCount = 0
  let afterLossWins = 0
  const sortedAllTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp)
  for (let i = 0; i < sortedAllTrades.length - 1; i++) {
    if (sortedAllTrades[i].pnl < 0) {
      afterLossCount++
      if (sortedAllTrades[i+1].pnl > 0) afterLossWins++
    }
  }
  const afterLossNextTrade = {
    winRate: afterLossCount > 0 ? (afterLossWins / afterLossCount) * 100 : 0,
    count: afterLossCount
  }

  return {
    byHour,
    bySession,
    byDayOfWeek,
    firstTradeOfDay,
    afterLossNextTrade
  }
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function analyzeDuration(trades: Trade[]): DurationAnalysis {
  const completeTrades = trades.filter(t => t.exitTime && t.timestamp && t.exitTime > t.timestamp && !t.timingIncomplete)
  const timingIncompleteCount = trades.filter(t => t.timingIncomplete || !t.exitTime).length

  const getDuration = (t: Trade) => (t.exitTime! - t.timestamp) / (1000 * 60)
  const winTrades = completeTrades.filter(t => t.pnl > 0)
  const lossTrades = completeTrades.filter(t => t.pnl < 0)

  const wDurs = winTrades.map(getDuration)
  const lDurs = lossTrades.map(getDuration)

  const validMfe = trades.filter(t => typeof t.favorableExcursion === 'number')
  const validMae = trades.filter(t => typeof t.adverseExcursion === 'number')

  const avgMfe = validMfe.length > 0 ? validMfe.reduce((acc, t) => acc + t.favorableExcursion!, 0) / validMfe.length : null
  const mfeWins = validMfe.filter(t => t.pnl > 0)
  const avgMfeOnWinners = mfeWins.length > 0 ? mfeWins.reduce((acc, t) => acc + t.favorableExcursion!, 0) / mfeWins.length : null
  const mfeLosses = validMfe.filter(t => t.pnl < 0)
  const avgMfeOnLosers = mfeLosses.length > 0 ? mfeLosses.reduce((acc, t) => acc + t.favorableExcursion!, 0) / mfeLosses.length : null

  const avgMae = validMae.length > 0 ? validMae.reduce((acc, t) => acc + t.adverseExcursion!, 0) / validMae.length : null
  const maeWins = validMae.filter(t => t.pnl > 0)
  const avgMaeOnWinners = maeWins.length > 0 ? maeWins.reduce((acc, t) => acc + t.adverseExcursion!, 0) / maeWins.length : null
  const maeLosses = validMae.filter(t => t.pnl < 0)
  const avgMaeOnLosers = maeLosses.length > 0 ? maeLosses.reduce((acc, t) => acc + t.adverseExcursion!, 0) / maeLosses.length : null

  return {
    winners: {
      avgDurationMinutes: wDurs.length > 0 ? wDurs.reduce((a, b) => a + b, 0) / wDurs.length : 0,
      medianDurationMinutes: median(wDurs),
      count: wDurs.length
    },
    losers: {
      avgDurationMinutes: lDurs.length > 0 ? lDurs.reduce((a, b) => a + b, 0) / lDurs.length : 0,
      medianDurationMinutes: median(lDurs),
      count: lDurs.length
    },
    mfeStats: { avgMfe, avgMfeOnWinners, avgMfeOnLosers },
    maeStats: { avgMae, avgMaeOnWinners, avgMaeOnLosers },
    timingIncompleteCount
  }
}

export function analyzePatterns(trades: Trade[]): PatternAnalysis {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp)
  let longestWinStreak = 0
  let longestLossStreak = 0
  let currentStreak = { type: 'none' as 'win'|'loss'|'none', count: 0 }
  let curW = 0, curL = 0
  
  for (const t of sorted) {
    if (t.pnl > 0) {
      curW++
      curL = 0
      if (curW > longestWinStreak) longestWinStreak = curW
      currentStreak = { type: 'win', count: curW }
    } else if (t.pnl < 0) {
      curL++
      curW = 0
      if (curL > longestLossStreak) longestLossStreak = curL
      currentStreak = { type: 'loss', count: curL }
    } else {
      currentStreak = { type: 'none', count: 0 }
      curW = 0
      curL = 0
    }
  }

  // pnl distribution buckets
  const maxAbs = Math.max(...trades.map(t => Math.abs(t.pnl))) || 1
  const bucketSize = maxAbs / 5 || 1
  const buckets = Array.from({length: 10}, (_, i) => {
    const min = -maxAbs + i * bucketSize * 2
    const max = min + bucketSize * 2
    return {
      label: `${Math.round(min)} to ${Math.round(max)}`,
      count: trades.filter(t => t.pnl >= min && t.pnl < max).length
    }
  })

  const winsSorted = trades.filter(t => t.pnl > 0).sort((a, b) => b.pnl - a.pnl)
  const lossesSorted = trades.filter(t => t.pnl < 0).sort((a, b) => a.pnl - b.pnl)
  const totalNet = trades.reduce((a, b) => a + b.pnl, 0)
  
  const top10PctCount = Math.max(1, Math.floor(winsSorted.length * 0.1))
  const top10PctWinsPnl = winsSorted.slice(0, top10PctCount).reduce((a, b) => a + b.pnl, 0)
  const totalWinsPnl = winsSorted.reduce((a, b) => a + b.pnl, 0)
  
  const bottom5PctCount = Math.max(1, Math.floor(lossesSorted.length * 0.05))
  const bottom5PctLossesPnl = lossesSorted.slice(0, bottom5PctCount).reduce((a, b) => a + b.pnl, 0)
  const totalLossesPnl = lossesSorted.reduce((a, b) => a + b.pnl, 0)

  const contracts = Array.from(new Set(trades.map(t => t.contracts)))
  const byContracts = contracts.map(c => {
    const cTrades = trades.filter(t => t.contracts === c)
    const stats = calculateBasicStats(cTrades)
    return { contracts: c, trades: stats.count, winRate: stats.winRate, netPnl: stats.netPnl, profitFactor: stats.profitFactor }
  })

  const avgScores = {
    setupQuality: trades.filter(t => t.setupQualityScore !== undefined).length > 0 ? trades.reduce((a, t) => a + (t.setupQualityScore || 0), 0) / trades.filter(t => t.setupQualityScore !== undefined).length : null,
    entryQuality: trades.filter(t => t.entryQualityScore !== undefined).length > 0 ? trades.reduce((a, t) => a + (t.entryQualityScore || 0), 0) / trades.filter(t => t.entryQualityScore !== undefined).length : null,
    exitQuality: trades.filter(t => t.exitQualityScore !== undefined).length > 0 ? trades.reduce((a, t) => a + (t.exitQualityScore || 0), 0) / trades.filter(t => t.exitQualityScore !== undefined).length : null,
    riskScore: trades.filter(t => t.riskScore !== undefined).length > 0 ? trades.reduce((a, t) => a + (t.riskScore || 0), 0) / trades.filter(t => t.riskScore !== undefined).length : null,
    disciplineScore: trades.filter(t => t.disciplineScore !== undefined).length > 0 ? trades.reduce((a, t) => a + (t.disciplineScore || 0), 0) / trades.filter(t => t.disciplineScore !== undefined).length : null,
  }

  const threshold = 70
  const highDiscipline = trades.filter(t => (t.disciplineScore || 0) >= threshold)
  const lowDiscipline = trades.filter(t => (t.disciplineScore || 0) < threshold)
  const hStats = calculateBasicStats(highDiscipline)
  const lStats = calculateBasicStats(lowDiscipline)

  return {
    streaks: { longestWinStreak, longestLossStreak, currentStreak },
    pnlDistribution: {
      buckets,
      top10PctWinsContributionPct: totalWinsPnl > 0 ? (top10PctWinsPnl / totalWinsPnl) * 100 : 0,
      bottom5PctLossesContributionPct: totalLossesPnl < 0 ? (bottom5PctLossesPnl / totalLossesPnl) * 100 : 0
    },
    byContracts,
    avgScores,
    highVsLowDiscipline: {
      high: { threshold, winRate: hStats.winRate, avgPnl: hStats.avgPnl, count: hStats.count },
      low: { winRate: lStats.winRate, avgPnl: lStats.avgPnl, count: lStats.count }
    }
  }
}

export function analyzeMCAlignment(trades: Trade[], accountSizeUsd: number): MCAlignmentAnalysis {
  const tradesByDate = trades.reduce((acc, t) => {
    const date = new Date(t.timestamp).toLocaleDateString('en-CA', {timeZone: 'America/New_York'})
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {} as Record<string, Trade[]>)

  const dailyPnlList: { date: string, pnl: number, type: 'good' | 'flat' | 'bad' }[] = []
  const dailyLossLimitBreaches: { date: string, pnl: number, pct: number }[] = []

  let goodCount = 0, flatCount = 0, badCount = 0
  let goodPnl = 0, badPnl = 0

  for (const [date, dTrades] of Object.entries(tradesByDate)) {
    const pnl = dTrades.reduce((a, t) => a + t.pnl, 0)
    let type: 'good' | 'flat' | 'bad' = 'flat'
    if (pnl > 0) {
      type = 'good'
      goodCount++
      goodPnl += pnl
    } else if (pnl < 0) {
      type = 'bad'
      badCount++
      badPnl += pnl
    } else {
      type = 'flat'
      flatCount++
    }
    dailyPnlList.push({ date, pnl, type })

    if (accountSizeUsd > 0 && pnl < -0.03 * accountSizeUsd) {
      dailyLossLimitBreaches.push({ date, pnl, pct: (pnl / accountSizeUsd) * 100 })
    }
  }

  const totalTradingDays = Object.keys(tradesByDate).length

  // implied risk pct
  const losses = trades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl) / accountSizeUsd * 100)
  const avg = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0
  const min = losses.length > 0 ? Math.min(...losses) : 0
  const max = losses.length > 0 ? Math.max(...losses) : 0
  const variance = losses.length > 0 ? losses.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / losses.length : 0
  const stdDev = Math.sqrt(variance)

  return {
    actualDayMix: {
      goodDayPct: totalTradingDays > 0 ? (goodCount / totalTradingDays) * 100 : 0,
      flatDayPct: totalTradingDays > 0 ? (flatCount / totalTradingDays) * 100 : 0,
      badDayPct: totalTradingDays > 0 ? (badCount / totalTradingDays) * 100 : 0,
      avgGoodDayPnl: goodCount > 0 ? goodPnl / goodCount : 0,
      avgBadDayPnl: badCount > 0 ? badPnl / badCount : 0,
      totalTradingDays
    },
    impliedRiskPct: { avg, min, max, stdDev },
    dailyPnlList: dailyPnlList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    dailyLossLimitBreaches
  }
}

export interface TradeInsight {
  type: 'strength' | 'weakness' | 'pattern'
  title: string
  description: string
}

export function generateInsights(
  psych: PsychologyAnalysis, 
  failures: FailureAnalysis, 
  time: TimeAnalysis, 
  duration: DurationAnalysis, 
  patterns: PatternAnalysis
): TradeInsight[] {
  const insights: TradeInsight[] = []

  // 1. Hold Time (Pattern/Weakness)
  if (duration.winners.count > 0 && duration.losers.count > 0) {
    if (duration.losers.avgDurationMinutes > duration.winners.avgDurationMinutes * 1.2) {
      insights.push({ 
        type: 'weakness', 
        title: 'Holding Losers Too Long', 
        description: `Your average losing trade lasts ${duration.losers.avgDurationMinutes.toFixed(1)} mins, while winners are cut at ${duration.winners.avgDurationMinutes.toFixed(1)} mins. You are hoping losers come back.` 
      })
    } else if (duration.winners.avgDurationMinutes > duration.losers.avgDurationMinutes * 1.5) {
      insights.push({ 
        type: 'strength', 
        title: 'Letting Winners Run', 
        description: `You hold winners (${duration.winners.avgDurationMinutes.toFixed(1)}m) much longer than losers (${duration.losers.avgDurationMinutes.toFixed(1)}m), which is excellent risk management.` 
      })
    }
  }

  // 2. After Loss (Weakness/Strength)
  if (time.afterLossNextTrade.count > 0) {
    if (time.afterLossNextTrade.winRate < 40) {
      insights.push({ 
        type: 'weakness', 
        title: 'Post-Loss Spiral', 
        description: `Your win rate on the very next trade after a loss drops to ${time.afterLossNextTrade.winRate.toFixed(0)}%. You may be revenge trading.` 
      })
    } else if (time.afterLossNextTrade.winRate > 60) {
      insights.push({ 
        type: 'strength', 
        title: 'Resilient Bounce Back', 
        description: `After taking a loss, your next trade has a ${time.afterLossNextTrade.winRate.toFixed(0)}% win rate. You recover well emotionally.` 
      })
    }
  }

  // 3. Best & Worst Hours (Strength/Weakness)
  if (time.byHour.length > 0) {
    const hoursSorted = [...time.byHour].sort((a, b) => b.netPnl - a.netPnl)
    const bestHour = hoursSorted[0]
    const worstHour = hoursSorted[hoursSorted.length - 1]
    
    if (bestHour && bestHour.netPnl > 0) {
      const hourLabel = bestHour.hour < 10 ? `0${bestHour.hour}` : bestHour.hour
      insights.push({ 
        type: 'strength', 
        title: 'Optimal Trading Window', 
        description: `You perform best during the ${hourLabel}:00 hour with a ${bestHour.winRate.toFixed(0)}% win rate.` 
      })
    }
    
    if (worstHour && worstHour.netPnl < 0 && time.byHour.length > 1) {
      const hourLabel = worstHour.hour < 10 ? `0${worstHour.hour}` : worstHour.hour
      insights.push({ 
        type: 'weakness', 
        title: 'Vulnerable Hour', 
        description: `Avoid trading during ${hourLabel}:00. It is your worst performing hour with a ${worstHour.winRate.toFixed(0)}% win rate.` 
      })
    }
  }

  // 4. Direction Bias (Strength/Weakness)
  const longs = failures.byDirection.find(d => d.direction === 'long')
  const shorts = failures.byDirection.find(d => d.direction === 'short')
  
  if (longs && longs.trades > 0 && shorts && shorts.trades > 0) {
    if (longs.winRate - shorts.winRate > 10) {
      insights.push({ 
        type: 'pattern', 
        title: 'Strong Long Bias', 
        description: `Your long trades (${longs.winRate.toFixed(0)}% WR) drastically outperform your short trades (${shorts.winRate.toFixed(0)}% WR). Focus on buying dips.` 
      })
    } else if (shorts.winRate - longs.winRate > 10) {
      insights.push({ 
        type: 'pattern', 
        title: 'Strong Short Bias', 
        description: `Your short trades (${shorts.winRate.toFixed(0)}% WR) drastically outperform your long trades (${longs.winRate.toFixed(0)}% WR). Focus on shorting rallies.` 
      })
    } else if (Math.abs(longs.winRate - shorts.winRate) <= 10) {
      insights.push({ 
        type: 'strength', 
        title: 'Balanced Directionality', 
        description: `You trade both long and short setups equally well (within 10% win rate variance).` 
      })
    }
  } else if (longs && !shorts) {
    insights.push({ type: 'pattern', title: 'Long-Only Trader', description: 'You have only taken long trades in this dataset.' })
  } else if (shorts && !longs) {
    insights.push({ type: 'pattern', title: 'Short-Only Trader', description: 'You have only taken short trades in this dataset.' })
  }

  // 5. Discipline (Pattern)
  if (patterns.highVsLowDiscipline.high.count > 0 && patterns.highVsLowDiscipline.low.count > 0) {
    const pnlDiff = patterns.highVsLowDiscipline.high.avgPnl - patterns.highVsLowDiscipline.low.avgPnl
    if (pnlDiff > 0) {
      insights.push({
        type: 'pattern',
        title: 'Discipline Pays Off',
        description: `When your discipline score is high, your win rate is ${patterns.highVsLowDiscipline.high.winRate.toFixed(0)}% vs ${patterns.highVsLowDiscipline.low.winRate.toFixed(0)}% when low discipline.`
      })
    }
  }

  // 6. Stop Hits (Weakness)
  const totalLosses = failures.byInstrument.reduce((acc, curr) => acc + curr.losses, 0)
  if (totalLosses > 0 && failures.stopHitTrades.count > 0) {
    const stopPct = (failures.stopHitTrades.count / totalLosses) * 100
    if (stopPct > 60) {
      insights.push({
        type: 'weakness',
        title: 'Stop Hunt Victim',
        description: `${stopPct.toFixed(0)}% of your losses are from direct stop hits. Your stops may be placed too tightly in high liquidity zones.`
      })
    }
  }

  // 7. Emotional Leak (Weakness)
  if (psych.emotionAffected.yes.count > 0 && psych.emotionAffected.no.count > 0) {
    const wrDrop = psych.emotionAffected.no.winRate - psych.emotionAffected.yes.winRate
    if (wrDrop > 10) {
      insights.push({
        type: 'weakness',
        title: 'Emotional Leak',
        description: `Trading while affected by emotion drops your win rate by ${wrDrop.toFixed(0)}% compared to when you are clear-headed.`
      })
    }
  } else if (psych.emotionAffected.yes.count > 0 && psych.emotionAffected.no.count === 0) {
      insights.push({
        type: 'weakness',
        title: 'Highly Emotional',
        description: `100% of your trades are marked as emotion-affected. You need to step back and build mechanical rules.`
      })
  }

  // 8. Best Instrument (Strength)
  if (failures.byInstrument.length > 0) {
    const bestInst = [...failures.byInstrument].sort((a, b) => b.netPnl - a.netPnl)[0]
    if (bestInst && bestInst.netPnl > 0) {
      insights.push({
        type: 'strength',
        title: 'Mastering ' + bestInst.instrument,
        description: `${bestInst.instrument} is your most profitable asset, generating ${bestInst.netPnl > 0 ? '+' : ''}${bestInst.netPnl} with a ${bestInst.winRate.toFixed(0)}% WR.`
      })
    }
  }

  // 9. Moving Stop Loss (Pattern)
  if (psych.movedStop.yes.count > 0) {
    if (psych.movedStop.yes.winRate < psych.movedStop.no.winRate) {
      insights.push({
        type: 'weakness',
        title: 'Moving Stops Hurts',
        description: `When you move your stop, your win rate is only ${psych.movedStop.yes.winRate.toFixed(0)}% vs ${psych.movedStop.no.winRate.toFixed(0)}% when you leave it alone.`
      })
    }
  }

  // 10. Rule Breaking (Weakness)
  if (psych.brokeRules.yes.count > 0) {
    insights.push({
      type: 'weakness',
      title: 'Breaking Rules',
      description: `You broke your trading rules on ${psych.brokeRules.yes.count} trades, resulting in a ${psych.brokeRules.yes.winRate.toFixed(0)}% win rate on those specific setups.`
    })
  }

  return insights
}
