import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { chatWithAiCoach } from "@/lib/ai/coach-chat"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()
    const { messages, accountId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 })
    }

    const result = await chatWithAiCoach(userId, messages, accountId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Coach chat route error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
