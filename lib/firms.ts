import type { ChallengeSize, PropFirm } from "./types"

// MANUAL REVIEW REQUIRED comments indicate parameters that were flagged in the audit
// but kept as legacy/defaults to avoid unauthorized database modification.

export const FIRMS: PropFirm[] = [
  {
    id: "apex",
    name: "Apex Trader Funding",
    shortName: "Apex",
    tagline: "Trailing threshold, no daily loss limit, fast payouts.",
    color: "#3b82f6",
    drawdownType: "eod",
    difficulty: "Moderate",
    difficultyScore: 58,
    successRate: 11,
    payoutSpeed: "Same day",
    challengeTypes: ["1-Step Eval", "Static accounts"],
    pros: ["No daily loss limit", "Fast same-day payouts", "Frequent discounts", "Generous contract sizing"],
    cons: ["Trailing drawdown is unforgiving", "50% consistency rule on payouts", "Activation fees on PA"],
    sizes: [
      {
        label: "25K",
        price: 147,
        rules: {
          startingBalance: 25000,
          // MANUAL REVIEW REQUIRED: New program has no profit target, replaced by one-time fee.
          profitTarget: 1500,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Trailing EOD drawdown floor locks at start balance + $100.
          maxDrawdown: 1250,
          drawdownType: "eod",
          maxContracts: 4,
          minTradingDays: 1,
          consistencyPct: 50,
        },
      },
      {
        label: "50K",
        price: 167,
        rules: {
          startingBalance: 50000,
          // MANUAL REVIEW REQUIRED: New program has no profit target, replaced by one-time fee.
          profitTarget: 3000,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Trailing EOD drawdown floor locks at start balance + $100.
          maxDrawdown: 2500,
          drawdownType: "eod",
          maxContracts: 10,
          minTradingDays: 1,
          consistencyPct: 50,
        },
      },
      {
        label: "100K",
        price: 207,
        rules: {
          startingBalance: 100000,
          // MANUAL REVIEW REQUIRED: New program has no profit target, replaced by one-time fee.
          profitTarget: 6000,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Trailing EOD drawdown floor locks at start balance + $100.
          maxDrawdown: 5000,
          drawdownType: "eod",
          maxContracts: 14,
          minTradingDays: 1,
          consistencyPct: 50,
        },
      },
      {
        label: "150K",
        price: 297,
        rules: {
          startingBalance: 150000,
          // MANUAL REVIEW REQUIRED: New program has no profit target, replaced by one-time fee.
          profitTarget: 9000,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Trailing EOD drawdown floor locks at start balance + $100.
          maxDrawdown: 7500,
          drawdownType: "eod",
          maxContracts: 17,
          minTradingDays: 1,
          consistencyPct: 50,
        },
      },
      // MANUAL REVIEW REQUIRED: 75K size not added yet due to lack of confirmed specs.
      // DEPRECATED sizes: 300K (and 250K) removed as of March 2026 update.
    ],
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
    sizes: [
      // DEPRECATED sizes: 25K plan discontinued.
      {
        label: "50K",
        price: 165,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 0, // No daily loss limit on Combine/XFA (only Live has DLL)
          maxDrawdown: 2000, // EOD trailing, locks at start balance
          drawdownType: "eod",
          maxContracts: 5,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
      {
        label: "100K",
        price: 325,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 0,
          maxDrawdown: 3000, // EOD trailing, locks at start balance
          drawdownType: "eod",
          maxContracts: 10,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
      {
        label: "150K",
        price: 375,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 0,
          maxDrawdown: 4500, // EOD trailing, locks at start balance
          drawdownType: "eod",
          maxContracts: 15,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
    ],
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
    pros: ["Multiple plan styles", "No-trailing options", "Fast payouts", "2-day minimum on Rapid plans"],
    cons: ["Consistency rule on Expert", "Activation fees", "Plan rules vary widely"],
    sizes: [
      {
        label: "25K",
        price: 145,
        rules: {
          startingBalance: 25000,
          profitTarget: 1500,
          dailyLossLimit: 0, // None on Rapid eval
          maxDrawdown: 1000,
          drawdownType: "eod",
          maxContracts: 3,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
      {
        label: "50K",
        price: 165,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 0,
          maxDrawdown: 2000,
          drawdownType: "eod",
          maxContracts: 5,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
      {
        label: "100K",
        price: 265,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 0,
          maxDrawdown: 3000,
          drawdownType: "eod",
          maxContracts: 10,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
      {
        label: "150K",
        price: 375,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 0,
          maxDrawdown: 4500,
          drawdownType: "eod",
          maxContracts: 15,
          minTradingDays: 2,
          consistencyPct: 50,
        },
      },
    ],
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
    pros: ["Transparent rule set", "Regulated broker (Ironbeam)", "30% consistency rule", "Keep first $10k 100%"],
    cons: ["Trailing intraday drawdown", "Tighter daily loss", "Smaller contract sizing"],
    sizes: [
      // DEPRECATED sizes: 25K plan discontinued.
      {
        label: "50K",
        price: 165,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 1100, // EOD daily loss limit
          maxDrawdown: 2000,
          drawdownType: "trailing",
          maxContracts: 5,
          minTradingDays: 5,
          consistencyPct: 30,
        },
      },
      {
        label: "100K",
        price: 275,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 2200,
          maxDrawdown: 3000,
          drawdownType: "trailing",
          maxContracts: 10,
          minTradingDays: 5,
          consistencyPct: 30,
        },
      },
      {
        label: "150K",
        price: 375,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 2200, // Implied max EOD DLL from $1100-$2200 range
          maxDrawdown: 4500,
          drawdownType: "trailing",
          maxContracts: 15,
          minTradingDays: 5,
          consistencyPct: 30,
        },
      },
    ],
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
    cons: ["No daily loss limit", "Activation fee", "Lower scaling"],
    sizes: [
      {
        label: "25K",
        price: 150,
        rules: {
          startingBalance: 25000,
          profitTarget: 1500,
          dailyLossLimit: 0, // TPT explicitly removed daily loss limits
          // MANUAL REVIEW REQUIRED: Community report says $1,100 drawdown. Kept legacy $1,000.
          maxDrawdown: 1000,
          drawdownType: "eod",
          maxContracts: 3,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      {
        label: "50K",
        price: 170,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Community report says $2,200 drawdown. Kept legacy $2,000.
          maxDrawdown: 2000,
          drawdownType: "eod",
          maxContracts: 6,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      {
        label: "100K",
        price: 250,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 0,
          maxDrawdown: 4000,
          drawdownType: "eod",
          maxContracts: 12,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      {
        label: "150K",
        price: 360,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Community report says $5,500 drawdown. Kept legacy $6,000.
          maxDrawdown: 6000,
          drawdownType: "eod",
          maxContracts: 15,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      // MANUAL REVIEW REQUIRED: 75K size not added yet due to lack of verified specs.
    ],
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
    sizes: [
      {
        label: "25K",
        price: 115,
        rules: {
          startingBalance: 25000,
          // MANUAL REVIEW REQUIRED: Implied 100% target to pass qualification. Kept legacy $1,500.
          profitTarget: 1500,
          dailyLossLimit: 0,
          maxDrawdown: 1500,
          drawdownType: "trailing",
          maxContracts: 4,
          minTradingDays: 10,
          consistencyPct: 40,
        },
      },
      {
        label: "50K",
        price: 145,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 0,
          maxDrawdown: 2500,
          drawdownType: "trailing",
          maxContracts: 10,
          minTradingDays: 10,
          consistencyPct: 40,
        },
      },
      {
        label: "100K",
        price: 175,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 0,
          maxDrawdown: 3000,
          drawdownType: "trailing",
          maxContracts: 14,
          minTradingDays: 10,
          consistencyPct: 40,
        },
      },
      {
        label: "150K",
        price: 285,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 0,
          maxDrawdown: 4500,
          drawdownType: "trailing",
          maxContracts: 17,
          minTradingDays: 10,
          consistencyPct: 40,
        },
      },
      // MANUAL REVIEW REQUIRED: 10K and 250K sizes not added yet due to lack of verified specs.
    ],
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
    sizes: [
      {
        label: "25K",
        price: 125,
        rules: {
          startingBalance: 25000,
          // MANUAL REVIEW REQUIRED: Audit reports 10% target. Kept legacy 5% ($1,250).
          profitTarget: 1250,
          dailyLossLimit: 0,
          // MANUAL REVIEW REQUIRED: Static plan fixed drawdown. Kept legacy $625.
          maxDrawdown: 625,
          drawdownType: "static",
          // MANUAL REVIEW REQUIRED: Audit reports 1 mini contract. Kept legacy 4.
          maxContracts: 4,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      {
        label: "50K",
        price: 150,
        rules: {
          startingBalance: 50000,
          // MANUAL REVIEW REQUIRED: Audit reports 10% target. Kept legacy 5% ($2,500).
          profitTarget: 2500,
          dailyLossLimit: 0,
          maxDrawdown: 1250,
          drawdownType: "static",
          // MANUAL REVIEW REQUIRED: Audit reports 2 mini contracts. Kept legacy 8.
          maxContracts: 8,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      {
        label: "100K",
        price: 190,
        rules: {
          startingBalance: 100000,
          profitTarget: 5000,
          dailyLossLimit: 0,
          maxDrawdown: 2500,
          drawdownType: "static",
          // MANUAL REVIEW REQUIRED: Audit reports 4 mini contracts. Kept legacy 12.
          maxContracts: 12,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      {
        label: "150K",
        price: 280,
        rules: {
          startingBalance: 150000,
          profitTarget: 7500,
          dailyLossLimit: 0,
          maxDrawdown: 3750,
          drawdownType: "static",
          // MANUAL REVIEW REQUIRED: Audit reports 6 mini contracts. Kept legacy 15.
          maxContracts: 15,
          minTradingDays: 5,
          consistencyPct: 0,
        },
      },
      // DEPRECATED sizes: 300K removed.
      // MANUAL REVIEW REQUIRED: 10K and 250K sizes not added yet due to lack of verified specs.
    ],
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
    sizes: [
      {
        label: "25K",
        price: 140,
        rules: {
          startingBalance: 25000,
          // MANUAL REVIEW REQUIRED: Audit reports 15% target ($3,750). Kept legacy 6% ($1,500).
          profitTarget: 1500,
          // MANUAL REVIEW REQUIRED: FLEX has DLL, PRO has none. Kept legacy $500.
          dailyLossLimit: 500,
          maxDrawdown: 2500, // EOD trailing = 10% of account
          drawdownType: "eod",
          // MANUAL REVIEW REQUIRED: Flex has 2 minis limit. Kept legacy 2.
          maxContracts: 2,
          minTradingDays: 5,
          consistencyPct: 40,
        },
      },
      {
        label: "50K",
        price: 160,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 1000,
          maxDrawdown: 5000, // EOD trailing = 10% of account
          drawdownType: "eod",
          maxContracts: 5,
          minTradingDays: 5,
          consistencyPct: 40,
        },
      },
      {
        label: "100K",
        price: 270,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 2000,
          maxDrawdown: 10000, // EOD trailing = 10% of account
          drawdownType: "eod",
          maxContracts: 10,
          minTradingDays: 5,
          consistencyPct: 40,
        },
      },
      {
        label: "150K",
        price: 365,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 3000,
          maxDrawdown: 15000, // EOD trailing = 10% of account
          drawdownType: "eod",
          maxContracts: 15,
          minTradingDays: 5,
          consistencyPct: 40,
        },
      },
    ],
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
    sizes: [
      // MANUAL REVIEW REQUIRED: The entire FFN config is unconfirmed. Kept legacy defaults.
      {
        label: "25K",
        price: 105,
        rules: {
          startingBalance: 25000,
          profitTarget: 1500,
          dailyLossLimit: 0,
          maxDrawdown: 1250,
          drawdownType: "trailing",
          maxContracts: 3,
          minTradingDays: 1,
          consistencyPct: 30,
        },
      },
      {
        label: "50K",
        price: 135,
        rules: {
          startingBalance: 50000,
          profitTarget: 3000,
          dailyLossLimit: 0,
          maxDrawdown: 2500,
          drawdownType: "trailing",
          maxContracts: 9,
          minTradingDays: 1,
          consistencyPct: 30,
        },
      },
      {
        label: "100K",
        price: 165,
        rules: {
          startingBalance: 100000,
          profitTarget: 6000,
          dailyLossLimit: 0,
          maxDrawdown: 5000,
          drawdownType: "trailing",
          maxContracts: 14,
          minTradingDays: 1,
          consistencyPct: 30,
        },
      },
      {
        label: "150K",
        price: 275,
        rules: {
          startingBalance: 150000,
          profitTarget: 9000,
          dailyLossLimit: 0,
          maxDrawdown: 7500,
          drawdownType: "trailing",
          maxContracts: 17,
          minTradingDays: 1,
          consistencyPct: 30,
        },
      },
    ],
  },
]

export function getFirm(id: string): PropFirm | undefined {
  return FIRMS.find((f) => f.id === id)
}

export const SESSIONS = ["Asia", "London", "New York AM", "New York PM"] as const
export const INSTRUMENTS = ["ES", "NQ", "MES", "MNQ", "CL", "GC", "MGC", "RTY", "YM"] as const

