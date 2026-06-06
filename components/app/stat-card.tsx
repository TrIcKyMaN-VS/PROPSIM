import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { AnimatedCard } from "./animated-ui"
import { AnimatedNumber } from "./animated-number"

export function StatCard({
  label,
  value,
  rawNumber,
  formatNumber,
  sub,
  icon: Icon,
  tone = "default",
  delay = 0,
}: {
  label: string
  value?: string
  rawNumber?: number
  formatNumber?: (val: number) => string
  sub?: string
  icon?: LucideIcon
  tone?: "default" | "success" | "warning" | "destructive"
  delay?: number
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone]

  return (
    <AnimatedCard delay={delay} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass)}>
        {rawNumber !== undefined ? (
          <AnimatedNumber value={rawNumber} format={formatNumber} enableFlash />
        ) : (
          value
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </AnimatedCard>
  )
}
