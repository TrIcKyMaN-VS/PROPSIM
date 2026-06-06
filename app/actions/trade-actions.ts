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
    orderBy: { timestamp: "asc" }
  })

  // Map to frontend Trade format
  return dbTrades.map(t => ({
    ...t,
    direction: t.direction as "long" | "short",
    timestamp: Number(t.timestamp),
    tags: t.tags ? JSON.parse(t.tags) : [],
    playbookChecklist: t.playbookChecklist ? JSON.parse(t.playbookChecklist) : {}
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
      instrument: trade.instrument,
      direction: trade.direction,
      entry: trade.entry,
      exit: trade.exit,
      contracts: trade.contracts,
      pnl: trade.pnl,
      calculatedPnl: trade.calculatedPnl,
      pnlMode: trade.pnlMode || "AUTO",
      day: trade.day,
      session: trade.session,
      notes: trade.notes || "",
      tags: JSON.stringify(trade.tags || []),
      playbookChecklist: trade.playbookChecklist ? JSON.stringify(trade.playbookChecklist) : null,
      timestamp: BigInt(ts)
    }
  })

  return {
    ...created,
    direction: created.direction as "long" | "short",
    timestamp: Number(created.timestamp),
    tags: created.tags ? JSON.parse(created.tags) : [],
    playbookChecklist: created.playbookChecklist ? JSON.parse(created.playbookChecklist) : {}
  } as Trade
}

export async function updateTrade(id: string, updates: Partial<Trade>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const data: any = { ...updates }
  delete data.id
  delete data.accountId
  delete data.timestamp

  if (data.tags) data.tags = JSON.stringify(data.tags)
  if (data.playbookChecklist !== undefined) {
    data.playbookChecklist = data.playbookChecklist ? JSON.stringify(data.playbookChecklist) : null
  }

  const updated = await prisma.trade.update({
    where: { 
      id,
      account: { userId: session.user.id }
    },
    data
  })

  return {
    ...updated,
    direction: updated.direction as "long" | "short",
    timestamp: Number(updated.timestamp),
    tags: updated.tags ? JSON.parse(updated.tags) : [],
    playbookChecklist: updated.playbookChecklist ? JSON.parse(updated.playbookChecklist) : {}
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
