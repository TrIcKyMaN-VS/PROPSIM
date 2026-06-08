"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import crypto from "crypto"

const prisma = new PrismaClient()

export async function generateApiToken(provider: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Generate a random 32-byte hex token
  const token = crypto.randomBytes(32).toString("hex")

  const apiToken = await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      provider,
      token,
    }
  })

  return { id: apiToken.id, token: apiToken.token, provider: apiToken.provider, createdAt: apiToken.createdAt }
}

export async function getApiTokens() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })

  return tokens
}

export async function revokeApiToken(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.apiToken.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  })

  return { success: true }
}
