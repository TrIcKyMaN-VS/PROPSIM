import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const TherapistSchema = z.object({
  mostCommonEmotion: z.string(),
  mostCommonMistake: z.string(),
  mostProfitableBehavior: z.string(),
  biggestWeakness: z.string(),
  recommendedFocus: z.string().describe("A short actionable therapy goal for next week"),
  summary: z.string().describe("A harsh but fair 2-paragraph evaluation from the AI therapist")
})

export async function generateTherapistSession(psychologyLogs: any[], trades: any[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the AI Therapist")
  }

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

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: TherapistSchema,
    prompt: `You are an elite Trading Therapist for a prop firm trader.
    Analyze the following recent trades and their psychological data.
    Identify self-sabotaging behaviors, fear/greed cycles, and rule breaking.
    
    Data:
    ${JSON.stringify(payload, null, 2)}
    `
  })

  return object
}
