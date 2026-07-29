import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"
import { decrypt } from "@/lib/encryption"

const prisma = new PrismaClient()

export interface AiProviderMetadata {
  provider: "GEMINI" | "OPENAI" | "PROGRAMMATIC"
  model: string
}

export interface AiCandidate {
  type: string
  provider: "GEMINI" | "OPENAI"
  modelName: string
  getKey: () => Promise<string | null | undefined>
  createModel: (key: string) => any
}

export async function getAiProvider() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(session.user as any).id) {
    throw new Error("Unauthorized AI request. Please log in.")
  }

  const userId = (session.user as any).id

  const settings = await prisma.userAiSettings.findUnique({
    where: { userId }
  }).catch(() => null)

  // 1. User Gemini
  if (settings?.geminiKey) {
    try {
      const key = decrypt(settings.geminiKey)
      const google = createGoogleGenerativeAI({ apiKey: key })
      return { model: google("gemini-2.5-flash"), userId, provider: "GEMINI" as const, modelName: "gemini-2.5-flash" }
    } catch {}
  }
  // 2. User OpenAI
  if (settings?.openaiKey) {
    try {
      const key = decrypt(settings.openaiKey)
      const openai = createOpenAI({ apiKey: key })
      return { model: openai("gpt-4o"), userId, provider: "OPENAI" as const, modelName: "gpt-4o" }
    } catch {}
  }
  // 3. Server Gemini
  const serverGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (serverGeminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: serverGeminiKey })
    return { model: google("gemini-2.5-flash"), userId, provider: "GEMINI" as const, modelName: "gemini-2.5-flash" }
  }
  // 4. Server OpenAI
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return { model: openai("gpt-4o"), userId, provider: "OPENAI" as const, modelName: "gpt-4o" }
  }

  throw new Error("No AI provider key is configured.")
}

export async function runWithAiFallback<T>(
  userId: string,
  executeFn: (model: any, providerInfo: { provider: "GEMINI" | "OPENAI"; modelName: string }) => Promise<T>
): Promise<{ result: T; metadata: AiProviderMetadata }> {
  // Query settings once
  const settings = await prisma.userAiSettings.findUnique({
    where: { userId }
  }).catch(() => null)

  const candidates: AiCandidate[] = [
    {
      type: "User Gemini Key",
      provider: "GEMINI",
      modelName: "gemini-2.5-flash",
      getKey: async () => {
        if (settings?.geminiKey) {
          try {
            return decrypt(settings.geminiKey)
          } catch {
            return null
          }
        }
        return null
      },
      createModel: (key: string) => {
        const google = createGoogleGenerativeAI({ apiKey: key })
        return google("gemini-2.5-flash")
      }
    },
    {
      type: "User OpenAI Key",
      provider: "OPENAI",
      modelName: "gpt-4o",
      getKey: async () => {
        if (settings?.openaiKey) {
          try {
            return decrypt(settings.openaiKey)
          } catch {
            return null
          }
        }
        return null
      },
      createModel: (key: string) => {
        const openai = createOpenAI({ apiKey: key })
        return openai("gpt-4o")
      }
    },
    {
      type: "Server Gemini Key",
      provider: "GEMINI",
      modelName: "gemini-2.5-flash",
      getKey: async () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null,
      createModel: (key: string) => {
        const google = createGoogleGenerativeAI({ apiKey: key })
        return google("gemini-2.5-flash")
      }
    },
    {
      type: "Server OpenAI Key",
      provider: "OPENAI",
      modelName: "gpt-4o",
      getKey: async () => process.env.OPENAI_API_KEY || null,
      createModel: (key: string) => {
        const openai = createOpenAI({ apiKey: key })
        return openai("gpt-4o")
      }
    }
  ]

  for (const candidate of candidates) {
    const key = await candidate.getKey()
    if (!key) {
      continue
    }

    try {
      const model = candidate.createModel(key)
      const result = await executeFn(model, { provider: candidate.provider, modelName: candidate.modelName })
      return {
        result,
        metadata: {
          provider: candidate.provider,
          model: candidate.modelName
        }
      }
    } catch (err: any) {
      console.warn(`AI Provider failed [${candidate.type}]:`, err?.message || err)
    }
  }

  throw new Error("All AI providers failed or are unconfigured.")
}

export async function trackAiUsage(userId: string, estimatedTokens: number, provider: "GEMINI" | "OPENAI") {
  const isGemini = provider === "GEMINI"
  const estimatedCost = isGemini 
    ? (estimatedTokens / 1000) * 0.000075 
    : (estimatedTokens / 1000) * 0.01

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
      provider: isGemini ? "GEMINI" : "OPENAI",
      totalRequests: 1,
      totalTokens: estimatedTokens,
      estimatedCost: estimatedCost,
      lastUsage: new Date()
    }
  }).catch(() => null)
}
