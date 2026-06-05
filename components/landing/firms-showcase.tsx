import Link from "next/link"
import { FIRMS } from "@/lib/firms"
import { ArrowRight } from "lucide-react"

export function FirmsShowcase() {
  return (
    <section className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Firm coverage</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Every major prop firm, modeled rule-for-rule
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            We translate each firm&apos;s evaluation into a precise rule set: drawdown type, profit targets, consistency
            caps, and payout schedules. Pick one and start simulating in seconds.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FIRMS.map((firm) => (
            <Link
              key={firm.id}
              href="/app/firms"
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
              >
                {firm.shortName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{firm.name}</div>
                <div className="text-xs capitalize text-muted-foreground">{firm.drawdownType} drawdown</div>
              </div>
              <div className="mt-auto flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                View rules <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
