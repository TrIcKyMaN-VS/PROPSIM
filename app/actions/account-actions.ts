"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getFirm } from "@/lib/firms"

const prisma = new PrismaClient()

export async function getAccounts() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.challengeAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function createAccount(firmId: string, sizeLabel: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const firm = getFirm(firmId)
  if (!firm) throw new Error("Firm not found")
  
  const size = firm.sizes.find(s => s.label === sizeLabel) || firm.sizes[0]

  const account = await prisma.challengeAccount.create({
    data: {
      userId: session.user.id,
      firmId,
      sizeLabel: size.label,
      rules: JSON.stringify(size.rules),
      status: "active"
    }
  })

  return account
}

export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.challengeAccount.deleteMany({
    where: { id, userId: session.user.id }
  })
}
