import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { runDatabaseMaintenance } from "@/lib/cleanup-service"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only admin can trigger
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const result = await runDatabaseMaintenance()
  return NextResponse.json({ success: true, ...result })
}
