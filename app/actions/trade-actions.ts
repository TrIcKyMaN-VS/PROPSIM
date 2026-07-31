"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Trade } from "@/lib/types"
import { calculateTradeScores } from "@/lib/ai/scoring-engine"
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

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
    exitTime: t.exitTime ? Number(t.exitTime) : undefined,
    timingIncomplete: t.timingIncomplete,
    tags: t.tags ? JSON.parse(t.tags) : [],
    playbookChecklist: t.playbookChecklist ? JSON.parse(t.playbookChecklist) : {},
    setupQualityScore: t.setupQualityScore ?? undefined,
    entryQualityScore: t.entryQualityScore ?? undefined,
    exitQualityScore: t.exitQualityScore ?? undefined,
    riskScore: t.riskScore ?? undefined,
    disciplineScore: t.disciplineScore ?? undefined,
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
  const exitTime = trade.exitTime ?? null
  const timingIncomplete = trade.timingIncomplete ?? !trade.exitTime
  
  // Calculate scores deterministically
  const scores = calculateTradeScores(trade, null)

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
      exitTime: exitTime ? BigInt(exitTime) : null,
      timingIncomplete,
      tradeIdea: trade.tradeIdea || "",
      marketBias: trade.marketBias || "",
      reasonForEntry: trade.reasonForEntry || "",
      expectedRR: trade.expectedRR || "",
      outcome: trade.outcome || "",
      mistakes: trade.mistakes || "",
      lessonsLearned: trade.lessonsLearned || "",
      psychologyNotes: trade.psychologyNotes || "",
      setupQualityScore: scores.setupQualityScore,
      entryQualityScore: scores.entryQualityScore,
      exitQualityScore: scores.exitQualityScore,
      riskScore: scores.riskScore,
      disciplineScore: scores.disciplineScore
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
    exitTime: finalTrade.exitTime ? Number(finalTrade.exitTime) : undefined,
    timingIncomplete: finalTrade.timingIncomplete,
    tags: finalTrade.tags ? JSON.parse(finalTrade.tags) : [],
    playbookChecklist: finalTrade.playbookChecklist ? JSON.parse(finalTrade.playbookChecklist) : {},
    setupQualityScore: finalTrade.setupQualityScore ?? undefined,
    entryQualityScore: finalTrade.entryQualityScore ?? undefined,
    exitQualityScore: finalTrade.exitQualityScore ?? undefined,
    riskScore: finalTrade.riskScore ?? undefined,
    disciplineScore: finalTrade.disciplineScore ?? undefined,
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

  // Load psychology if it exists to calculate scores
  const psy = await prisma.tradePsychology.findUnique({
    where: { tradeId: id }
  })
  
  // Calculate scores
  const currentTrade = await prisma.trade.findUnique({ where: { id } })
  const mergedTrade = { ...currentTrade, ...updates }
  const scores = calculateTradeScores(mergedTrade, psy)
  Object.assign(data, scores)

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
    exitTime: updated.exitTime ? Number(updated.exitTime) : undefined,
    timingIncomplete: updated.timingIncomplete,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
    playbookChecklist: updated.playbookChecklist ? JSON.parse(updated.playbookChecklist) : {},
    setupQualityScore: updated.setupQualityScore ?? undefined,
    entryQualityScore: updated.entryQualityScore ?? undefined,
    exitQualityScore: updated.exitQualityScore ?? undefined,
    riskScore: updated.riskScore ?? undefined,
    disciplineScore: updated.disciplineScore ?? undefined,
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
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          const { data, error } = await supabase.storage
            .from('screenshots')
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: true
            })
          
          if (error) throw error
          
          finalUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${fileName}`
        } catch (error: any) {
          console.error("Failed to upload to Supabase:", error)
          throw new Error(`Failed to upload to Supabase: ${error.message}`)
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
    const entryTime = ts
    const exitTime = t.exitTime ?? null
    const timingIncomplete = t.timingIncomplete ?? !t.exitTime
    
    // Calculate default scores for imported trades
    const scores = calculateTradeScores(t, null)
    
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
      timestamp: BigInt(entryTime),
      exitTime: exitTime ? BigInt(exitTime) : null,
      timingIncomplete,
      setupQualityScore: scores.setupQualityScore,
      entryQualityScore: scores.entryQualityScore,
      exitQualityScore: scores.exitQualityScore,
      riskScore: scores.riskScore,
      disciplineScore: scores.disciplineScore
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

export async function reindexTradeDays(accountId: string, forceRecalculate?: boolean) {
  const trades = await prisma.trade.findMany({
    where: { accountId },
    orderBy: { timestamp: "asc" },
    include: { screenshots: true }
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
    // Audit freeze: do not modify status or violations for accounts created before 2026-06-10T22:30:00Z
    const freezeTime = new Date("2026-06-10T22:30:00Z").getTime()
    const accountCreatedTime = new Date(account.createdAt).getTime()
    const isFrozen = accountCreatedTime < freezeTime
    if (isFrozen) {
      return
    }

    const rulesObj = JSON.parse(account.rules)
    const frontendTrades = trades.map(t => {
      const dateStr = getESTDateString(Number(t.timestamp))
      const day = uniqueDates.indexOf(dateStr) + 1
      return {
        ...t,
        day,
        direction: t.direction as "long" | "short",
        timestamp: Number(t.timestamp),
        exitTime: t.exitTime ? Number(t.exitTime) : undefined,
        timingIncomplete: t.timingIncomplete,
        tags: t.tags ? JSON.parse(t.tags) : [],
        playbookChecklist: t.playbookChecklist ? JSON.parse(t.playbookChecklist) : {},
        setupQualityScore: t.setupQualityScore ?? undefined,
        entryQualityScore: t.entryQualityScore ?? undefined,
        exitQualityScore: t.exitQualityScore ?? undefined,
        riskScore: t.riskScore ?? undefined,
        disciplineScore: t.disciplineScore ?? undefined,
        screenshots: t.screenshots || []
      }
    }) as any[]

    const { evaluate } = await import("@/lib/rule-engine")
    const evalResult = evaluate(rulesObj, frontendTrades)

    const failReason = evalResult.violations.length > 0
      ? evalResult.violations.map(v => v.detail).join("; ")
      : null

    let statusToUpdate = evalResult.status
    let failReasonToUpdate = failReason
    let failureAtToUpdate = account.failureAt
    let failureSnapshotToUpdate = account.failureSnapshot

    if (account.status === "failed" && !forceRecalculate) {
      statusToUpdate = "failed"
      failReasonToUpdate = account.failReason
    } else if (evalResult.status === "failed") {
      const firstHardViolation = evalResult.violations.find(v => v.severity === "HARD") || evalResult.violations[0]
      const triggeringTrade = firstHardViolation?.tradeId
        ? trades.find(t => t.id === firstHardViolation.tradeId)
        : null

      const snapshot = {
        breachType: firstHardViolation?.type || "unknown",
        ruleName: firstHardViolation?.label || "Unknown Breach",
        allowedValue: firstHardViolation?.allowedValue || null,
        actualValue: firstHardViolation?.actualValue || null,
        tradeId: triggeringTrade?.id || null,
        tradeDate: triggeringTrade ? new Date(Number(triggeringTrade.timestamp)).toISOString() : null,
        balanceAtFailure: evalResult.balance,
        equityAtFailure: evalResult.equity,
        remainingDrawdown: evalResult.remainingDrawdown,
        tradingDay: triggeringTrade?.day || evalResult.tradingDays,
        challengeProgress: evalResult.completionPct,
        accountSize: account.sizeLabel,
        firm: account.firmId,
        failureTimestamp: new Date().toISOString(),
        failedTradeScreenshot: triggeringTrade?.screenshots?.[0]?.url || null
      }

      statusToUpdate = "failed"
      failReasonToUpdate = firstHardViolation?.detail || "Rule Violation"
      failureAtToUpdate = new Date()
      failureSnapshotToUpdate = JSON.stringify(snapshot)
    } else if (forceRecalculate) {
      statusToUpdate = evalResult.status
      failReasonToUpdate = null
      failureAtToUpdate = null
      failureSnapshotToUpdate = null
    }

    const isHistorical = account.createdAt < new Date("2026-06-10T22:30:00Z")

    if (!isHistorical) {
      await prisma.challengeAccount.update({
        where: { id: accountId },
        data: {
          status: statusToUpdate,
          failReason: failReasonToUpdate,
          failureAt: failureAtToUpdate,
          failureSnapshot: failureSnapshotToUpdate
        }
      })

      // Hash Reconciliation & Soft Resolution
      const existingViolations = await prisma.ruleViolation.findMany({
        where: { accountId }
      })

      const newHashes = evalResult.violations.map(v => `${accountId}_${v.type}_${v.tradeId || "none"}`)

      // Mark no longer active violations as resolved
      const hashesToResolve = existingViolations
        .filter(ev => !ev.isResolved && !newHashes.includes(ev.violationHash || ""))
        .map(ev => ev.id)

      if (hashesToResolve.length > 0) {
        await prisma.ruleViolation.updateMany({
          where: { id: { in: hashesToResolve } },
          data: {
            isResolved: true,
            resolvedAt: new Date()
          }
        })
      }

      // Upsert active violations
      for (const v of evalResult.violations) {
        const hash = `${accountId}_${v.type}_${v.tradeId || "none"}`
        const existing = existingViolations.find(ev => ev.violationHash === hash)

        if (existing) {
          await prisma.ruleViolation.update({
            where: { id: existing.id },
            data: {
              isResolved: false,
              resolvedAt: null,
              violationText: v.detail,
              allowedValue: v.allowedValue || null,
              actualValue: v.actualValue || null,
              severity: v.severity || "HARD"
            }
          })
        } else {
          try {
            await prisma.ruleViolation.create({
              data: {
                userId: account.userId,
                accountId,
                tradeId: v.tradeId || null,
                ruleName: v.label,
                violationText: v.detail,
                severity: v.severity || "HARD",
                allowedValue: v.allowedValue || null,
                actualValue: v.actualValue || null,
                violationHash: hash,
                isResolved: false,
                resolvedAt: null,
                timestamp: v.timestamp ? new Date(v.timestamp) : new Date()
              }
            })
          } catch (err) {
            console.error("Duplicate violation insert caught:", err)
          }
        }
      }
    }
  }
}
