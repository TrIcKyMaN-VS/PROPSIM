import { usePropStore } from "@/lib/store"

export function fmtCurrency(n: number | null | undefined, opts?: { sign?: boolean }): string {
  if (n === undefined || n === null || Number.isNaN(n) || !Number.isFinite(n)) {
    return "N/A"
  }
  const sign = opts?.sign && n > 0 ? "+" : ""
  return `${sign}${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n) || !Number.isFinite(n)) {
    return "0.0%"
  }
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`
}

/**
 * Format a P&L value as either currency ($1,234), percentage of account balance (+2.47%), or R-multiple (+2.50R).
 * Pass `accountBalance` (the starting balance) to enable percentage mode.
 */
export function fmtPnl(
  pnl: number | null | undefined,
  mode: "currency" | "percentage" | "r_multiple",
  accountBalance: number,
  opts?: { sign?: boolean; digits?: number }
): string {
  if (pnl === undefined || pnl === null || Number.isNaN(pnl) || !Number.isFinite(pnl)) {
    return "N/A"
  }
  if (mode === "r_multiple") {
    const defaultPlannedRisk = usePropStore.getState().defaultPlannedRisk || 100
    const r = pnl / defaultPlannedRisk
    const digits = opts?.digits ?? 2
    const sign = r > 0 ? "+" : ""
    return `${sign}${r.toFixed(digits)}R`
  }
  if (mode === "percentage") {
    const store = usePropStore.getState()
    const activeAcc = store.accounts.find(a => a.id === store.activeAccountId) || store.accounts[0]
    const bal = (accountBalance && accountBalance > 0) ? accountBalance : (activeAcc?.rules?.startingBalance || 50000)
    const pct = (pnl / bal) * 100
    const digits = opts?.digits ?? 2
    const sign = pct > 0 ? "+" : ""
    return `${sign}${pct.toFixed(digits)}%`
  }
  return fmtCurrency(pnl, { sign: opts?.sign })
}

export function logRuleEngineDiagnostic(accountId: string, challengeId: string, calcName: string, inputs: any, error: string) {
  console.error(`[RULE_ENGINE_DIAGNOSTICS] ${JSON.stringify({
    timestamp: new Date().toISOString(),
    accountId,
    challengeId,
    calculationName: calcName,
    rawInputs: inputs,
    error
  })}`);
}

export function difficultyColor(score: number): string {
  if (score < 50) return "text-success"
  if (score < 62) return "text-warning"
  return "text-destructive"
}

export function difficultyLabel(score: number): string {
  if (score < 50) return "Easy"
  if (score < 62) return "Moderate"
  if (score < 75) return "Advanced"
  return "Expert"
}

export function formatDisplayTime(
  timestamp: number | bigint | Date,
  mode: "Exchange Time" | "Local Time" = "Exchange Time",
  instrument?: string
): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp
  const date = new Date(ts)
  if (isNaN(date.getTime())) return "N/A"
  
  const timeZone = mode === "Exchange Time" ? "America/New_York" : undefined
  const suffix = mode === "Exchange Time" ? " NY" : ""
  
  const formatted = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone
  })
  return `${formatted}${suffix}`
}

export function formatDisplayDateTime(
  timestamp: number | bigint | Date,
  mode: "Exchange Time" | "Local Time" = "Exchange Time",
  instrument?: string
): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp
  const date = new Date(ts)
  if (isNaN(date.getTime())) return "N/A"
  
  const timeZone = mode === "Exchange Time" ? "America/New_York" : undefined
  const suffix = mode === "Exchange Time" ? " NY" : ""
  
  const formatted = date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone
  })
  return `${formatted}${suffix}`
}
