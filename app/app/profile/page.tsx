"use client"

import { useSession } from "next-auth/react"
import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Shield, TrendingUp, Target, Brain, Award, Calendar, Activity, Zap } from "lucide-react"

export default function ProfilePage() {
  const { data: session } = useSession()
  const trades = usePropStore(s => s.trades)
  const accounts = usePropStore(s => s.accounts)
  const psychology = usePropStore(s => s.tradePsychology)

  if (!session?.user) return null
  const user = session.user as any

  // Personal
  const joinDate = "October 2023" // Mocked until we fetch from DB or add to JWT
  
  // Trading Stats
  const totalTrades = trades.length
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const wins = trades.filter(t => t.pnl > 0)
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0
  const grossWin = wins.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0)
  
  // Average RR (estimated)
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0
  const avgLoss = (totalTrades - wins.length) > 0 ? grossLoss / (totalTrades - wins.length) : 0
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0

  // Psychology Stats
  const totalPsy = psychology.length
  const ruleBreaks = psychology.filter(p => p.brokeRules).length
  const disciplineScore = totalPsy > 0 ? 100 - ((ruleBreaks / totalPsy) * 100) : 100
  const emotionTrades = psychology.filter(p => p.emotionAffected).length
  const psyScore = totalPsy > 0 ? 100 - ((emotionTrades / totalPsy) * 100) : 100

  // Challenge Stats
  const passed = accounts.filter(a => a.status === "passed").length
  const failed = accounts.filter(a => a.status === "failed").length
  const active = accounts.filter(a => a.status === "active").length
  const completed = passed + failed
  const passRate = completed > 0 ? (passed / completed) * 100 : 0

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trader Profile</h1>
        <p className="text-muted-foreground">Macro-level overview of your career performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Personal Info Card */}
        <Card className="col-span-1 border-primary/20 bg-gradient-to-b from-card to-card/50">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {user.name ? user.name.slice(0,2).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">{user.plan || "FREE"} PLAN</Badge>
              {user.role === "ADMIN" && <Badge variant="destructive">ADMIN</Badge>}
            </div>
            <div className="w-full pt-4 border-t flex justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> Member Since</span>
              <span className="font-medium text-foreground">{joinDate}</span>
            </div>
          </CardContent>
        </Card>

        {/* High Level Stats */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary"/> Total PnL</CardTitle></CardHeader>
            <CardContent><div className={`text-3xl font-bold ${totalPnl >= 0 ? "text-success" : "text-destructive"}`}>${totalPnl.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><Target className="w-4 h-4 text-primary"/> Win Rate</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{winRate.toFixed(1)}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><Shield className="w-4 h-4 text-primary"/> Pass Rate</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{passRate.toFixed(1)}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2"><Brain className="w-4 h-4 text-primary"/> Discipline</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{disciplineScore.toFixed(0)} / 100</div></CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary"/> Trading Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Total Trades</span>
              <span className="font-bold">{totalTrades}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Profit Factor</span>
              <span className="font-bold">{profitFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Average R:R</span>
              <span className="font-bold">1:{avgRR.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-muted-foreground">Best Setup</span>
              <span className="font-bold text-primary">A+ Breakout</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary"/> Psychology Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Discipline Score</span>
              <span className="font-bold">{disciplineScore.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Psychology Score</span>
              <span className="font-bold">{psyScore.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Rule Violations</span>
              <span className="font-bold text-destructive">{ruleBreaks}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-muted-foreground">Emotion Driven</span>
              <span className="font-bold text-warning">{emotionTrades}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary"/> Challenge Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Active Challenges</span>
              <span className="font-bold">{active}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Challenges Passed</span>
              <span className="font-bold text-success">{passed}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Challenges Failed</span>
              <span className="font-bold text-destructive">{failed}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-muted-foreground">Total Attempted</span>
              <span className="font-bold">{completed + active}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="achievements">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary"/> Career Achievements</CardTitle>
          <CardDescription>Badges earned throughout your trading journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Dynamic Badges based on actual stats */}
            <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${totalTrades >= 1 ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-dashed opacity-50 grayscale'}`}>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Zap className="w-6 h-6"/></div>
              <div className="font-bold text-sm">First Trade</div>
              <div className="text-xs text-muted-foreground">Execute a trade</div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${totalTrades >= 100 ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-dashed opacity-50 grayscale'}`}>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Activity className="w-6 h-6"/></div>
              <div className="font-bold text-sm">Centurion</div>
              <div className="text-xs text-muted-foreground">100 trades logged</div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${passed >= 1 ? 'bg-success/5 border-success/30' : 'bg-muted/30 border-dashed opacity-50 grayscale'}`}>
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center text-success"><Shield className="w-6 h-6"/></div>
              <div className="font-bold text-sm">Funded Trader</div>
              <div className="text-xs text-muted-foreground">Pass a challenge</div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${disciplineScore >= 95 && totalTrades > 10 ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-dashed opacity-50 grayscale'}`}>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Brain className="w-6 h-6"/></div>
              <div className="font-bold text-sm">Iron Mind</div>
              <div className="text-xs text-muted-foreground">95%+ Discipline</div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${totalPnl >= 10000 ? 'bg-success/5 border-success/30' : 'bg-muted/30 border-dashed opacity-50 grayscale'}`}>
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center text-success"><TrendingUp className="w-6 h-6"/></div>
              <div className="font-bold text-sm">5-Figures</div>
              <div className="text-xs text-muted-foreground">$10k+ Lifetime PnL</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
