import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Test the waters with a single account simulation.",
    features: ["1 active simulation", "All firm rule sets", "Manual trade entry", "Basic drawdown tracking"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Trader",
    price: "$19",
    period: "/month",
    desc: "For serious traders prepping multiple evaluations.",
    features: [
      "Unlimited simulations",
      "CSV trade import",
      "Full analytics suite",
      "Firm comparison engine",
      "AI strategy coach",
      "Trade journal",
    ],
    cta: "Start 7-day trial",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    desc: "For funded traders managing a portfolio of accounts.",
    features: [
      "Everything in Trader",
      "Multi-account portfolio view",
      "Payout & consistency planner",
      "Monte Carlo risk modeling",
      "Priority AI coaching",
      "Export reports",
    ],
    cta: "Go Pro",
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Cheaper than a single failed evaluation
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            The average trader blows three evals before passing. That&apos;s over $500 gone. PROPSIM costs less than one.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                tier.highlight ? "border-primary bg-card shadow-lg shadow-primary/10" : "border-border bg-card/50",
              )}
            >
              {tier.highlight && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tier.desc}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={tier.highlight ? "default" : "outline"}
                className="mt-8 w-full"
              >
                <Link href="/app">{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
