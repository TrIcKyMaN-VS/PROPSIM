
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
      fromTrades:   z.array(z.string()).describe("Mistakes and losing patterns found from trade logs. Return ['Insufficient evidence to identify a repeated pattern.'] if < 3 examples or low sample size."),
      fromContext:  z.array(z.string()).describe("Correlated context from journals matching the trade mistakes. Return ['Insufficient evidence to identify a repeated pattern.'] if lack of evidence.")
    }),
    repeatedWinConditions: z.object({
      fromTrades:  z.array(z.string()).describe("Characteristics appearing MORE OFTEN in winning trades compared to losing trades. Return ['Insufficient evidence to identify a repeated pattern.'] if lack of evidence."),
      fromContext: z.array(z.string()).describe("Correlated habits/states from journals matching the best trade conditions. Return ['Insufficient evidence to identify a repeated pattern.'] if lack of evidence.")
    }),
    emotionalTimingPatterns: z.object({
      fromTrades:  z.array(z.string()).describe("Trade timing/holding durations correlated with specific results. Return ['Insufficient evidence to identify a repeated pattern.'] if lack of evidence."),
      fromContext: z.array(z.string()).describe("Journal mentions of mental states correlated with actual execution timing. Return ['Insufficient evidence to identify a repeated pattern.'] if lack of evidence.")
    })
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: `You are an expert trading psychologist and quantitative performance coach.

Perform a deep cross-analysis of all available TRADE EXECUTIONS and DAILY JOURNAL REFLECTIONS below.
You must analyze and cross-reference EVERY available detail: entry/exit timing, holding time, session, P&L, Net R, risk management (SL/TP), setup, direction, market condition, trade management, and journal context.

RULES:
1. ONLY SHOW PATTERNS WITH ACTUAL REPEATED EVIDENCE. Do NOT call something a "repeated pattern" based on only 1-2 examples. Rely strictly on sample size.
2. If there is not enough evidence to confidently identify a pattern, you MUST return an array with exactly one string: ["Insufficient evidence to identify a repeated pattern."]
3. For "repeatedWinConditions": compare winning trades against losing trades and identify conditions that actually appear MORE OFTEN in the best-performing trades. Do not just search for matching words in the journal.
4. For "emotionalTimingPatterns": connect journal reflections with actual trade timing, entry/exit timing, holding time, and results. Only mention an emotional/timing pattern when both the journal and trade data support it.
5. Do not invent, assume, exaggerate, or force any pattern. No generic trading advice.
6. The analysis must be done internally, but the final text output must be clean, concise, highly specific, and easy to understand. Avoid long paragraphs and repeated statements.
7. Keep each answer split into "fromTrades" (evidence strictly from trade records) and "fromContext" (evidence from journal reflections).

DATA:
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
