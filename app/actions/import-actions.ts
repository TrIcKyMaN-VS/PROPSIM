"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { encryptString, decryptString } from "@/lib/encryption"
import { syncTradovate } from "@/lib/broker-api/tradovate"
import { syncTradeLocker } from "@/lib/broker-api/tradelocker"
import { syncNinjaTrader } from "@/lib/broker-api/ninjatrader"
import { syncRithmic } from "@/lib/broker-api/rithmic"

const prisma = new PrismaClient()

// Broker Connection Actions
export async function getBrokerConnections() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.brokerConnection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })
}

export async function addBrokerConnection(provider: string, configObj: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Check if exists
  const existing = await prisma.brokerConnection.findFirst({
    where: { userId: session.user.id, provider }
  })
  
  if (existing) throw new Error("Connection already exists")

  // Encrypt config payload
  const encryptedConfig = encryptString(JSON.stringify(configObj))

  return prisma.brokerConnection.create({
    data: {
      userId: session.user.id,
      provider,
      status: "Connected",
      accountName: configObj.accountName || `${provider} Account`,
      config: encryptedConfig
    }
  })
}

export async function removeBrokerConnection(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.brokerConnection.deleteMany({
    where: { id, userId: session.user.id }
  })
}

export async function syncBroker(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const conn = await prisma.brokerConnection.findFirst({
    where: { id, userId: session.user.id }
  })
  if (!conn) throw new Error("Connection not found")
  if (!conn.config) throw new Error("Connection configuration missing")

  await prisma.brokerConnection.update({
    where: { id },
    data: { status: "Syncing" }
  })

  try {
    // Decrypt credentials
    const configObj = JSON.parse(decryptString(conn.config))
    let result = { tradesAdded: 0, message: "" }

    // Route to correct adapter
    if (conn.provider === "Tradovate") {
      result = await syncTradovate(configObj)
    } else if (conn.provider === "TradeLocker") {
      result = await syncTradeLocker(configObj)
    } else if (conn.provider === "NinjaTrader") {
      result = await syncNinjaTrader(configObj)
    } else if (conn.provider === "Rithmic") {
      result = await syncRithmic(configObj)
    } else {
      throw new Error("Unsupported provider")
    }

    await prisma.brokerConnection.update({
      where: { id },
      data: { status: "Connected", lastSync: new Date(), errorMessage: null }
    })
    
    // Log the import
    await prisma.importLog.create({
      data: {
        userId: session.user.id,
        source: conn.provider + " API",
        newTradesCount: result.tradesAdded,
        status: "Success",
        message: result.message
      }
    })
  } catch (error: any) {
    await prisma.brokerConnection.update({
      where: { id },
      data: { status: "Error", errorMessage: error.message || "Unknown error occurred" }
    })
    
    await prisma.importLog.create({
      data: {
        userId: session.user.id,
        source: conn.provider + " API",
        newTradesCount: 0,
        errorsCount: 1,
        status: "Failed",
        message: error.message || "Sync failed"
      }
    })
    
    throw error
  }
}

// Import Log Actions
export async function getImportLogs() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.importLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })
}

export async function logManualImport(source: string, newTradesCount: number, duplicatesSkipped: number, errorsCount: number, status: string, message?: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.importLog.create({
    data: {
      userId: session.user.id,
      source,
      newTradesCount,
      duplicatesSkipped,
      errorsCount,
      status,
      message
    }
  })
}
