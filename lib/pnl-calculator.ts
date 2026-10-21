import { TradeDirection } from "./types"

export const CONTRACT_MULTIPLIERS: Record<string, number> = {
  ES: 50,
  MES: 5,
  NQ: 20,
  MNQ: 2,
  YM: 5,
  MYM: 0.5,
  RTY: 50,
  M2K: 5,
  CL: 1000,
  GC: 100
}

export function calculatePnl(
  instrument: string,
  direction: TradeDirection,
  entry: number | string,
  exit: number | string,
  contracts: number | string
): number | null {
  const e1 = Number(entry)
  const e2 = Number(exit)
  const c = Number(contracts)

  if (Number.isNaN(e1) || Number.isNaN(e2) || Number.isNaN(c) || c <= 0 || !entry || !exit) {
    return null
  }

  const upperInstrument = instrument.trim().toUpperCase()
  const multiplier = CONTRACT_MULTIPLIERS[upperInstrument]

  if (!multiplier) {
    return null
  }

  const pointDiff = direction === "long" ? e2 - e1 : e1 - e2
  const pnl = pointDiff * multiplier * c

  return Number(pnl.toFixed(2))
}

export function getInstrumentPointMultiplier(instrument?: string | null): number {
  if (!instrument) return 2
  const clean = instrument.trim().toUpperCase()
  const base = clean.split(/[\s_\-\/]/)[0]
  if (CONTRACT_MULTIPLIERS[base] !== undefined) return CONTRACT_MULTIPLIERS[base]
  if (CONTRACT_MULTIPLIERS[clean] !== undefined) return CONTRACT_MULTIPLIERS[clean]
  if (clean.startsWith("MNQ")) return 2
  if (clean.startsWith("NQ")) return 20
  if (clean.startsWith("MES")) return 5
  if (clean.startsWith("ES")) return 50
  if (clean.startsWith("MYM")) return 0.5
  if (clean.startsWith("YM")) return 5
  if (clean.startsWith("M2K")) return 5
  if (clean.startsWith("RTY")) return 50
  if (clean.startsWith("CL")) return 1000
  if (clean.startsWith("GC")) return 100
  return 2
}

export function calculateDollarRiskFromPoints(
  instrument: string | undefined | null,
  riskPoints: number,
  contracts: number = 1
): number {
  const mult = getInstrumentPointMultiplier(instrument)
  const qty = Math.max(1, Number(contracts) || 1)
  return Number((Math.abs(riskPoints) * mult * qty).toFixed(2))
}
