import { createOpenAI } from "@ai-sdk/openai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"
import { decrypt } from "@/lib/encryption"

const prisma = new PrismaClient()

export async function getAiProvider() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized AI request. Please log in.")
  }

  const userId = session.user.id

  const settings = await prisma.userAiSettings.findUnique({
    where: { userId }
  })

  // If user has Personal Key mode active
  if (settings && settings.provider === "OPENAI" && settings.openaiKey) {
    try {
      const decryptedKey = decrypt(settings.openaiKey)
      const personalOpenAi = createOpenAI({ apiKey: decryptedKey })
      return { model: personalOpenAi("gpt-4o"), userId, mode: "PERSONAL" }
    } catch (err) {
      console.error("Failed to decrypt personal API key for user", userId)
      throw new Error("Failed to load your personal API key. Please re-enter it in Settings.")
    }
  }

  // Fallback to PROPSIM Managed Key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("PROPSIM API Key is not configured and no personal key was provided.")
  }

  const defaultOpenAi = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return { model: defaultOpenAi("gpt-4o"), userId, mode: "PROPSIM" }
}

export async function trackAiUsage(userId: string, estimatedTokens: number) {
  // Approximate cost for GPT-4o: ~$0.01 per 1k tokens combined roughly for simplistic tracking
  const estimatedCost = (estimatedTokens / 1000) * 0.01

  await prisma.userAiSettings.upsert({
    where: { userId },
    update: {
      totalRequests: { increment: 1 },
      totalTokens: { increment: estimatedTokens },
      estimatedCost: { increment: estimatedCost },
      lastUsage: new Date()
    },
    create: {
      userId,
      provider: "PROPSIM",
      totalRequests: 1,
      totalTokens: estimatedTokens,
      estimatedCost: estimatedCost,
      lastUsage: new Date()
    }
  })
}
