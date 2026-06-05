export function calculateReadinessScore(trades: any[]) {
  if (!trades || trades.length < 5) return { score: 0, status: "Not Ready" }

  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl <= 0)
  
  const winRate = wins.length / trades.length
  
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1
  const rr = avgWin / (avgLoss === 0 ? 1 : avgLoss)

  // A score from 0 to 100 based on idealized prop firm metrics (e.g. 50% WR, 1.5 RR)
  const winRateScore = Math.min(100, (winRate / 0.5) * 100)
  const rrScore = Math.min(100, (rr / 1.5) * 100)

  const score = Math.round((winRateScore * 0.4) + (rrScore * 0.6))

  let status = "Not Ready"
  if (score > 85) status = "Funded Ready"
  else if (score > 65) status = "Nearly Ready"
  else if (score > 40) status = "Developing"

  return { score, status, winRate, rr }
}

export function calculatePassProbability(metrics: { winRate: number, rr: number, consistency: number }) {
  // Rough proxy for Kelly Criterion / Expected value
  const ev = (metrics.winRate * metrics.rr) - (1 - metrics.winRate)
  
  const firms = [
    { name: "Apex", difficulty: 1.0 },
    { name: "Topstep", difficulty: 1.2 },
    { name: "Lucid", difficulty: 0.9 },
    { name: "TradeDay", difficulty: 1.1 }
  ]

  return firms.map(f => {
    // Math model: base probability scales with EV, penalized by firm difficulty
    let prob = 0
    if (ev > 0) {
      prob = Math.min(99, 20 + (ev * 100 / f.difficulty))
    } else {
      prob = Math.max(1, 20 - (Math.abs(ev) * 100 * f.difficulty))
    }
    
    return {
      firm: f.name,
      probability: Math.round(prob)
    }
  })
}

export function analyzeSessions(trades: any[]) {
  const sessions = ["Asia", "London", "New York AM", "New York PM"]
  
  return sessions.map(sessionName => {
    const sessionTrades = trades.filter(t => t.session === sessionName)
    const wins = sessionTrades.filter(t => t.pnl > 0).length
    const winRate = sessionTrades.length ? (wins / sessionTrades.length) * 100 : 0
    const pnl = sessionTrades.reduce((s, t) => s + t.pnl, 0)
    return { session: sessionName, count: sessionTrades.length, winRate, pnl }
  }).sort((a, b) => b.pnl - a.pnl)
}
