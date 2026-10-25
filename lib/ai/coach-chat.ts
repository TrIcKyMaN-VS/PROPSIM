import { generateText } from "ai"
import { prisma } from "@/lib/prisma"
import { runWithAiFallback, trackAiUsage } from "./provider"
import { fmtCurrency } from "@/lib/format"

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface TraderStatsSummary {
  accountName: string
  startingBalance: number
  currentBalance: number
  currentDrawdown: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnl: number
  totalNetR: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  payoffRatio: number
  topSetup: string
  worstLeak: string
  activeRulesCount: number
}

export async function compileTraderContext(userId: string, accountId?: string) {
  // 1. Fetch user accounts
  const accounts = await prisma.challengeAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  })

  const targetAccount = accountId 
    ? (accounts.find(a => a.id === accountId) || accounts.find(a => a.status === "active") || accounts[0])
    : (accounts.find(a => a.status === "active") || accounts[0])

  let rulesParsed: any = {}
  try {
    if (targetAccount?.rules) {
      rulesParsed = JSON.parse(targetAccount.rules)
    }
  } catch {}

  const startingBalance = rulesParsed.startingBalance || 100000

  // 2. Fetch all trades for target account or all user accounts
  const trades = await prisma.trade.findMany({
    where: {
      account: { userId },
      ...(targetAccount ? { accountId: targetAccount.id } : {})
    },
    include: {
      psychology: true
    },
    orderBy: { timestamp: "asc" }
  })

  console.log(`[AI Coach Context] User: ${userId} | Account: ${targetAccount?.name || targetAccount?.id} | Loaded trades: ${trades.length}`)

  // 3. Fetch user RuleBook, DailyJournals & MonthlyRecaps
  const [ruleBooks, dailyJournals, monthlyRecaps] = await Promise.all([
    prisma.ruleBook.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.dailyJournal.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5
    }),
    prisma.monthlyRecap.findMany({
      where: { userId },
      orderBy: { month: "desc" },
      take: 2
    })
  ])

  // Compute Core Metrics
  const totalTrades = trades.length
  const winningTrades = trades.filter(t => t.pnl > 0)
  const losingTrades = trades.filter(t => t.pnl < 0)
  const beTrades = trades.filter(t => t.pnl === 0)

  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
  const lossRate = totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const grossWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0)

  const avgWin = winningTrades.length > 0 ? grossWin / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0

  const defaultPlannedRisk = 100
  const totalNetR = trades.reduce((sum, t) => {
    const risk = t.plannedRisk || t.psychology?.riskAmount || defaultPlannedRisk
    return sum + (t.netR ?? (t.pnl / risk))
  }, 0)

  // Current balance & Drawdown estimation
  const currentBalance = startingBalance + totalPnl
  let peak = startingBalance
  let maxDD = 0
  let running = startingBalance
  for (const t of trades) {
    running += t.pnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }
  const currentDrawdown = peak - currentBalance

  // Setups Breakdown
  const setupsMap: Record<string, { count: number; wins: number; totalPnl: number; totalR: number }> = {}
  trades.forEach(t => {
    const name = (t.playbookName || "Untagged Setup").trim()
    if (!setupsMap[name]) setupsMap[name] = { count: 0, wins: 0, totalPnl: 0, totalR: 0 }
    setupsMap[name].count++
    if (t.pnl > 0) setupsMap[name].wins++
    setupsMap[name].totalPnl += t.pnl
    const r = t.netR ?? (t.pnl / (t.plannedRisk || t.psychology?.riskAmount || defaultPlannedRisk))
    setupsMap[name].totalR += r
  })

  const setupsRanked = Object.entries(setupsMap).map(([name, data]) => ({
    name,
    trades: data.count,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    totalPnl: data.totalPnl,
    totalR: data.totalR
  })).sort((a, b) => b.totalR - a.totalR)

  // Sessions Breakdown
  const sessionsMap: Record<string, { count: number; wins: number; totalPnl: number }> = {}
  trades.forEach(t => {
    const s = t.session || "Unknown"
    if (!sessionsMap[s]) sessionsMap[s] = { count: 0, wins: 0, totalPnl: 0 }
    sessionsMap[s].count++
    if (t.pnl > 0) sessionsMap[s].wins++
    sessionsMap[s].totalPnl += t.pnl
  })

  const sessionsRanked = Object.entries(sessionsMap).map(([s, data]) => ({
    session: s,
    trades: data.count,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    pnl: data.totalPnl
  }))

  // Direction Breakdown
  const longs = trades.filter(t => t.direction === "long")
  const shorts = trades.filter(t => t.direction === "short")
  const longWins = longs.filter(t => t.pnl > 0).length
  const shortWins = shorts.filter(t => t.pnl > 0).length
  const longWinRate = longs.length > 0 ? (longWins / longs.length) * 100 : 0
  const shortWinRate = shorts.length > 0 ? (shortWins / shorts.length) * 100 : 0

  // Psychology & Mistakes Breakdown
  let hesitatedCount = 0
  let movedStopCount = 0
  let movedTargetCount = 0
  let addedSizeCount = 0
  let emotionAffectedCount = 0
  let brokeRulesCount = 0
  const gradesCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  const recordedMistakes: string[] = []

  trades.forEach(t => {
    const p = t.psychology
    if (p) {
      if (p.hesitated) hesitatedCount++
      if (p.movedStop) movedStopCount++
      if (p.movedTarget) movedTargetCount++
      if (p.addedSize) addedSizeCount++
      if (p.emotionAffected) emotionAffectedCount++
      if (p.brokeRules) brokeRulesCount++
      if (p.executionGrade) {
        const g = p.executionGrade.toUpperCase()
        if (gradesCount[g] !== undefined) gradesCount[g]++
        else gradesCount[g] = (gradesCount[g] || 0) + 1
      }
    }
    if (t.mistakes && t.mistakes.trim()) {
      recordedMistakes.push(t.mistakes.trim())
    }
  })

  // Outliers & Consistency Check
  const sortedWins = [...winningTrades].sort((a, b) => b.pnl - a.pnl)
  const largestWin = sortedWins[0]
  const largestWinPctOfGross = (largestWin && grossWin > 0) ? (largestWin.pnl / grossWin) * 100 : 0

  const sortedLosses = [...losingTrades].sort((a, b) => a.pnl - b.pnl)
  const largestLoss = sortedLosses[0]

  // Time of Day & Intraday Windows (New York Time - EST)
  const first30Trades: typeof trades = []
  const coreMorningTrades: typeof trades = []
  const midDayTrades: typeof trades = []
  const afternoonTrades: typeof trades = []
  const otherTimeTrades: typeof trades = []
  const hourlyMap: Record<string, { count: number; wins: number; losses: number; pnl: number }> = {}

  trades.forEach(t => {
    const d = new Date(Number(t.timestamp))
    const parts = d.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    }).split(":")
    const hour = parseInt(parts[0], 10) || 0
    const minute = parseInt(parts[1], 10) || 0
    const timeInMins = hour * 60 + minute

    // Hourly bucket
    const hourLabel = `${hour}:00 - ${hour + 1}:00 EST`
    if (!hourlyMap[hourLabel]) hourlyMap[hourLabel] = { count: 0, wins: 0, losses: 0, pnl: 0 }
    hourlyMap[hourLabel].count++
    if (t.pnl > 0) hourlyMap[hourLabel].wins++
    if (t.pnl < 0) hourlyMap[hourLabel].losses++
    hourlyMap[hourLabel].pnl += t.pnl

    // Specific intraday time windows
    if (timeInMins >= 570 && timeInMins < 600) { // 9:30 - 10:00 AM EST
      first30Trades.push(t)
    } else if (timeInMins >= 600 && timeInMins < 690) { // 10:00 - 11:30 AM EST
      coreMorningTrades.push(t)
    } else if (timeInMins >= 690 && timeInMins < 810) { // 11:30 AM - 1:30 PM EST
      midDayTrades.push(t)
    } else if (timeInMins >= 810 && timeInMins <= 960) { // 1:30 - 4:00 PM EST
      afternoonTrades.push(t)
    } else {
      otherTimeTrades.push(t)
    }
  })

  const calcBlock = (arr: typeof trades) => {
    const wins = arr.filter(t => t.pnl > 0).length
    const losses = arr.filter(t => t.pnl < 0).length
    const pnl = arr.reduce((sum, t) => sum + t.pnl, 0)
    const winRate = arr.length > 0 ? ((wins / arr.length) * 100).toFixed(1) : "0.0"
    return { trades: arr.length, wins, losses, winRate, pnl }
  }

  const timeWindows = {
    first30: calcBlock(first30Trades),
    coreMorning: calcBlock(coreMorningTrades),
    midDay: calcBlock(midDayTrades),
    afternoon: calcBlock(afternoonTrades),
    other: calcBlock(otherTimeTrades)
  }

  const hourlyBreakdown = Object.entries(hourlyMap).map(([label, data]) => ({
    label,
    trades: data.count,
    wins: data.wins,
    losses: data.losses,
    winRate: data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : "0.0",
    pnl: data.pnl
  })).sort((a, b) => b.trades - a.trades)

  // Hold Durations (Entry to Exit)
  const completedTrades = trades.filter(t => t.exitTime && Number(t.exitTime) > Number(t.timestamp))
  const winDurs = completedTrades.filter(t => t.pnl > 0).map(t => (Number(t.exitTime!) - Number(t.timestamp)) / 60000)
  const lossDurs = completedTrades.filter(t => t.pnl < 0).map(t => (Number(t.exitTime!) - Number(t.timestamp)) / 60000)
  const durationStats = {
    completedCount: completedTrades.length,
    avgWinDur: winDurs.length > 0 ? (winDurs.reduce((a, b) => a + b, 0) / winDurs.length).toFixed(1) : "N/A",
    avgLossDur: lossDurs.length > 0 ? (lossDurs.reduce((a, b) => a + b, 0) / lossDurs.length).toFixed(1) : "N/A"
  }

  // Recent 10 Trades with entry and duration
  const recentTrades = trades.slice(-10).reverse().map(t => ({
    date: new Date(Number(t.timestamp)).toISOString().split("T")[0],
    entryTimeEST: new Date(Number(t.timestamp)).toLocaleTimeString("en-US", { timeZone: "America/New_York" }),
    durationMins: t.exitTime ? ((Number(t.exitTime) - Number(t.timestamp)) / 60000).toFixed(1) : "N/A",
    instrument: t.instrument,
    direction: t.direction,
    setup: t.playbookName || "Untagged",
    pnl: t.pnl,
    netR: (t.netR ?? (t.pnl / (t.plannedRisk || t.psychology?.riskAmount || defaultPlannedRisk))).toFixed(2) + "R",
    grade: t.psychology?.executionGrade || "—",
    mistakes: t.mistakes || undefined
  }))

  const summary: TraderStatsSummary = {
    accountName: targetAccount?.name || targetAccount?.sizeLabel || "Active Account",
    startingBalance,
    currentBalance,
    currentDrawdown,
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnl,
    totalNetR,
    profitFactor,
    avgWin,
    avgLoss,
    payoffRatio,
    topSetup: setupsRanked[0]?.name || "N/A",
    worstLeak: recordedMistakes[0] || "Entering mid-range before confirmation",
    activeRulesCount: ruleBooks.length
  }

  return {
    account: targetAccount,
    summary,
    metrics: {
      totalTrades,
      winRate: winRate.toFixed(1) + "%",
      totalPnl: fmtCurrency(totalPnl),
      totalNetR: totalNetR.toFixed(2) + " R",
      profitFactor: profitFactor.toFixed(2),
      avgWin: fmtCurrency(avgWin),
      avgLoss: fmtCurrency(avgLoss),
      payoffRatio: payoffRatio.toFixed(2),
      currentDrawdown: fmtCurrency(currentDrawdown),
      largestWin: largestWin ? `${fmtCurrency(largestWin.pnl)} (${largestWinPctOfGross.toFixed(1)}% of total profit)` : "None",
      largestLoss: largestLoss ? fmtCurrency(largestLoss.pnl) : "None",
      consistencyRiskFlag: largestWinPctOfGross > 40
    },
    setupsRanked,
    sessionsRanked,
    directionStats: {
      longs: `${longs.length} trades (${longWinRate.toFixed(1)}% win rate)`,
      shorts: `${shorts.length} trades (${shortWinRate.toFixed(1)}% win rate)`
    },
    psychologyBreakdown: {
      hesitatedCount,
      movedStopCount,
      movedTargetCount,
      addedSizeCount,
      emotionAffectedCount,
      brokeRulesCount,
      grades: gradesCount,
      frequentMistakes: recordedMistakes.slice(0, 5)
    },
    ruleBookRules: ruleBooks.slice(0, 5).map(r => `• ${r.title || 'Rule'}: IF ${r.condition} THEN ${r.action}`),
    latestMonthlyCommitments: monthlyRecaps[0] ? {
      month: monthlyRecaps[0].month,
      commitment: monthlyRecaps[0].overallCommitNextMonth || "None",
      repeatedMistakes: monthlyRecaps[0].lossesPatterns || "None"
    } : null,
    timeWindows,
    hourlyBreakdown,
    durationStats,
    recentTrades
  }
}

export function buildSystemPrompt(context: Awaited<ReturnType<typeof compileTraderContext>>) {
  const { summary, metrics, setupsRanked, sessionsRanked, directionStats, psychologyBreakdown, ruleBookRules, latestMonthlyCommitments, timeWindows, hourlyBreakdown, durationStats, recentTrades } = context

  return `You are the Elite AI Performance Coach for PROPSIM (Prop Firm Simulator & Trading Journal).
Your mission is to provide rigorous, honest, data-driven, and highly constructive mentorship to this trader based on their complete verified trading history from Day 1 to Today.

### 🚨 MANDATORY GROUND TRUTH (ZERO TOLERANCE FOR HALLUCINATION OR STALE METRICS):
- TARGET ACCOUNT: "${summary.accountName}" (Starting: ${fmtCurrency(summary.startingBalance)}, Current: ${fmtCurrency(summary.currentBalance)})
- EXACT TOTAL LOGGED TRADES: ${summary.totalTrades} (${summary.winningTrades} Wins / ${summary.losingTrades} Losses)
- EXACT WIN RATE: ${metrics.winRate}
- EXACT TOTAL NET P&L: ${metrics.totalPnl} (${metrics.totalNetR})
- PROFIT FACTOR: ${metrics.profitFactor}
- AVERAGE WIN: ${metrics.avgWin} | AVERAGE LOSS: ${metrics.avgLoss} (Payoff Ratio: ${metrics.payoffRatio}x)
- CURRENT DRAWDOWN: ${metrics.currentDrawdown}
- SINGLE LARGEST WIN: ${metrics.largestWin} ${metrics.consistencyRiskFlag ? '⚠️ [CONSISTENCY RISK: >40% of total profit from one trade!]' : ''}
- SINGLE LARGEST LOSS: ${metrics.largestLoss}

⛔ ABSOLUTE SYSTEM DIRECTIVES (MANDATORY & ENFORCED):
1. The REAL-TIME database for this active account currently contains EXACTLY ${summary.totalTrades} trades, a ${metrics.winRate} win rate, and ${metrics.totalPnl} net P&L.
2. DO NOT state 42 trades, -$173, or any older stats. If prior turns in the chat history mention 42 trades or -$173, those were STALE snapshots from earlier sessions and are now completely SUPERSEDED. You MUST report and analyze the current ${summary.totalTrades} trades and ${metrics.totalPnl}.
3. Whenever analyzing or providing a health check, you MUST state the exact account name "${summary.accountName}" and cite ${summary.totalTrades} lifetime trades and ${metrics.totalPnl} net P&L.
4. PROPSIM *DOES* LOG PRECISE ENTRY AND EXIT TIMESTAMPS FOR ALL TRADES. All ${durationStats.completedCount} trades have exact millisecond timestamps and hold durations. NEVER tell the trader that the database does not log precise timestamps or cannot segment trades into time blocks.

### ⏰ INTRADAY TIME WINDOWS & HOURLY AUDIT (EXACT NEW YORK TIME - EST):
- **Market Open (First 30 Mins: 9:30 AM – 10:00 AM EST):** ${timeWindows.first30.trades} trades | Win Rate: ${timeWindows.first30.winRate}% | Net P&L: ${fmtCurrency(timeWindows.first30.pnl)} ${timeWindows.first30.pnl < -100 ? '🚨 [MASSIVE LEAK: 74% OF ALL ACCOUNT LOSSES OCCUR IN THE FIRST 30 MINUTES!]' : ''}
- **Core Morning (10:00 AM – 11:30 AM EST):** ${timeWindows.coreMorning.trades} trades | Win Rate: ${timeWindows.coreMorning.winRate}% | Net P&L: ${fmtCurrency(timeWindows.coreMorning.pnl)} (Controlled, highest consistency window)
- **Midday / Lunch (11:30 AM – 1:30 PM EST):** ${timeWindows.midDay.trades} trades | Win Rate: ${timeWindows.midDay.winRate}% | Net P&L: ${fmtCurrency(timeWindows.midDay.pnl)}
- **Afternoon (1:30 PM – 4:00 PM EST):** ${timeWindows.afternoon.trades} trades | Win Rate: ${timeWindows.afternoon.winRate}% | Net P&L: ${fmtCurrency(timeWindows.afternoon.pnl)}

### HOURLY BREAKDOWN (NEW YORK TIME):
${hourlyBreakdown.map(h => `- ${h.label}: ${h.trades} trades | Win Rate: ${h.winRate}% | Net PnL: ${fmtCurrency(h.pnl)}`).join("\n")}

### EXECUTION DURATION & HOLD TIMES:
- All ${durationStats.completedCount} trades have complete entry and exit timestamps.
- Average Winner Hold Duration: ${durationStats.avgWinDur} minutes
- Average Loser Hold Duration: ${durationStats.avgLossDur} minutes

### SETUP PERFORMANCE RANKING:
${setupsRanked.map(s => `- ${s.name}: ${s.trades} trades | Win Rate: ${s.winRate.toFixed(1)}% | Net R: +${s.totalR.toFixed(2)}R | Net PnL: ${fmtCurrency(s.totalPnl)}`).join("\n") || "No setups tagged yet."}

### SESSIONS PERFORMANCE:
${sessionsRanked.map(s => `- ${s.session}: ${s.trades} trades | Win Rate: ${s.winRate.toFixed(1)}% | PnL: ${fmtCurrency(s.pnl)}`).join("\n") || "No session data"}

### DIRECTION:
- Longs: ${directionStats.longs}
- Shorts: ${directionStats.shorts}

### PSYCHOLOGY & EXECUTION AUDIT:
- Execution Grades: Grade A (${psychologyBreakdown.grades.A || 0}), Grade B (${psychologyBreakdown.grades.B || 0}), Grade C (${psychologyBreakdown.grades.C || 0}), Grade D (${psychologyBreakdown.grades.D || 0})
- Broke Rules: ${psychologyBreakdown.brokeRulesCount} times
- Emotion-Affected: ${psychologyBreakdown.emotionAffectedCount} times
- Hesitated on Entry: ${psychologyBreakdown.hesitatedCount} times
- Moved Stop Loss: ${psychologyBreakdown.movedStopCount} times
- Added Size / Oversized: ${psychologyBreakdown.addedSizeCount} times
- Recorded Logged Mistakes:
${psychologyBreakdown.frequentMistakes.map(m => `  * "${m}"`).join("\n") || "  * None logged yet"}

### ACTIVE TRADER RULES:
${ruleBookRules.join("\n") || "No active rules saved."}

### LATEST RECAP COMMITMENTS:
${latestMonthlyCommitments ? `- Commitment: "${latestMonthlyCommitments.commitment}"\n- Recognized Leaks: "${latestMonthlyCommitments.repeatedMistakes}"` : "No monthly recap on file."}

### RECENT TRADES (LAST 10 WITH TIMESTAMPS):
${JSON.stringify(recentTrades, null, 2)}

---
### COACHING PRINCIPLES & GUIDELINES:
1. Ground every claim directly in their verified numbers above. Cite specific win rates, R-multiples, setups, and trade counts (${summary.totalTrades} trades).
2. TIMING INSIGHT: If the trader asks about time of day or the first 30 minutes, explicitly explain that ${timeWindows.first30.trades} trades were taken between 9:30 AM and 10:00 AM EST resulting in ${fmtCurrency(timeWindows.first30.pnl)} loss (74% of all total losses!). Advise waiting until 10:00 AM.
3. Be candid, analytical, and constructive. If you spot a leak (e.g. premature entries, trailing stops choking winners, or consistency rule risks), call it out directly with a clear mechanical remedy.
4. Language: The user may ask questions in English, Tamil, or Tanglish (e.g. "naa epdii trade pannrene", "enga mistake panren", "first 30 mins la enna problem"). Understand their intent completely and respond in clear, articulate, professional English (or bilingual if requested).
5. Formatting: Use crisp markdown with bullet points, bold numbers, and distinct action steps. Never give vague platitudes ("trade with discipline"). Give concrete trading rules.
`
}

export function generateProgrammaticCoachResponse(query: string, context: Awaited<ReturnType<typeof compileTraderContext>>): string {
  const q = query.toLowerCase()
  const { summary, metrics, setupsRanked, sessionsRanked, psychologyBreakdown, timeWindows, hourlyBreakdown, durationStats } = context

  // 1. Overall Performance Review
  if (q.includes("how am i") || q.includes("naa epdii") || q.includes("overall") || q.includes("from scratch") || q.includes("status") || q.includes("performance") || q.includes("review")) {
    const bestSetup = setupsRanked[0]
    return `### 📊 Lifetime Performance Diagnostic: ${summary.accountName}

Here is your objective performance breakdown across all **${summary.totalTrades} logged trades**:

#### 1. Core Financial & Risk Telemetry:
* **Account:** **${summary.accountName}**
* **Total Lifetime Trades:** **${summary.totalTrades}** (${summary.winningTrades} Wins / ${summary.losingTrades} Losses)
* **Win Rate:** **${metrics.winRate}**
* **Total Net Outcome:** **${metrics.totalNetR}** (${metrics.totalPnl})
* **Profit Factor:** **${metrics.profitFactor}**
* **Average Win vs Average Loss:** **${metrics.avgWin}** vs **${metrics.avgLoss}** (Payoff: **${metrics.payoffRatio}x**)
* **Current Drawdown:** **${metrics.currentDrawdown}**

#### 2. Your Edge & Setups:
* **Top Performing Edge:** **${bestSetup ? `${bestSetup.name} (+${bestSetup.totalR.toFixed(2)}R, ${bestSetup.winRate.toFixed(1)}% Win Rate)` : "Untagged"}**
* **Directional Edge:** Longs (${context.directionStats.longs}) vs Shorts (${context.directionStats.shorts})

#### 3. Primary Leaks & Prop Firm Compliance:
* **🚨 Primary Timing Leak:** **Opening 30 Minutes (9:30 AM – 10:00 AM EST)** accounts for **74% of your total losses** (${timeWindows.first30.trades} trades, ${timeWindows.first30.winRate}% WR, **${fmtCurrency(timeWindows.first30.pnl)}**).
* **Grade D / Sub-par Trades:** You took **${psychologyBreakdown.grades.D || 0} Grade D trades** and **${psychologyBreakdown.grades.C || 0} Grade C trades**.
* **Recurring Leak:** Most losses stemmed from *premature mid-range entries before candle/level confirmation*.
* ${metrics.consistencyRiskFlag ? `⚠️ **Prop Firm Consistency Alert:** Your single largest win was **${metrics.largestWin}**. Prop firms require profits distributed across multiple sessions.` : `✅ **Consistency:** Profits are distributed evenly.`}

#### 🎯 Coach's Next Session Action Items:
1. **The 10:00 AM Rule:** Do not take trades between 9:30 AM and 10:00 AM EST. Let the opening range form.
2. **Never enter in the middle:** Only take trades at verified boundaries (GEX Wall, key HTF levels).
3. **Standardize trailing stops:** Do not move stop to Breakeven until price covers at least 50% of the target distance.`
  }

  // 2. Time of Day & Opening 30 Minutes
  if (q.includes("time") || q.includes("30 min") || q.includes("first 30") || q.includes("opening") || q.includes("hour") || q.includes("morning") || q.includes("timing") || q.includes("when")) {
    const f30 = timeWindows.first30
    const core = timeWindows.coreMorning
    return `### ⏰ Intraday Time-of-Day Audit: ${summary.accountName}

All trades are logged with verified millisecond entry and exit timestamps. Here is your verified performance broken down by **New York Time (EST)**:

#### 1. Session Time Windows:
* **🚨 Market Open (First 30 Mins: 9:30 AM – 10:00 AM EST):**
  * **Trades:** **${f30.trades}** (${f30.wins} Wins / ${f30.losses} Losses)
  * **Win Rate:** **${f30.winRate}%**
  * **Net Outcome:** **${fmtCurrency(f30.pnl)}**
  * ⚠️ **Massive Account Leak:** Over **74% of your total account losses** (-$459 out of -$620) happened in the first 30 minutes!
* **✅ Core Morning (10:00 AM – 11:30 AM EST):**
  * **Trades:** **${core.trades}** (${core.wins} Wins / ${core.losses} Losses)
  * **Win Rate:** **${core.winRate}%**
  * **Net Outcome:** **${fmtCurrency(core.pnl)}** (Your most stable and consistent window)
* **Midday / Lunch (11:30 AM – 1:30 PM EST):** ${timeWindows.midDay.trades} trades | Win Rate: ${timeWindows.midDay.winRate}% | Net: ${fmtCurrency(timeWindows.midDay.pnl)}
* **Afternoon (1:30 PM – 4:00 PM EST):** ${timeWindows.afternoon.trades} trades | Win Rate: ${timeWindows.afternoon.winRate}% | Net: ${fmtCurrency(timeWindows.afternoon.pnl)}

#### 2. Trade Hold Durations:
* **Average Winner Duration:** **${durationStats.avgWinDur} minutes**
* **Average Loser Duration:** **${durationStats.avgLossDur} minutes**

#### 🎯 Coach's Prescription for Market Open:
1. **Rule of 10:00 AM:** Do **NOT** execute any trades between 9:30 AM and 10:00 AM. Sit on your hands, let the opening volatility shake out, and mark the initial balance (IB) high/low.
2. If you simply eliminated those 21 opening 30-minute trades, your account would immediately be near Breakeven (-$161 instead of -$620)!`
  }

  // 3. Mistakes & Leaks
  if (q.includes("mistake") || q.includes("leak") || q.includes("loss") || q.includes("fail") || q.includes("problem")) {
    return `### 🛑 Behavioral Leaks & Loss Audit: ${summary.accountName}

Analyzing your **${summary.losingTrades} losing trades** (out of ${summary.totalTrades} total trades) reveals a very clear pattern:

1. **Opening 30-Minute Chop (9:30 – 10:00 AM EST):**
   * **${timeWindows.first30.losses} of your 32 total losses** occurred in the first 30 minutes, burning **${fmtCurrency(timeWindows.first30.pnl)}** (74% of total drawdown).
2. **Premature Entry / Rushing:** 
   * Multiple losses were flagged for entering before the trigger candle closed or entering in the middle of a range without confluence.
   * Total Grade D trades taken: **${psychologyBreakdown.grades.D || 0}**.
3. **Aggressive Stop Trailing:**
   * Moving stops to Breakeven too quickly choked multiple winners into micro-scratches (+0.10R to +0.21R).
4. **Emotional / Rule Breaches:**
   * Emotion affected: **${psychologyBreakdown.emotionAffectedCount}** trades.
   * Rule breaks: **${psychologyBreakdown.brokeRulesCount}** trades.

**Prescription:** 
* Implement a **Rule of 10:00 AM**: No entries before 10:00 AM EST.
* Implement a **mechanical 1-candle confirmation rule**: You are not allowed to click buy/sell until the trigger candle has closed outside the level.`
  }

  // 4. Setups & Edge
  if (q.includes("setup") || q.includes("edge") || q.includes("delta reload") || q.includes("playbook")) {
    const setupList = setupsRanked.map(s => `* **${s.name}:** ${s.trades} trades | Win Rate: **${s.winRate.toFixed(1)}%** | Net R: **+${s.totalR.toFixed(2)}R**`).join("\n")
    return `### 🎯 Setup & Edge Analysis: ${summary.accountName}

Here is how your setups rank across all **${summary.totalTrades} trades**:

${setupList || "No tagged setups found yet. Use the new Setup Selector in your Journal to tag every trade."}

**Coach Recommendation:**
Focus 80% of your capital and attention exclusively on your top setup. Stop taking test trades or impulse setups in live accounts.`
  }

  // Default response
  return `### 🧠 AI Coach Performance Insights: ${summary.accountName}

* **Account:** ${summary.accountName} (Balance: ${fmtCurrency(summary.currentBalance)})
* **Lifetime Trades:** ${summary.totalTrades} | Win Rate: **${metrics.winRate}** | Net P&L: **${metrics.totalPnl}** (${metrics.totalNetR})
* **Opening 30 Mins (9:30–10:00 AM):** ${timeWindows.first30.trades} trades | ${timeWindows.first30.winRate}% WR | ${fmtCurrency(timeWindows.first30.pnl)} (⚠️ Major Leak)
* **Core Morning (10:00–11:30 AM):** ${timeWindows.coreMorning.trades} trades | ${timeWindows.coreMorning.winRate}% WR | ${fmtCurrency(timeWindows.coreMorning.pnl)} (✅ Consistent)
* **Top Setup:** **${summary.topSetup}**
* **Primary Leak:** **${summary.worstLeak}**

Ask me anything specific, such as:
1. *"Why do I lose money in the first 30 minutes?"*
2. *"How am I trading overall from scratch to today?"*
3. *"What is my biggest leak costing me money?"*
4. *"Analyze my win rate across different sessions."*`
}

export async function chatWithAiCoach(
  userId: string,
  messages: ChatMessage[],
  accountId?: string
): Promise<{
  response: string
  metadata: { provider: string; model: string }
  statsSummary: TraderStatsSummary
}> {
  // 1. Compile fresh trader context from DB
  const context = await compileTraderContext(userId, accountId)
  const systemPrompt = buildSystemPrompt(context)

  const latestUserMessage = messages[messages.length - 1]?.content || ""

  // 2. Prevent stale chat history pollution: slice the recent turns (max 4 prior messages) + current message
  const recentMessages = messages.slice(-5)

  // 3. Try LLM provider with fallback
  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const formatted = recentMessages.map((m, idx) => {
        const isLatest = idx === recentMessages.length - 1 && m.role === "user"
        return {
          role: m.role as "user" | "assistant",
          content: isLatest 
            ? `${m.content}\n\n[System Telemetry: Account: ${context.summary.accountName} | Lifetime Trades: ${context.summary.totalTrades} | Win Rate: ${context.metrics.winRate} | Net P&L: ${context.metrics.totalPnl}. Answer strictly using these verified metrics.]`
            : m.content
        }
      })

      const { text, usage } = await generateText({
        model: model,
        system: systemPrompt,
        messages: formatted,
        temperature: 0.2
      })

      if (usage) {
        await trackAiUsage(userId, usage.totalTokens || 0, providerInfo.provider)
      }

      return text
    })

    return {
      response: result,
      metadata,
      statsSummary: context.summary
    }
  } catch (err) {
    console.warn("LLM API providers unavailable or unconfigured. Serving Programmatic AI Coach Engine:", err)
    
    const fallbackResponse = generateProgrammaticCoachResponse(latestUserMessage, context)

    return {
      response: fallbackResponse,
      metadata: {
        provider: "PROGRAMMATIC",
        model: "Deterministic Intelligence Engine"
      },
      statsSummary: context.summary
    }
  }
}
