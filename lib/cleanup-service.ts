import { prisma } from "@/lib/prisma"

export async function runDatabaseMaintenance() {
  const now = new Date()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [sessions, tokens, violations, importLogs, aiReviews, auditLogs, playbooks] = await Promise.all([
    prisma.deviceSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isValid: false, updatedAt: { lt: thirtyDaysAgo } }
        ]
      }
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { used: true }
        ]
      }
    }),
    prisma.ruleViolation.deleteMany({
      where: {
        isResolved: true,
        resolvedAt: { lt: thirtyDaysAgo }
      }
    }),
    prisma.importLog.deleteMany({
      where: { createdAt: { lt: sixtyDaysAgo } }
    }),
    prisma.aiReview.deleteMany({
      where: {
        OR: [
          { type: "COACH_REPORT", createdAt: { lt: thirtyDaysAgo } },
          { type: "DAILY", createdAt: { lt: ninetyDaysAgo } }
        ]
      }
    }),
    prisma.auditLog.deleteMany({
      where: {
        action: { in: ["LOGIN", "PASSWORD_RESET_REQUEST"] },
        createdAt: { lt: ninetyDaysAgo }
      }
    }),
    prisma.playbook.deleteMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    })
  ])

  return {
    deletedSessions: sessions.count,
    deletedTokens: tokens.count,
    deletedViolations: violations.count,
    deletedImportLogs: importLogs.count,
    deletedAiReviews: aiReviews.count,
    deletedAuditLogs: auditLogs.count,
    deletedPlaybooks: playbooks.count,
    totalDeleted: sessions.count + tokens.count + violations.count + importLogs.count + aiReviews.count + auditLogs.count + playbooks.count
  }
}
