"use client"

import { usePropStore } from "@/lib/store"
import { DollarSign, Percent } from "lucide-react"
import { cn } from "@/lib/utils"

export function PnlModeToggle() {
  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)
  const setPnlDisplayMode = usePropStore(s => s.setPnlDisplayMode)

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
      title="Toggle P&L display between currency ($) and percentage (%)"
    >
      <button
        id="pnl-mode-currency"
        onClick={() => setPnlDisplayMode("currency")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all",
          pnlDisplayMode === "currency"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
        aria-pressed={pnlDisplayMode === "currency"}
        aria-label="Show P&L in dollars"
      >
        <DollarSign className="h-3.5 w-3.5" />
      </button>
      <button
        id="pnl-mode-percentage"
        onClick={() => setPnlDisplayMode("percentage")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all",
          pnlDisplayMode === "percentage"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
        aria-pressed={pnlDisplayMode === "percentage"}
        aria-label="Show P&L as percentage"
      >
        <Percent className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
