import type { ChallengeRules, ChallengeSize, PropFirm } from "./types"

// Helper to generate scaled sizes for a firm given a per-100k rule profile.
function sizes(
  profile: {
    target: number // per 1k of balance
    daily: number // per 1k
    drawdown: number // per 1k
    maxContracts: Record<number, number>
    price: Record<number, number>
  },
  base: Omit<ChallengeRules, "startingBalance" | "profitTarget" | "dailyLossLimit" | "maxDrawdown" | "maxContracts">,
): ChallengeSize[] {
  const balances = [25000, 50000, 100000, 150000, 300000]
  return balances
    .filter((b) => profile.maxContracts[b] !== undefined)
    .map((b) => {
      const k = b / 1000
      return {
        label: `${b / 1000}K`,
        price: profile.price[b],
        rules: {
          ...base,
          startingBalance: b,
          profitTarget: Math.round(profile.target * k),
          dailyLossLimit: profile.daily === 0 ? 0 : Math.round(profile.daily * k),
          maxDrawdown: Math.round(profile.drawdown * k),
          maxContracts: profile.maxContracts[b],
        },
      }
    })
}

export const FIRMS: PropFirm[] = [
  {
    id: "apex",
    name: "Apex Trader Funding",
    shortName: "Apex",
    tagline: "Trailing threshold, no daily loss limit, fast payouts.",
    color: "#3b82f6",
    drawdownType: "trailing",
    difficulty: "Moderate",
    difficultyScore: 58,
    successRate: 11,
    payoutSpeed: "Same day",
    challengeTypes: ["1-Step Eval", "Static accounts"],
    pros: ["No daily loss limit", "Fast same-day payouts", "Frequent discounts", "Generous contract sizing"],
    cons: ["Trailing drawdown is unforgiving", "30% consistency rule on payouts", "Activation fees on PA"],
    sizes: sizes(
      {
        target: 60,
        daily: 0,
        drawdown: 50,
        maxContracts: { 25000: 4, 50000: 10, 100000: 14, 150000: 17, 300000: 35 },
        price: { 25000: 147, 50000: 167, 100000: 207, 150000: 297, 300000: 657 },
      },
      { drawdownType: "trailing", trailingLockProfit: 0, minTradingDays: 1, maxTradingDays: undefined, consistencyPct: 30 },
    ),
  },
  {
    id: "topstep",
    name: "Topstep",
    shortName: "Topstep",
    tagline: "Industry standard combine with EOD trailing drawdown.",
    color: "#22c55e",
    drawdownType: "eod",
    difficulty: "Advanced",
    difficultyScore: 71,
    successRate: 8,
    payoutSpeed: "2-3 days",
    challengeTypes: ["Trading Combine", "Express Funded"],
    pros: ["Reputable & long-standing", "EOD drawdown (intraday safe)", "Strong education", "Scaling plan"],
    cons: ["Strict consistency rule", "Lower contract limits", "Monthly subscription"],
    sizes: sizes(
      {
        target: 60,
        daily: 20,
        drawdown: 40,
        maxContracts: { 50000: 5, 100000: 10, 150000: 15 },
        price: { 50000: 165, 100000: 325, 150000: 375 },
      },
      { drawdownType: "eod", trailingLockProfit: 0, minTradingDays: 2, maxTradingDays: undefined, consistencyPct: 50 },
    ),
  },
  {
    id: "mffu",
    name: "MyFundedFutures",
    shortName: "MFFU",
    tagline: "Flexible plans including no-trailing Expert options.",
    color: "#a855f7",
    drawdownType: "eod",
    difficulty: "Moderate",
    difficultyScore: 55,
    successRate: 13,
    payoutSpeed: "Same day",
    challengeTypes: ["Starter", "Expert", "Milestone"],
    pros: ["Multiple plan styles", "No-trailing options", "Fast payouts", "1-day minimum on some plans"],
    cons: ["Consistency rule on Expert", "Activation fees", "Plan rules vary widely"],
    sizes: sizes(
      {
        target: 60,
        daily: 20,
        drawdown: 40,
        maxContracts: { 50000: 5, 100000: 12, 150000: 15 },
        price: { 50000: 165, 100000: 265, 150000: 375 },
      },
      { drawdownType: "eod", trailingLockProfit: 0, minTradingDays: 1, maxTradingDays: undefined, consistencyPct: 40 },
    ),
  },
  {
    id: "tradeday",
    name: "TradeDay",
    shortName: "TradeDay",
    tagline: "Real-time intraday drawdown with transparent rules.",
    color: "#f59e0b",
    drawdownType: "trailing",
    difficulty: "Advanced",
    difficultyScore: 66,
    successRate: 9,
    payoutSpeed: "1-2 days",
    challengeTypes: ["Evaluation", "Funded"],
    pros: ["Transparent rule set", "Regulated broker (Ironbeam)", "No consistency rule", "Keep first $10k 100%"],
    cons: ["Trailing intraday drawdown", "Tighter daily loss", "Smaller contract sizing"],
    sizes: sizes(
      {
        target: 60,
        daily: 22,
        drawdown: 40,
        maxContracts: { 50000: 5, 100000: 10, 150000: 15 },
        price: { 50000: 165, 100000: 275, 150000: 375 },
      },
      { drawdownType: "trailing", trailingLockProfit: 0, minTradingDays: 1, maxTradingDays: undefined, consistencyPct: 0 },
    ),
  },
  {
    id: "tpt",
    name: "Take Profit Trader",
    shortName: "TPT",
    tagline: "EOD drawdown with a PRO funded transition.",
    color: "#ef4444",
    drawdownType: "eod",
    difficulty: "Moderate",
    difficultyScore: 52,
    successRate: 14,
    payoutSpeed: "Same day",
    challengeTypes: ["PRO Eval", "PRO Funded"],
    pros: ["EOD drawdown", "Keep first $25k 100%", "No consistency rule on eval", "Simple ruleset"],
    cons: ["Daily loss limit", "Activation fee", "Lower scaling"],
    sizes: sizes(
      {
        target: 60,
        daily: 20,
        drawdown: 40,
        maxContracts: { 25000: 3, 50000: 6, 100000: 12, 150000: 15 },
        price: { 25000: 150, 50000: 170, 100000: 250, 150000: 360 },
      },
      { drawdownType: "eod", trailingLockProfit: 0, minTradingDays: 5, maxTradingDays: undefined, consistencyPct: 0 },
    ),
  },
  {
    id: "bulenox",
    name: "Bulenox",
    shortName: "Bulenox",
    tagline: "Affordable evals with trailing and EOD options.",
    color: "#06b6d4",
    drawdownType: "trailing",
    difficulty: "Moderate",
    difficultyScore: 57,
    successRate: 12,
    payoutSpeed: "1-3 days",
    challengeTypes: ["Eval", "Master"],
    pros: ["Low cost", "Frequent coupons", "Multiple drawdown styles"],
    cons: ["Newer firm", "Consistency on payout", "Trailing option is tough"],
    sizes: sizes(
      {
        target: 60,
        daily: 0,
        drawdown: 50,
        maxContracts: { 25000: 4, 50000: 10, 100000: 14, 150000: 17 },
        price: { 25000: 115, 50000: 145, 100000: 175, 150000: 285 },
      },
      { drawdownType: "trailing", trailingLockProfit: 0, minTradingDays: 1, maxTradingDays: undefined, consistencyPct: 30 },
    ),
  },
  {
    id: "elite",
    name: "Elite Trader Funding",
    shortName: "Elite",
    tagline: "Wide menu of eval styles from static to trailing.",
    color: "#8b5cf6",
    drawdownType: "static",
    difficulty: "Easy",
    difficultyScore: 44,
    successRate: 16,
    payoutSpeed: "1-5 days",
    challengeTypes: ["Fast Track", "Static", "Diamond Hands"],
    pros: ["Static drawdown options", "Many plan types", "Big discounts"],
    cons: ["Inconsistent rule clarity", "Payout consistency rule", "Variable quality"],
    sizes: sizes(
      {
        target: 50,
        daily: 0,
        drawdown: 25,
        maxContracts: { 25000: 4, 50000: 8, 100000: 12, 150000: 15, 300000: 30 },
        price: { 25000: 125, 50000: 150, 100000: 190, 150000: 280, 300000: 590 },
      },
      { drawdownType: "static", trailingLockProfit: 0, minTradingDays: 0, maxTradingDays: undefined, consistencyPct: 0 },
    ),
  },
  {
    id: "lucid",
    name: "Lucid Trading Fund",
    shortName: "Lucid",
    tagline: "Modern eval with clean rules and a quick path to funded.",
    color: "#14b8a6",
    drawdownType: "eod",
    difficulty: "Advanced",
    difficultyScore: 68,
    successRate: 9,
    payoutSpeed: "1-2 days",
    challengeTypes: ["Advanced Eval", "Funded"],
    pros: ["Clean modern ruleset", "EOD drawdown", "Reasonable targets"],
    cons: ["Consistency rule", "Tighter daily loss", "Activation fee"],
    sizes: sizes(
      {
        target: 60,
        daily: 20,
        drawdown: 40,
        maxContracts: { 50000: 5, 100000: 10, 150000: 15 },
        price: { 50000: 160, 100000: 270, 150000: 365 },
      },
      { drawdownType: "eod", trailingLockProfit: 0, minTradingDays: 3, maxTradingDays: undefined, consistencyPct: 40 },
    ),
  },
  {
    id: "ffn",
    name: "Funded Futures Network",
    shortName: "FFN",
    tagline: "Beginner-friendly evals with optional one-day passing.",
    color: "#3b82f6",
    drawdownType: "trailing",
    difficulty: "Easy",
    difficultyScore: 47,
    successRate: 15,
    payoutSpeed: "Same day",
    challengeTypes: ["Standard", "One Step"],
    pros: ["Beginner friendly", "Fast payouts", "Low pricing"],
    cons: ["Trailing drawdown", "Consistency rule", "Smaller community"],
    sizes: sizes(
      {
        target: 60,
        daily: 0,
        drawdown: 50,
        maxContracts: { 25000: 3, 50000: 9, 100000: 14, 150000: 17 },
        price: { 25000: 105, 50000: 135, 100000: 165, 150000: 275 },
      },
      { drawdownType: "trailing", trailingLockProfit: 0, minTradingDays: 1, maxTradingDays: undefined, consistencyPct: 30 },
    ),
  },
]

export function getFirm(id: string): PropFirm | undefined {
  return FIRMS.find((f) => f.id === id)
}

export const SESSIONS = ["Asia", "London", "New York AM", "New York PM"] as const
export const INSTRUMENTS = ["ES", "NQ", "MES", "MNQ", "CL", "GC", "MGC", "RTY", "YM"] as const
