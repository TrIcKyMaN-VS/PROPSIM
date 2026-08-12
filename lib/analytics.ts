import type { Trade } from "./types"

export interface Analytics {
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  lossRate: number
  profitFactor: number
  avgWinner: number
  avgLoser: number
  expectancy: number
  largestWinner: number
  largestLoser: number
  maxDrawdown: number
  sharpe: number
  riskOfRuin: number
  netPnl: number
  bySession: { session: string; pnl: number; trades: number }[]
  byInstrument: { instrument: string; pnl: number; trades: number }[]
}

export function computeAnalytics(trades: Trade[]): Analytics {
  const total = trades.length
  const winTrades = trades.filter((t) => t.pnl > 0)
  const lossTrades = trades.filter((t) => t.pnl < 0)
  const wins = winTrades.length
  const losses = lossTrades.length
  const grossWin = winTrades.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0))
  const netPnl = grossWin - grossLoss
  const winRate = total ? (wins / total) * 100 : 0
  const lossRate = total ? (losses / total) * 100 : 0
  const avgWinner = wins ? grossWin / wins : 0
  const avgLoser = losses ? grossLoss / losses : 0
  const profitFactor = grossLoss ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0
  const expectancy = total ? netPnl / total : 0
  const largestWinner = winTrades.reduce((m, t) => Math.max(m, t.pnl), 0)
  const largestLoser = lossTrades.reduce((m, t) => Math.min(m, t.pnl), 0)

  // max drawdown over running pnl
  let run = 0
  let peak = 0
  let maxDd = 0
  for (const t of [...trades].sort((a, b) => a.timestamp - b.timestamp)) {
    run += t.pnl
    if (run > peak) peak = run
    maxDd = Math.max(maxDd, peak - run)
  }

  // sharpe-ish: mean/std of per-trade returns
  const mean = total ? netPnl / total : 0
  const variance = total ? trades.reduce((s, t) => s + (t.pnl - mean) ** 2, 0) / total : 0
  const std = Math.sqrt(variance)
  const sharpe = std ? (mean / std) * Math.sqrt(total || 1) : 0

  // risk of ruin (simplified): based on win rate and payoff ratio
  const p = winRate / 100
  const payoff = avgLoser ? avgWinner / avgLoser : 1
  const edge = p * payoff - (1 - p)
  let riskOfRuin = 0
  if (edge <= 0) riskOfRuin = 100
  else {
    const a = (1 - edge) / (1 + edge)
    riskOfRuin = Math.min(100, Math.max(0, a ** 10 * 100))
  }

  const sessions = ["Asia", "London", "New York AM", "New York PM"]
  const bySession = sessions.map((s) => {
    const ts = trades.filter((t) => t.session === s)
    return { session: s, pnl: Math.round(ts.reduce((a, t) => a + t.pnl, 0)), trades: ts.length }
  })

  const instrMap = new Map<string, { pnl: number; trades: number }>()
  for (const t of trades) {
    const cur = instrMap.get(t.instrument) ?? { pnl: 0, trades: 0 }
    cur.pnl += t.pnl
    cur.trades += 1
    instrMap.set(t.instrument, cur)
  }
  const byInstrument = [...instrMap.entries()].map(([instrument, v]) => ({
    instrument,
    pnl: Math.round(v.pnl),
    trades: v.trades,
  }))

  return {
    totalTrades: total,
    wins,
    losses,
    winRate,
    lossRate,
    profitFactor: profitFactor === Infinity ? 99 : profitFactor,
    avgWinner,
    avgLoser,
    expectancy,
    largestWinner,
    largestLoser,
    maxDrawdown: maxDd,
    sharpe,
    riskOfRuin,
    netPnl,
    bySession,
    byInstrument,
  }
}

export interface CoachInsight {
  severity: "good" | "warning" | "critical"
  title: string
  detail: string
}

export function generateCoachInsights(trades: Trade[], a: Analytics): CoachInsight[] {
  const out: CoachInsight[] = []
  if (a.totalTrades === 0) {
    return [{ severity: "warning", title: "No trades yet", detail: "Log or import trades to unlock AI coaching." }]
  }
  if (a.avgLoser > a.avgWinner && a.avgWinner > 0) {
    out.push({
      severity: "critical",
      title: "Average loser exceeds average winner",
      detail: `Your avg loss ($${a.avgLoser.toFixed(0)}) is larger than your avg win ($${a.avgWinner.toFixed(0)}). Tighten stops or let winners run to flip your risk/reward.`,
    })
  }
  const worstSession = [...a.bySession].filter((s) => s.trades > 0).sort((x, y) => x.pnl - y.pnl)[0]
  if (worstSession && worstSession.pnl < 0) {
    out.push({
      severity: "warning",
      title: `Losses concentrate in ${worstSession.session}`,
      detail: `You're down $${Math.abs(worstSession.pnl).toLocaleString()} across ${worstSession.trades} trades in the ${worstSession.session} session. Consider avoiding it or sizing down.`,
    })
  }
  // overtrading: any day with > 8 trades
  const perDay = new Map<string, number>()
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York" })
  trades.forEach((t) => {
    const d = fmt.format(new Date(Number(t.timestamp)))
    perDay.set(d, (perDay.get(d) ?? 0) + 1)
  })
  const overtradeDay = [...perDay.entries()].find(([, c]) => c > 8)
  if (overtradeDay) {
    out.push({
      severity: "warning",
      title: "Overtrading detected",
      detail: `Date ${overtradeDay[0]} had ${overtradeDay[1]} trades. High frequency often signals revenge trading — set a daily trade cap.`,
    })
  }
  if (a.winRate >= 50 && a.profitFactor >= 1.3) {
    out.push({
      severity: "good",
      title: "Solid edge detected",
      detail: `A ${a.winRate.toFixed(0)}% win rate with a ${a.profitFactor.toFixed(2)} profit factor is fundable. Stay consistent and protect your drawdown.`,
    })
  }
  if (a.riskOfRuin > 30) {
    out.push({
      severity: "critical",
      title: "Elevated risk of ruin",
      detail: `Your current stats imply a ${a.riskOfRuin.toFixed(0)}% risk of ruin. Reduce position size and improve your reward-to-risk before scaling.`,
    })
  }
  if (out.length === 0) {
    out.push({ severity: "good", title: "No major issues found", detail: "Your trade profile looks balanced. Keep logging to refine the analysis." })
  }
  return out
}

export interface ReadinessScore {
  score: number
  label: "Not Ready" | "Developing" | "Nearly Ready" | "Funded Ready"
  factors: { name: string; value: number }[]
}

export function fundedReadiness(a: Analytics): ReadinessScore {
  const winRateScore = Math.min(100, (a.winRate / 55) * 100)
  const pfScore = Math.min(100, (a.profitFactor / 2) * 100)
  const rorScore = Math.max(0, 100 - a.riskOfRuin)
  const expScore = Math.min(100, Math.max(0, (a.expectancy / 150) * 100))
  const score = Math.round(winRateScore * 0.25 + pfScore * 0.3 + rorScore * 0.25 + expScore * 0.2)
  let label: ReadinessScore["label"] = "Not Ready"
  if (score >= 80) label = "Funded Ready"
  else if (score >= 60) label = "Nearly Ready"
  else if (score >= 40) label = "Developing"
  return {
    score,
    label,
    factors: [
      { name: "Win Rate", value: Math.round(winRateScore) },
      { name: "Profit Factor", value: Math.round(pfScore) },
      { name: "Risk Control", value: Math.round(rorScore) },
      { name: "Expectancy", value: Math.round(expScore) },
    ],
  }
}
