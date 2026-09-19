
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

  const formatNyTime = (ts: number | bigint | null | undefined): string => {
    if (!ts) return "N/A"
    const d = new Date(Number(ts))
    if (isNaN(d.getTime())) return "N/A"
    return `${d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York"
    })} NY`
  }

  // ── Build trade summary sections ───────────────────────────────────────────
  const formatTrade = (t: typeof weekTrades[0], idx: number) => {
    const entryDate = formatNyTime(t.timestamp)
    const exitDate = formatNyTime(t.exitTime)
    const holdMs = t.exitTime ? (Number(t.exitTime) - Number(t.timestamp)) : null
    const holdMins = holdMs ? (holdMs / 1000 / 60).toFixed(1) + " mins" : "N/A"
    
    const lines = [
      `  Trade ${idx + 1} | ${t.instrument} ${t.direction.toUpperCase()} | Date/Time: ${entryDate} | PnL: $${t.pnl} | Net R: ${t.netR ? t.netR.toFixed(2) + "R" : "N/A"}`,
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
    repeatedMistakes: z.array(z.string()).describe(
      "Return 2-4 concise, evidence-based insights about repeated mistakes from BOTH trade records and journal entries combined. " +
      "Each insight must begin with exactly one of: 'Repeated pattern:', 'Possible pattern:', or 'Observation:'. " +
      "Return exactly ['Insufficient evidence'] if no meaningful insight exists."
    ),
    repeatedWinConditions: z.array(z.string()).describe(
      "Return 2-4 concise, evidence-based insights about conditions behind the trader's best trades, combining trade record evidence and journal context. " +
      "Each insight must begin with exactly one of: 'Repeated pattern:', 'Possible pattern:', or 'Observation:'. " +
      "Return exactly ['Insufficient evidence'] if no meaningful insight exists."
    ),
    emotionalTimingPatterns: z.array(z.string()).describe(
      "Return 2-4 concise, evidence-based insights about emotional and timing patterns, combining trade timing data and journal emotional context. " +
      "Each insight must begin with exactly one of: 'Repeated pattern:', 'Possible pattern:', or 'Observation:'. " +
      "Return exactly ['Insufficient evidence'] if no meaningful insight exists."
    )
  })

  const result = await runWithAiFallback(session.user.id, async (model, providerInfo) => {
    const { object, usage } = await generateObject({
      model,
      schema,
      prompt: `You are an expert trading psychologist and quantitative performance coach.

Your task is to analyze the COMPLETE AVAILABLE TRADING DATA and identify practical, evidence-based patterns from the trader's actual trade records and journal entries.

The goal is NOT to generate generic trading advice.

The goal is to identify:
1. Repeated mistakes
2. Conditions associated with the trader's best trades
3. Emotional and timing patterns
4. Useful observations that can later be converted into testable IF → THEN trading rules

==================================================
RULES FOR PATTERN DETECTION & CLASSIFICATION
==================================================

1. ANALYZE THE COMPLETE AVAILABLE DATA

- Analyze all available trade logs and journal entries, not only recent records.
- Use every relevant field available, including:
  setup, direction, entry, exit, entry time, exit time, holding time, P&L, R, SL, TP, R:R, session, market condition, key levels, GEX, volume profile, order flow, trade management, entry quality, exit quality, process grade, state check, emotions, hesitation, confidence, mistakes, reasoning, expectations, and any other recorded information.
- Do not rely only on keywords or individual fields.
- Use the complete context of each trade whenever available.
- Compare trades against relevant/comparable trades rather than treating every trade as equivalent.

2. CROSS-REFERENCE TRADE DATA WITH JOURNAL DATA

- Use trade records to determine what actually happened.
- Use journal entries to understand the trader's reasoning, expectations, emotions, decision-making, and self-identified mistakes.
- Cross-reference the two sources to identify relationships that are not obvious from either source alone.
- When journal claims and actual trade behavior differ, identify the difference when it is useful.
- Give greater weight to actual trade data when determining what physically happened.
- Use journal context to explain the reasoning or behaviour behind that outcome.

3. IDENTIFY USEFUL PATTERNS WITHOUT INVENTING THEM

- Actively look for meaningful recurring behaviors, conditions, relationships, and tendencies.
- Do not require a large sample size before reporting a useful observation.
- Do not call something "repeated" or "consistent" simply because two values happen to match.
- Consider:
  1. Frequency relative to relevant/comparable trades
  2. Consistency across those trades
  3. Strength of relationship with the relevant outcome or behavior
  4. Whether it appears across different sessions, setups, market conditions, or journal entries when applicable
  5. Practical relevance to execution and decision-making
  6. Quality and completeness of supporting data
- Never invent causes, emotions, correlations, or patterns that are not supported by the available data.
- Do not force a pattern simply to fill an output section.

4. EVIDENCE CLASSIFICATION

Classify every insight using one of these labels:

"Repeated pattern:"
Use this when the behavior or relationship is recurring, meaningful, and supported by multiple relevant pieces of evidence.

"Possible pattern:"
Use this when the relationship appears meaningful but the evidence is still developing or mixed.

"Observation:"
Use this when the information is useful and specific but does not yet justify calling it a pattern.

"Insufficient evidence"
Use this only when there is genuinely no meaningful insight that can be extracted from the available data.

Do not use "Insufficient evidence" merely because the dataset is small.

5. DYNAMIC PATTERN DETECTION

- Pattern detection must be fully dynamic and data-driven.
- Do NOT use fixed occurrence thresholds.
- Do NOT use fixed trade counts.
- Do NOT use fixed percentages.
- Do NOT use rules such as "3 trades = pattern" or "40% = pattern".
- Re-evaluate pattern strength based on the amount, quality, and distribution of currently available data.
- A behavior does not need to appear in every trade to be meaningful.
- A frequently occurring behavior is not automatically a strong pattern.
- A repeated characteristic is only meaningful when it has relevant context and a meaningful relationship to execution, decision-making, or outcome.
- Re-evaluate all classifications whenever additional trades or journal entries become available.

6. PROCESS VS OUTCOME

- Evaluate execution quality separately from P&L.
- Do NOT classify a trade as a mistake simply because it lost.
- A losing trade can be a good-process trade if it followed the model correctly.
- Do NOT classify a winning trade as a positive pattern simply because it made money.
- A profitable trade can still be poor process if it violated the model, rules, risk plan, or entry criteria.
- When identifying best trades, consider both:
  a) outcome/performance
  b) process quality
- Give priority to patterns that improve repeatable execution rather than patterns that merely explain profitable outcomes.

7. AVOID FALSE CAUSALITY

- Do not assume that one characteristic caused an outcome merely because both occurred together.
- When the data only shows association, use wording such as:
  "associated with"
  "appeared alongside"
  "coincided with"
  "was more common in"
- Use causal language such as "caused", "led to", or "resulted in" only when the available evidence directly supports the mechanism.
- Holding time, session, setup, emotional state, GEX, or any other variable should not automatically be treated as the cause of a result.

8. REPEATED MISTAKES

Analyze losing trades, missed trades, skipped trades, poor executions, and management errors for recurring issues.

Consider:
- Entry timing
- Entry location
- Setup quality
- Direction
- Bias alignment
- Key-level interaction
- GEX alignment
- Volume Profile / Market Profile context
- Order-flow confirmation
- Absorption
- Aggression
- Delta
- CVD
- Squeeze / delta reload / mean reversion / momentum setups
- SL placement
- TP placement
- Risk/reward
- Position sizing
- Trade management
- Moving to BE
- Trailing stop
- Early exits
- Late exits
- Overholding
- Rushed entries
- Chasing
- Middle-of-range entries
- Missed entries
- Hesitation
- Over-confirmation
- Overtrading
- Rule breaks

Cross-reference these findings with the journal to determine whether the trader recognized or described the same issue.

Do not list every mistake. Select only the most practically important recurring or useful insights.

9. BEST-TRADE CONDITIONS

Identify the trader's highest-quality and best-performing trades.

Compare these trades against weaker and losing trades.

Look for common characteristics in:
- Setup
- Direction
- Bias
- Key-level location
- GEX alignment
- Volume Profile / Market Profile context
- Order-flow confirmation
- Absorption
- Aggression
- Delta / CVD
- Squeeze
- Delta reload
- 40R / 80R candle confirmation
- Entry timing
- Session
- Market condition
- Holding time
- Risk/reward
- Trade management
- Exit
- Process grade
- State check
- Journal reasoning

Focus on characteristics meaningfully associated with the strongest trades.

Do not force a pattern if the evidence does not support one.

10. EMOTIONAL AND TIMING PATTERNS

Cross-reference:
- State check
- Confidence
- Hesitation
- Impatience
- FOMO
- Frustration
- Fear
- Calmness
- Focus
- Mental readiness
- Trade timing
- Entry timing
- Exit timing
- Holding duration
- Session timing
- Trade outcome

Only identify an emotional pattern when the journal explicitly provides evidence for that emotion or state.

Never infer emotions from P&L alone.

If the journal says the trader lacked confidence and the trade was missed, that can be reported.

Do NOT infer "fear" simply because the trader did not enter.

11. HOLDING-TIME ANALYSIS

- Use holding duration whenever available.
- Compare holding time between strong, weak, winning, losing, BE, and missed trades when relevant.
- Consider holding time together with setup quality, entry quality, management, and outcome.
- Do not treat holding duration alone as the cause of success or failure.
- If shorter holding times are associated with poor outcomes, investigate whether the underlying issue was rushed entry, poor location, weak confirmation, early exit, or another identifiable factor.

12. MISSED AND SKIPPED TRADES

- Analyze missed and skipped setups when journal data identifies them.
- Distinguish between:
  a) correctly skipped trades
  b) missed valid trades
  c) trades skipped because confirmation was absent
  d) trades missed because of hesitation or execution failure
- Do not treat every missed trade as a mistake.
- A missed trade is only a potential execution issue when the available evidence indicates that the setup met the trader's model or planned criteria.

13. JOURNAL VS ACTUAL BEHAVIOR

When useful, explicitly identify discrepancies such as:

- Planned long-only bias → actual short trade
- Planned key-level entry → actual middle-of-range entry
- Planned confirmation → actual entry before confirmation
- Journal says "waited for confirmation" → trade data shows entry occurred before the stated trigger
- Journal says "followed rules" → recorded trade violated a documented rule
- Journal says "no opportunity" → replay/journal evidence shows a valid missed setup

Do not search for discrepancies just to create criticism.

Only report meaningful discrepancies supported by the data.

14. AVOID DUPLICATION

- Do not repeat the same insight using different wording.
- If the same underlying pattern is supported by trade records and journal context, combine the evidence into one concise insight.
- Avoid repeating the same pattern in multiple sections unless the distinction is genuinely useful.
- Each insight should provide new information.

15. OUTPUT SECTIONS

Return exactly these three sections:

A. REPEATED MISTAKES
B. REPEATED CONDITIONS BEHIND BEST TRADES
C. EMOTIONAL / TIMING PATTERNS NOTICED

For each section:
- Return only the most useful 2-4 insights when meaningful insights exist.
- If fewer than 2 meaningful insights exist, return only the meaningful insights.
- If no meaningful insight exists, return exactly: ["Insufficient evidence"]

Every insight must begin with exactly one classification:
- Repeated pattern:
- Possible pattern:
- Observation:

Keep each insight concise, specific, and evidence-based.

16. EVIDENCE AND EXAMPLES

- When a specific trade materially supports an insight, include the relevant date and NY time.
- Do not cite unnecessary trades.
- Use specific examples only when they strengthen the insight.
- Format timestamps in New York time using:
  "Aug 28 at 09:36 AM NY"
  "Sep 18 at 02:03 PM NY"
  "Sep 17 session"
- Always include the date when citing a specific trade.
- Never output raw UTC timestamps or ISO timestamps.
- Never output raw database IDs.

17. TIMEZONE CONVERSION

- Convert all trade timestamps to New York time.
- Correctly account for EST/EDT based on the actual trade date.
- Never expose UTC timestamps in the output.

18. DATA QUALITY

- If a field is missing, do not invent it.
- If timestamps cannot be reliably converted, do not guess the time.
- If the journal and trade record contain conflicting information, identify the conflict rather than silently resolving it.
- If a conclusion depends on missing or incomplete information, lower the evidence classification accordingly.
- Do not treat unavailable data as negative evidence.

19. PRACTICAL RELEVANCE

Prioritize insights that can realistically improve:
- Entry quality
- Entry location
- Confirmation
- Trade selection
- Trade management
- Exit quality
- Risk management
- Rule adherence
- Preparation
- Emotional control
- Execution consistency

Avoid generic statements such as:
- "Be more disciplined."
- "Be more patient."
- "Follow the trend."
- "Manage risk properly."

Instead identify the specific behavior observed in the actual data.

20. DO NOT CREATE RULES YET

The purpose of this analysis is PATTERN DETECTION, not rule creation.

Do NOT automatically convert every observation into a trading rule.

Only identify the evidence.

The weekly review process will separately decide whether a pattern should become an IF → THEN rule and be backtested.

21. DO NOT OPTIMIZE FOR POSITIVE FINDINGS

- Do not search only for profitable patterns.
- Report negative patterns, neutral observations, and mixed evidence when useful.
- Do not make the trader feel better by describing weak execution positively.
- Do not criticize a trade simply because it lost.
- Report what the evidence supports, even when it is unfavorable.

22. FINAL STANDARD

The goal is to extract practical and honest insights from the trader's actual history.

Be:
- Evidence-based
- Specific
- Neutral
- Practical
- Concise
- Willing to identify uncomfortable patterns
- Willing to report uncertainty

Be neither overly conservative nor overly confident.

Prefer "Observation:" when useful evidence exists but the relationship is not yet strong enough to call a pattern.
Prefer "Possible pattern:" when a meaningful relationship is emerging but remains uncertain.
Use "Repeated pattern:" only when the relationship is genuinely recurring and meaningful relative to the available comparable data.

Never manufacture a pattern just to fill a section.

==================================================
DATA TO ANALYZE
==================================================

${compiledText}`
    })

    if (usage?.totalTokens) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }

    const cleanStr = (s: string) => {
      if (!s) return s
      return s
        .replace(/\\u2019/g, "'")
        .replace(/\\u2018/g, "'")
        .replace(/\\u201c/g, '"')
        .replace(/\\u201d/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }

    const formatSection = (items: string[], noDataLabel: string) => {
      const clean = (items || []).map(cleanStr)
      if (clean.length === 0) return noDataLabel
      return clean.map(s => `- ${s}`).join("\n\n")
    }

    return {
      repeatedMistakes: formatSection(
        object.repeatedMistakes,
        weekTrades.length === 0 ? "⚠️ No trades logged this week." : "No repeated mistakes found."
      ),
      repeatedWinConditions: formatSection(
        object.repeatedWinConditions,
        weekTrades.length === 0 ? "⚠️ No trades logged this week." : winners.length === 0 ? "No winning trades this week." : "No repeated win conditions found."
      ),
      emotionalTimingPatterns: formatSection(
        object.emotionalTimingPatterns,
        weekTrades.length === 0 ? "⚠️ No trades logged this week." : "No emotional or timing patterns found."
      )
    }
  })

  return result.result
}


