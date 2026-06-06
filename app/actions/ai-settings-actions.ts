"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { encrypt } from "@/lib/encryption"

const prisma = new PrismaClient()

export async function getUserAiSettings() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const settings = await prisma.userAiSettings.findUnique({
    where: { userId: session.user.id }
  })

  if (!settings) {
    return {
      provider: "PROPSIM",
      hasOpenaiKey: false,
      hasAnthropicKey: false,
      hasGeminiKey: false
    }
  }

  // Never return the actual keys to the frontend! Only boolean flags.
  return {
    provider: settings.provider,
    hasOpenaiKey: !!settings.openaiKey,
    hasAnthropicKey: !!settings.anthropicKey,
    hasGeminiKey: !!settings.geminiKey
  }
}

export async function saveUserAiSettings(data: { provider: string; openaiKey?: string; anthropicKey?: string; geminiKey?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const updateData: any = { provider: data.provider }

  if (data.openaiKey) updateData.openaiKey = encrypt(data.openaiKey)
  if (data.anthropicKey) updateData.anthropicKey = encrypt(data.anthropicKey)
  if (data.geminiKey) updateData.geminiKey = encrypt(data.geminiKey)

  await prisma.userAiSettings.upsert({
    where: { userId: session.user.id },
    update: updateData,
    create: {
      userId: session.user.id,
      ...updateData
    }
  })

  return { success: true }
}
