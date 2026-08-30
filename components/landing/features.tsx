"use client"

import { motion } from "framer-motion"
import { Gauge, Brain, BarChart3, NotebookPen, GitCompareArrows, ShieldAlert } from "lucide-react"

const features = [
  {
    icon: Gauge,
    title: "Challenge Simulator",
    desc: "Run any firm's evaluation with a real-time rule engine tracking balance, drawdown, daily loss, and profit targets.",
  },
  {
    icon: Brain,
    title: "AI Coach",
    desc: "Surface behavioral leaks, session-based losses, overtrading and risk mistakes with actionable recommendations.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Win rate, profit factor, expectancy, Sharpe, risk of ruin, and equity curves — the full performance picture.",
  },
  {
    icon: NotebookPen,
    title: "Trade Journal",
    desc: "Log trades with instrument, direction, risk, reward, tags and notes. Import CSVs from Tradovate, NinjaTrader & more.",
  },
  {
    icon: GitCompareArrows,
    title: "Firm Comparison",
    desc: "Compare up to four firms side by side across targets, drawdown style, contracts, consistency, cost and difficulty.",
  },
  {
    icon: ShieldAlert,
    title: "Rule Violation Detection",
    desc: "Trailing drawdown, daily loss, consistency and contract breaches are flagged the moment they happen.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Everything you need to get funded</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            A full evaluation, analytics, and trader development platform
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            VSX isn't a trading platform. It's the simulator, evaluator, and coach that prepares
            you to pass — and stay funded.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
