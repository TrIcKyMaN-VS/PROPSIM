import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

interface QueuedCommand {
  command: string
  startDate: string
  endDate: string
}

declare global {
  var queuedCommands: Record<string, QueuedCommand> | undefined
}

if (!global.queuedCommands) {
  global.queuedCommands = {}
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { startDate, endDate } = await req.json()
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing startDate or endDate" }, { status: 400 })
    }

    // Queue the command for the user
    global.queuedCommands![session.user.id] = {
      command: "SYNC_HISTORY",
      startDate,
      endDate
    }

    return NextResponse.json({ success: true, message: `Sync queued from ${startDate} to ${endDate}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Clear queue
    delete global.queuedCommands![session.user.id]
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
