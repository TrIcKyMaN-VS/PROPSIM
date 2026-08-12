import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { reindexTradeDays } from "@/app/actions/trade-actions"
import { calculateTradeScores } from "@/lib/ai/scoring-engine"

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
          archivedAt: null,
          OR: [
            { brokerAccountName: payload.accountName },
            { name: payload.accountName }
          ]
        }
      })
      
      // Map accountName to ChallengeAccount. Priority to active accounts.
      let account = accounts.find(a => a.brokerAccountName === payload.accountName && a.status === "active")
      if (!account) {
        account = accounts.find(a => a.name === payload.accountName && a.status === "active")
      }
      if (!account) {
        account = accounts.find(a => a.brokerAccountName === payload.accountName)
      }
      if (!account && accounts.length > 0) {
        account = accounts[0]
      }
      
      if (!account) {
        if (!isArray) {
          return NextResponse.json({ success: false, message: `Ignored: Account mapping not found for ${payload.accountName}` }, { status: 200 })
        }
        errors.push({ payload, error: `Account mapping not found for ${payload.accountName}` })
        continue
      }
      
      const parseToUtcMs = (dateStr: string): number => {
        if (!dateStr.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
          return new Date(dateStr + "Z").getTime();
        }
        return new Date(dateStr).getTime();
      }

      let entryTimeMs = payload.entryTime ? parseToUtcMs(payload.entryTime) : Date.now()
      if (isNaN(entryTimeMs)) {
        entryTimeMs = Date.now()
      }

      let exitTimeMs = payload.exitTime ? parseToUtcMs(payload.exitTime) : null
      if (exitTimeMs !== null && isNaN(exitTimeMs)) {
        exitTimeMs = Date.now()
      }

      const timingIncomplete = !payload.exitTime
      
      const mappedTrade = {
        entry: payload.entryPrice,
        exit: payload.exitPrice,
        pnl: payload.pnl,
        contracts: payload.contracts,
        instrument: payload.instrument
      }
      const scores = calculateTradeScores(mappedTrade, null)

      // Duplicate prevention: check if trade with same NT providerTradeId or instrument+timestamp exists
      const ntTag = `NT-${payload.providerTradeId}`
      const existing = await prisma.trade.findFirst({
        where: {
          accountId: account.id,
          OR: [
            { tags: { contains: ntTag } },
            {
              instrument: payload.instrument,
              timestamp: BigInt(entryTimeMs)
            }
          ]
        }
      })
      
      if (existing) {
        // Update existing trade
        const updated = await prisma.trade.update({
          where: { id: existing.id },
          data: {
            instrument: payload.instrument,
            direction: payload.direction,
            entry: payload.entryPrice,
            exit: payload.exitPrice,
            contracts: payload.contracts,
            pnl: payload.pnl,
            exitTime: exitTimeMs ? BigInt(exitTimeMs) : null,
            timingIncomplete,
            setupQualityScore: scores.setupQualityScore,
            entryQualityScore: scores.entryQualityScore,
            exitQualityScore: scores.exitQualityScore,
            riskScore: scores.riskScore,
            disciplineScore: scores.disciplineScore
          }
        })
        
        const safeTrade = {
          ...updated,
          timestamp: Number(updated.timestamp),
          exitTime: updated.exitTime ? Number(updated.exitTime) : null,
          timingIncomplete: updated.timingIncomplete,
          setupQualityScore: updated.setupQualityScore ?? undefined,
          entryQualityScore: updated.entryQualityScore ?? undefined,
          exitQualityScore: updated.exitQualityScore ?? undefined,
          riskScore: updated.riskScore ?? undefined,
          disciplineScore: updated.disciplineScore ?? undefined
        }
        
        if (!isArray) {
          // Reindex days so this trade's day number reflects its real calendar date
          await reindexTradeDays(account.id)
          return NextResponse.json({ message: "Trade updated successfully", trade: safeTrade }, { status: 200 })
        }
        syncedTrades.push({ 
          ...safeTrade, 
          status: 'synced'
        })
        continue
      }

      // Determine session naively
      const hour = new Date(entryTimeMs).getUTCHours()
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
          timestamp: BigInt(entryTimeMs),
          exitTime: exitTimeMs ? BigInt(exitTimeMs) : null,
          timingIncomplete,
          tags: JSON.stringify([ntTag]),
          notes: "Imported via NinjaTrader Sync",
          setupQualityScore: scores.setupQualityScore,
          entryQualityScore: scores.entryQualityScore,
          exitQualityScore: scores.exitQualityScore,
          riskScore: scores.riskScore,
          disciplineScore: scores.disciplineScore
        }
      })
      
      // Convert BigInt to Number for JSON serialization
      const safeTrade = {
        ...trade,
        timestamp: Number(trade.timestamp),
        exitTime: trade.exitTime ? Number(trade.exitTime) : null,
        timingIncomplete: trade.timingIncomplete,
        setupQualityScore: trade.setupQualityScore ?? undefined,
        entryQualityScore: trade.entryQualityScore ?? undefined,
        exitQualityScore: trade.exitQualityScore ?? undefined,
        riskScore: trade.riskScore ?? undefined,
        disciplineScore: trade.disciplineScore ?? undefined
      }
      
      if (!isArray) {
        // Reindex days so this trade's day number reflects its real calendar date
        await reindexTradeDays(account.id)
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
