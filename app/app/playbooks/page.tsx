"use client"

import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlaybookDialog } from "@/components/app/playbook-dialog"
import { BookOpen, TrendingUp, Target, Activity } from "lucide-react"
import Link from "next/link"

export default function PlaybooksPage() {
  const playbooks = usePropStore((s) => s.playbooks) || []

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playbook OS</h1>
          <p className="text-muted-foreground">Manage your trading setups and institutional playbooks.</p>
        </div>
        <PlaybookDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {playbooks.map((pb) => {
          // Calculate basic stats for this playbook
          const trades = pb.trades || []
          const winRate = trades.length ? (trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100 : 0
          const netPnl = trades.reduce((sum: number, t: any) => sum + t.pnl, 0)
          
          let grade = "Unrated"
          if (trades.length >= 10) {
            grade = winRate > 65 ? "A+" : winRate > 55 ? "A" : winRate > 45 ? "B" : winRate > 35 ? "C" : "F"
          }

          return (
            <Link href={`/app/playbooks/${pb.id}`} key={pb.id}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{pb.name}</CardTitle>
                      <CardDescription>{pb.category} · {pb.marketCondition}</CardDescription>
                    </div>
                    <Badge variant={grade === "A+" || grade === "A" ? "default" : grade === "F" ? "destructive" : "secondary"}>
                      {grade === "Unrated" ? "Unrated" : `${grade} Grade`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-muted-foreground mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Win Rate</div>
                      <div className="font-medium">{trades.length > 0 ? `${winRate.toFixed(1)}%` : "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Net P&L</div>
                      <div className={`font-medium ${netPnl > 0 ? "text-success" : netPnl < 0 ? "text-destructive" : ""}`}>
                        ${netPnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <Badge variant="outline">{pb.instrument}</Badge>
                    <Badge variant="outline">{pb.session}</Badge>
                    <Badge variant="outline">{trades.length} Trades</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {playbooks.length === 0 && (
          <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No playbooks found</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first institutional playbook to track your setups.</p>
            <PlaybookDialog />
          </div>
        )}
      </div>
    </div>
  )
}
