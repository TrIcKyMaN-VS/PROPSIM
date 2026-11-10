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
}
