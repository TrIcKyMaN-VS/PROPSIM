import Link from "next/link"
import type { PropFirm } from "@/lib/types"
import { fmtCurrency } from "@/lib/format"
import { ArrowUpRight } from "lucide-react"

const diffColor: Record<string, string> = {
  Easy: "text-success",
  Moderate: "text-warning",
  Advanced: "text-destructive",
  Expert: "text-destructive",
}

export function FirmCard({ firm }: { firm: PropFirm }) {
  const cheapest = firm.sizes.reduce((m, s) => Math.min(m, s.price), Infinity)
  const sample = firm.sizes.find((s) => s.label === "50K") ?? firm.sizes[0]

  return (
    <Link
      href={`/app/firms/${firm.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
          >
            {firm.shortName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{firm.name}</div>
            <div className="text-xs capitalize text-muted-foreground">{firm.drawdownType} drawdown</div>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{firm.tagline}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
        <div>
          <div className={`text-sm font-semibold ${diffColor[firm.difficulty]}`}>{firm.difficulty}</div>
          <div className="text-[11px] text-muted-foreground">Difficulty</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{firm.successRate}%</div>
          <div className="text-[11px] text-muted-foreground">Pass rate</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{fmtCurrency(cheapest)}</div>
          <div className="text-[11px] text-muted-foreground">From</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {firm.challengeTypes.slice(0, 3).map((t) => (
          <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
            {t}
          </span>
        ))}
      </div>

      {sample && (
        <div className="mt-4 text-xs text-muted-foreground">
          50K target {fmtCurrency(sample.rules.profitTarget)} · DD {fmtCurrency(sample.rules.maxDrawdown)}
        </div>
      )}
    </Link>
  )
}
