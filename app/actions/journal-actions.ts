"use server"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"


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



async function saveLocalFile(fileName: string, buffer: Buffer): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  const filePath = path.join(uploadsDir, fileName)
  fs.writeFileSync(filePath, buffer)
  return "/uploads/" + fileName
}

async function processBase64Images(images: string[], prefix: string): Promise<string[]> {
  const processed: string[] = []
  for (let i = 0; i < images.length; i++) {
    const url = images[i]
    if (!url) continue
    if (url.startsWith("data:")) {
      const match = url.match(/^data:(image\/[a-zA-Z+-\.]+);base64,(.+)$/)
      if (match) {
        const mimeType = match[1]
        const base64Content = match[2]
        const buffer = Buffer.from(base64Content, "base64")
        const fileExt = mimeType.split("/")[1] || "png"
        const fileName = `${prefix}_${Date.now()}_${i}.${fileExt}`
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && supabaseServiceKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseServiceKey)
            const { data, error } = await supabase.storage
              .from('screenshots')
              .upload(fileName, buffer, { contentType: mimeType, upsert: true })
            if (error) throw error
            processed.push(`${supabaseUrl}/storage/v1/object/public/screenshots/${fileName}`)
          } catch (error: any) {
            console.error("Failed to upload to Supabase:", error)
            processed.push(await saveLocalFile(fileName, buffer))
          }
        } else {
          processed.push(await saveLocalFile(fileName, buffer))
        }
      } else {
        processed.push(url)
      }
    } else {
      processed.push(url)
    }
  }
  return processed
}

export async function saveDailyJournal(date: string, data: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  if (data.preMarketScreenshots && Array.isArray(data.preMarketScreenshots)) {
    data.preMarketScreenshots = await processBase64Images(data.preMarketScreenshots, "pm_" + session.user.id + "_" + date)
  }
  if (data.postSessionScreenshots && Array.isArray(data.postSessionScreenshots)) {
    data.postSessionScreenshots = await processBase64Images(data.postSessionScreenshots, "ps_" + session.user.id + "_" + date)
  }
  
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


