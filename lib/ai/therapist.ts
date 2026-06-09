import { generateObject } from "ai"
import { z } from "zod"
import { getAiProvider, trackAiUsage } from "./provider"

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

export async function generateTherapistSession(psychologyLogs: any[], trades: any[]) {
  const { model, userId } = await getAiProvider()

  // Combine trades and psychology data to feed the AI
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
  }).slice(0, 50) // limit context window

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
    await trackAiUsage(userId, usage.totalTokens)
  }

  return object
}

export const DailyReviewSchema = z.object({
  summary: z.string().describe("A short summary paragraph of the day's performance (2 sentences max)"),
  bestDecision: z.string().describe("What was the single best decision of the day"),
  worstDecision: z.string().describe("What was the single worst decision of the day")
})

export async function generateDailyReview(trades: any[]) {
  const { model, userId } = await getAiProvider()

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
    await trackAiUsage(userId, usage.totalTokens)
  }

  return object
}

export const MonthlySummarySchema = z.object({
  summary: z.string().describe("A 3-sentence summary of the month's trading behavior and focus goals")
})

export async function generateMonthlySummary(trades: any[]) {
  const { model, userId } = await getAiProvider()

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
    await trackAiUsage(userId, usage.totalTokens)
  }

  return object
}
