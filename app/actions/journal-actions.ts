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


export async function getPreviousWeeklyReview(currentWeekOf: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Fetch all master RuleBook entries for this user
  const masterRules = await prisma.ruleBook.findMany({
    where: { userId: session.user.id, status: { not: "retired" } },
    orderBy: { createdAt: "asc" },
  })

  // Get all weekly reviews ordered by weekOf desc
  const allReviews = await prisma.weeklyReview.findMany({
    where: { userId: session.user.id },
    orderBy: { weekOf: 'desc' },
    select: { weekOf: true, rulesBuilt: true, ruleEvaluations: true }
  })

  // Find the most recent week BEFORE currentWeekOf
  const prev = allReviews.find(r => r.weekOf < currentWeekOf)

  // Collect all ever-retired rule signatures across ALL weeks
  const retiredSignatures = new Set<string>()
  for (const review of allReviews) {
    if (review.ruleEvaluations) {
      try {
        const evals = JSON.parse(review.ruleEvaluations) as Array<{ when: string; then: string; verdict: string }>
        for (const e of evals) {
          if (e.verdict === 'retire') {
            retiredSignatures.add(e.when + '||' + e.then)
          }
        }
      } catch {}
    }
  }

  // Combine rules from master RuleBook and previous weekly reviews
  const ruleMap = new Map<string, { when: string; then: string; from: string; status?: string; id?: string }>()

  // 1. First add from master RuleBook (excluding retired ones)
  for (const r of masterRules) {
    const sig = r.condition + '||' + r.action
    if (!retiredSignatures.has(sig)) {
      // If rule was added in an earlier week, or has no week, or is active/testing
      if (!r.weekAdded || r.weekAdded < currentWeekOf) {
        ruleMap.set(sig, {
          when: r.condition,
          then: r.action,
          from: r.fromMistake || (r.weekAdded ? `Week ${r.weekAdded}` : "Rule Book"),
          status: r.status,
          id: r.id
        })
      }
    }
  }

  // 2. Also incorporate previous review rulesBuilt if any exist
  if (prev?.rulesBuilt) {
    try {
      const parsed = JSON.parse(prev.rulesBuilt)
      for (const r of parsed) {
        const sig = r.when + '||' + r.then
        if (!retiredSignatures.has(sig) && !ruleMap.has(sig)) {
          ruleMap.set(sig, {
            when: r.when,
            then: r.then,
            from: r.from || `Week ${prev.weekOf}`,
          })
        }
      }
    } catch {}
  }

  // If no earlier rules found specifically before currentWeekOf, but master rules exist, load active & testing master rules
  let prevRules = Array.from(ruleMap.values())
  if (prevRules.length === 0 && masterRules.length > 0) {
    prevRules = masterRules
      .filter(r => !retiredSignatures.has(r.condition + '||' + r.action))
      .map(r => ({
        when: r.condition,
        then: r.action,
        from: r.fromMistake || (r.weekAdded ? `Week ${r.weekAdded}` : "Rule Book"),
        status: r.status,
        id: r.id
      }))
  }

  const previousWeekLabel = prev?.weekOf || (prevRules.length > 0 ? "Rule Book" : null)

  // Get saved evaluations for current week (if editing)
  const currentWeek = allReviews.find(r => r.weekOf === currentWeekOf)
  let savedEvals: any[] = []
  if (currentWeek?.ruleEvaluations) {
    try { savedEvals = JSON.parse(currentWeek.ruleEvaluations) } catch {}
  }

  return { previousWeekOf: previousWeekLabel, rules: prevRules, savedEvals }
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
  if (!session?.user?.id) return null
  
  try {
    return await prisma.monthlyRecap.findUnique({
      where: { userId_month: { userId: session.user.id, month } }
    })
  } catch {
    return null
  }
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

// Upload images for weekly review missed trades (reuses the same Supabase bucket)
export async function uploadMissedTradeImages(base64Images: string[], weekOf: string): Promise<string[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  return processBase64Images(base64Images, `mt_${session.user.id}_${weekOf}`)
}

// Upload image via FormData to bypass Next.js base64 server action limits
export async function uploadImageFormData(formData: FormData): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const file = formData.get("file") as File
  if (!file) throw new Error("No file")

  const prefix = formData.get("prefix") as string || "img"
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const mimeType = file.type || "image/png"
  const fileExt = mimeType.split("/")[1] || "png"
  const fileName = `${prefix}_${session.user.id}_${Date.now()}.${fileExt}`

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data, error } = await supabase.storage
        .from('screenshots')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true })
      if (error) throw error
      return `${supabaseUrl}/storage/v1/object/public/screenshots/${fileName}`
    } catch (error: any) {
      console.error("Failed to upload to Supabase:", error)
      return saveLocalFile(fileName, buffer)
    }
  } else {
    return saveLocalFile(fileName, buffer)
  }
}