"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getFirm } from "@/lib/firms"

const prisma = new PrismaClient()

export async function getAccounts() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.challengeAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function createAccount(
  firmId: string, 
  sizeLabel: string, 
  challengeType: "OFFICIAL" | "CUSTOM" = "OFFICIAL", 
  customOverrides?: Record<string, any>
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const firm = getFirm(firmId)
  if (!firm) throw new Error("Firm not found")
  
  const size = firm.sizes.find(s => s.label === sizeLabel) || firm.sizes[0]

  // Validation
  if (challengeType === "CUSTOM" && customOverrides) {
    const balance = customOverrides.startingBalance ?? size.rules.startingBalance
    const target = customOverrides.profitTarget ?? size.rules.profitTarget
    const drawdown = customOverrides.maxDrawdown ?? size.rules.maxDrawdown
    const contracts = customOverrides.maxContracts ?? size.rules.maxContracts
    const dailyLoss = customOverrides.dailyLossLimit ?? size.rules.dailyLossLimit
    const minDays = customOverrides.minTradingDays ?? size.rules.minTradingDays
    const consistency = customOverrides.consistencyPct ?? size.rules.consistencyPct

    if (balance <= 0) throw new Error("Starting Balance must be greater than 0")
    if (target <= 0) throw new Error("Profit Target must be greater than 0")
    if (drawdown <= 0) throw new Error("Max Drawdown must be greater than 0")
    if (contracts < 1 || contracts > 100) throw new Error("Max Contracts must be between 1 and 100")
    if (dailyLoss < 0) throw new Error("Daily Loss Limit must be 0 or greater")
    if (minDays < 0) throw new Error("Minimum Trading Days must be 0 or greater")
    if (consistency < 0 || consistency > 100) throw new Error("Consistency % must be between 0 and 100")
  }

  const baseRules = size.rules
  const rulesToSave = challengeType === "CUSTOM" && customOverrides
    ? { ...baseRules, ...customOverrides }
    : baseRules

  const account = await prisma.challengeAccount.create({
    data: {
      userId: session.user.id,
      firmId,
      sizeLabel: size.label,
      rules: JSON.stringify(rulesToSave),
      challengeType,
      customOverrides: challengeType === "CUSTOM" && customOverrides ? JSON.stringify(customOverrides) : null,
      baseRules: JSON.stringify(baseRules),
      status: "active"
    }
  })

  return account
}

export async function deleteAccount(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.challengeAccount.deleteMany({
    where: { id, userId: session.user.id }
  })
}

export async function updateAccountMapping(accountId: string, brokerAccountName: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.challengeAccount.updateMany({
    where: { id: accountId, userId: session.user.id },
    data: { brokerAccountName }
  })
  
  return { success: true }
}

export async function getDiscoveredAccounts() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.discoveredAccount.findMany({
    where: { userId: session.user.id, provider: "NinjaTrader" },
    orderBy: { lastSeen: "desc" }
  })
}

export async function resetToOfficialRules(accountId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const account = await prisma.challengeAccount.findUnique({
    where: { id: accountId }
  })
  if (!account || account.userId !== session.user.id) throw new Error("Account not found")

  const baseRulesStr = account.baseRules || account.rules

  await prisma.challengeAccount.update({
    where: { id: accountId },
    data: {
      rules: baseRulesStr,
      challengeType: "OFFICIAL",
      customOverrides: null
    }
  })

  return { success: true }
}
