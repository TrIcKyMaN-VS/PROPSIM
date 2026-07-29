import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const token = authHeader.split(" ")[1]
    
    // Update the lastUsed timestamp for the heartbeat
    const apiToken = await prisma.apiToken.update({
      where: { token },
      data: { lastUsed: new Date() }
    })

    const queuedCommands = (global as any).queuedCommands || {}
    const command = queuedCommands[apiToken.userId] || null

    if (command) {
      delete queuedCommands[apiToken.userId]
    }
    
    return NextResponse.json({ success: true, command })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
