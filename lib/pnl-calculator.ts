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
