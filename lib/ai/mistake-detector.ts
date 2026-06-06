import { generateObject } from "ai"
import { z } from "zod"
import { getAiProvider, trackAiUsage } from "./provider"

export const MistakeDetectorSchema = z.object({
  mistakes: z.array(z.object({
    type: z.string().describe("Type of mistake e.g. Revenge Trading, Overtrading, Holding Losers"),
    description: z.string(),
    estimatedCost: z.number().describe("Estimated monetary cost of this mistake"),
    occurrences: z.number().describe("Number of times this mistake pattern was detected")
  })),
  traderDna: z.object({
    style: z.string().describe("e.g. Scalper, Momentum Trader, Trend Trader"),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    bestSession: z.string(),
    recommendedAccountSize: z.string()
  })
})

export async function detectMistakesAndDna(trades: any[]) {
  if (trades.length < 5) {
    throw new Error("Not enough trades to analyze DNA. Minimum 5 trades required.")
  }

  const { model, userId } = await getAiProvider()

  // Sample up to 50 recent trades to save context limit
  const recentTrades = trades.slice(0, 50).map(t => ({
    id: t.id,
    pnl: t.pnl,
    direction: t.direction,
    instrument: t.instrument,
    session: t.session,
    durationMs: t.exitTime ? t.exitTime - t.timestamp : 0 // hypothetical field
  }))

  const { object, usage } = await generateObject({
    model: model,
    schema: MistakeDetectorSchema,
    prompt: `You are an AI Trading Coach and Mistake Detector.
    Analyze the following recent trades to determine the trader's DNA and identify any systematic mistakes.
    
    Look for:
    - Revenge Trading: Multiple losses in quick succession on the same instrument.
    - Holding Losers: A few massive losses that wipe out many small wins.
    - Overtrading: An excessive amount of trades in one session.
    
    Calculate an estimated monetary cost for these mistakes.
    Determine their style (Scalper, Swing, etc.) based on trade duration/frequency.
    
    Trades:
    ${JSON.stringify(recentTrades, null, 2)}
    `
  })

  if (usage) {
    await trackAiUsage(userId, usage.totalTokens)
  }

  return object
}
