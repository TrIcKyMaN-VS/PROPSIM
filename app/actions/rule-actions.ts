"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function saveRuleTemplate(name: string, nodes: any[], edges: any[], description?: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const template = await prisma.ruleTemplate.create({
    data: {
      userId: session.user.id,
      name,
      description,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges)
    }
  })

  return template
}

export async function getRuleTemplates() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const templates = await prisma.ruleTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })

  return templates.map(t => ({
    ...t,
    nodes: JSON.parse(t.nodes),
    edges: JSON.parse(t.edges)
  }))
}

export async function deleteRuleTemplate(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.ruleTemplate.deleteMany({
    where: { id, userId: session.user.id }
  })
}

export async function getRuleViolationsForAccount(accountId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.ruleViolation.findMany({
    where: {
      accountId,
      userId: session.user.id
    },
    orderBy: { timestamp: "desc" },
    take: 20
  })
}
