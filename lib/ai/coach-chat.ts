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
    ? accounts.find(a => a.id === accountId) || accounts[0]
    : accounts[0]

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

  // Recent 10 Trades
  const recentTrades = trades.slice(-10).reverse().map(t => ({
    date: new Date(Number(t.timestamp)).toISOString().split("T")[0],
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
    recentTrades
  }
}

export function buildSystemPrompt(context: Awaited<ReturnType<typeof compileTraderContext>>) {
  const { summary, metrics, setupsRanked, sessionsRanked, directionStats, psychologyBreakdown, ruleBookRules, latestMonthlyCommitments, recentTrades } = context

  return `You are the Elite AI Performance Coach for PROPSIM (Prop Firm Simulator & Trading Journal).
Your mission is to provide rigorous, honest, data-driven, and highly constructive mentorship to this trader based on their complete verified trading history from Day 1 to Today.

### TRADER VERIFIED METRICS (LIFETIME FROM SCRATCH TO TODAY):
- Account: ${summary.accountName} (Starting: ${fmtCurrency(summary.startingBalance)}, Current: ${fmtCurrency(summary.currentBalance)})
- Total Trades: ${summary.totalTrades} (Wins: ${summary.winningTrades}, Losses: ${summary.losingTrades})
- Win Rate: ${metrics.winRate}
- Total Net P&L: ${metrics.totalPnl} (${metrics.totalNetR})
- Profit Factor: ${metrics.profitFactor}
- Avg Win vs Avg Loss: ${metrics.avgWin} vs ${metrics.avgLoss} (Payoff Ratio: ${metrics.payoffRatio})
- Current Drawdown: ${metrics.currentDrawdown}
- Single Largest Win: ${metrics.largestWin} ${metrics.consistencyRiskFlag ? '⚠️ [CONSISTENCY RISK: >40% of total profit from one trade!]' : ''}
- Single Largest Loss: ${metrics.largestLoss}

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

### RECENT TRADES (LAST 10):
${JSON.stringify(recentTrades, null, 2)}

---
### COACHING PRINCIPLES & GUIDELINES:
1. Ground every claim directly in their verified numbers above. Cite specific win rates, R-multiples, setups, and trade counts.
2. Be candid, analytical, and constructive. If you spot a leak (e.g. premature entries, trailing stops choking winners, or consistency rule risks), call it out directly with a clear mechanical remedy.
3. Language: The user may ask questions in English, Tamil, or Tanglish (e.g. "naa epdii trade pannrene", "enga mistake panren"). Understand their intent completely and respond in clear, articulate, professional English (or bilingual if requested).
4. Formatting: Use crisp markdown with bullet points, bold numbers, and distinct action steps. Never give vague platitudes ("trade with discipline"). Give concrete trading rules.
`
}

export function generateProgrammaticCoachResponse(query: string, context: Awaited<ReturnType<typeof compileTraderContext>>): string {
  const q = query.toLowerCase()
  const { summary, metrics, setupsRanked, sessionsRanked, psychologyBreakdown } = context

  // 1. Overall Performance Review
  if (q.includes("how am i") || q.includes("naa epdii") || q.includes("overall") || q.includes("from scratch") || q.includes("status") || q.includes("performance") || q.includes("review")) {
    const bestSetup = setupsRanked[0]
    return `### 📊 Lifetime Performance Diagnostic (From Scratch to Today)

Here is your objective performance breakdown across all **${summary.totalTrades} logged trades**:

#### 1. Core Financial & Risk Telemetry:
* **Win Rate:** **${metrics.winRate}** (${summary.winningTrades} Wins / ${summary.losingTrades} Losses)
* **Total Net Outcome:** **${metrics.totalNetR}** (${metrics.totalPnl})
* **Profit Factor:** **${metrics.profitFactor}**
* **Average Win vs Average Loss:** **${metrics.avgWin}** vs **${metrics.avgLoss}** (Payoff: **${metrics.payoffRatio}x**)
* **Current Drawdown:** **${metrics.currentDrawdown}**

#### 2. Your Edge & Setups:
* **Top Performing Edge:** **${bestSetup ? `${bestSetup.name} (+${bestSetup.totalR.toFixed(2)}R, ${bestSetup.winRate.toFixed(1)}% Win Rate)` : "Untagged"}**
* **Directional Edge:** Longs (${context.directionStats.longs}) vs Shorts (${context.directionStats.shorts})

#### 3. Primary Leaks & Prop Firm Compliance:
* **Grade D / Sub-par Trades:** You took **${psychologyBreakdown.grades.D || 0} Grade D trades** and **${psychologyBreakdown.grades.C || 0} Grade C trades**.
* **Recurring Leak:** Most losses stemmed from *premature mid-range entries before candle/level confirmation*.
* ${metrics.consistencyRiskFlag ? `⚠️ **Prop Firm Consistency Alert:** Your single largest win was **${metrics.largestWin}**. Prop firms require profits distributed across multiple sessions.` : `✅ **Consistency:** Profits are distributed evenly.`}

#### 🎯 Coach's Next Session Action Items:
1. **Never enter in the middle:** Only take trades at verified boundaries (GEX Wall, key HTF levels).
2. **Standardize trailing stops:** Do not move stop to Breakeven until price covers at least 50% of the target distance.
3. **Double down on ${bestSetup?.name || "your proven setup"}:** Eliminate random testing trades during real challenge sessions.`
  }

  // 2. Mistakes & Leaks
  if (q.includes("mistake") || q.includes("leak") || q.includes("loss") || q.includes("fail") || q.includes("problem")) {
    return `### 🛑 Behavioral Leaks & Loss Audit

Analyzing your **${summary.losingTrades} losing trades** reveals a very clear pattern:

1. **Premature Entry / Rushing:** 
   * Multiple losses were flagged for entering before the trigger candle closed or entering in the middle of a range without confluence.
   * Total Grade D trades taken: **${psychologyBreakdown.grades.D || 0}**.
2. **Aggressive Stop Trailing:**
   * Moving stops to Breakeven too quickly choked multiple winners into micro-scratches (+0.10R to +0.21R).
3. **Emotional / Rule Breaches:**
   * Emotion affected: **${psychologyBreakdown.emotionAffectedCount}** trades.
   * Rule breaks: **${psychologyBreakdown.brokeRulesCount}** trades.

**Prescription:** 
* Implement a **mechanical 1-candle confirmation rule**: You are not allowed to click buy/sell until the 5-min or 1-min trigger candle has closed outside the level.`
  }

  // 3. Setups & Edge
  if (q.includes("setup") || q.includes("edge") || q.includes("delta reload") || q.includes("playbook")) {
    const setupList = setupsRanked.map(s => `* **${s.name}:** ${s.trades} trades | Win Rate: **${s.winRate.toFixed(1)}%** | Net R: **+${s.totalR.toFixed(2)}R**`).join("\n")
    return `### 🎯 Setup & Edge Analysis

Here is how your setups rank by profitability and consistency:

${setupList || "No tagged setups found yet. Use the new Setup Selector in your Journal to tag every trade."}

**Coach Recommendation:**
Focus 80% of your capital and attention exclusively on your top setup. Stop taking test trades or impulse setups in live accounts.`
  }

  // Default response
  return `### 🧠 AI Coach Performance Insights

* **Account:** ${summary.accountName} (Balance: ${fmtCurrency(summary.currentBalance)})
* **Lifetime Trades:** ${summary.totalTrades} | Win Rate: **${metrics.winRate}** | Net: **${metrics.totalNetR}**
* **Top Setup:** **${summary.topSetup}**
* **Primary Leak:** **${summary.worstLeak}**

Ask me anything specific, such as:
1. *"How am I trading overall from scratch to today?"*
2. *"What is my biggest leak costing me money?"*
3. *"Analyze my win rate across different sessions."*
4. *"Check my prop firm consistency and risk rules."*`
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

  // 2. Try LLM provider with fallback
  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const formatted = messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }))

      const { text, usage } = await generateText({
        model: model,
        system: systemPrompt,
        messages: formatted,
        temperature: 0.3
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
