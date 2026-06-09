"use server"

import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

export async function getChecklistTemplates() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const templates = await prisma.checklistTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })

  return templates.map(t => ({
    ...t,
    items: JSON.parse(t.items)
  }))
}

export async function saveChecklistTemplate(data: { id?: string, name: string, items: any[], isPublic?: boolean }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (data.id && !data.id.startsWith("0.")) { // Avoid mock temp ids
    const updated = await prisma.checklistTemplate.updateMany({
      where: { id: data.id, userId: session.user.id },
      data: {
        name: data.name,
        items: JSON.stringify(data.items),
        isPublic: data.isPublic || false
      }
    })
    return { id: data.id, name: data.name, items: data.items, isPublic: data.isPublic }
  }

  const created = await prisma.checklistTemplate.create({
    data: {
      userId: session.user.id,
      name: data.name,
      items: JSON.stringify(data.items),
      isPublic: data.isPublic || false
    }
  })

  return {
    id: created.id,
    name: created.name,
    items: JSON.parse(created.items),
    isPublic: created.isPublic
  }
}

export async function deleteChecklistTemplate(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.checklistTemplate.deleteMany({
    where: { id, userId: session.user.id }
  })
}
