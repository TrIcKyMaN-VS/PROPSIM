export type MacroSymbol = "NQ" | "ES" | "YM" | "RTY" | "GC" | "CL" | "6E" | "6B" | "BTC"

export interface MacroSymbolConfig {
  symbol: MacroSymbol
  name: string
  cftcSearchTerm: string
  category: "Indices" | "Commodities" | "Currencies" | "Crypto"
  tickValue?: string
  description: string
}

export const SUPPORTED_MACRO_SYMBOLS: Record<MacroSymbol, MacroSymbolConfig> = {
  NQ: {
    symbol: "NQ",
    name: "Nasdaq 100 (E-mini / Micro)",
    cftcSearchTerm: "NASDAQ MINI - CHICAGO MERCANTILE EXCHANGE",
    category: "Indices",
    tickValue: "$5.00 / pt (NQ) | $0.50 / pt (MNQ)",
    description: "Tech-heavy index, highly sensitive to interest rates, CPI, and Fed liquidity."
  },
  ES: {
    symbol: "ES",
    name: "S&P 500 (E-mini / Micro)",
    cftcSearchTerm: "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE",
    category: "Indices",
    tickValue: "$12.50 / tick | $50.00 / pt",
    description: "Benchmark US equities index, core bellwether for institutional portfolio rebalancing."
  },
  YM: {
    symbol: "YM",
    name: "Dow Jones 30 (E-mini / Micro)",
    cftcSearchTerm: "DJIA Consolidated - CHICAGO BOARD OF TRADE",
    category: "Indices",
    tickValue: "$5.00 / pt (YM) | $0.50 / pt (MYM)",
    description: "30 mega-cap industrials and blue chips, cyclical & defensive benchmark."
  },
  RTY: {
    symbol: "RTY",
    name: "Russell 2000 (E-mini / Micro)",
    cftcSearchTerm: "RUSSELL E-MINI - CHICAGO MERCANTILE EXCHANGE",
    category: "Indices",
    tickValue: "$5.00 / pt (RTY) | $0.50 / pt (M2K)",
    description: "US Small-Cap index, most sensitive to domestic credit and regional banking."
  },
  GC: {
    symbol: "GC",
    name: "Gold Futures",
    cftcSearchTerm: "GOLD - COMMODITY EXCHANGE INC.",
    category: "Commodities",
    tickValue: "$10.00 / 0.10 pt ($100 / $1)",
    description: "Safe haven asset, inversely correlated with real yields and US Dollar strength."
  },
  CL: {
    symbol: "CL",
    name: "Crude Oil (WTI)",
    cftcSearchTerm: "CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE",
    category: "Commodities",
    tickValue: "$10.00 / $0.01 cent ($1,000 / $1)",
    description: "Global energy driver, highly responsive to OPEC, EIA inventory, and geopolitics."
  },
  "6E": {
    symbol: "6E",
    name: "Euro FX Futures (EUR/USD)",
    cftcSearchTerm: "EURO FX - CHICAGO MERCANTILE EXCHANGE",
    category: "Currencies",
    tickValue: "$6.25 / 0.00005 pip",
    description: "Accounts for 57.6% of the DXY index; key institutional FX liquidity barometer."
  },
  "6B": {
    symbol: "6B",
    name: "British Pound Futures (GBP/USD)",
    cftcSearchTerm: "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE",
    category: "Currencies",
    tickValue: "$6.25 / 0.0001 pip",
    description: "Sterling futures, sensitive to Bank of England policy and UK economic growth."
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin Futures (CME)",
    cftcSearchTerm: "BITCOIN - CHICAGO MERCANTILE EXCHANGE",
    category: "Crypto",
    tickValue: "$25.00 / $5 pt",
    description: "Regulated institutional crypto exposure; key gauge of digital asset risk appetite."
  }
}

export type SentimentRegime = 
  | "BULLISH_ACCUMULATION" 
  | "BEARISH_DISTRIBUTION" 
  | "SPECULATIVE_EXTREME_LONG" 
  | "SPECULATIVE_EXTREME_SHORT" 
  | "NEUTRAL_BALANCED"

export interface CotDataPoint {
  date: string // YYYY-MM-DD
  reportDate: string
  marketName: string
  nonCommercialLong: number
  nonCommercialShort: number
  nonCommercialNet: number
  commercialLong: number
  commercialShort: number
  commercialNet: number
  nonReportableLong: number
  nonReportableShort: number
  nonReportableNet: number
  openInterest: number
  wowCommercialChange: number
  wowNonCommercialChange: number
  cotIndex: number // 0 - 100 oscillator
}

export interface CotReportSummary {
  symbol: MacroSymbol
  symbolName: string
  latestDate: string
  history: CotDataPoint[]
  current: CotDataPoint
  previous: CotDataPoint | null
  commercialSentiment: "Bullish Hedging" | "Bearish Hedging" | "Neutral"
  speculatorSentiment: "Heavily Long" | "Heavily Short" | "Neutral"
  cotIndex: number
  regime: SentimentRegime
  regimeLabel: string
  regimeDescription: string
  smartMoneyBias: "BULLISH" | "BEARISH" | "NEUTRAL"
  biasScore: number // e.g. +30 or -45
  biasLabel: "LONG" | "SHORT" | "NEUTRAL"
  longDelta: number
  shortDelta: number
  netDelta: number
  threeReportSequence: {
    values: number[]
    label: string
    isBullish: boolean
  }
}

export interface EconomicEvent {
  id: string
  title: string
  country: string
  date: string // ISO
  timeEST: string
  dateStr: string // YYYY-MM-DD
  impact: "High" | "Medium" | "Low" | "Holiday"
  forecast: string
  previous: string
  actual?: string
  isRedFolder: boolean
  isUpcoming: boolean
  minutesUntil: number
}

export interface ScenarioMatrixItem {
  eventName: string
  timeEST: string
  impact: string
  hotScenario: string // If higher than forecast
  coolScenario: string // If lower than forecast
  inlineScenario: string // If in-line
}

export interface WeeklySessionDayPlan {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
  phase: string
  tacticalAction: string
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
}

export interface AiMacroBriefing {
  symbol: MacroSymbol
  generatedAt: string
  headline: string
  institutionalRegime: string
  smartMoneyBias: "BULLISH" | "BEARISH" | "NEUTRAL"
  keyFindings: string[]
  upcomingRedFolderRisks: string[]
  propFirmRuleSafeguard: string
  tradeAlignmentScore: number // 0-100
  traderStats: {
    totalTradesAnalyzed: number
    alignedTradesCount: number
    alignedWinRate: number
    alignedPnL: number
    counterTradesCount: number
    counterWinRate: number
    counterPnL: number
  }
  actionablePlaybookAdvice: string
  // ── Real Edge Additions (Beyond trade review) ──
  squeezeProbability: number // 0-100%
  squeezeWarning: string
  liquidityPoolTargets: {
    buySide: string
    sellSide: string
  }
  economicScenarioMatrix: ScenarioMatrixItem[]
  weeklySessionPlan: WeeklySessionDayPlan[]
  macroDivergence: {
    detected: boolean
    title: string
    analysis: string
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5 NEW REAL EDGE ENGINE TYPES (Institutional Macro Infusion)
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_REFERENCE_PRICES: Record<MacroSymbol, number> = {
  NQ: 27750,
  ES: 6850,
  YM: 47500,
  RTY: 2450,
  GC: 2950,
  CL: 78.5,
  "6E": 1.0850,
  "6B": 1.3100,
  BTC: 96000,
}

export const SYMBOL_VOLATILITY_BETAS: Record<MacroSymbol, number> = {
  NQ: 1.65,
  ES: 1.0,
  YM: 0.85,
  RTY: 1.45,
  GC: 0.75,
  CL: 1.25,
  "6E": 0.40,
  "6B": 0.50,
  BTC: 2.50,
}

export interface FedRateExpectations {
  currentRate: number
  nextMeetingLabel: string
  meetingDate: string
  daysUntilMeeting: number
  cutProbability: number
  holdProbability: number
  hikeProbability: number
  marketBias: "DOVISH" | "NEUTRAL" | "HAWKISH"
  edgeSignal: string
  rateTrajectory: "CUTTING" | "HOLDING" | "HIKING"
  source: "FRED" | "FALLBACK"
}

export interface EventExpectedMove {
  eventName: string
  eventDate: string
  timeEST: string
  daysUntil: number
  referencePrice: number
  vixLevel: number
  expectedMovePts: number
  halfSdPts: number
  movePercent: number
  absorptionThreshold: number
  momentumThreshold: number
  impact: "High" | "Medium"
  edgeNote: string
}

export interface NewsReactionEvent {
  eventName: string
  date: string
  actualPrint: string
  expectedDirection: "UP" | "DOWN" | "NEUTRAL"
  actualMoveLabel: string
  actualMovePositive: boolean
  reactionType: "CONFIRMED" | "DIVERGENCE_BULLISH" | "DIVERGENCE_BEARISH" | "ABSORPTION"
  edgeNote: string
}

export interface DivergenceEngineResult {
  events: NewsReactionEvent[]
  score: number // -100 to +100
  bullishDivergences: number
  bearishDivergences: number
  absorptions: number
  bias: "BULLISH" | "BEARISH" | "NEUTRAL"
  interpretation: string
  actionableEdge: string
}

export interface PriceLevelMap {
  referencePrice: number
  symbol: MacroSymbol
  buySidePool: { low: number; high: number; label: string }
  prevWeekHigh: number
  roundNumberAbove: number
  halfLevelAbove: number
  sellSidePool: { low: number; high: number; label: string }
  prevWeekLow: number
  roundNumberBelow: number
  halfLevelBelow: number
  dailyAdrEstimate: number
  dailyHighTarget: number
  dailyLowTarget: number
  magnetZones: Array<{ level: number; label: string; type: "BUY" | "SELL" | "NEUTRAL" }>
}

export interface ConfluenceScore {
  score: number // -100 to +100
  label: string
  tier: "STRONG_BULL" | "MILD_BULL" | "NEUTRAL" | "MILD_BEAR" | "STRONG_BEAR"
  components: {
    cotBias: { score: number; label: string; weight: number }
    fedWatch: { score: number; label: string; weight: number }
    expectedMove: { score: number; label: string; weight: number }
    reactionDivergence: { score: number; label: string; weight: number }
    priceLevel: { score: number; label: string; weight: number }
  }
  interpretation: string
  propFirmEdge: string
  riskWarning: string
}

export interface RealEdgeData {
  fedRate: FedRateExpectations
  expectedMoves: EventExpectedMove[]
  divergenceEngine: DivergenceEngineResult
  priceLevels: PriceLevelMap
  confluence: ConfluenceScore
  generatedAt: string
  referencePrice: number
  vixLevel: number
}

