"use client"

import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AccountSwitcher() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const setActive = usePropStore((s) => s.setActive)
  const trades = usePropStore((s) => s.trades)
  const router = useRouter()

  const active = accounts.find((a) => a.id === activeId)
  const activeFirm = active ? getFirm(active.firmId) : undefined

  // Calculate active account stats
  let activePnl = 0
  let activeBalance = 0
  if (active && activeFirm) {
    const accTrades = trades.filter(t => t.accountId === active.id)
    activePnl = accTrades.reduce((sum, t) => sum + t.pnl, 0)
    const size = activeFirm.sizes.find(s => s.label === active.sizeLabel)
    activeBalance = (size?.value || 0) + activePnl
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary">
        {activeFirm ? (
          <>
            <span
              className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold"
              style={{ backgroundColor: `${activeFirm.color}1a`, color: activeFirm.color }}
            >
              {activeFirm.shortName.slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col items-start leading-none gap-1">
              <span className="font-bold">
                {activeFirm.shortName} <span className="text-muted-foreground font-normal">{active!.sizeLabel}</span>
                <span className={`ml-2 text-[9px] font-bold px-1 rounded-sm uppercase ${active!.challengeType === "CUSTOM" ? "bg-amber-500/15 text-amber-500 border border-amber-500/25" : "bg-blue-600/15 text-blue-500 border border-blue-500/25"}`}>
                  {active!.challengeType === "CUSTOM" ? "CUSTOM" : "OFFICIAL"}
                </span>
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">Bal: <span className="font-medium text-foreground">${activeBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></span>
                <span className={activePnl >= 0 ? "text-success" : "text-destructive"}>
                  {activePnl >= 0 ? "+" : ""}${activePnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">No active account</span>
        )}
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-2" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-68">
        {accounts.map((acc) => {
          const firm = getFirm(acc.firmId)!
          const accTrades = trades.filter(t => t.accountId === acc.id)
          const pnl = accTrades.reduce((sum, t) => sum + t.pnl, 0)
          const size = firm.sizes.find(s => s.label === acc.sizeLabel)
          const bal = (size?.value || 0) + pnl
          const cType = acc.challengeType || "OFFICIAL"

          return (
            <DropdownMenuItem key={acc.id} onClick={() => setActive(acc.id)} className="gap-3 py-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold shrink-0"
                style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
              >
                {firm.shortName.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex flex-col flex-1 leading-tight gap-0.5">
                <span className="font-bold flex items-center">
                  {firm.shortName} <span className="text-muted-foreground font-normal ml-1">{acc.sizeLabel}</span>
                  <span className={`ml-2 text-[9px] font-bold px-1 rounded-sm uppercase ${cType === "CUSTOM" ? "bg-amber-500/15 text-amber-500 border border-amber-500/25" : "bg-blue-600/15 text-blue-500 border border-blue-500/25"}`}>
                    {cType === "CUSTOM" ? "CUSTOM" : "OFFICIAL"}
                  </span>
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">${bal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  <span className={pnl >= 0 ? "text-success" : "text-destructive"}>
                    {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </span>
                </div>
              </div>
              {acc.id === activeId && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/app/new')} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          New challenge
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
