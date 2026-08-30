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
    success: "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    warning: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]",
    destructive: "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]",
  }[tone]

  const borderTone = {
    default: "border-border/60 hover:border-primary/40",
    success: "border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.06)]",
    warning: "border-amber-500/20 hover:border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]",
    destructive: "border-rose-500/20 hover:border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.06)]",
  }[tone]

  const iconTone = {
    default: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    destructive: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  }[tone]

  return (
    <AnimatedCard delay={delay} className={cn("relative group rounded-xl border bg-card/60 backdrop-blur-xl p-4 transition-all duration-300", borderTone)}>
      {/* HUD Corner Accent */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/30 rounded-tr-sm group-hover:border-primary transition-colors" />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
        {Icon && (
          <div className={cn("p-1.5 rounded-lg border text-xs", iconTone)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className={cn("mt-2 text-2xl font-black tracking-tight tabular-nums font-mono", toneClass)}>
        {rawNumber !== undefined ? (
          <AnimatedNumber value={rawNumber} format={formatNumber} enableFlash />
        ) : (
          value
        )}
      </div>

      {sub && <div className="mt-1 text-xs font-medium text-muted-foreground/80 flex items-center gap-1">{sub}</div>}
    </AnimatedCard>
  )
}
