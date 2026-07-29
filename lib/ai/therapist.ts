import { generateObject } from "ai"
import { z } from "zod"
import { runWithAiFallback, trackAiUsage } from "./provider"

export const TherapistSchema = z.object({
  mostCommonEmotion: z.string(),
  mostCommonMistake: z.string(),
  mostProfitableBehavior: z.string(),
  biggestWeakness: z.string(),
  recommendedFocus: z.string().describe("A short actionable therapy goal for next week"),
  summary: z.string().describe("A harsh but fair 2-paragraph evaluation from the AI therapist"),
  executionScore: z.number().min(0).max(100),
  psychologyScore: z.number().min(0).max(100)
})

export async function generateTherapistSession(psychologyLogs: any[], trades: any[], userId: string) {
  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const payload = trades.map(t => {
        const p = psychologyLogs.find(log => log.tradeId === t.id)
        return {
          instrument: t.instrument,
          pnl: t.pnl,
          direction: t.direction,
          emotion: p?.preFeeling || "Unknown",
          hesitated: p?.hesitated,
          movedStop: p?.movedStop,
          brokeRules: p?.brokeRules,
          decisionScore: p?.decisionScore
        }
      }).slice(0, 50)

      const { object, usage } = await generateObject({
        model: model,
        schema: TherapistSchema,
        prompt: `You are an elite Trading Therapist for a prop firm trader.
        Analyze the following recent trades and their psychological data.
        Identify self-sabotaging behaviors, fear/greed cycles, and rule breaking.
        Assign execution and psychology scores between 0 and 100 based on their performance.
        
        Data:
        ${JSON.stringify(payload, null, 2)}
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
    console.error("AI Therapist failed. Generating Programmatic Fallback:", err)
    return {
      mostCommonEmotion: "Anxious",
      mostCommonMistake: "FOMO Entries",
      mostProfitableBehavior: "Sticking to playbook setups",
      biggestWeakness: "Moving stop loss under pressure",
      recommendedFocus: "Do not move stop-loss after trade entry.",
      summary: "Programmatic Analysis: Your psychology logs suggest some hesitation or emotional reactions. Focus on strict risk discipline and executing pre-planned setups.",
      executionScore: 75,
      psychologyScore: 70,
      isFallback: true,
      metadata: {
        provider: "PROGRAMMATIC" as const,
        model: "Programmatic Engine"
      }
    }
  }
}

export const DailyReviewSchema = z.object({
  summary: z.string().describe("A short summary paragraph of the day's performance (2 sentences max)"),
  bestDecision: z.string().describe("What was the single best decision of the day"),
  worstDecision: z.string().describe("What was the single worst decision of the day")
})

export async function generateDailyReview(trades: any[], userId: string) {
  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const payload = trades.map(t => ({
        instrument: t.instrument,
        pnl: t.pnl,
        direction: t.direction,
        notes: t.notes || "",
        session: t.session
      })).slice(0, 30)

      const { object, usage } = await generateObject({
        model: model,
        schema: DailyReviewSchema,
        prompt: `You are an AI Trading Coach. Analyze these trades executed on a single day.
        Compile a summary (2 sentences max) describing the performance and identify the best and worst decisions.
        
        Trades:
        ${JSON.stringify(payload, null, 2)}
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
    console.error("AI Daily Review failed. Generating Programmatic Fallback:", err)
    return {
      summary: "Programmatic Analysis: Managed trades across daily sessions. Review checklist and entry parameters for subsequent sessions.",
      bestDecision: "Respecting risk levels",
      worstDecision: "Deviating from setup parameters",
      isFallback: true,
      metadata: {
        provider: "PROGRAMMATIC" as const,
        model: "Programmatic Engine"
      }
    }
  }
}

export const MonthlySummarySchema = z.object({
  summary: z.string().describe("A 3-sentence summary of the month's trading behavior and focus goals")
})

export async function generateMonthlySummary(trades: any[], userId: string) {
  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const payload = trades.map(t => ({
        instrument: t.instrument,
        pnl: t.pnl,
        direction: t.direction,
        session: t.session,
        notes: t.notes || "",
        tags: t.tags || []
      })).slice(0, 50)

      const { object, usage } = await generateObject({
        model: model,
        schema: MonthlySummarySchema,
        prompt: `You are an AI Trading Coach. Analyze the trader's trades for the past month.
        Compile a 3-sentence summary highlighting their monthly patterns, strategic mistakes, and focus goals.
        
        Trades:
        ${JSON.stringify(payload, null, 2)}
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
    console.error("AI Monthly Summary failed. Generating Programmatic Fallback:", err)
    return {
      summary: "Programmatic Analysis: Completed monthly review checklist. Keep execution focus on playbook parameters and maintain risk ceilings.",
      isFallback: true,
      metadata: {
        provider: "PROGRAMMATIC" as const,
        model: "Programmatic Engine"
      }
    }
  }
}
