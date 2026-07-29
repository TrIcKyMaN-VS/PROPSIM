"use server"

import { detectMistakesAndDna } from "@/lib/ai/mistake-detector"
import { matchTradeToPlaybook } from "@/lib/ai/playbook-matcher"
import { detectCsvMapping } from "@/lib/ai/import-engine"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateTherapistSession, generateDailyReview, generateMonthlySummary } from "@/lib/ai/therapist"

const prisma = new PrismaClient()

async function getAuthUserId() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function getHistoricalAiReviewsAction() {
  const userId = await getAuthUserId()
  return await prisma.aiReview.findMany({
    where: {
      userId,
      type: "COACH_REPORT"
    },
    orderBy: {
      createdAt: "desc"
    }
  })
}

export async function analyzeTraderDnaAction(trades: any[]) {
  const userId = await getAuthUserId()
  
  const psychology = await prisma.tradePsychology.findMany({
    where: {
      trade: { account: { userId } }
    }
  })
  
  const tradeHash = trades
    .map(t => `${t.id}-${t.timestamp}-${t.pnl}-${t.setupQualityScore || ''}`)
    .join("|")
  
  const crypto = await import("crypto")
  const hash = crypto.createHash("md5").update(tradeHash).digest("hex")
  
  const cached = await prisma.aiReview.findUnique({
    where: {
      userId_type_dateKey: {
        userId,
        type: "COACH_REPORT",
        dateKey: hash
      }
    }
  })
  
  if (cached) {
    const report = JSON.parse(cached.summary)
    // Inject source if missing in old caches
    if (report && !report.metadata) {
      report.metadata = {
        provider: cached.source || "PROGRAMMATIC",
        model: cached.source === "GEMINI" ? "gemini-2.5-flash" : cached.source === "OPENAI" ? "gpt-4o" : "Programmatic Engine"
      }
    }
    return report
  }
  
  const report = await detectMistakesAndDna(trades, psychology, userId)
  
  await prisma.aiReview.create({
    data: {
      userId,
      type: "COACH_REPORT",
      dateKey: hash,
      summary: JSON.stringify(report),
      source: report.metadata.provider,
      score1: report.monthlyCoachReport.propFirmSurvivalScore,
      score2: report.traderDna.confidenceScore
    }
  })
  
  return report
}

export async function matchPlaybookAction(trade: any, playbooks: any[]) {
  try {
    return await matchTradeToPlaybook(trade, playbooks)
  } catch (err) {
    console.error("Playbook match error:", err)
    return null
  }
}

export async function smartImportCsvAction(csvSample: any[]) {
  return await detectCsvMapping(csvSample)
}

export async function getAiReviewAction(type: "DAILY" | "WEEKLY" | "MONTHLY", dateKey: string) {
  const userId = await getAuthUserId()
  return await prisma.aiReview.findUnique({
    where: {
      userId_type_dateKey: {
        userId,
        type,
        dateKey
      }
    }
  })
}

export async function generateWeeklyReviewAction(trades: any[], psychology: any[], dateKey: string) {
  const userId = await getAuthUserId()

  const cached = await prisma.aiReview.findUnique({
    where: {
      userId_type_dateKey: {
        userId,
        type: "WEEKLY",
        dateKey
      }
    }
  })
  if (cached) {
    const analysis = JSON.parse(cached.summary)
    if (analysis && !analysis.metadata) {
      analysis.metadata = { provider: cached.source || "PROGRAMMATIC", model: "" }
    }
    return analysis
  }

  const analysis = await generateTherapistSession(psychology, trades, userId)

  await prisma.aiReview.create({
    data: {
      userId,
      type: "WEEKLY",
      dateKey,
      summary: JSON.stringify(analysis),
      source: analysis.metadata.provider,
      score1: analysis.executionScore,
      score2: analysis.psychologyScore
    }
  })

  return analysis
}

export async function generateDailyReviewAction(trades: any[], dateKey: string) {
  const userId = await getAuthUserId()

  const cached = await prisma.aiReview.findUnique({
    where: {
      userId_type_dateKey: {
        userId,
        type: "DAILY",
        dateKey
      }
    }
  })
  if (cached) {
    const analysis = JSON.parse(cached.summary)
    if (analysis && !analysis.metadata) {
      analysis.metadata = { provider: cached.source || "PROGRAMMATIC", model: "" }
    }
    return analysis
  }

  const analysis = await generateDailyReview(trades, userId)

  await prisma.aiReview.create({
    data: {
      userId,
      type: "DAILY",
      dateKey,
      summary: JSON.stringify(analysis),
      source: analysis.metadata.provider
    }
  })

  return analysis
}

export async function generateMonthlySummaryAction(trades: any[], dateKey: string) {
  const userId = await getAuthUserId()

  const cached = await prisma.aiReview.findUnique({
    where: {
      userId_type_dateKey: {
        userId,
        type: "MONTHLY",
        dateKey
      }
    }
  })
  if (cached) {
    const analysis = JSON.parse(cached.summary)
    if (analysis && !analysis.metadata) {
      analysis.metadata = { provider: cached.source || "PROGRAMMATIC", model: "" }
    }
    return analysis
  }

  const analysis = await generateMonthlySummary(trades, userId)

  await prisma.aiReview.create({
    data: {
      userId,
      type: "MONTHLY",
      dateKey,
      summary: JSON.stringify(analysis),
      source: analysis.metadata.provider
    }
  })

  return analysis
}
