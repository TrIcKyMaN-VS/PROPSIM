"use server"

import { detectMistakesAndDna } from "@/lib/ai/mistake-detector"
import { matchTradeToPlaybook } from "@/lib/ai/playbook-matcher"
import { detectCsvMapping } from "@/lib/ai/import-engine"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateTherapistSession, generateDailyReview, generateMonthlySummary } from "@/lib/ai/therapist"
import { generateMonthComparison } from "@/lib/ai/monthly-comparison"
import { generateText } from "ai"
import { runWithAiFallback, trackAiUsage } from "@/lib/ai/provider"
import { buildGeminiTradePrompt } from "@/lib/trade-plan-review"

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

export async function generateMonthComparisonAction(currentMonth: string) {
  const userId = await getAuthUserId()

  // Derive previous month key (e.g. "2024-10" → "2024-09", "2024-01" → "2023-12")
  const [yearStr, monthStr] = currentMonth.split("-")
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const prevYear  = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const previousMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`

  // Fetch both recaps
  const [currentRecap, previousRecap] = await Promise.all([
    prisma.monthlyRecap.findUnique({
      where: { userId_month: { userId, month: currentMonth } }
    }),
    prisma.monthlyRecap.findUnique({
      where: { userId_month: { userId, month: previousMonth } }
    }),
  ])

  // Guard: need at least the current month to have any content
  if (!currentRecap) {
    return {
      repeatedMistakes: "",
      commitmentsKept: "",
      highestLeverage: "",
      status: "no_current_recap" as const,
    }
  }

  // Guard: need the previous month to do a comparison
  if (!previousRecap) {
    return {
      repeatedMistakes: "",
      commitmentsKept: "",
      highestLeverage: "",
      status: "no_previous_recap" as const,
      previousMonth,
    }
  }

  const result = await generateMonthComparison(
    currentMonth,
    previousMonth,
    currentRecap as Record<string, any>,
    previousRecap as Record<string, any>,
    userId
  )

  return {
    repeatedMistakes: result.repeatedMistakes,
    commitmentsKept: result.commitmentsKept,
    highestLeverage: result.highestLeverage,
    status: "ok" as const,
    isFallback: result.isFallback,
    metadata: result.metadata,
  }
}

export async function reviewSingleTradeWithAiAction(trade: any, accountName?: string) {
  const userId = await getAuthUserId()
  const prompt = buildGeminiTradePrompt(trade, accountName)

  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const { text, usage } = await generateText({
        model: model,
        prompt: prompt,
        system: "You are an elite prop trading performance coach specializing in trade execution, plan adherence, and risk management. Provide direct, objective, constructive feedback without fluff. Evaluate plan adherence, exit timing, risk rules, and highlight repeated patterns.",
      })

      if (usage) {
        await trackAiUsage(userId, usage.totalTokens || 0, providerInfo.provider)
      }

      return text
    })

    return {
      success: true,
      review: result,
      metadata,
      prompt,
    }
  } catch (err: any) {
    console.error("Single Trade AI review error:", err)
    return {
      success: false,
      error: err.message || "Failed to generate AI review.",
      prompt,
    }
  }
}


