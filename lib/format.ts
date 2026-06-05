export function fmtCurrency(n: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && n > 0 ? "+" : ""
  return `${sign}${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
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
