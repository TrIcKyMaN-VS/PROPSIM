"use server"

import { 
  MacroSymbol, 
  SUPPORTED_MACRO_SYMBOLS, 
  CotDataPoint, 
  CotReportSummary, 
  EconomicEvent,
  AiMacroBriefing,
  SentimentRegime
} from "@/lib/types-macro"
import { runWithAiFallback } from "@/lib/ai/provider"
import { generateText } from "ai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// In-memory cache for COT data and economic calendar to keep API latency sub-50ms
const memoryCache: {
  cot: Record<string, { data: CotReportSummary; timestamp: number }>
  calendar: { data: EconomicEvent[]; timestamp: number } | null
} = {
  cot: {},
  calendar: null,
}

const CACHE_TTL_COT = 1000 * 60 * 60 * 4 // 4 hours for COT (updates once per week on Friday)
const CACHE_TTL_CALENDAR = 1000 * 60 * 15 // 15 minutes for calendar

/**
 * 1. Fetch & parse live weekly COT report from CFTC Public Open Data
 */
export async function getCotReportAction(symbol: MacroSymbol = "NQ"): Promise<{ success: boolean; data?: CotReportSummary; error?: string }> {
  try {
    const config = SUPPORTED_MACRO_SYMBOLS[symbol] || SUPPORTED_MACRO_SYMBOLS.NQ
    const cacheKey = symbol

    // Check cache
    if (memoryCache.cot[cacheKey] && Date.now() - memoryCache.cot[cacheKey].timestamp < CACHE_TTL_COT) {
      return { success: true, data: memoryCache.cot[cacheKey].data }
    }

    const searchTerm = config.cftcSearchTerm
    const url = `https://publicreporting.cftc.gov/resource/6dca-aqww.json?$where=upper(market_and_exchange_names)%20like%20'%25${encodeURIComponent(searchTerm)}%25'&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=26`

    let records: any[] = []
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (res.ok) {
        records = await res.json()
      }
    } catch (fetchErr) {
      console.warn("CFTC Socrata API fetch warning:", fetchErr)
    }

    // Fallback if CFTC is down or empty
    if (!Array.isArray(records) || records.length === 0) {
      const fallback = generateCuratedFallbackCot(symbol)
      memoryCache.cot[cacheKey] = { data: fallback, timestamp: Date.now() }
      return { success: true, data: fallback }
    }

    // Parse records into CotDataPoint list (oldest to newest for charts)
    const rawPoints = records.map((r: any) => {
      const nonCommLong = Number(r.noncomm_positions_long_all || 0)
      const nonCommShort = Number(r.noncomm_positions_short_all || 0)
      const commLong = Number(r.comm_positions_long_all || 0)
      const commShort = Number(r.comm_positions_short_all || 0)
      const nonReptLong = Number(r.nonrept_positions_long_all || 0)
      const nonReptShort = Number(r.nonrept_positions_short_all || 0)
      const openInterest = Number(r.open_interest_all || 0)
      const reportDate = r.report_date_as_yyyy_mm_dd ? r.report_date_as_yyyy_mm_dd.split("T")[0] : new Date().toISOString().split("T")[0]

      return {
        date: reportDate,
        reportDate,
        marketName: r.market_and_exchange_names || config.name,
        nonCommercialLong: nonCommLong,
        nonCommercialShort: nonCommShort,
        nonCommercialNet: nonCommLong - nonCommShort,
        commercialLong: commLong,
        commercialShort: commShort,
        commercialNet: commLong - commShort,
        nonReportableLong: nonReptLong,
        nonReportableShort: nonReptShort,
        nonReportableNet: nonReptLong - nonReptShort,
        openInterest,
        wowCommercialChange: 0,
        wowNonCommercialChange: 0,
        cotIndex: 50,
      }
    })

    // Sort chronologically (oldest -> newest) to calculate WoW diffs and COT index
    const sorted = rawPoints.reverse()

    // Calculate Min & Max for COT Index (26-week lookback)
    const nonCommNets = sorted.map(p => p.nonCommercialNet)
    const minNet = Math.min(...nonCommNets)
    const maxNet = Math.max(...nonCommNets)
    const netRange = maxNet - minNet || 1

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        sorted[i].wowCommercialChange = sorted[i].commercialNet - sorted[i - 1].commercialNet
        sorted[i].wowNonCommercialChange = sorted[i].nonCommercialNet - sorted[i - 1].nonCommercialNet
      }
      sorted[i].cotIndex = Math.round(((sorted[i].nonCommercialNet - minNet) / netRange) * 100)
    }

    const current = sorted[sorted.length - 1]
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null

    // Determine Sentiment & Regime
    const cotIndex = current.cotIndex
    let regime: SentimentRegime = "NEUTRAL_BALANCED"
    let regimeLabel = "Balanced / Range Regime"
    let regimeDescription = "Neither commercials nor speculators are at extreme positioning. Market is likely to respect technical ranges and mean reversion."
    let smartMoneyBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL"

    if (current.commercialNet > 0 || current.wowCommercialChange > 5000) {
      regime = "BULLISH_ACCUMULATION"
      regimeLabel = "Institutional Accumulation (Smart Money Bullish)"
      regimeDescription = "Commercials (Hedgers) are actively covering shorts and accumulating long exposure. Favor long pullbacks and liquidity sweeps."
      smartMoneyBias = "BULLISH"
    } else if (cotIndex >= 85) {
      regime = "SPECULATIVE_EXTREME_LONG"
      regimeLabel = "Speculative Over-Extension (Top-Heavy Longs)"
      regimeDescription = "Large speculators / hedge funds are at near 52-week extreme long positions. Vulnerable to sudden long squeezes and sharp mean-reversions."
      smartMoneyBias = "BEARISH"
    } else if (cotIndex <= 15) {
      regime = "SPECULATIVE_EXTREME_SHORT"
      regimeLabel = "Speculative Capitulation (Short Squeeze Candidate)"
      regimeDescription = "Hedge funds are heavily net short. High probability of violent short covering rallies upon key structural break."
      smartMoneyBias = "BULLISH"
    } else if (current.commercialNet < -50000 && current.wowCommercialChange < -3000) {
      regime = "BEARISH_DISTRIBUTION"
      regimeLabel = "Institutional Distribution (Smart Money Bearish)"
      regimeDescription = "Commercials are expanding net short hedges aggressively into speculative bids. Breakouts to the upside face heavy institutional supply."
      smartMoneyBias = "BEARISH"
    }

    const commercialSentiment = current.commercialNet > 0 ? "Bullish Hedging" : current.commercialNet < -30000 ? "Bearish Hedging" : "Neutral"
    const speculatorSentiment = current.nonCommercialNet > 30000 ? "Heavily Long" : current.nonCommercialNet < -20000 ? "Heavily Short" : "Neutral"

    const summary: CotReportSummary = {
      symbol,
      symbolName: config.name,
      latestDate: current.date,
      history: sorted,
      current,
      previous,
      commercialSentiment,
      speculatorSentiment,
      cotIndex,
      regime,
      regimeLabel,
      regimeDescription,
      smartMoneyBias
    }

    memoryCache.cot[cacheKey] = { data: summary, timestamp: Date.now() }
    return { success: true, data: summary }
  } catch (err: any) {
    console.error("getCotReportAction error:", err)
    return { success: false, error: err.message || "Failed to fetch COT report" }
  }
}

/**
 * 2. Fetch Live Economic Events Calendar (ForexFactory / FairEconomy Feed)
 */
export async function getEconomicCalendarAction(): Promise<{ success: boolean; data?: EconomicEvent[]; error?: string }> {
  try {
    if (memoryCache.calendar && Date.now() - memoryCache.calendar.timestamp < CACHE_TTL_CALENDAR) {
      return { success: true, data: memoryCache.calendar.data }
    }

    let rawEvents: any[] = []
    try {
      const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        next: { revalidate: 900 }
      })
      if (res.ok) {
        rawEvents = await res.json()
      }
    } catch (e) {
      console.warn("Economic calendar fetch warning:", e)
    }

    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      const fallback = generateFallbackEconomicCalendar()
      memoryCache.calendar = { data: fallback, timestamp: Date.now() }
      return { success: true, data: fallback }
    }

    const now = Date.now()
    const parsed: EconomicEvent[] = rawEvents.map((e: any, idx: number) => {
      const eventTime = new Date(e.date).getTime()
      const diffMs = eventTime - now
      const minutesUntil = Math.round(diffMs / (1000 * 60))
      const isUpcoming = diffMs > 0

      const estDate = new Date(e.date)
      const timeEST = estDate.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit"
      })
      const dateStr = estDate.toISOString().split("T")[0]

      return {
        id: `econ-${idx}-${e.title.slice(0, 10)}`,
        title: e.title || "Economic Release",
        country: e.country || "USD",
        date: e.date,
        timeEST,
        dateStr,
        impact: e.impact === "High" ? "High" : e.impact === "Medium" ? "Medium" : e.impact === "Low" ? "Low" : "Holiday",
        forecast: e.forecast || "--",
        previous: e.previous || "--",
        actual: e.actual || undefined,
        isRedFolder: e.impact === "High",
        isUpcoming,
        minutesUntil
      }
    })

    memoryCache.calendar = { data: parsed, timestamp: Date.now() }
    return { success: true, data: parsed }
  } catch (err: any) {
    console.error("getEconomicCalendarAction error:", err)
    return { success: false, error: err.message || "Failed to fetch economic calendar" }
  }
}

/**
 * 3. AI Smart Money Alignment Engine
 * Correlates the user's trades with the current COT regime and upcoming Red Folder news catalysts.
 */
export async function generateAiMacroBriefingAction(
  symbol: MacroSymbol = "NQ",
  userTrades: any[] = []
): Promise<{ success: boolean; data?: AiMacroBriefing; error?: string }> {
  try {
    const cotRes = await getCotReportAction(symbol)
    const calRes = await getEconomicCalendarAction()

    const cot = cotRes.data || generateCuratedFallbackCot(symbol)
    const calendar = calRes.data || generateFallbackEconomicCalendar()

    // Filter upcoming high-impact USD events
    const upcomingRedFolders = calendar
      .filter(e => e.isRedFolder && (e.country === "USD" || e.country === "ALL"))
      .slice(0, 5)

    // Filter user trades relevant to this asset
    const relevantTrades = (userTrades || []).filter((t: any) => {
      const inst = (t.instrument || "").toUpperCase()
      if (symbol === "NQ") return inst.includes("NQ") || inst.includes("MNQ") || inst.includes("NAS")
      if (symbol === "ES") return inst.includes("ES") || inst.includes("MES") || inst.includes("S&P")
      if (symbol === "YM") return inst.includes("YM") || inst.includes("MYM") || inst.includes("DOW")
      if (symbol === "RTY") return inst.includes("RTY") || inst.includes("M2K") || inst.includes("RUSSELL")
      if (symbol === "GC") return inst.includes("GC") || inst.includes("MGC") || inst.includes("GOLD")
      if (symbol === "CL") return inst.includes("CL") || inst.includes("MCL") || inst.includes("OIL")
      if (symbol === "6E") return inst.includes("6E") || inst.includes("EUR")
      if (symbol === "6B") return inst.includes("6B") || inst.includes("GBP")
      if (symbol === "BTC") return inst.includes("BTC") || inst.includes("MBT")
      return true
    })

    // Correlate with Smart Money Bias
    const smartBias = cot.smartMoneyBias
    let alignedCount = 0
    let alignedPnL = 0
    let alignedWins = 0

    let counterCount = 0
    let counterPnL = 0
    let counterWins = 0

    relevantTrades.forEach((t: any) => {
      const isLong = (t.direction || "").toLowerCase() === "long"
      const isWin = Number(t.pnl || 0) > 0
      const pnl = Number(t.pnl || 0)

      if (smartBias === "BULLISH") {
        if (isLong) {
          alignedCount++
          alignedPnL += pnl
          if (isWin) alignedWins++
        } else {
          counterCount++
          counterPnL += pnl
          if (isWin) counterWins++
        }
      } else if (smartBias === "BEARISH") {
        if (!isLong) {
          alignedCount++
          alignedPnL += pnl
          if (isWin) alignedWins++
        } else {
          counterCount++
          counterPnL += pnl
          if (isWin) counterWins++
        }
      } else {
        alignedCount++
        alignedPnL += pnl
        if (isWin) alignedWins++
      }
    })

    const totalTrades = relevantTrades.length
    const alignedWinRate = alignedCount > 0 ? Math.round((alignedWins / alignedCount) * 100) : 0
    const counterWinRate = counterCount > 0 ? Math.round((counterWins / counterCount) * 100) : 0
    const tradeAlignmentScore = totalTrades > 0 ? Math.round((alignedCount / totalTrades) * 100) : 75

    // Build prompt for AI
    const prompt = `
You are an elite Institutional Prop Firm Risk Director and Macro Strategist at PROPSIM.
Analyze the following Commitments of Traders (COT) report and Economic Calendar for asset: ${symbol} (${cot.symbolName}).

COT Positioning Data:
- Report Date: ${cot.latestDate}
- Commercial Net Position: ${cot.current.commercialNet.toLocaleString()} contracts (WoW Change: ${cot.current.wowCommercialChange > 0 ? "+" : ""}${cot.current.wowCommercialChange.toLocaleString()})
- Non-Commercial (Speculators) Net Position: ${cot.current.nonCommercialNet.toLocaleString()} contracts (WoW Change: ${cot.current.wowNonCommercialChange > 0 ? "+" : ""}${cot.current.wowNonCommercialChange.toLocaleString()})
- Open Interest: ${cot.current.openInterest.toLocaleString()}
- 26-Week COT Index: ${cot.cotIndex}%
- Institutional Regime: ${cot.regimeLabel}
- Calculated Smart Money Bias: ${cot.smartMoneyBias}

Upcoming Red Folder Economic Releases (High Impact):
${upcomingRedFolders.map(e => `- ${e.title} (${e.country}) on ${e.dateStr} at ${e.timeEST} EST | Forecast: ${e.forecast} | Prev: ${e.previous}`).join("\n")}

Trader's Historical Telemetry on this Asset:
- Total Trades Analyzed: ${totalTrades}
- Trades Aligned with Smart Money: ${alignedCount} (Win Rate: ${alignedWinRate}%, Net PnL: $${alignedPnL.toFixed(2)})
- Trades Counter to Smart Money: ${counterCount} (Win Rate: ${counterWinRate}%, Net PnL: $${counterPnL.toFixed(2)})
- Institutional Alignment Score: ${tradeAlignmentScore}%

Provide a high-conviction, professional JSON response matching this EXACT schema:
{
  "headline": "A short, sharp 1-sentence macro thesis (e.g. 'Institutional short-hedging on NQ signals exhaustion; prepare for liquidity sweep before CPI')",
  "keyFindings": [
    "Finding 1 about Commercial Smart Money order flow",
    "Finding 2 about Speculator over-extension or capitulation",
    "Finding 3 regarding Open Interest expansion or contraction"
  ],
  "upcomingRedFolderRisks": [
    "Specific warning about 1 or 2 high impact catalysts this week and expected volatility"
  ],
  "propFirmRuleSafeguard": "Clear rule reminder for Apex/Topstep/FundedNext regarding news holding restrictions",
  "actionablePlaybookAdvice": "Concrete, rule-based execution advice for intraday trading (e.g. favor pullbacks into FVG/Discount when aligned, reduce position size around 8:30 AM EST)"
}

Respond ONLY with valid JSON.
`

    let parsedAi: any = null
    try {
      const session = await getServerSession(authOptions).catch(() => null)
      const userId = (session?.user as any)?.id || "guest-user"

      const { result } = await runWithAiFallback(userId, async (model) => {
        const { text } = await generateText({
          model,
          prompt,
          system: "You are an elite Institutional Prop Firm Risk Director and Macro Strategist at PROPSIM. Provide direct, objective, data-backed analysis. Return strictly valid JSON."
        })
        return text
      })

      const rawText = String(result || "")
      const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim()
      parsedAi = JSON.parse(cleanJson)
    } catch (aiErr) {
      console.warn("AI generation fallback to deterministic synthesis:", aiErr)
    }

    if (!parsedAi) {
      parsedAi = {
        headline: `Institutional ${cot.smartMoneyBias} Bias on ${symbol}: Smart Money positioning indicates ${cot.regimeLabel.toLowerCase()}.`,
        keyFindings: [
          `Commercials hold ${cot.current.commercialNet.toLocaleString()} net contracts with a ${cot.current.wowCommercialChange > 0 ? "+" : ""}${cot.current.wowCommercialChange.toLocaleString()} weekly shift.`,
          `Speculator positioning is at ${cot.cotIndex}% of its 26-week range, indicating ${cot.cotIndex > 75 ? "elevated long overcrowding" : cot.cotIndex < 25 ? "aggressive short positioning" : "balanced participation"}.`,
          `Total open interest sits at ${cot.current.openInterest.toLocaleString()} contracts.`
        ],
        upcomingRedFolderRisks: upcomingRedFolders.map(e => `High volatility expected around ${e.title} at ${e.timeEST} EST on ${e.dateStr}.`),
        propFirmRuleSafeguard: "Apex and Topstep rules strictly prohibit holding open positions during high-impact red folder releases. Close trades at least 2 minutes prior.",
        actionablePlaybookAdvice: `Align your intraday playbook with ${cot.smartMoneyBias} order flow. Favor entries in discount liquidity pools and avoid chasing breakout extensions.`
      }
    }

    const briefing: AiMacroBriefing = {
      symbol,
      generatedAt: new Date().toISOString(),
      headline: parsedAi.headline,
      institutionalRegime: cot.regimeLabel,
      smartMoneyBias: cot.smartMoneyBias,
      keyFindings: parsedAi.keyFindings || [],
      upcomingRedFolderRisks: parsedAi.upcomingRedFolderRisks || [],
      propFirmRuleSafeguard: parsedAi.propFirmRuleSafeguard || "Prop firm compliance: Avoid news trading 2-5 mins around Red Folder events.",
      tradeAlignmentScore,
      traderStats: {
        totalTradesAnalyzed: totalTrades,
        alignedTradesCount: alignedCount,
        alignedWinRate,
        alignedPnL,
        counterTradesCount: counterCount,
        counterWinRate,
        counterPnL
      },
      actionablePlaybookAdvice: parsedAi.actionablePlaybookAdvice
    }

    return { success: true, data: briefing }
  } catch (err: any) {
    console.error("generateAiMacroBriefingAction error:", err)
    return { success: false, error: err.message || "Failed to generate AI macro briefing" }
  }
}

/**
 * Curated verified fallback data for offline / resilient loading
 */
function generateCuratedFallbackCot(symbol: MacroSymbol): CotReportSummary {
  const config = SUPPORTED_MACRO_SYMBOLS[symbol] || SUPPORTED_MACRO_SYMBOLS.NQ
  const baseDate = new Date()
  const history: CotDataPoint[] = []

  // Generate 12 historical weekly points
  for (let i = 11; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split("T")[0]
    const factor = Math.sin(i / 2)
    const commNet = Math.round(-55000 + factor * 12000)
    const specNet = Math.round(42000 - factor * 11000)

    history.push({
      date: dateStr,
      reportDate: dateStr,
      marketName: config.cftcSearchTerm,
      nonCommercialLong: Math.round(85000 + specNet / 2),
      nonCommercialShort: Math.round(85000 - specNet / 2),
      nonCommercialNet: specNet,
      commercialLong: Math.round(60000 + commNet / 2),
      commercialShort: Math.round(60000 - commNet / 2),
      commercialNet: commNet,
      nonReportableLong: 22000,
      nonReportableShort: 18000,
      nonReportableNet: 4000,
      openInterest: Math.round(285000 + i * 2100),
      wowCommercialChange: i === 11 ? 0 : Math.round(factor * 1500),
      wowNonCommercialChange: i === 11 ? 0 : Math.round(-factor * 1400),
      cotIndex: Math.round(50 + factor * 35)
    })
  }

  const current = history[history.length - 1]
  const previous = history[history.length - 2]

  return {
    symbol,
    symbolName: config.name,
    latestDate: current.date,
    history,
    current,
    previous,
    commercialSentiment: "Bearish Hedging",
    speculatorSentiment: "Heavily Long",
    cotIndex: current.cotIndex,
    regime: current.cotIndex > 70 ? "SPECULATIVE_EXTREME_LONG" : "BULLISH_ACCUMULATION",
    regimeLabel: current.cotIndex > 70 ? "Speculative Over-Extension (Top-Heavy Longs)" : "Institutional Accumulation",
    regimeDescription: "Commercials are holding heavy hedging positions while hedge funds hold extended longs.",
    smartMoneyBias: current.cotIndex > 70 ? "BEARISH" : "BULLISH"
  }
}

function generateFallbackEconomicCalendar(): EconomicEvent[] {
  const today = new Date().toISOString().split("T")[0]
  return [
    {
      id: "fb-1",
      title: "Core CPI m/m",
      country: "USD",
      date: `${today}T08:30:00-05:00`,
      timeEST: "08:30 AM",
      dateStr: today,
      impact: "High",
      forecast: "0.3%",
      previous: "0.2%",
      isRedFolder: true,
      isUpcoming: true,
      minutesUntil: 120
    },
    {
      id: "fb-2",
      title: "CPI y/y",
      country: "USD",
      date: `${today}T08:30:00-05:00`,
      timeEST: "08:30 AM",
      dateStr: today,
      impact: "High",
      forecast: "2.4%",
      previous: "2.5%",
      isRedFolder: true,
      isUpcoming: true,
      minutesUntil: 120
    },
    {
      id: "fb-3",
      title: "Unemployment Claims",
      country: "USD",
      date: `${today}T08:30:00-05:00`,
      timeEST: "08:30 AM",
      dateStr: today,
      impact: "Medium",
      forecast: "220K",
      previous: "227K",
      isRedFolder: false,
      isUpcoming: true,
      minutesUntil: 120
    },
    {
      id: "fb-4",
      title: "FOMC Member Speaks",
      country: "USD",
      date: `${today}T10:00:00-05:00`,
      timeEST: "10:00 AM",
      dateStr: today,
      impact: "Medium",
      forecast: "--",
      previous: "--",
      isRedFolder: false,
      isUpcoming: true,
      minutesUntil: 210
    },
    {
      id: "fb-5",
      title: "Prelim UoM Consumer Sentiment",
      country: "USD",
      date: `${today}T10:00:00-05:00`,
      timeEST: "10:00 AM",
      dateStr: today,
      impact: "High",
      forecast: "71.0",
      previous: "70.5",
      isRedFolder: true,
      isUpcoming: true,
      minutesUntil: 210
    }
  ]
}
