import { generateObject } from "ai"
import { z } from "zod"
import { runWithAiFallback, trackAiUsage } from "./provider"

export const MistakeDetectorSchema = z.object({
  traderDna: z.object({
    style: z.enum([
      "Scalper",
      "Momentum Trader",
      "Breakout Trader",
      "Reversal Trader",
      "Trend Follower",
      "Mean Reversion Trader"
    ]),
    confidenceScore: z.number().min(0).max(100),
    explanation: z.string().describe("Explanation for this DNA classification")
  }),
  mistakes: z.array(z.object({
    type: z.enum([
      "FOMO Entries",
      "Revenge Trading",
      "Chasing",
      "Overtrading",
      "Early Exits",
      "Late Exits",
      "Rule Violations",
      "Trading During Low Edge Conditions"
    ]),
    description: z.string(),
    estimatedCost: z.number().describe("Estimated monetary cost of this mistake"),
    occurrences: z.number()
  })),
  psychology: z.object({
    tiltDetected: z.boolean(),
    emotionalTradingDetected: z.boolean(),
    inconsistentRiskDetected: z.boolean(),
    impulsiveEntriesDetected: z.boolean(),
    revengeTradingCyclesDetected: z.boolean(),
    lossChasingDetected: z.boolean(),
    analysis: z.string().describe("A summary of the psychology and behavioral cycles found")
  }),
  weeklyCoachReport: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    biggestMistake: z.string(),
    bestSetup: z.string(),
    worstHabit: z.string(),
    improvementPlan: z.array(z.string()).describe("A list of concrete steps for the trader to work on")
  }),
  monthlyCoachReport: z.object({
    monthlyGrade: z.enum(["A+", "A", "B+", "B", "C+", "C", "D", "F"]),
    consistencyScore: z.number().min(0).max(100),
    disciplineScore: z.number().min(0).max(100),
    riskManagementScore: z.number().min(0).max(100),
    propFirmSurvivalScore: z.number().min(0).max(100).describe("Overall probability of passing challenge")
  })
})

export type MistakeDetectorReport = z.infer<typeof MistakeDetectorSchema> & {
  isFallback: boolean
  metadata: {
    provider: "GEMINI" | "OPENAI" | "PROGRAMMATIC"
    model: string
  }
}

export function generateProgrammaticFallback(trades: any[], psychologyLogs: any[] = []): z.infer<typeof MistakeDetectorSchema> {
  const totalTrades = trades.length
  if (totalTrades === 0) {
    return {
      traderDna: { style: "Momentum Trader", confidenceScore: 50, explanation: "No trade data available." },
      mistakes: [],
      psychology: { tiltDetected: false, emotionalTradingDetected: false, inconsistentRiskDetected: false, impulsiveEntriesDetected: false, revengeTradingCyclesDetected: false, lossChasingDetected: false, analysis: "No psychology logs found." },
      weeklyCoachReport: { strengths: [], weaknesses: [], biggestMistake: "None", bestSetup: "None", worstHabit: "None", improvementPlan: [] },
      monthlyCoachReport: { monthlyGrade: "B", consistencyScore: 100, disciplineScore: 90, riskManagementScore: 85, propFirmSurvivalScore: 75 }
    }
  }

  // 1. Calculate trader DNA based on duration
  let totalDurationMs = 0
  let validDurationsCount = 0
  trades.forEach(t => {
    if (t.exitTime && t.timestamp) {
      const dur = Number(t.exitTime) - Number(t.timestamp)
      if (dur > 0) {
        totalDurationMs += dur
        validDurationsCount++
      }
    }
  })
  const avgDurationMins = validDurationsCount ? (totalDurationMs / validDurationsCount) / 60000 : 10
  
  let dnaStyle: "Scalper" | "Momentum Trader" | "Breakout Trader" | "Reversal Trader" | "Trend Follower" | "Mean Reversion Trader" = "Momentum Trader"
  let dnaExplanation = "Displays a momentum-focused profile executing short-to-mid term trade setups."
  
  if (avgDurationMins < 3) {
    dnaStyle = "Scalper"
    dnaExplanation = "Scalper profile programmatically identified: rapid trade entries and exits with average holding times under 3 minutes."
  } else if (avgDurationMins > 60) {
    dnaStyle = "Trend Follower"
    dnaExplanation = "Trend Follower profile programmatically identified: patient holding times averaging over an hour to capture structural market runs."
  }

  // Calculate averages
  const avgDiscipline = Math.round(trades.reduce((s, t) => s + (t.disciplineScore ?? 90), 0) / totalTrades)
  const avgRisk = Math.round(trades.reduce((s, t) => s + (t.riskScore ?? 85), 0) / totalTrades)
  const avgSetup = Math.round(trades.reduce((s, t) => s + (t.setupQualityScore ?? 70), 0) / totalTrades)

  // 2. Programmatic mistakes detection
  const mistakesList: Array<{
    type: "FOMO Entries" | "Revenge Trading" | "Chasing" | "Overtrading" | "Early Exits" | "Late Exits" | "Rule Violations" | "Trading During Low Edge Conditions"
    description: string
    estimatedCost: number
    occurrences: number
  }> = []

  const mistakeDefs = [
    {
      type: "FOMO Entries" as const,
      desc: "Entering trades out of fear of missing the move.",
      filter: (t: any, p: any) => p?.preFeeling?.toLowerCase().includes("fomo") || p?.hesitated
    },
    {
      type: "Revenge Trading" as const,
      desc: "Over-leveraging or entering trades in frustration after a loss.",
      filter: (t: any, p: any) => p?.emotionAffected && p?.brokeRules
    },
    {
      type: "Chasing" as const,
      desc: "Buying near local highs or selling near local lows.",
      filter: (t: any, p: any) => p?.hesitated || (t.entryQualityScore && t.entryQualityScore < 60)
    },
    {
      type: "Overtrading" as const,
      desc: "Executing more than 5 trades in a single session.",
      filter: (t: any, p: any) => {
        const dayTrades = trades.filter(x => x.day === t.day)
        return dayTrades.length > 5
      }
    },
    {
      type: "Early Exits" as const,
      desc: "Cutting winning trades short before reaching planned targets.",
      filter: (t: any, p: any) => p?.exitReason?.toLowerCase().includes("early") || (t.exitQualityScore && t.exitQualityScore < 60)
    },
    {
      type: "Late Exits" as const,
      desc: "Failing to cut losses or letting trades run past stops.",
      filter: (t: any, p: any) => p?.exitReason?.toLowerCase().includes("late") || p?.movedStop
    },
    {
      type: "Rule Violations" as const,
      desc: "Executing entries or sizing that explicitly violates rules.",
      filter: (t: any, p: any) => p?.brokeRules
    },
    {
      type: "Trading During Low Edge Conditions" as const,
      desc: "Trading in slow or unpredictable market sessions.",
      filter: (t: any, p: any) => {
        const sessionTrades = trades.filter(x => x.session === t.session)
        const sessionPnl = sessionTrades.reduce((s, x) => s + x.pnl, 0)
        return sessionPnl < 0
      }
    }
  ]

  mistakeDefs.forEach(def => {
    const matching = trades.filter(t => {
      const p = psychologyLogs.find(x => x.tradeId === t.id)
      return def.filter(t, p)
    })

    if (matching.length > 0) {
      const cost = matching.reduce((s, t) => s + (t.pnl < 0 ? Math.abs(t.pnl) : 0), 0)
      mistakesList.push({
        type: def.type,
        description: def.desc + " Programmatically identified from journal tags and checklist metrics.",
        estimatedCost: Math.round(cost),
        occurrences: matching.length
      })
    }
  })

  // 3. Psychology flags
  const tilt = psychologyLogs.some(p => p.emotionAffected && p.brokeRules)
  const emotional = psychologyLogs.some(p => p.emotionAffected)
  const inconsistentRisk = psychologyLogs.some(p => p.addedSize || p.movedStop)
  const impulsive = psychologyLogs.some(p => p.hesitated)
  const revenge = mistakesList.some(m => m.type === "Revenge Trading")
  const lossChasing = psychologyLogs.some(p => p.movedStop || p.addedSize)

  let psyAnalysis = "Your psychology logs indicate stable discipline. Risk limits are respected."
  if (tilt || emotional || revenge) {
    psyAnalysis = "Behavioral flags detected. Signs of emotional trading or rule breaks were registered in your trade psychology logs. Maintain strict risk protocols."
  }

  // 4. Weekly Coach Report
  const strengths = ["Good execution consistency", "Clear playbook alignment on core setups"]
  if (avgDiscipline > 85) strengths.push("Strong rule compliance scores")
  if (avgRisk > 85) strengths.push("Effective stop-loss placement")

  const weaknesses = mistakesList.map(m => m.type)
  const sortedMistakes = [...mistakesList].sort((a, b) => b.estimatedCost - a.estimatedCost)
  const biggestMistake = sortedMistakes.length > 0 ? sortedMistakes[0].type : "None"
  
  // Best setup
  const playbookMap: Record<string, number> = {}
  trades.forEach(t => {
    const name = t.playbookName || "Unlinked"
    playbookMap[name] = (playbookMap[name] || 0) + t.pnl
  })
  const bestSetup = Object.keys(playbookMap).length > 0
    ? Object.entries(playbookMap).sort((a, b) => b[1] - a[1])[0][0]
    : "None"

  const worstHabit = sortedMistakes.length > 0 ? sortedMistakes[0].type : "None"
  
  const improvementPlan = [
    "Review your checklist rules before entering any position.",
    "Place a hard daily trade limit to prevent overtrading.",
    "Log your pre-trade emotional states on every execution."
  ]

  // 5. Monthly Report
  let grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F" = "B"
  if (avgDiscipline >= 95) grade = "A+"
  else if (avgDiscipline >= 90) grade = "A"
  else if (avgDiscipline >= 85) grade = "B+"
  else if (avgDiscipline >= 80) grade = "B"
  else if (avgDiscipline >= 70) grade = "C+"
  else if (avgDiscipline >= 60) grade = "C"
  else if (avgDiscipline >= 50) grade = "D"
  else grade = "F"

  // Survival score
  let survivalScore = 75
  const wr = totalTrades ? (trades.filter(t => t.pnl > 0).length / totalTrades) * 100 : 0
  if (wr < 40) survivalScore -= 15
  else if (wr > 55) survivalScore += 10

  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl < 0)
  const grossW = wins.reduce((s, t) => s + t.pnl, 0)
  const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const pf = grossL ? grossW / grossL : (grossW > 0 ? 3.0 : 1.0)
  if (pf < 1.0) survivalScore -= 20
  else if (pf > 1.8) survivalScore += 12

  survivalScore = Math.min(100, Math.max(0, Math.round(survivalScore)))

  return {
    traderDna: {
      style: dnaStyle,
      confidenceScore: 70,
      explanation: dnaExplanation
    },
    mistakes: mistakesList,
    psychology: {
      tiltDetected: tilt,
      emotionalTradingDetected: emotional,
      inconsistentRiskDetected: inconsistentRisk,
      impulsiveEntriesDetected: impulsive,
      revengeTradingCyclesDetected: revenge,
      lossChasingDetected: lossChasing,
      analysis: psyAnalysis
    },
    weeklyCoachReport: {
      strengths,
      weaknesses: weaknesses.slice(0, 3),
      biggestMistake,
      bestSetup,
      worstHabit,
      improvementPlan
    },
    monthlyCoachReport: {
      monthlyGrade: grade,
      consistencyScore: 85,
      disciplineScore: avgDiscipline,
      riskManagementScore: avgRisk,
      propFirmSurvivalScore: survivalScore
    }
  }
}

export async function detectMistakesAndDna(trades: any[], psychologyLogs: any[] = [], userId: string) {
  if (trades.length < 1) {
    throw new Error("Log at least one trade to generate an AI analysis.")
  }

  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const recentTrades = trades.slice(0, 50).map(t => ({
        id: t.id,
        pnl: t.pnl,
        direction: t.direction,
        instrument: t.instrument,
        session: t.session,
        contracts: t.contracts,
        entryPrice: t.entry,
        exitPrice: t.exit,
        stopLoss: t.stopLoss || null,
        setupQualityScore: t.setupQualityScore,
        entryQualityScore: t.entryQualityScore,
        exitQualityScore: t.exitQualityScore,
        riskScore: t.riskScore,
        disciplineScore: t.disciplineScore,
        durationMs: t.exitTime ? Number(t.exitTime) - Number(t.timestamp) : null
      }))

      const psyPayload = psychologyLogs.slice(0, 50).map(p => ({
        tradeId: p.tradeId,
        preFeeling: p.preFeeling,
        preNotes: p.preNotes,
        hesitated: p.hesitated,
        movedStop: p.movedStop,
        movedTarget: p.movedTarget,
        addedSize: p.addedSize,
        emotionAffected: p.emotionAffected,
        brokeRules: p.brokeRules,
        exitReason: p.exitReason
      }))

      const { object, usage } = await generateObject({
        model: model,
        schema: MistakeDetectorSchema,
        prompt: `You are an elite, world-class AI Trading Coach for a prop firm trader.
        Analyze the following recent trades and trader psychology logs.
        Identify systematic behavioral mistakes, psychology issues, trade DNA profile, and coach reports.
        
        Trades:
        ${JSON.stringify(recentTrades, null, 2)}
        
        Psychology Logs:
        ${JSON.stringify(psyPayload, null, 2)}
        
        Instructions:
        1. DNA Style: Select the closest profile matching the trader's average hold time and setup:
           - Scalper: holds for seconds/minutes
           - Momentum Trader: chases rapid expansion
           - Breakout Trader: buys key level breaches
           - Reversal Trader: tops and bottoms
           - Trend Follower: stays with dominant structure
           - Mean Reversion Trader: fades extremes
        2. Mistakes: Identify specific occurrences of systematic mistakes and calculate their estimated monetary cost:
           - FOMO Entries
           - Revenge Trading
           - Chasing
           - Overtrading
           - Early Exits
           - Late Exits
           - Rule Violations
           - Trading During Low Edge Conditions
        3. Psychology: Detect signs of Tilt, Emotional Trading, Inconsistent Risk, Impulsive Entries, Revenge Trading Cycles, and Loss Chasing.
        4. Weekly Coach Report: Identify Strengths, Weaknesses, Biggest Mistake, Best Setup, Worst Habit, and a concrete Improvement Plan.
        5. Monthly Coach Report: Rate the trader's Month Grade (A+ to F), Consistency, Discipline, Risk Management, and a Prop Firm Survival Score (0-100 overall probability of passing a challenge based on drawdown, consistency, rule violations, and risk controls).
        `
      })

      if (usage) {
        await trackAiUsage(userId, usage.totalTokens || 0, providerInfo.provider)
      }

      return object
    })

    return {
      ...result,
      isFallback: false,
      metadata
    }
  } catch (err) {
    console.error("AI Coach Engine failed. Generating Programmatic Fallback Report:", err)
    const fallback = generateProgrammaticFallback(trades, psychologyLogs)
    return {
      ...fallback,
      isFallback: true,
      metadata: {
        provider: "PROGRAMMATIC" as const,
        model: "Programmatic Engine"
      }
    }
  }
}
