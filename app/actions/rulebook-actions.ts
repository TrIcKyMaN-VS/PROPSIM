"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function getRuleBookEntries() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const rules = await prisma.ruleBook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return rules.map(r => ({
    ...r,
    adjustmentHistory: r.adjustmentHistory ? JSON.parse(r.adjustmentHistory) : [],
  }))
}

export async function createRuleBookEntry(data: {
  condition: string
  action: string
  fromMistake?: string
  weekAdded?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const existing = await prisma.ruleBook.findFirst({
    where: {
      userId: session.user.id,
      condition: data.condition,
      action: data.action,
      status: { not: "retired" },
    },
  })
  if (existing) return { rule: existing, isDuplicate: true }
  const rule = await prisma.ruleBook.create({
    data: {
      userId: session.user.id,
      condition: data.condition,
      action: data.action,
      fromMistake: data.fromMistake || null,
      weekAdded: data.weekAdded || null,
      status: "testing",
    },
  })
  return { rule, isDuplicate: false }
}

export async function updateRuleBookStatus(id: string, status: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  return prisma.ruleBook.updateMany({
    where: { id, userId: session.user.id },
    data: { status },
  })
}

export async function applyRuleVerdict(payload: {
  ruleId: string
  followStatus: string
  helpStatus: string
  verdict: string
  adjustmentNote: string
  newCondition?: string
  newAction?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const rule = await prisma.ruleBook.findFirst({
    where: { id: payload.ruleId, userId: session.user.id },
  })
  if (!rule) throw new Error("Rule not found")
  const existingHistory: any[] = rule.adjustmentHistory ? JSON.parse(rule.adjustmentHistory) : []
  const update: any = { reviewCount: { increment: 1 } }
  if (payload.followStatus === "followed") update.followCount = { increment: 1 }
  if (payload.helpStatus === "helped") update.helpCount = { increment: 1 }
  if (payload.verdict === "retire") {
    update.status = "retired"
  } else if (payload.verdict === "adjust") {
    existingHistory.push({
      date: new Date().toISOString(),
      note: payload.adjustmentNote,
      oldCondition: rule.condition,
      oldAction: rule.action,
    })
    update.adjustmentHistory = JSON.stringify(existingHistory)
    if (payload.newCondition) update.condition = payload.newCondition
    if (payload.newAction) update.action = payload.newAction
  } else if (payload.verdict === "keep") {
    const newHelp = (rule.helpCount || 0) + (payload.helpStatus === "helped" ? 1 : 0)
    const newReview = (rule.reviewCount || 0) + 1
    if (rule.status === "testing" && newReview >= 2 && newHelp >= 2) update.status = "active"
  }
  return prisma.ruleBook.update({ where: { id: payload.ruleId }, data: update })
}

export async function deleteRuleBookEntry(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  await prisma.ruleBook.deleteMany({ where: { id, userId: session.user.id } })
}

export async function syncRuleBookStats() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const userId = session.user.id

  const reviews = await prisma.weeklyReview.findMany({
    where: { userId },
    select: { weekOf: true, ruleEvaluations: true, missedTrades: true },
  })

  const rules = await prisma.ruleBook.findMany({
    where: { userId },
  })

  for (const rule of rules) {
    let reviewCount = 0
    let followCount = 0
    let helpCount = 0

    for (const rev of reviews) {
      let ruleEvaluated = false
      let ruleFollowed = false
      let ruleHelped = false

      if (rev.ruleEvaluations) {
        try {
          const evals = JSON.parse(rev.ruleEvaluations) as any[]
          const matched = evals.find(
            e =>
              (e.ruleId && e.ruleId === rule.id) ||
              (e.when === rule.condition && e.then === rule.action)
          )
          if (matched && (matched.followStatus || matched.helpStatus || matched.verdict)) {
            ruleEvaluated = true
            if (matched.followStatus === "followed") ruleFollowed = true
            if (matched.helpStatus === "helped") ruleHelped = true
          }
        } catch {}
      }

      // Also credit if this rule prevented a loss in missedTrades
      if (rev.missedTrades) {
        try {
          const missed = JSON.parse(rev.missedTrades) as any[]
          const rulePreventedLoss = missed.some(
            m =>
              m.ruleHelped &&
              m.outcome === "loss" &&
              (m.ruleId === rule.id || (m.ruleTitle && m.ruleTitle.includes(rule.condition)))
          )
          if (rulePreventedLoss) {
            ruleFollowed = true
            ruleHelped = true
          }
        } catch {}
      }

      if (ruleEvaluated) reviewCount++
      if (ruleFollowed) followCount++
      if (ruleHelped) helpCount++
    }

    await prisma.ruleBook.update({
      where: { id: rule.id },
      data: {
        reviewCount,
        followCount,
        helpCount,
        ...(rule.status === "testing" && reviewCount >= 2 && helpCount >= 2 ? { status: "active" } : {}),
      },
    })
  }
}