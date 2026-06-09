"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

async function checkAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in")
  }
  // Allow all logged-in users to manage templates for testing/flexibility, or restrict to ADMIN
  // Let's enforce ADMIN but fallback if needed. We'll check the role.
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin role required")
  }
  return session.user.id
}

export async function createChallengeTemplate(data: {
  name: string
  description?: string
  balance: number
  profitTarget: number
  dailyLoss: number
  maxDrawdown: number
  drawdownType: string
  maxContracts: number
  minTradingDays: number
  isPublic?: boolean
}) {
  const userId = await checkAdmin()

  const template = await prisma.challengeTemplate.create({
    data: {
      userId,
      name: data.name,
      description: data.description || "",
      balance: data.balance,
      profitTarget: data.profitTarget,
      dailyLoss: data.dailyLoss,
      maxDrawdown: data.maxDrawdown,
      drawdownType: data.drawdownType,
      maxContracts: data.maxContracts,
      minTradingDays: data.minTradingDays,
      isPublic: data.isPublic ?? true
    }
  })

  revalidatePath("/admin/firms")
  return template
}

export async function deleteChallengeTemplate(id: string) {
  await checkAdmin()

  await prisma.challengeTemplate.delete({
    where: { id }
  })

  revalidatePath("/admin/firms")
}
