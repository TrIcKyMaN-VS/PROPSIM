export function fmtCurrency(n: number | null | undefined, opts?: { sign?: boolean }): string {
  if (n === undefined || n === null || Number.isNaN(n) || !Number.isFinite(n)) {
    return "N/A"
  }
  const sign = opts?.sign && n > 0 ? "+" : ""
  return `${sign}${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n) || !Number.isFinite(n)) {
    return "N/A"
  }
  return `${n.toFixed(digits)}%`
}

/**
 * Format a P&L value as either currency ($1,234) or percentage of account balance (+2.47%).
 * Pass `accountBalance` (the starting balance) to enable percentage mode.
 */
export function fmtPnl(
  pnl: number | null | undefined,
  mode: "currency" | "percentage",
  accountBalance: number,
  opts?: { sign?: boolean; digits?: number }
): string {
  if (pnl === undefined || pnl === null || Number.isNaN(pnl) || !Number.isFinite(pnl)) {
    return "N/A"
  }
  if (mode === "percentage") {
    if (!accountBalance || accountBalance === 0) return "N/A"
    const pct = (pnl / accountBalance) * 100
    const digits = opts?.digits ?? 2
    const sign = pct > 0 ? "+" : ""
    return `${sign}${pct.toFixed(digits)}%`
  }
  return fmtCurrency(pnl, opts)
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
