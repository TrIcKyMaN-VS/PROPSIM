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
  
  const allTrades = await prisma.trade.findMany({
    where: {
      account: { userId: session.user.id }
    }
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

  // get trades for the week based on timestamp matching the days
  const weekDates = new Set(weekJournals.map(j => j.date))
  
  // also find trades that fall into this week based on their timestamp
  const weekTrades = allTrades.filter(t => {
     const d = new Date(Number(t.timestamp))
     const y = d.getFullYear()
     const m = String(d.getMonth() + 1).padStart(2, '0')
     const day = String(d.getDate()).padStart(2, '0')
     const dateStr = \`\${y}-\${m}-\${day}\`
     return weekDates.has(dateStr) || getWeekKeyFromDate(dateStr) === weekOf
  })

  if (weekJournals.length === 0 && weekTrades.length === 0) {
    throw new Error("No daily journals or trades found for this week.")
  }

  const compiledText = weekJournals.map(j => {
    const dayTrades = weekTrades.filter(t => {
       const d = new Date(Number(t.timestamp))
       const y = d.getFullYear()
       const m = String(d.getMonth() + 1).padStart(2, '0')
       const day = String(d.getDate()).padStart(2, '0')
       return \`\${y}-\${m}-\${day}\` === j.date
    })

    let tradesText = ""
    if (dayTrades.length > 0) {
       tradesText = "\\nTrades Executed This Day:\\n" + dayTrades.map((t, i) => 
         \`  Trade \${i+1} (\${t.instrument} \${t.direction}): PnL: $\${t.pnl}, Mistakes Tagged: \${t.mistakes || "None"}, Notes: \${t.notes || "None"}\`
       ).join("\\n")
    }

    return \`Date: \${j.date}
Red Day: \${j.isRedDay ? "Yes" : "No"}
Context & Prep: \${j.htfContext || ""}
Execution & Thought Process: \${j.overallThoughtProcess || ""}
Mistakes / Rules Broken: \${j.rulesBroken || ""} \${j.redCorrectiveAction || ""}
Mental State: \${j.stateCheckNotes || ""}\${tradesText}\`
  }).join("\\n---\\n")

  const schema = z.object({
    repeatedMistakes: z.array(z.string()).describe("ONLY list mistakes that occurred MULTIPLE TIMES (e.g. across 2 or more trades, or noted multiple times). If a mistake only happened ONCE all week, exclude it completely. Format as a concise bulleted list."),
    repeatedWinConditions: z.string().describe("ONLY list win conditions/prep habits that occurred MULTIPLE TIMES. Exclude single occurrences. Format as a concise bulleted list."),
    emotionalTimingPatterns: z.string().describe("ONLY list emotional or timing patterns that occurred MULTIPLE TIMES. Exclude single occurrences. Format as a concise bulleted list.")
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: \`You are an expert trading psychologist and coach. Review the following daily trading journals and TRADE EXECUTIONS for a single week and extract the key patterns. 

CRITICAL RULE: Once is noise. Twice is a pattern. 
You must ONLY output items that happened 2 OR MORE TIMES during the week (e.g., a mistake made on 2 different trades, or a mental pattern noted multiple times).
If a mistake, win condition, or emotional trigger only happened ONCE all week, DO NOT INCLUDE IT in your output. It is just noise.

Read BOTH the Daily Journal reflections AND the individual Trade Mistakes/Notes to find patterns.

Be honest, direct, and concise. 

Data:
\${compiledText}
      \`
    })

    if (usage?.totalTokens) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }

    return {
      repeatedMistakes: object.repeatedMistakes?.map(s => \`• \${s}\`).join("\\n\\n") || "No repeated mistakes found.",
      repeatedWinConditions: typeof object.repeatedWinConditions === 'string' ? object.repeatedWinConditions : (object.repeatedWinConditions as any)?.map?.((s: string) => \`• \${s}\`).join("\\n\\n") || "No repeated win conditions found.",
      emotionalTimingPatterns: typeof object.emotionalTimingPatterns === 'string' ? object.emotionalTimingPatterns : (object.emotionalTimingPatterns as any)?.map?.((s: string) => \`• \${s}\`).join("\\n\\n") || "No repeated patterns found."
    }
  })

  return result.result
}
`;

fs.writeFileSync('app/actions/weekly-review-ai-actions.ts', content, 'utf8');
