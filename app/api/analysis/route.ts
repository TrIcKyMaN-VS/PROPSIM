import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import {
  analyzePsychology,
  analyzeFailures,
  analyzeTime,
  analyzeDuration,
  analyzePatterns,
  analyzeMCAlignment,
  generateInsights
} from "@/lib/trade-analysis"
import { Trade } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    const tradeWhere = accountId ? { accountId, account: { userId: session.user.id } } : { account: { userId: session.user.id } }

    const dbTrades = await prisma.trade.findMany({
      where: tradeWhere,
      orderBy: { timestamp: "asc" },
      include: {
        psychology: true
      }
    })

    const trades = dbTrades.map((t: any) => ({
      ...t,
      direction: t.direction as "long" | "short",
      timestamp: Number(t.timestamp),
      exitTime: t.exitTime ? Number(t.exitTime) : undefined,
      timingIncomplete: t.timingIncomplete,
      tags: t.tags ? JSON.parse(t.tags) : [],
      playbookChecklist: t.playbookChecklist ? JSON.parse(t.playbookChecklist) : {},
      stopLoss: t.stopLoss ?? undefined,
      calculatedPnl: t.calculatedPnl ?? undefined,
      expectedRR: t.expectedRR ?? undefined,
      mistakes: t.mistakes ?? undefined,
      lessonsLearned: t.lessonsLearned ?? undefined,
      marketBias: t.marketBias ?? undefined,
      outcome: t.outcome ?? undefined,
      playbookName: t.playbookName ?? undefined,
      psychologyNotes: t.psychologyNotes ?? undefined,
      reasonForEntry: t.reasonForEntry ?? undefined,
      tradeIdea: t.tradeIdea ?? undefined,
      notes: t.notes ?? undefined,
      setupQualityScore: t.setupQualityScore ?? undefined,
      entryQualityScore: t.entryQualityScore ?? undefined,
      exitQualityScore: t.exitQualityScore ?? undefined,
      riskScore: t.riskScore ?? undefined,
      disciplineScore: t.disciplineScore ?? undefined,
      confidenceScore: t.confidenceScore ?? undefined,
      adverseExcursion: t.adverseExcursion ?? undefined,
      favorableExcursion: t.favorableExcursion ?? undefined,
      psychology: t.psychology ? {
        ...t.psychology,
        preFeeling: t.psychology.preFeeling ?? undefined,
        preNotes: t.psychology.preNotes ?? undefined,
        checklistScore: t.psychology.checklistScore ?? undefined,
        convictionScore: t.psychology.convictionScore ?? undefined,
        riskAmount: t.psychology.riskAmount ?? undefined,
        rewardAmount: t.psychology.rewardAmount ?? undefined,
        expectedValue: t.psychology.expectedValue ?? undefined,
        exitReason: t.psychology.exitReason ?? undefined,
        executionGrade: t.psychology.executionGrade ?? undefined,
        psychologyGrade: t.psychology.psychologyGrade ?? undefined,
        riskGrade: t.psychology.riskGrade ?? undefined,
        complianceGrade: t.psychology.complianceGrade ?? undefined,
        decisionScore: t.psychology.decisionScore ?? undefined,
      } : undefined
    })) as unknown as Trade[]

    // Get account size
    let accountSizeUsd = 0
    if (accountId) {
      const acc = await prisma.challengeAccount.findUnique({ where: { id: accountId } })
      if (acc && acc.rules) {
        const rules = JSON.parse(acc.rules as string)
        accountSizeUsd = rules.startingBalance || 0
      }
    } else {
       const acc = await prisma.challengeAccount.findFirst({ where: { userId: session.user.id } })
       if (acc && acc.rules) {
         const rules = JSON.parse(acc.rules as string)
         accountSizeUsd = rules.startingBalance || 0
       }
    }

    const psychology = analyzePsychology(trades)
    const failures = analyzeFailures(trades)
    const time = analyzeTime(trades)
    const duration = analyzeDuration(trades)
    const patterns = analyzePatterns(trades)
    const mcAlignment = analyzeMCAlignment(trades, accountSizeUsd)
    const insights = generateInsights(psychology, failures, time, duration, patterns)

    return NextResponse.json({
      psychology,
      failures,
      time,
      duration,
      patterns,
      mcAlignment,
      insights
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
