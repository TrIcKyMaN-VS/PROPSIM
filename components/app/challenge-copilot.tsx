"use client"

import { usePropStore } from "@/lib/store"
import { evaluate } from "@/lib/rule-engine"
import { AlertTriangle, Info, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

export function ChallengeCopilot() {
  const accounts = usePropStore(s => s.accounts)
  const activeId = usePropStore(s => s.activeAccountId)
  const allTrades = usePropStore(s => s.trades)
  
  const [warnings, setWarnings] = useState<{ id: string, msg: string, level: "info" | "warn" | "critical" }[]>([])

  useEffect(() => {
    const account = accounts.find(a => a.id === activeId)
    if (!account) return

    const trades = allTrades.filter(t => t.accountId === account.id)
    const status = evaluate(account.rules, trades)

    const newWarnings: typeof warnings = []

    // 1. Drawdown Warning
    if (status.drawdownUsedPct > 80 && status.drawdownUsedPct < 100) {
      newWarnings.push({ id: "dd", msg: "CRITICAL: You are very close to violating your max drawdown rule. One more full loss will fail the challenge.", level: "critical" })
    } else if (status.drawdownUsedPct > 60) {
      newWarnings.push({ id: "dd_warn", msg: "WARNING: You have used over 60% of your drawdown buffer. Reduce position size.", level: "warn" })
    }

    // 2. Daily Loss Warning
    if (status.dailyLossUsedPct > 80 && status.dailyLossUsedPct < 100) {
      newWarnings.push({ id: "dl", msg: "CRITICAL: You are nearing your daily loss limit. Consider stepping away for the day.", level: "critical" })
    }

    // 3. Profit Target
    if (status.profitTargetProgress > 80 && status.profitTargetProgress < 100) {
      newWarnings.push({ id: "pt", msg: `INFO: Profit target is ${status.profitTargetProgress.toFixed(0)}% complete. Play good defense.`, level: "info" })
    }

    // 4. Overleveraging
    if (account.rules.maxContracts > 0 && status.contractUsagePct > 80) {
      newWarnings.push({ id: "mc", msg: "WARNING: High contract usage detected. Ensure you don't breach your scaling plan.", level: "warn" })
    }

    setWarnings(newWarnings)
  }, [accounts, activeId, allTrades])

  if (warnings.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-[320px]">
      <AnimatePresence>
        {warnings.map(w => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-xl border shadow-lg flex gap-3 ${
              w.level === "critical" ? "bg-destructive/10 border-destructive text-destructive" :
              w.level === "warn" ? "bg-warning/10 border-warning text-warning-foreground" :
              "bg-card border-primary/20 text-foreground"
            }`}
          >
            {w.level === "critical" ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : 
             w.level === "warn" ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> :
             <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary" />}
            <div className="text-sm font-medium leading-tight">{w.msg}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
