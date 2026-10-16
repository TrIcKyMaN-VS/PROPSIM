/**
 * Commission Rules:
 * MNQ: $1.00 round trip per contract ($0.50 / side)
 * NQ:  $4.00 round trip per contract ($2.00 / side)
 */
export function calculateTradeCommission(instrument: string | undefined | null, contracts: number | undefined | null): number {
  if (!instrument) return 0
  const qty = Number(contracts) || 1
  if (qty <= 0) return 0

  const inst = instrument.trim().toUpperCase()
  if (inst.startsWith("MNQ")) {
    return Number((qty * 1.0).toFixed(2))
  }
  if (inst.startsWith("NQ")) {
    return Number((qty * 4.0).toFixed(2))
  }
  return 0
}

/**
 * Calculates net P&L and net R given gross P&L, commission, and initial planned dollar risk.
 */
export function calculateNetPnlAndR(params: {
  grossPnl: number
  commission: number
  plannedRisk?: number | null
}): { netPnl: number; netR: number | null } {
  const netPnl = Number((params.grossPnl - params.commission).toFixed(2))
  const risk = params.plannedRisk != null && params.plannedRisk > 0 ? params.plannedRisk : null
  const netR = risk ? Number((netPnl / risk).toFixed(2)) : null
  return { netPnl, netR }
}
