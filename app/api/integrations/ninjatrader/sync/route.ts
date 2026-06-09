import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { reindexTradeDays } from "@/app/actions/trade-actions"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 })
    }
    
    const token = authHeader.split(" ")[1]
    const apiToken = await prisma.apiToken.findUnique({ where: { token } })
    
    if (!apiToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
    
    // Update lastUsed
    await prisma.apiToken.update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } })
    
    const body = await req.json()
    const isArray = Array.isArray(body)
    const payloads = isArray ? body : [body]
    const syncedTrades = []
    const errors = []

    for (const payload of payloads) {
      // Expected Payload: providerTradeId, accountName, instrument, direction, entryPrice, exitPrice, contracts, pnl, entryTime
      
      // Map accountName to ChallengeAccount. Grab account matching brokerAccountName or name.
      const accounts = await prisma.challengeAccount.findMany({
        where: { 
          userId: apiToken.userId,
          OR: [
            { brokerAccountName: payload.accountName },
            { name: payload.accountName }
          ]
        }
      })
      
      let account = accounts.find(a => a.brokerAccountName === payload.accountName)
      if (!account && accounts.length > 0) {
        account = accounts[0]
      }
      
      if (!account) {
        if (!isArray) {
          return NextResponse.json({ error: `Account mapping not found for ${payload.accountName}` }, { status: 400 })
        }
        errors.push({ payload, error: `Account mapping not found for ${payload.accountName}` })
        continue
      }
      
      const ts = new Date(payload.entryTime || Date.now()).getTime()
      
      // Duplicate prevention: check if trade with same instrument and timestamp exists
      const existing = await prisma.trade.findFirst({
        where: {
          accountId: account.id,
          instrument: payload.instrument,
          timestamp: BigInt(ts)
        }
      })
      
      if (existing) {
        if (!isArray) {
          return NextResponse.json({ message: "Trade already synced", tradeId: existing.id }, { status: 200 })
        }
        syncedTrades.push({ ...existing, timestamp: Number(existing.timestamp), status: 'already_synced' })
        continue
      }

      // Determine session naively
      const hour = new Date(ts).getUTCHours()
      const session = hour >= 13 && hour <= 20 ? "New York AM" : "London"
      
      const trade = await prisma.trade.create({
        data: {
          accountId: account.id,
          instrument: payload.instrument,
          direction: payload.direction,
          entry: payload.entryPrice,
          exit: payload.exitPrice,
          contracts: payload.contracts,
          pnl: payload.pnl,
          day: 1, // Should be computed based on challenge start, defaulting to 1
          session,
          timestamp: BigInt(ts),
          tags: JSON.stringify([`NT-${payload.providerTradeId}`]),
          notes: "Imported via NinjaTrader Sync"
        }
      })
      
      // Convert BigInt to Number for JSON serialization
      const safeTrade = {
        ...trade,
        timestamp: Number(trade.timestamp)
      }
      
      if (!isArray) {
        return NextResponse.json({ message: "Trade synced successfully", trade: safeTrade }, { status: 200 })
      }
      
      syncedTrades.push({ ...safeTrade, status: 'synced' })
    }

    // Reindex trade days for all modified accounts to ensure correct sequential ordering
    const modifiedAccountIds = Array.from(new Set(syncedTrades.filter(t => t.status === 'synced').map(t => t.accountId)))
    for (const accId of modifiedAccountIds) {
      await reindexTradeDays(accId)
    }

    return NextResponse.json({ 
      message: "Sync completed", 
      trades: syncedTrades,
      errors: errors.length > 0 ? errors : undefined 
    }, { status: 200 })
  } catch (err: any) {
    console.error("NinjaTrader Sync Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
