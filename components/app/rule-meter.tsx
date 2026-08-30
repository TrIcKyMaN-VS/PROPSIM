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
  const barGradient = {
    default: "bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]",
    success: "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    warning: "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    destructive: "bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]",
  }[tone]

  const borderTone = {
    default: "border-border/60 hover:border-primary/40",
    success: "border-emerald-500/20 hover:border-emerald-500/40",
    warning: "border-amber-500/20 hover:border-amber-500/40",
    destructive: "border-rose-500/20 hover:border-rose-500/40",
  }[tone]

  const safePct = Math.max(0, Math.min(100, pct))

  return (
    <div className={cn("rounded-xl border bg-card/60 backdrop-blur-xl p-4 transition-all duration-300", borderTone)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono">{label}</span>
        <span className="text-xs font-bold tabular-nums font-mono text-muted-foreground">{value}</span>
      </div>
      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-muted/60 border border-border/40">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barGradient)}
          style={{ width: `${safePct}%` }}
        />
      </div>
      {hint && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{hint}</span>
          <span className="font-mono font-bold text-foreground/90">{safePct.toFixed(0)}% used</span>
        </div>
      )}
    </div>
  )
}
