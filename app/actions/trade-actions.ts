"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Trade } from "@/lib/types"

const prisma = new PrismaClient()

export async function getTrades(accountId?: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // If no account specified, fetch all trades for user's accounts
  const whereClause = accountId ? { accountId } : {
    account: { userId: session.user.id }
  }

  const dbTrades = await prisma.trade.findMany({
    where: whereClause,
    orderBy: { timestamp: "asc" },
    include: {
      screenshots: true
    }
  })

  // Map to frontend Trade format
  return dbTrades.map(t => ({
    ...t,
    direction: t.direction as "long" | "short",
    timestamp: Number(t.timestamp),
    tags: t.tags ? JSON.parse(t.tags) : [],
    playbookChecklist: t.playbookChecklist ? JSON.parse(t.playbookChecklist) : {},
    screenshots: t.screenshots || []
  })) as Trade[]
}

export async function addTrade(trade: Omit<Trade, "id" | "timestamp"> & { timestamp?: number }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Verify ownership
  const account = await prisma.challengeAccount.findUnique({
    where: { id: trade.accountId }
  })
  if (!account || account.userId !== session.user.id) throw new Error("Unauthorized")

  const ts = trade.timestamp ?? Date.now()
  const created = await prisma.trade.create({
    data: {
      accountId: trade.accountId,
      playbookId: trade.playbookId,
      playbookName: trade.playbookName,
      instrument: trade.instrument,
      direction: trade.direction,
      entry: trade.entry,
      exit: trade.exit,
      stopLoss: trade.stopLoss || null,
      contracts: trade.contracts,
      pnl: trade.pnl,
      calculatedPnl: trade.calculatedPnl,
      pnlMode: trade.pnlMode || "AUTO",
      day: trade.day,
      session: trade.session,
      notes: trade.notes || "",
      tags: JSON.stringify(trade.tags || []),
      playbookChecklist: trade.playbookChecklist ? JSON.stringify(trade.playbookChecklist) : null,
      timestamp: BigInt(ts),
      tradeIdea: trade.tradeIdea || "",
      marketBias: trade.marketBias || "",
      reasonForEntry: trade.reasonForEntry || "",
      expectedRR: trade.expectedRR || "",
      outcome: trade.outcome || "",
      mistakes: trade.mistakes || "",
      lessonsLearned: trade.lessonsLearned || "",
      psychologyNotes: trade.psychologyNotes || ""
    },
    include: {
      screenshots: true
    }
  })

  return {
    ...created,
    direction: created.direction as "long" | "short",
    timestamp: Number(created.timestamp),
    tags: created.tags ? JSON.parse(created.tags) : [],
    playbookChecklist: created.playbookChecklist ? JSON.parse(created.playbookChecklist) : {},
    screenshots: created.screenshots || []
  } as Trade
}

export async function updateTrade(id: string, updates: Partial<Trade>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const data: any = { ...updates }
  delete data.id
  delete data.accountId
  delete data.timestamp
  delete data.screenshots

  if (data.tags) data.tags = JSON.stringify(data.tags)
  if (data.playbookChecklist !== undefined) {
    data.playbookChecklist = data.playbookChecklist ? JSON.stringify(data.playbookChecklist) : null
  }

  const updated = await prisma.trade.update({
    where: { 
      id,
      account: { userId: session.user.id }
    },
    data,
    include: {
      screenshots: true
    }
  })

  return {
    ...updated,
    direction: updated.direction as "long" | "short",
    timestamp: Number(updated.timestamp),
    tags: updated.tags ? JSON.parse(updated.tags) : [],
    playbookChecklist: updated.playbookChecklist ? JSON.parse(updated.playbookChecklist) : {},
    screenshots: updated.screenshots || []
  } as Trade
}

export async function deleteTrade(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.trade.deleteMany({
    where: { 
      id,
      account: { userId: session.user.id }
    }
  })
}

export async function addTradeScreenshot(tradeId: string, stage: string, url: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Ensure user owns this trade
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { account: true }
  })
  if (!trade || trade.account.userId !== session.user.id) {
    throw new Error("Unauthorized")
  }

  // To support Replace: delete any existing screenshot for the same stage
  await prisma.tradeScreenshot.deleteMany({
    where: { tradeId, stage }
  })

  const created = await prisma.tradeScreenshot.create({
    data: {
      tradeId,
      stage,
      url
    }
  })

  return created
}

export async function deleteTradeScreenshot(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Find the screenshot first to verify ownership
  const screenshot = await prisma.tradeScreenshot.findUnique({
    where: { id },
    include: { trade: { include: { account: true } } }
  })

  if (!screenshot || screenshot.trade.account.userId !== session.user.id) {
    throw new Error("Unauthorized")
  }

  await prisma.tradeScreenshot.delete({
    where: { id }
  })
}

export async function importTradesBatch(accountId: string, trades: Omit<Trade, "id" | "accountId" | "timestamp">[]) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  let ts = Date.now()
  
  const data = trades.map(t => {
    ts += 1000 * 60 // space them by 1 min
    return {
      accountId,
      instrument: t.instrument,
      direction: t.direction,
      entry: t.entry,
      exit: t.exit,
      contracts: t.contracts,
      pnl: t.pnl,
      day: t.day,
      session: t.session,
      notes: t.notes || "",
      tags: JSON.stringify(t.tags || []),
      timestamp: BigInt(ts)
    }
  })

  await prisma.trade.createMany({ data })
}
