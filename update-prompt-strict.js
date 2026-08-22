const fs = require('fs');

const content = `
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { runWithAiFallback, trackAiUsage } from "@/lib/ai/provider"
import { generateObject } from "ai"
import { z } from "zod"

function getWeekKeyFromDate(dateStr: string) {
  const d = new Date(dateStr)
  const year = d.getUTCFullYear()
  const oneJan = new Date(Date.UTC(year, 0, 1))
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((d.getUTCDay() + 1 + numberOfDays) / 7)
  return \`\${year}-W\${week.toString().padStart(2, "0")}\`
}

export async function generateWeeklyPatterns(weekOf: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const year = weekOf.split("-")[0]

  const allJournals = await prisma.dailyJournal.findMany({
    where: { 
      userId: session.user.id,
      date: { startsWith: year }
    },
    orderBy: { date: 'asc' }
  })

  const weekJournals = allJournals.filter(j => {
    return getWeekKeyFromDate(j.date) === weekOf || 
           (function(){
             const d = new Date(j.date + "T12:00:00")
             const y = d.getFullYear()
             const oJ = new Date(y, 0, 1)
             const num = Math.floor((d.getTime() - oJ.getTime()) / (24 * 60 * 60 * 1000))
             const w = Math.ceil((d.getDay() + 1 + num) / 7)
             return \`\${y}-W\${w.toString().padStart(2, "0")}\` === weekOf
           })()
  })

  if (weekJournals.length === 0) {
    throw new Error("No daily journals found for this week. Please fill out your daily journals first.")
  }

  const compiledText = weekJournals.map(j => \`
Date: \${j.date}
Red Day: \${j.isRedDay ? "Yes" : "No"}
Context & Prep: \${j.htfContext || ""}
Execution & Thought Process: \${j.overallThoughtProcess || ""}
Mistakes / Rules Broken: \${j.rulesBroken || ""} \${j.redCorrectiveAction || ""}
Mental State: \${j.stateCheckNotes || ""}
\`).join("\\n---\\n")

  const schema = z.object({
    repeatedMistakes: z.string().describe("ONLY list mistakes that occurred on MULTIPLE days. If a mistake only happened once, exclude it completely. Format as a concise bulleted list. If none, say 'No repeated mistakes found.'"),
    repeatedWinConditions: z.string().describe("ONLY list win conditions/prep habits that occurred on MULTIPLE days. If it only happened once, exclude it completely. Format as a concise bulleted list. If none, say 'No repeated win conditions found.'"),
    emotionalTimingPatterns: z.string().describe("ONLY list emotional or timing patterns that occurred on MULTIPLE days. If it only happened once, exclude it completely. Format as a concise bulleted list. If none, say 'No repeated patterns found.'")
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: \`You are an expert trading psychologist and coach. Review the following daily trading journals for a single week and extract the key patterns. 

CRITICAL RULE: Once is noise. Twice is a pattern. 
You must ONLY output items that happened repeatedly (on more than one day). 
If a mistake, win condition, or emotional trigger only happened on a single day, DO NOT INCLUDE IT in your output. It is just noise.

Be honest, direct, and concise. Use bullet points.

Journals:
\${compiledText}
      \`
    })

    if (usage?.totalTokens) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }

    return object
  })

  return result.result
}
`;

fs.writeFileSync('app/actions/weekly-review-ai-actions.ts', content, 'utf8');
