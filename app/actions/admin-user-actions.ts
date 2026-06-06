"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const prisma = new PrismaClient()

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user?.role !== "ADMIN") throw new Error("Unauthorized")
  return user
}

async function writeAuditLog(opts: { userId?: string; targetId?: string; action: string; details?: object }) {
  await prisma.auditLog.create({
    data: {
      userId: opts.userId,
      targetId: opts.targetId,
      action: opts.action,
      details: opts.details ? JSON.stringify(opts.details) : null,
    },
  }).catch(console.error)
}

export async function adminGetUsers(search?: string, statusFilter?: string) {
  await assertAdmin()

  return prisma.user.findMany({
    where: {
      AND: [
        statusFilter && statusFilter !== "ALL"
          ? { status: statusFilter }
          : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      status: true,
      createdAt: true,
      lastLogin: true,
      emailVerified: true,
      _count: {
        select: {
          challenges: true,
          deviceSessions: true,
        },
      },
      aiSettings: {
        select: { totalRequests: true, totalTokens: true, estimatedCost: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function adminGetUser(id: string) {
  await assertAdmin()

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          challenges: true,
          playbooks: true,
        },
      },
      deviceSessions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      aiSettings: true,
      challenges: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { trades: true } } },
      },
    },
  })

  if (!user) throw new Error("User not found")

  // Get trade count
  const tradeCount = await prisma.trade.count({
    where: { account: { userId: id } },
  })

  return { ...user, tradeCount }
}

export async function adminUpdateUser(
  id: string,
  updates: { name?: string; email?: string; role?: string; plan?: string; status?: string; notes?: string }
) {
  const admin = await assertAdmin()
  if (id === admin.id && updates.role && updates.role !== "ADMIN") {
    throw new Error("You cannot remove your own admin role.")
  }

  const prev = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true, plan: true } })
  const updated = await prisma.user.update({ where: { id }, data: updates })

  await writeAuditLog({
    userId: admin.id,
    targetId: id,
    action: "ADMIN_USER_EDIT",
    details: { previous: prev, changes: updates },
  })

  // If user was just suspended/banned, invalidate all their device sessions
  if (updates.status && updates.status !== "ACTIVE" && prev?.status === "ACTIVE") {
    await prisma.deviceSession.updateMany({ where: { userId: id }, data: { isValid: false } })
  }

  return updated
}

export async function adminDeleteUser(id: string, permanent: boolean = false) {
  const admin = await assertAdmin()
  if (id === admin.id) throw new Error("You cannot delete your own account.")

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { challenges: true, playbooks: true } },
    },
  })
  if (!user) throw new Error("User not found")

  const tradeCount = await prisma.trade.count({ where: { account: { userId: id } } })

  if (permanent) {
    await prisma.user.delete({ where: { id } })
    await writeAuditLog({
      userId: admin.id,
      targetId: id,
      action: "ADMIN_USER_DELETE_PERMANENT",
      details: { email: user.email, tradeCount, challenges: user._count.challenges },
    })
  } else {
    // Soft delete: ban and invalidate sessions
    await prisma.user.update({ where: { id }, data: { status: "BANNED" } })
    await prisma.deviceSession.updateMany({ where: { userId: id }, data: { isValid: false } })
    await writeAuditLog({
      userId: admin.id,
      targetId: id,
      action: "ADMIN_USER_SOFT_DELETE",
      details: { email: user.email },
    })
  }

  return { success: true }
}

export async function adminGetUserImpact(id: string) {
  await assertAdmin()

  const [tradeCount, playbookCount, challengeCount] = await Promise.all([
    prisma.trade.count({ where: { account: { userId: id } } }),
    prisma.playbook.count({ where: { userId: id } }),
    prisma.challengeAccount.count({ where: { userId: id } }),
  ])

  return { tradeCount, playbookCount, challengeCount }
}

export async function adminKillSession(sessionId: string) {
  const admin = await assertAdmin()
  await prisma.deviceSession.update({ where: { id: sessionId }, data: { isValid: false } })
  await writeAuditLog({ userId: admin.id, action: "ADMIN_KILL_SESSION", details: { sessionId } })
  return { success: true }
}

export async function adminKillAllUserSessions(userId: string) {
  const admin = await assertAdmin()
  await prisma.deviceSession.updateMany({ where: { userId }, data: { isValid: false } })
  await writeAuditLog({ userId: admin.id, targetId: userId, action: "ADMIN_KILL_ALL_SESSIONS" })
  return { success: true }
}

export async function adminResetUserPassword(userId: string) {
  const admin = await assertAdmin()

  const tempPassword = crypto.randomBytes(8).toString("hex")
  const hashed = await bcrypt.hash(tempPassword, 12)

  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  await prisma.deviceSession.updateMany({ where: { userId }, data: { isValid: false } })

  await writeAuditLog({
    userId: admin.id,
    targetId: userId,
    action: "ADMIN_RESET_PASSWORD",
    details: { tempPassword },
  })

  return { success: true, tempPassword }
}

export async function adminGetAuditLog(limit = 50) {
  await assertAdmin()
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { name: true, email: true } },
      target: { select: { name: true, email: true } },
    },
  })
}

export async function adminGetDashboardStats() {
  await assertAdmin()

  const [totalUsers, activeUsers, suspendedUsers, newUsersThisWeek, totalSessions, aiStats] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: { in: ["SUSPENDED", "BANNED", "DISABLED"] } } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.deviceSession.count({ where: { isValid: true, expiresAt: { gt: new Date() } } }),
    prisma.userAiSettings.aggregate({
      _sum: { totalRequests: true, totalTokens: true, estimatedCost: true },
    }),
  ])

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    newUsersThisWeek,
    totalSessions,
    totalAiRequests: aiStats._sum.totalRequests ?? 0,
    totalAiTokens: aiStats._sum.totalTokens ?? 0,
    totalAiCost: aiStats._sum.estimatedCost ?? 0,
  }
}
