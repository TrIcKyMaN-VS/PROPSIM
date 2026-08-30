
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { runWithAiFallback, trackAiUsage } from "@/lib/ai/provider"
import { generateObject } from "ai"
import { z } from "zod"

function getWeekKeyFromDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const year = d.getFullYear()
  const oneJan = new Date(year, 0, 1)
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7)
  return `${year}-W${week.toString().padStart(2, "0")}`
}

export async function generateWeeklyPatterns(weekOf: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const year = weekOf.split("-")[0]

  // ── Fetch all journals for the year ────────────────────────────────────────
  const allJournals = await prisma.dailyJournal.findMany({
    where: { userId: session.user.id, date: { startsWith: year } },
    orderBy: { date: "asc" }
  })

  // ── Fetch all trades with psychology + lessons ─────────────────────────────
  const allTrades = await prisma.trade.findMany({
    where: { account: { userId: session.user.id } },
    include: { 
      psychology: true,
      lesson: true
    }
  })

  // ── Filter to this week ────────────────────────────────────────────────────
  const weekJournals = allJournals.filter(j => getWeekKeyFromDate(j.date) === weekOf)

  const weekDates = new Set(weekJournals.map(j => j.date))

  const weekTrades = allTrades.filter(t => {
    const d = new Date(Number(t.timestamp))
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    return weekDates.has(dateStr) || getWeekKeyFromDate(dateStr) === weekOf
  })

  if (weekJournals.length === 0 && weekTrades.length === 0) {
    throw new Error("No daily journals or trades found for this week.")
  }

  // ── Split trades into winners and losers ───────────────────────────────────
  const winners = weekTrades.filter(t => t.pnl > 0)
  const losers  = weekTrades.filter(t => t.pnl <= 0)

  // ── Format tags safely ─────────────────────────────────────────────────────
  const parseTags = (raw: string | null): string => {
    if (!raw) return "None"
    try { return (JSON.parse(raw) as string[]).join(", ") || "None" }
    catch { return raw }
  }

  // ── Build trade summary sections ───────────────────────────────────────────
  const formatTrade = (t: typeof weekTrades[0], idx: number) => {
    const entryDate = new Date(Number(t.timestamp)).toISOString()
    const exitDate = t.exitTime ? new Date(Number(t.exitTime)).toISOString() : "N/A"
    const holdMs = t.exitTime ? (Number(t.exitTime) - Number(t.timestamp)) : null
    const holdMins = holdMs ? (holdMs / 1000 / 60).toFixed(1) + " mins" : "N/A"
    
    const lines = [
      `  Trade ${idx + 1} | ${t.instrument} ${t.direction.toUpperCase()} | PnL: $${t.pnl} | Net R: ${t.netR ? t.netR.toFixed(2) + "R" : "N/A"}`,
      `    Execution: Entry @ ${t.entry ?? "N/A"}, Exit @ ${t.exit ?? "N/A"} | Size: ${t.contracts} | Session: ${(t as any).session ?? "N/A"}`,
      `    Timing: In @ ${entryDate} -> Out @ ${exitDate} (Hold: ${holdMins})`,
      `    Risk Management: StopLoss ${t.stopLoss ?? "N/A"}, Planned Risk $${t.plannedRisk ?? "N/A"}`
    ]
    if (t.playbookName)          lines.push(`    Playbook/Setup: ${t.playbookName}`)
    if (t.reasonForEntry)        lines.push(`    Reason for entry: ${t.reasonForEntry}`)
    if (t.marketBias)            lines.push(`    Market bias: ${t.marketBias}`)
    if (t.resultVsExpectation)   lines.push(`    Result vs expectation: ${t.resultVsExpectation}`)
    if (t.mistakes)              lines.push(`    Mistakes tagged: ${t.mistakes}`)
    if (t.executionImprovement)  lines.push(`    Execution improvement: ${t.executionImprovement}`)
    if (t.psychologyNotes)       lines.push(`    Psychology notes: ${t.psychologyNotes}`)
    const tags = parseTags(t.tags as string | null)
    if (tags !== "None")         lines.push(`    Setup tags: ${tags}`)
    // Psychology sub-record
    if (t.psychology) {
      const p = t.psychology
      if (p.preFeeling)    lines.push(`    Pre-trade feeling: ${p.preFeeling}`)
      if (p.preNotes)      lines.push(`    Pre-trade notes: ${p.preNotes}`)
      if (p.exitReason)    lines.push(`    Exit reason: ${p.exitReason}`)
      if (p.executionGrade) lines.push(`    Execution grade: ${p.executionGrade}`)
      const flags = [
        p.hesitated    && "hesitated",
        p.movedStop    && "moved stop",
        p.movedTarget  && "moved target",
        p.addedSize    && "added to size",
        p.brokeRules   && "broke rules",
        p.emotionAffected && "emotion affected decision"
      ].filter(Boolean).join(", ")
      if (flags) lines.push(`    Behaviour flags: ${flags}`)
    }
    // Lesson learned sub-record
    if (t.lesson) {
      const l = t.lesson
      if (l.wentWell)       lines.push(`    What went well: ${l.wentWell}`)
      if (l.wentWrong)      lines.push(`    What went wrong: ${l.wentWrong}`)
      if (l.biggestMistake) lines.push(`    Biggest mistake: ${l.biggestMistake}`)
    }
    return lines.join("\n")
  }

  const tradesBlock = weekTrades.length === 0
    ? "  ⚠️  No trades were logged in the trade journal this week."
    : [
        winners.length > 0
          ? `WINNING TRADES (${winners.length}):\n${winners.map((t, i) => formatTrade(t, i)).join("\n\n")}`
          : "WINNING TRADES: None",
        losers.length > 0
          ? `\nLOSING / BREAKEVEN TRADES (${losers.length}):\n${losers.map((t, i) => formatTrade(t, i)).join("\n\n")}`
          : "\nLOSING / BREAKEVEN TRADES: None"
      ].join("\n")

  // ── Build daily journal sections ───────────────────────────────────────────
  const journalBlock = weekJournals.length === 0
    ? "  ⚠️  No daily journals written this week."
    : weekJournals.map(j => {
        const lines = [`Date: ${j.date}${j.isRedDay ? " 🔴 RED DAY" : ""}`]
        if (j.htfContext)             lines.push(`  HTF Context & Prep: ${j.htfContext}`)
        if (j.keyLevels)              lines.push(`  Key Levels: ${j.keyLevels}`)
        if (j.stateCheck)             lines.push(`  Mental State Score: ${j.stateCheck}/10`)
        if (j.stateCheckNotes)        lines.push(`  Mental State Notes: ${j.stateCheckNotes}`)
        if (j.overallThoughtProcess)  lines.push(`  Overall Thought Process: ${j.overallThoughtProcess}`)
        if (j.rulesBroken)            lines.push(`  Rules Broken: ${j.rulesBroken}`)
        if (j.redCorrectiveAction)    lines.push(`  Corrective Action: ${j.redCorrectiveAction}`)
        if (j.planAccuracy)           lines.push(`  Plan Accuracy: ${j.planAccuracy}/10 — ${j.planAccuracyWhy || ""}`)
        if (j.planAdherence)          lines.push(`  Plan Adherence: ${j.planAdherence}/10 — ${j.planAdherenceWhy || ""}`)
        return lines.join("\n")
      }).join("\n---\n")

  // ── Full prompt data ───────────────────────────────────────────────────────
  const compiledText = `
=== TRADE EXECUTIONS ===
${tradesBlock}

=== DAILY JOURNAL REFLECTIONS ===
${journalBlock}
`

  const schema = z.object({
    repeatedMistakes: z.object({
      fromTrades: z.array(z.string()).describe(
        "Return up to 4 concise, evidence-based insights from trade records about recurring mistakes or poor execution. " +
        "Use 'Repeated pattern:' for clear recurring evidence and 'Observation:' or 'Possible pattern:' for limited evidence. " +
        "Return exactly ['Insufficient evidence'] only when no meaningful insight exists."
      ),
      fromContext: z.array(z.string()).describe(
        "Return up to 4 concise insights from journal context related to mistakes, decision-making, or execution. " +
        "Cross-reference trade records when useful. " +
        "Use 'Repeated pattern:', 'Observation:', or 'Possible pattern:' according to evidence strength. " +
        "Return exactly ['Insufficient evidence'] only when no meaningful insight exists."
      )
    }),

    repeatedWinConditions: z.object({
      fromTrades: z.array(z.string()).describe(
        "Return up to 4 concise insights about characteristics associated with the user's highest-quality or best-performing trades. " +
        "Compare best trades against the rest of the trade history. Consider setup, direction, entry, key levels, session, market condition, holding time, R:R, management, and outcome. " +
        "Use evidence-based classification and do not force patterns."
      ),
      fromContext: z.array(z.string()).describe(
        "Return up to 4 concise insights about journal habits, reasoning, mindset, or state associated with the user's strongest trades. " +
        "Cross-reference actual trade outcomes where relevant. " +
        "Use evidence-based classification and do not infer unsupported emotions."
      )
    }),

    emotionalTimingPatterns: z.object({
      fromTrades: z.array(z.string()).describe(
        "Return up to 4 concise insights from trade timing, session, entry timing, exit timing, holding duration, and outcomes. " +
        "Identify useful relationships without assuming causation. " +
        "Use 'Repeated pattern:', 'Observation:', or 'Possible pattern:' according to evidence."
      ),
      fromContext: z.array(z.string()).describe(
        "Return up to 4 concise insights connecting journal mental state, feelings, hesitation, confidence, impatience, etc. with actual trade timing, holding duration, execution, and outcomes. " +
        "Only use emotions explicitly supported by the journal. " +
        "Use evidence-based classification."
      )
    })
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: `You are an expert trading psychologist and quantitative performance coach.

RULES FOR PATTERN DETECTION & CLASSIFICATION:

1. ANALYZE THE COMPLETE AVAILABLE DATA
   - Analyze all available trade logs and journal entries, not just recent records.
   - Use every relevant field available, including setup, direction, entry, exit, entry/exit time, holding time, P&L, SL, TP, R:R, session, market condition, trade management, entry/exit quality, state check, notes, emotions, and any other recorded information.
   - Do not rely only on keywords or individual fields.

2. CROSS-REFERENCE TRADE DATA WITH JOURNAL DATA
   - Use trade records to determine what actually happened.
   - Use journal entries to understand the trader's reasoning, expectations, emotions, and decision-making.
   - Compare both sources to identify relationships that are not obvious when looking at either source separately.
   - When journal claims and actual trade behavior differ, identify the difference when it is useful.

3. IDENTIFY USEFUL PATTERNS WITHOUT INVENTING THEM
   - Actively look for meaningful recurring behaviors, conditions, relationships, and tendencies.
   - Do not require a large sample size before reporting a useful observation.
   - Do not call something "repeated" or "consistent" simply because two values happen to match.
   - Consider how often the behavior occurs, whether it appears consistently, and whether it is meaningfully related to the outcome.
   - Never invent causes, emotions, correlations, or patterns that are not supported by the available data.

4. EVIDENCE CLASSIFICATION
   - Clear recurring evidence across multiple relevant trades/journal entries:
     "Repeated pattern: ..."
   - Limited evidence or an early signal that is still useful:
     "Observation: ..." or "Possible pattern: ..."
   - No meaningful insight can be extracted:
     "Insufficient evidence"

5. USE "INSUFFICIENT EVIDENCE" CORRECTLY
   - Do not use "Insufficient evidence" merely because the dataset is small.
   - If even a small dataset contains a useful observation, report it as an "Observation" or "Possible pattern".
   - Use "Insufficient evidence" only when there is genuinely no useful insight to report.

6. REPEATED MISTAKES
   - Analyze losing trades and poor executions for recurring issues.
   - Consider entry timing, entry location, setup quality, direction, SL/TP, R:R, trade management, holding time, early exits, late exits, overholding, missed entries, overtrading, and other available variables.
   - Cross-reference these findings with the journal to determine whether the trader recognized or described the same issue.

7. BEST-TRADE CONDITIONS
   - Identify the user's highest-quality and best-performing trades.
   - Compare these trades against the rest of the trade history, especially losing and weaker trades.
   - Look for common characteristics in setup, direction, key levels, entry location, session, market condition, holding time, risk/reward, management, exit, and journal mindset.
   - Focus on characteristics that appear meaningfully associated with the user's strongest trades.
   - Do not force a pattern if the available data does not support one.

8. EMOTIONAL AND TIMING PATTERNS
   - Cross-reference journal state checks, feelings, hesitation, confidence, impatience, FOMO, frustration, etc. with actual trade behavior.
   - Compare these with entry timing, exit timing, holding duration, session, and trade outcome.
   - Only identify an emotional pattern when the journal provides evidence for it.
   - Do not infer an emotion that is not supported by the journal or trade data.

9. HOLDING-TIME ANALYSIS
   - Use holding duration whenever available.
   - Compare holding time between strong, weak, winning, and losing trades when relevant.
   - Consider holding time together with setup, entry quality, and outcome rather than treating duration alone as the cause of success or failure.

10. AVOID DUPLICATION
   - Do not repeat the same insight using different wording.
   - If the same underlying pattern is supported by both trade records and journal context, place the most appropriate evidence in each section without unnecessary duplication.

11. OUTPUT FORMAT
   - Return only the most useful 2-4 insights per section when meaningful insights exist.
   - Keep every insight concise, specific, and evidence-based.
   - Avoid generic trading advice, filler, long explanations, and unnecessary statistics.
   - Do not mention every analyzed variable; mention only the variables relevant to the insight.
   - If no meaningful insight exists, return exactly ["Insufficient evidence"].

12. FINAL STANDARD
   - The goal is to extract practical and honest insights from the user's actual trading history.
   - Be neither overly conservative nor overly confident.
   - Prefer a useful "Observation" over hiding a potentially valuable insight.
   - Prefer "Possible pattern" over falsely claiming a confirmed pattern.
   - Never manufacture a pattern just to fill the section.

DATA TO ANALYZE:
${compiledText}`
    })

    if (usage?.totalTokens) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }

    // ── Format output with dual headings ──────────────────────────────────
    const formatDual = (
      fromTrades: string[],
      fromContext: string[],
      noTradesLabel: string,
      noContextLabel: string
    ) => {
      const tradesPart = fromTrades.length > 0
        ? `📊 From Trade Records:\n${fromTrades.map(s => `- ${s}`).join("\n\n")}`
        : `📊 From Trade Records:\n${noTradesLabel}`

      const contextPart = fromContext.length > 0
        ? `📓 From Journal Context:\n${fromContext.map(s => `- ${s}`).join("\n\n")}`
        : `📓 From Journal Context:\n${noContextLabel}`

      return `${tradesPart}\n\n${contextPart}`
    }

    return {
      repeatedMistakes: formatDual(
        object.repeatedMistakes.fromTrades,
        object.repeatedMistakes.fromContext,
        weekTrades.length === 0 ? "⚠️ No trades logged this week." : "No repeated mistakes found in trade records.",
        weekJournals.length === 0 ? "⚠️ No daily journals written this week." : "No repeated mistakes found in journal reflections."
      ),
      repeatedWinConditions: formatDual(
        object.repeatedWinConditions.fromTrades,
        object.repeatedWinConditions.fromContext,
        weekTrades.length === 0 ? "⚠️ No trades logged this week." : winners.length === 0 ? "No winning trades this week." : "No repeated win conditions found.",
        weekJournals.length === 0 ? "⚠️ No daily journals written this week." : "No repeated win conditions found in journals."
      ),
      emotionalTimingPatterns: formatDual(
        object.emotionalTimingPatterns.fromTrades,
        object.emotionalTimingPatterns.fromContext,
        weekTrades.length === 0 ? "⚠️ No trades logged this week." : "No repeated emotional patterns found in trade records.",
        weekJournals.length === 0 ? "⚠️ No daily journals written this week." : "No repeated emotional patterns found in journals."
      )
    }
  })

  return result.result
}
