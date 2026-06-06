"use server"

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { headers } from "next/headers"
import { rateLimit } from "@/lib/rate-limiter"

const prisma = new PrismaClient()

async function getIp(): Promise<string> {
  const h = await headers()
  return h.get("x-forwarded-for") || h.get("x-real-ip") || "unknown"
}

async function writeAuditLog(opts: {
  userId?: string
  targetId?: string
  action: string
  details?: object
  ip?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        targetId: opts.targetId,
        action: opts.action,
        details: opts.details ? JSON.stringify(opts.details) : null,
        ip: opts.ip,
        userAgent: opts.userAgent,
      },
    })
  } catch (e) {
    console.error("AuditLog write failed:", e)
  }
}

export async function registerAction(data: {
  name: string
  email: string
  password: string
  confirmPassword: string
}) {
  const ip = await getIp()
  const { allowed } = rateLimit(`register:${ip}`, 5, 10 * 60_000) // 5 per 10 min

  if (!allowed) {
    throw new Error("Too many registration attempts. Please wait and try again.")
  }

  if (!data.name || !data.email || !data.password) {
    throw new Error("All fields are required.")
  }

  if (data.password !== data.confirmPassword) {
    throw new Error("Passwords do not match.")
  }

  if (data.password.length < 8) {
    throw new Error("Password must be at least 8 characters.")
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new Error("An account with this email already exists. Please log in.")
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "USER",
      plan: "FREE",
      status: "ACTIVE",
    },
  })

  await writeAuditLog({
    userId: user.id,
    action: "REGISTER",
    details: { email: user.email, method: "credentials" },
    ip,
  })

  return { success: true, userId: user.id }
}

export async function requestPasswordResetAction(email: string) {
  const ip = await getIp()
  const { allowed } = rateLimit(`forgot:${ip}`, 3, 15 * 60_000) // 3 per 15 min

  if (!allowed) {
    throw new Error("Too many requests. Please wait and try again.")
  }

  // Always show success regardless of whether email exists (security best practice)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { success: true }

  // Invalidate existing tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  await writeAuditLog({
    userId: user.id,
    action: "PASSWORD_RESET_REQUEST",
    details: { email },
    ip,
  })

  // In production: send email with reset link
  // For MVP: log token to console so you can test the flow
  const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`
  console.log(`\n🔑 PASSWORD RESET LINK for ${email}:\n${resetUrl}\n`)

  return { success: true }
}

export async function resetPasswordAction(token: string, newPassword: string, confirmPassword: string) {
  if (!token) throw new Error("Invalid or missing reset token.")
  if (newPassword !== confirmPassword) throw new Error("Passwords do not match.")
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.")

  const ip = await getIp()

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!resetToken || resetToken.used) {
    throw new Error("This reset link is invalid or has already been used.")
  }

  if (new Date() > resetToken.expiresAt) {
    throw new Error("This reset link has expired. Please request a new one.")
  }

  const hashed = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashed },
  })

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { used: true },
  })

  // Invalidate all device sessions for security
  await prisma.deviceSession.updateMany({
    where: { userId: resetToken.userId },
    data: { isValid: false },
  })

  await writeAuditLog({
    userId: resetToken.userId,
    action: "PASSWORD_RESET",
    details: { method: "token" },
    ip,
  })

  return { success: true }
}
