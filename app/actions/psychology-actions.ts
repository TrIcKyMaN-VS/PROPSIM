"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

// --- TRADE PSYCHOLOGY ---

export async function getTradePsychology() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.tradePsychology.findMany({
    where: {
      trade: {
        account: {
          userId: session.user.id
        }
      }
    }
  })
}

export async function saveTradePsychology(data: {
  tradeId: string
  preFeeling?: string | null
  preNotes?: string | null
  checklistScore?: number | null
  convictionScore?: number | null
  riskAmount?: number | null
  rewardAmount?: number | null
  expectedValue?: number | null
  hesitated?: boolean
  movedStop?: boolean
  movedTarget?: boolean
  addedSize?: boolean
  emotionAffected?: boolean
  brokeRules?: boolean
  exitReason?: string | null
  executionGrade?: string | null
  psychologyGrade?: string | null
  riskGrade?: string | null
  complianceGrade?: string | null
  decisionScore?: number | null
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Verify ownership of the trade
  const trade = await prisma.trade.findFirst({
    where: {
      id: data.tradeId,
      account: { userId: session.user.id }
    }
  })
  if (!trade) throw new Error("Trade not found or unauthorized")

  const { tradeId, ...fields } = data

  const upserted = await prisma.tradePsychology.upsert({
    where: { tradeId },
    update: fields,
    create: {
      tradeId,
      ...fields
    }
  })

  return upserted
}

// --- LESSONS LEARNED ---

export async function getLessonsLearned() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.lessonLearned.findMany({
    where: {
      trade: {
        account: {
          userId: session.user.id
        }
      }
    }
  })
}

export async function saveLessonLearned(data: {
  tradeId: string
  wentWell?: string | null
  wentWrong?: string | null
  biggestMistake?: string | null
  improvement?: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const trade = await prisma.trade.findFirst({
    where: {
      id: data.tradeId,
      account: { userId: session.user.id }
    }
  })
  if (!trade) throw new Error("Trade not found or unauthorized")

  const { tradeId, ...fields } = data

  const upserted = await prisma.lessonLearned.upsert({
    where: { tradeId },
    update: fields,
    create: {
      tradeId,
      ...fields
    }
  })

  return upserted
}

// --- DAILY PERFORMANCE / ROUTINES ---

export async function getDailyPerformances() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.dailyPerformance.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" }
  })
}

export async function saveDailyPerformance(data: {
  id?: string
  date: string
  sleepHours?: number | null
  exercise?: boolean
  meditation?: boolean
  waterIntake?: number | null
  mood?: string | null
  morningChecklist?: string | null
  eodChecklist?: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const { id, ...fields } = data

  const upserted = await prisma.dailyPerformance.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date: data.date
      }
    },
    update: fields,
    create: {
      userId: session.user.id,
      ...fields
    }
  })

  return upserted
}
