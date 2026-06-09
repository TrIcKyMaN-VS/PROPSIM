"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Trade } from "@/lib/types"
import fs from "fs"
import path from "path"

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

  await reindexTradeDays(trade.accountId)

  const finalTrade = await prisma.trade.findUnique({
    where: { id: created.id },
    include: { screenshots: true }
  })

  if (!finalTrade) throw new Error("Created trade not found")

  return {
    ...finalTrade,
    direction: finalTrade.direction as "long" | "short",
    timestamp: Number(finalTrade.timestamp),
    tags: finalTrade.tags ? JSON.parse(finalTrade.tags) : [],
    playbookChecklist: finalTrade.playbookChecklist ? JSON.parse(finalTrade.playbookChecklist) : {},
    screenshots: finalTrade.screenshots || []
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

  const trade = await prisma.trade.findUnique({
    where: { id },
    select: { accountId: true }
  })

  await prisma.trade.deleteMany({
    where: { 
      id,
      account: { userId: session.user.id }
    }
  })

  if (trade) {
    await reindexTradeDays(trade.accountId)
  }
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
  const existingScreenshots = await prisma.tradeScreenshot.findMany({
    where: { tradeId, stage }
  })

  // Clean up physical local files if they exist
  for (const sc of existingScreenshots) {
    if (sc.url.startsWith("/uploads/")) {
      const oldPath = path.join(process.cwd(), "public", sc.url)
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath)
        } catch (err) {
          console.error("Failed to delete local screenshot file:", err)
        }
      }
    }
  }

  await prisma.tradeScreenshot.deleteMany({
    where: { tradeId, stage }
  })

  let finalUrl = url

  // Check if it's a base64 data URL
  const isBase64 = url.startsWith("data:")
  if (isBase64) {
    const match = url.match(/^data:(image\/[a-zA-Z+-\.]+);base64,(.+)$/)
    if (match) {
      const mimeType = match[1]
      const base64Content = match[2]
      const buffer = Buffer.from(base64Content, "base64")
      
      const fileExt = mimeType.split("/")[1] || "png"
      const fileName = `${tradeId}_${stage.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.${fileExt}`

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseServiceKey) {
        try {
          const uploadRes = await fetch(
            `${supabaseUrl}/storage/v1/object/screenshots/${fileName}`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": mimeType,
                "x-upsert": "true"
              },
              body: buffer
            }
          )

          if (!uploadRes.ok) {
            const errText = await uploadRes.text()
            throw new Error(`Supabase upload failed: ${uploadRes.statusText} - ${errText}`)
          }

          finalUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${fileName}`
        } catch (error) {
          console.error("Failed to upload to Supabase, falling back to local filesystem:", error)
          finalUrl = await saveLocalFile(fileName, buffer)
        }
      } else {
        finalUrl = await saveLocalFile(fileName, buffer)
      }
    }
  }

  const created = await prisma.tradeScreenshot.create({
    data: {
      tradeId,
      stage,
      url: finalUrl
    }
  })

  return created
}

async function saveLocalFile(fileName: string, buffer: Buffer): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  const filePath = path.join(uploadsDir, fileName)
  await fs.promises.writeFile(filePath, buffer)
  return `/uploads/${fileName}`
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

  // Clean up local file if it exists
  if (screenshot.url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", screenshot.url)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (err) {
        console.error("Failed to delete local screenshot file:", err)
      }
    }
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
  await reindexTradeDays(accountId)
}

function getESTDateString(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestampMs))
}

export async function reindexTradeDays(accountId: string) {
  const trades = await prisma.trade.findMany({
    where: { accountId },
    orderBy: { timestamp: "asc" }
  })

  if (trades.length === 0) return

  const uniqueDates: string[] = []
  const tradeUpdates: { id: string, day: number }[] = []

  for (const t of trades) {
    const dateStr = getESTDateString(Number(t.timestamp))
    let idx = uniqueDates.indexOf(dateStr)
    if (idx === -1) {
      uniqueDates.push(dateStr)
      idx = uniqueDates.length - 1
    }
    const day = idx + 1
    if (t.day !== day) {
      tradeUpdates.push({ id: t.id, day })
    }
  }

  if (tradeUpdates.length > 0) {
    await prisma.$transaction(
      tradeUpdates.map(u => 
        prisma.trade.update({
          where: { id: u.id },
          data: { day: u.day }
        })
      )
    )
  }

  // Persist status and violations to database
  const account = await prisma.challengeAccount.findUnique({
    where: { id: accountId }
  })
  if (account) {
    const rulesObj = JSON.parse(account.rules)
    const frontendTrades = trades.map(t => {
      const dateStr = getESTDateString(Number(t.timestamp))
      const day = uniqueDates.indexOf(dateStr) + 1
      return {
        ...t,
        day,
        direction: t.direction as "long" | "short",
        timestamp: Number(t.timestamp),
        tags: t.tags ? JSON.parse(t.tags) : [],
        playbookChecklist: t.playbookChecklist ? JSON.parse(t.playbookChecklist) : {},
        screenshots: []
      }
    }) as any[]

    const { evaluate } = await import("@/lib/rule-engine")
    const evalResult = evaluate(rulesObj, frontendTrades)

    const failReason = evalResult.violations.length > 0
      ? evalResult.violations.map(v => v.detail).join("; ")
      : null

    await prisma.challengeAccount.update({
      where: { id: accountId },
      data: {
        status: evalResult.status,
        failReason
      }
    })

    await prisma.ruleViolation.deleteMany({
      where: { accountId }
    })

    if (evalResult.violations.length > 0) {
      await prisma.ruleViolation.createMany({
        data: evalResult.violations.map(v => {
          let severity = "warning"
          if (v.type === "daily_loss" || v.type === "max_drawdown" || v.type === "trailing_drawdown") {
            severity = "fail"
          }
          return {
            userId: account.userId,
            accountId,
            ruleName: v.label,
            violationText: v.detail,
            severity,
            timestamp: new Date()
          }
        })
      })
    }
  }
}
