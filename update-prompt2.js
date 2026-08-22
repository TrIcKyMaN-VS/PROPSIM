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
    repeatedMistakes: z.array(z.string()).describe("Analyze the week end-to-end. Highlight every REPEATED mistake. Explicitly note the frequency: Once is noise. Twice is a pattern. Three times is a rule waiting to be written. If a mistake happened 2+ times, suggest turning it into a rule (Condition + Action)."),
    repeatedWinConditions: z.array(z.string()).describe("Highlight every REPEATED win condition. What did the best/controlled days have in common? Note the frequency (e.g. 'Happened twice - this is a pattern')."),
    emotionalTimingPatterns: z.array(z.string()).describe("Identify emotional/timing patterns (e.g. FOMO during open, revenge trading after a loss). Format any severe patterns as a 'Condition + Action' rule that someone else could apply to the charts.")
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: \`You are an elite prop firm trading coach. Your job is to enforce strict discipline based on this exact playbook:

1. Read the week end to end. Highlight every repeated mistake and every repeated win condition. Once is noise. Twice is a pattern. Three times is a rule waiting to be written.
2. Turn patterns into rules. A rule MUST be written as a CONDITION plus an ACTION, and it must be specific enough that someone else could apply it to the charts and get the same answer.
3. You are preparing the trader to backtest this week using these new rules to find "the exact cost of their undisciplined behavior in R".
4. Rules stay in "testing" for 3 weeks before joining the model.

Format your responses concisely using bullet points. Be blunt, objective, and mathematical about their behavior.

Journals for the week:
\${compiledText}
\`
    })

    if (usage?.totalTokens) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }

    return {
      repeatedMistakes: object.repeatedMistakes.map(s => \`• \${s}\`).join("\\n\\n"),
      repeatedWinConditions: object.repeatedWinConditions.map(s => \`• \${s}\`).join("\\n\\n"),
      emotionalTimingPatterns: object.emotionalTimingPatterns.map(s => \`• \${s}\`).join("\\n\\n")
    }
  })

  return result.result
}
`;

fs.writeFileSync('app/actions/weekly-review-ai-actions.ts', content, 'utf8');
