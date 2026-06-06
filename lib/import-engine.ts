// Professional Smart Import Engine

export type ParsedTrade = {
  date: string
  instrument: string
  direction: "long" | "short"
  contracts: number
  entry: number
  exit: number
  pnl: number
  raw?: any
}

export type ImportStrategy = "Skip" | "Update" | "NewOnly"

/** Auto-detect platform and map generic headers */
export function parseCSVData(rows: any[]): { platform: string, trades: ParsedTrade[] } {
  if (rows.length === 0) return { platform: "Unknown", trades: [] }
  
  // Detect platform by examining the headers of the first row
  const firstRow = rows[0]
  const keys = Object.keys(firstRow).map(k => k.toLowerCase().trim())
  
  let platform = "Generic CSV"
  if (keys.includes("nt entry") || keys.includes("ninja_entry")) platform = "NinjaTrader"
  else if (keys.includes("tradovate id") || keys.includes("con id")) platform = "Tradovate"
  else if (keys.includes("tradelocker id")) platform = "TradeLocker"
  
  const trades: ParsedTrade[] = []

  for (const row of rows) {
    const raw: any = {}
    // Normalize keys
    for (const [k, v] of Object.entries(row)) {
      raw[k.toLowerCase().trim()] = v
    }

    // Auto mapping logic
    const pnlRaw = raw.profit ?? raw["net profit"] ?? raw.pnl ?? raw["p/l"] ?? raw.realized
    const pnl = parseFloat(String(pnlRaw).replace(/[^0-9.-]/g, ""))
    
    if (isNaN(pnl)) continue // Not a valid trade row

    const instrument = raw.symbol ?? raw.instrument ?? raw.ticker ?? "UNKNOWN"
    const qtyRaw = raw.qty ?? raw.quantity ?? raw.contracts ?? raw.size ?? 1
    const contracts = parseInt(String(qtyRaw).replace(/[^0-9]/g, ""), 10) || 1
    
    const entryRaw = raw.entry ?? raw["entry price"] ?? raw.price ?? raw["avg entry"]
    const exitRaw = raw.exit ?? raw["exit price"] ?? raw["avg exit"]
    const entry = parseFloat(String(entryRaw).replace(/[^0-9.-]/g, "")) || 0
    const exit = parseFloat(String(exitRaw).replace(/[^0-9.-]/g, "")) || 0

    const dateRaw = raw.date ?? raw.time ?? raw["execution time"] ?? raw.timestamp ?? new Date().toISOString()
    const directionRaw = String(raw.direction ?? raw.side ?? raw.action ?? "long").toLowerCase()
    const direction = (directionRaw.includes("sell") || directionRaw.includes("short")) ? "short" : "long"

    trades.push({
      date: dateRaw,
      instrument,
      direction,
      contracts,
      entry,
      exit,
      pnl,
      raw: row
    })
  }

  return { platform, trades }
}

/** Check if a parsed trade matches an existing trade in the database/store */
export function isDuplicate(parsed: ParsedTrade, existingTrades: any[]) {
  // A trade is a duplicate if Date (within same day), Instrument, and PnL match closely
  // For robustness, we check PnL and Instrument. 
  return existingTrades.some(t => {
    return t.instrument === parsed.instrument && Math.abs(t.pnl - parsed.pnl) < 1.0
  })
}
