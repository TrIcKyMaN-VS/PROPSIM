import { generateObject } from "ai"
import { getAiProvider, trackAiUsage } from "./provider"
import { z } from "zod"

export const PlaybookMatchSchema = z.object({
  playbookId: z.string().nullable().describe("The ID of the best matching playbook, or null if none match"),
  confidenceScore: z.number().describe("Confidence score between 0.0 and 1.0"),
  reasoning: z.string().describe("Brief explanation of why this playbook was selected")
})

export async function matchTradeToPlaybook(trade: any, playbooks: any[]) {
  if (!playbooks || playbooks.length === 0) {
    return { playbookId: null, confidenceScore: 0, reasoning: "No playbooks available" }
  }

  const playbooksData = playbooks.map(pb => ({
    id: pb.id,
    name: pb.name,
    category: pb.category,
    instrument: pb.instrument,
    session: pb.session,
    entryRules: pb.entryRules
  }))

  try {
    const { model, userId, provider } = await getAiProvider()

    const { object, usage } = await generateObject({
      model: model,
      schema: PlaybookMatchSchema,
      prompt: `You are an AI Playbook Matching Engine. 
      Analyze the following trade:
      Instrument: ${trade.instrument}
      Direction: ${trade.direction}
      PnL: ${trade.pnl}
      Session: ${trade.session}
      
      Here are the user's available playbooks:
      ${JSON.stringify(playbooksData, null, 2)}
      
      Determine which playbook best matches this trade based on the instrument, session, and overall profile.
      If it's a weak match (confidence < 0.5), return null for playbookId.
      `
    })

    if (usage) {
      await trackAiUsage(userId, usage.totalTokens || 0, provider)
    }

    return object
  } catch (err) {
    console.error("Playbook matcher failed. Using default unlinked fallback:", err)
    
    // Programmatic matching based on session or instrument name
    const sessionMatch = playbooks.find(pb => pb.session === trade.session)
    const instrumentMatch = playbooks.find(pb => trade.instrument && pb.instrument && trade.instrument.toLowerCase().includes(pb.instrument.toLowerCase()))
    const match = sessionMatch || instrumentMatch || null
    
    return {
      playbookId: match ? match.id : null,
      confidenceScore: match ? 0.6 : 0.0,
      reasoning: match 
        ? `Programmatic match based on session/instrument alignment (${match.name}).`
        : "No matching playbook setup identified in logs."
    }
  }
}
