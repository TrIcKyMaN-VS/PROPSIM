"use client"

import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlaybookDialog } from "@/components/app/playbook-dialog"
import { BookOpen, TrendingUp, Target, Activity, Layers, Sparkles } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const GRADE_STYLES: Record<string, string> = {
  "A+": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]",
  "A":  "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]",
  "B":  "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.2)]",
  "C":  "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
  "F":  "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]",
  "Unrated": "bg-muted/40 text-muted-foreground border-border/60",
}

export default function PlaybooksPage() {
  const playbooks = (usePropStore((s) => s.playbooks) || []).filter(p => !p.deletedAt)

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Playbook OS</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              STRATEGY ARCHITECTURE
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your trading setups, execution rules, and institutional strategy playbooks.
          </p>
        </div>

        <PlaybookDialog />
      </div>

      {/* Playbooks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {playbooks.map((pb) => {
          const trades = pb.trades || []
          const winRate = trades.length ? (trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100 : 0
          const netPnl = trades.reduce((sum: number, t: any) => sum + t.pnl, 0)
          
          let grade = "Unrated"
          if (trades.length >= 10) {
            grade = winRate > 65 ? "A+" : winRate > 55 ? "A" : winRate > 45 ? "B" : winRate > 35 ? "C" : "F"
          }

          return (
            <Link href={`/app/playbooks/${pb.id}`} key={pb.id}>
              <Card className="bg-card/60 backdrop-blur-xl border-border/80 hover:border-primary/50 transition-all duration-200 cursor-pointer h-full shadow-xl flex flex-col justify-between group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{pb.name}</CardTitle>
                      <CardDescription className="text-xs font-mono mt-0.5">{pb.category} · {pb.marketCondition}</CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("font-mono text-xs font-bold border", GRADE_STYLES[grade])}>
                      {grade === "Unrated" ? "Unrated" : `${grade} Grade`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 font-mono text-xs">
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3 text-cyan-400" /> Win Rate
                      </div>
                      <div className="font-extrabold text-foreground text-sm mt-0.5">{trades.length > 0 ? `${winRate.toFixed(1)}%` : "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> Net P&amp;L
                      </div>
                      <div className={cn("font-black text-sm mt-0.5", netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        ${netPnl.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    <Badge variant="outline" className="bg-muted/40 font-bold">{pb.instrument}</Badge>
                    <Badge variant="outline" className="bg-muted/40">{pb.session}</Badge>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{trades.length} Trades</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {playbooks.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/40 backdrop-blur-xl space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground">No playbooks found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create your first institutional setup playbook to track execution performance.</p>
            <div className="pt-2">
              <PlaybookDialog />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
