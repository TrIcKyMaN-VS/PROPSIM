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
    repeatedMistakes: z.string().describe("A summary of the mistakes that kept showing up this week across the journals. Keep it concise and bulleted if possible."),
    repeatedWinConditions: z.string().describe("A summary of what the best or most controlled days had in common (prep, mindset, context). Keep it concise."),
    emotionalTimingPatterns: z.string().describe("Any emotional or timing patterns noticed (e.g., FOMO during open, revenge trading after a loss).")
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: \`You are an expert trading psychologist and coach. Review the following daily trading journals for a single week and extract the key patterns. 
      Be honest, direct, and concise.

      Journals:
      \${compiledText}
      \`
    })

    if (usage) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }

    return object
  })

  return result.result
}
`;
fs.writeFileSync('app/actions/weekly-review-ai-actions.ts', content, 'utf8');
