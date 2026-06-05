import { cn } from "@/lib/utils"

export function RuleMeter({
  label,
  value,
  pct,
  tone = "default",
  hint,
}: {
  label: string
  value: string
  pct: number
  tone?: "default" | "success" | "warning" | "destructive"
  hint?: string
}) {
  const barColor = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
