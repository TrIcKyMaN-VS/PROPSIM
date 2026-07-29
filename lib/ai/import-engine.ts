import { generateObject } from "ai"
import { getAiProvider, trackAiUsage } from "./provider"
import { z } from "zod"

export const TradeMappingSchema = z.object({
  instrumentCol: z.string().describe("The column name representing the ticker/instrument"),
  directionCol: z.string().optional().describe("The column name for Long/Short, Buy/Sell, or Action"),
  entryCol: z.string().describe("The column name for entry price"),
  exitCol: z.string().optional().describe("The column name for exit price. If missing, we will reconstruct it."),
  contractsCol: z.string().describe("The column name for quantity/size/contracts"),
  pnlCol: z.string().describe("The column name for Net Profit, PnL, GainLoss"),
  dateCol: z.string().describe("The column name for the timestamp or date"),
  directionBuyValues: z.array(z.string()).optional().describe("If directionCol exists, what values mean 'Long'? e.g. ['Buy', 'Long']"),
})

export type TradeMapping = z.infer<typeof TradeMappingSchema>

export async function detectCsvMapping(csvSample: object[]): Promise<TradeMapping> {
  const sampleData = JSON.stringify(csvSample.slice(0, 3))
  const columns = Object.keys(csvSample[0] || {})
  const columnsStr = columns.join(", ")

  try {
    const { model, userId, provider } = await getAiProvider()

    const { object, usage } = await generateObject({
      model: model,
      schema: TradeMappingSchema,
      prompt: `You are a Universal Trade Import AI. A user uploaded a broker statement.
      Columns available: ${columnsStr}
      Data sample:
      ${sampleData}
      
      Determine which columns map to our internal Trade fields:
      - instrument (e.g. Symbol, Ticker)
      - direction (e.g. Action, Side)
      - entry (e.g. Buy Price, Open Price, Price)
      - exit (e.g. Sell Price, Close Price)
      - contracts (e.g. Qty, Quantity)
      - pnl (e.g. Net PnL, Profit, Gross)
      - date (e.g. Date, Time, Exec Time)
      
      If exit price is not present, omit exitCol and the Trade Reconstruction Engine will handle it.
      `
    })

    if (usage) {
      await trackAiUsage(userId, usage.totalTokens || 0, provider)
    }

    return object
  } catch (err) {
    console.error("CSV mapper AI failed. Making programmatic headers mapping guess:", err)
    
    const findCol = (keys: string[], targets: string[]): string => {
      const match = keys.find(k => targets.some(t => k.toLowerCase().includes(t.toLowerCase())))
      return match || keys[0]
    }
    
    const directionCol = columns.find(k => ["action", "side", "direction", "type", "bs"].some(t => k.toLowerCase().includes(t.toLowerCase())))
    const exitCol = columns.find(k => ["exit", "close price", "sell price"].some(t => k.toLowerCase().includes(t.toLowerCase())))
    
    return {
      instrumentCol: findCol(columns, ["symbol", "ticker", "instrument", "contract", "product"]),
      directionCol,
      entryCol: findCol(columns, ["entry", "open price", "buy price", "price", "avg price"]),
      exitCol,
      contractsCol: findCol(columns, ["qty", "quantity", "size", "contracts", "volume"]),
      pnlCol: findCol(columns, ["net pnl", "profit", "pnl", "gain", "realized", "amount"]),
      dateCol: findCol(columns, ["date", "time", "timestamp", "execution time", "exec_time", "created"]),
      directionBuyValues: ["buy", "long", "b", "l"]
    }
  }
}

// Trade Reconstruction Engine
export function reconstructTrade(rawRow: any, mapping: TradeMapping) {
  let direction = "long"
  if (mapping.directionCol && rawRow[mapping.directionCol]) {
    const dirVal = String(rawRow[mapping.directionCol]).trim()
    direction = (mapping.directionBuyValues || ["buy", "long"]).some(v => dirVal.toLowerCase().includes(v.toLowerCase())) ? "long" : "short"
  } else {
    if (mapping.exitCol && rawRow[mapping.exitCol] && rawRow[mapping.entryCol]) {
       const entry = Number(rawRow[mapping.entryCol])
       const exit = Number(rawRow[mapping.exitCol])
       const pnl = Number(rawRow[mapping.pnlCol])
       if (exit > entry) {
          direction = pnl > 0 ? "long" : "short"
       } else {
          direction = pnl > 0 ? "short" : "long"
       }
    }
  }

  const entry = Number(rawRow[mapping.entryCol] || 0)
  const pnl = Number(rawRow[mapping.pnlCol]?.toString().replace(/[^0-9.-]/g, "") || 0)
  const contracts = Number(rawRow[mapping.contractsCol] || 1)
  
  let exit = entry
  let confidenceScore = 1.0
  let isReconstructed = false

  if (mapping.exitCol && rawRow[mapping.exitCol]) {
    exit = Number(rawRow[mapping.exitCol])
  } else {
    isReconstructed = true
    confidenceScore = 0.8
    const priceDiff = pnl / contracts
    exit = direction === "long" ? entry + priceDiff : entry - priceDiff
  }

  return {
    instrument: String(rawRow[mapping.instrumentCol] || "UNKNOWN"),
    direction,
    entry,
    exit,
    contracts,
    pnl,
    timestamp: new Date(rawRow[mapping.dateCol]).getTime() || Date.now(),
    confidenceScore,
    isReconstructed
  }
}
