"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

export type PlaybookInput = {
  name: string
  category: string
  marketCondition: string
  session: string
  instrument: string
  entryRules: string
  exitRules: string
  riskRules: string
  checklist: string[] // We will stringify this to JSON
  isPublic?: boolean
}

export async function getPlaybooks() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const playbooks = await prisma.playbook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      trades: true // to calculate stats later
    }
  })

  return playbooks.map(p => ({
    ...p,
    checklist: JSON.parse(p.checklist),
    trades: p.trades.map(t => ({
      ...t,
      direction: t.direction as "long" | "short",
      timestamp: Number(t.timestamp),
      tags: t.tags ? JSON.parse(t.tags) : []
    }))
  }))
}

export async function createPlaybook(data: PlaybookInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const playbook = await prisma.playbook.create({
    data: {
      userId: session.user.id,
      name: data.name,
      category: data.category,
      marketCondition: data.marketCondition,
      session: data.session,
      instrument: data.instrument,
      entryRules: data.entryRules,
      exitRules: data.exitRules,
      riskRules: data.riskRules,
      checklist: JSON.stringify(data.checklist),
      isPublic: data.isPublic || false
    }
  })

  return { ...playbook, checklist: JSON.parse(playbook.checklist), trades: [] }
}

export async function updatePlaybook(id: string, data: PlaybookInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const playbook = await prisma.playbook.update({
    where: { id, userId: session.user.id },
    data: {
      name: data.name,
      category: data.category,
      marketCondition: data.marketCondition,
      session: data.session,
      instrument: data.instrument,
      entryRules: data.entryRules,
      exitRules: data.exitRules,
      riskRules: data.riskRules,
      checklist: JSON.stringify(data.checklist),
      isPublic: data.isPublic || false
    }
  })

  return { ...playbook, checklist: JSON.parse(playbook.checklist) }
}

export async function deletePlaybook(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.playbook.deleteMany({
    where: { id, userId: session.user.id }
  })
}

export async function assignTradeToPlaybook(tradeId: string, playbookId: string | null) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Ensure trade belongs to user
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { account: true }
  })

  if (!trade || trade.account.userId !== session.user.id) {
    throw new Error("Unauthorized")
  }

  await prisma.trade.update({
    where: { id: tradeId },
    data: { playbookId }
  })
}
