"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

export async function updateRoutineConfig(config: { morning: string[], eod: string[] }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      routineConfig: JSON.stringify(config)
    }
  })
}

export async function getRoutineConfig() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user?.routineConfig) return null

  return JSON.parse(user.routineConfig) as { morning: string[], eod: string[] }
}
