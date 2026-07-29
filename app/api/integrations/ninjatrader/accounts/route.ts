import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const token = authHeader.split(" ")[1]
    const apiToken = await prisma.apiToken.findFirst({
      where: { token, provider: "NinjaTrader" }
    })
    
    if (!apiToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
    
    const { accounts } = await req.json()
    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    
    // Upsert discovered accounts
    for (const acc of accounts) {
      await prisma.discoveredAccount.upsert({
        where: {
          userId_provider_accountName: {
            userId: apiToken.userId,
            provider: "NinjaTrader",
            accountName: acc
          }
        },
        update: {
          lastSeen: new Date()
        },
        create: {
          userId: apiToken.userId,
          provider: "NinjaTrader",
          accountName: acc
        }
      })
    }
    
    // Prune stale accounts that are no longer present in NinjaTrader's active accounts list
    await prisma.discoveredAccount.deleteMany({
      where: {
        userId: apiToken.userId,
        provider: "NinjaTrader",
        accountName: {
          notIn: accounts
        }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
