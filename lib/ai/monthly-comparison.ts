import { generateObject } from "ai"
import { z } from "zod"
import { runWithAiFallback, trackAiUsage } from "./provider"

// ── Output Schema ─────────────────────────────────────────────────────────────
// Maps exactly to the 3 Month-vs-Month textareas in the monthly review page.

export const MonthComparisonSchema = z.object({
  repeatedMistakes: z
    .string()
    .describe(
      "2-4 bullet points identifying behavioral or execution mistakes that appear in BOTH this month and last month's written recaps. " +
      "Each bullet must be ONE concise sentence (max 30 words) quoting or closely paraphrasing the trader's own words where possible. " +
      "Start each bullet with '- '. " +
      "If no meaningful repetition is found, return exactly: 'No repeated mistakes identified across these two months.'"
    ),
  commitmentsKept: z
    .string()
    .describe(
      "2-3 bullet points identifying commitments the trader wrote at the end of last month that were actually honoured this month, based on evidence in the current month recap. " +
      "Quote or closely paraphrase from the trader's own text. " +
      "Start each bullet with '- '. " +
      "If no evidence of kept commitments is found, return exactly: 'No commitments from last month were clearly honoured this month.'"
    ),
  highestLeverage: z
    .string()
    .describe(
      "ONE specific, actionable adjustment — the single highest-leverage behavioural or process change the trader should focus on next month. " +
      "This must be derived from what the data in the two recaps shows, NOT generic trading advice. " +
      "Write it as a direct, concrete sentence (max 40 words). " +
      "Do NOT write 'be disciplined' or 'manage risk'. Name the specific behaviour."
    ),
})

export type MonthComparisonOutput = z.infer<typeof MonthComparisonSchema>

// ── Helper: build a readable text block from a monthly recap object ───────────
function buildRecapText(month: string, data: Record<string, any>): string {
  const lines: string[] = [`MONTH: ${month}`]

  if (data.daysTradedCount) lines.push(`Days Traded: ${data.daysTradedCount}`)
  if (data.netR) lines.push(`Net R: ${data.netR}`)

  if (data.winsImpactfulSetups?.trim())
    lines.push(`\n[WINNING TRADES — Most Impactful Setups]\n${data.winsImpactfulSetups.trim()}`)
  if (data.winsMaximisedDays?.trim())
    lines.push(`[WINNING TRADES — Maximised Days]\n${data.winsMaximisedDays.trim()}`)
  if (data.winsBestTradesCommon?.trim())
    lines.push(`[WINNING TRADES — Common Factors]\n${data.winsBestTradesCommon.trim()}`)
  if (data.winsAffectedConfidence?.trim())
    lines.push(`[WINNING TRADES — Effect on Confidence]\n${data.winsAffectedConfidence.trim()}`)

  if (data.lossesWithinRisk?.trim())
    lines.push(`\n[LOSING TRADES — Risk Management]\n${data.lossesWithinRisk.trim()}`)
  if (data.lossesFollowedRules?.trim())
    lines.push(`[LOSING TRADES — Rule Adherence]\n${data.lossesFollowedRules.trim()}`)
  if (data.lossesPatterns?.trim())
    lines.push(`[LOSING TRADES — Patterns]\n${data.lossesPatterns.trim()}`)
  if (data.lossesLearnedOrRepeated?.trim())
    lines.push(`[LOSING TRADES — Learned vs Repeated]\n${data.lossesLearnedOrRepeated.trim()}`)

  if (data.overallDisciplineImproved?.trim())
    lines.push(`\n[OVERALL — Discipline Improvement]\n${data.overallDisciplineImproved.trim()}`)
  if (data.overallFollowedRulesMore?.trim())
    lines.push(`[OVERALL — Rule Following]\n${data.overallFollowedRulesMore.trim()}`)
  if (data.overallConsistentJournaling?.trim())
    lines.push(`[OVERALL — Journaling Consistency]\n${data.overallConsistentJournaling.trim()}`)
  if (data.overallCommitNextMonth?.trim())
    lines.push(`[OVERALL — Commitments Made for Next Month]\n${data.overallCommitNextMonth.trim()}`)

  return lines.join("\n")
}

// ── Main Function ─────────────────────────────────────────────────────────────
export async function generateMonthComparison(
  currentMonth: string,
  previousMonth: string,
  currentRecap: Record<string, any>,
  previousRecap: Record<string, any>,
  userId: string
): Promise<MonthComparisonOutput & { isFallback: boolean; metadata: { provider: string; model: string } }> {
  const currentText = buildRecapText(currentMonth, currentRecap)
  const previousText = buildRecapText(previousMonth, previousRecap)

  const prompt = `You are an elite trading performance analyst doing a month-over-month comparison review.

Your job is to read the trader's OWN WRITTEN monthly recap for two consecutive months and extract:
1. Behavioral mistakes that REPEATED across both months
2. Commitments the trader made at the end of last month that they actually KEPT this month
3. The single highest-leverage adjustment for next month

==================================================
CRITICAL RULES
==================================================

1. READ ONLY WHAT THE TRADER ACTUALLY WROTE.
   - Do not invent patterns that are not in the text.
   - Do not add generic trading advice.
   - If the text is vague, say so — do not fill gaps with assumptions.

2. QUOTE OR CLOSELY PARAPHRASE THE TRADER'S OWN WORDS.
   - The power of this comparison is that the trader sees their own words reflected back.
   - Where the text supports it, use the trader's own language rather than generic paraphrasing.

3. REPEATED MISTAKES — STRICT CRITERIA
   - A mistake is only "repeated" if it appears in BOTH months' recaps in some form.
   - Do not invent a repetition just because the same topic appears.
   - If a mistake appears only in one month, it is NOT a repeated mistake.

4. COMMITMENTS KEPT — STRICT CRITERIA
   - Only count a commitment as "kept" if the current month recap contains specific evidence of it being honoured.
   - Do not assume a commitment was kept just because it isn't mentioned as broken.
   - The evidence must be explicit.

5. HIGHEST-LEVERAGE ADJUSTMENT — ONE SPECIFIC THING
   - Name the exact behaviour, not a category.
   - Wrong: "Manage your risk better."
   - Right: "Stop entering during the 11:30–1:00 PM chop window, which caused 4 of your losing trades both months."
   - If the data is too thin to identify one clearly, state that honestly.

6. TONE
   - Be direct and honest. The trader asked for truth, not encouragement.
   - Do not soften findings.
   - Do not celebrate average performance.

==================================================
DATA TO ANALYZE
==================================================

=== PREVIOUS MONTH RECAP ===
${previousText}

=== CURRENT MONTH RECAP ===
${currentText}
`

  try {
    const { result, metadata } = await runWithAiFallback(userId, async (model, providerInfo) => {
      const { object, usage } = await generateObject({
        model,
        schema: MonthComparisonSchema,
        prompt,
      })

      if (usage?.totalTokens) {
        await trackAiUsage(userId, usage.totalTokens, providerInfo.provider)
      }

      return object
    })

    return {
      ...result,
      isFallback: false,
      metadata,
    }
  } catch (err) {
    console.error("Monthly comparison AI failed:", err)
    return {
      repeatedMistakes:
        "- AI analysis failed. Please check your AI provider settings and try again.",
      commitmentsKept:
        "- AI analysis failed. Please check your AI provider settings and try again.",
      highestLeverage:
        "AI analysis could not be completed. Verify your API key in Settings → AI Settings.",
      isFallback: true,
      metadata: { provider: "PROGRAMMATIC", model: "Fallback" },
    }
  }
}
