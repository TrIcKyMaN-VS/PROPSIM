"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function getDailyJournal(date: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.dailyJournal.findUnique({
    where: { userId_date: { userId: session.user.id, date } }
  })
}

export async function saveDailyJournal(date: string, data: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.dailyJournal.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: data,
    create: { ...data, userId: session.user.id, date }
  })
}

export async function getWeeklyReview(weekOf: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.weeklyReview.findUnique({
    where: { userId_weekOf: { userId: session.user.id, weekOf } }
  })
}

export async function saveWeeklyReview(weekOf: string, data: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.weeklyReview.upsert({
    where: { userId_weekOf: { userId: session.user.id, weekOf } },
    update: data,
    create: { ...data, userId: session.user.id, weekOf }
  })
}

export async function getMonthlyRecap(month: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.monthlyRecap.findUnique({
    where: { userId_month: { userId: session.user.id, month } }
  })
}

export async function saveMonthlyRecap(month: string, data: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return prisma.monthlyRecap.upsert({
    where: { userId_month: { userId: session.user.id, month } },
    update: data,
    create: { ...data, userId: session.user.id, month }
  })
}
