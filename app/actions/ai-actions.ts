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

export async function analyzeTraderDnaAction(trades: any[]) {
  return await detectMistakesAndDna(trades)
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

  // Check cache
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
    return JSON.parse(cached.summary)
  }

  // Generate real AI review
  const analysis = await generateTherapistSession(psychology, trades)

  // Cache in database
  await prisma.aiReview.create({
    data: {
      userId,
      type: "WEEKLY",
      dateKey,
      summary: JSON.stringify(analysis),
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
    return JSON.parse(cached.summary)
  }

  const analysis = await generateDailyReview(trades)

  await prisma.aiReview.create({
    data: {
      userId,
      type: "DAILY",
      dateKey,
      summary: JSON.stringify(analysis)
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
    return JSON.parse(cached.summary)
  }

  const analysis = await generateMonthlySummary(trades)

  await prisma.aiReview.create({
    data: {
      userId,
      type: "MONTHLY",
      dateKey,
      summary: JSON.stringify(analysis)
    }
  })

  return analysis
}
