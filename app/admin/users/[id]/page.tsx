import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Mail, CalendarDays, Activity, Target, Brain, TrendingUp, AlertTriangle, PlayCircle, Trophy, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AdminUserProfilePage({ params }: { params: { id: string } }) {
  // In a real app, fetch user data based on params.id
  // Mock data for this specific user
  const user = {
    id: params.id,
    name: params.id === "usr_1" ? "Vasanth" : "User " + params.id,
    email: params.id === "usr_1" ? "vasanth@example.com" : "user@example.com",
    plan: "PRO",
    role: "ADMIN",
    status: "Active",
    joined: "2023-10-15",
    stats: {
      totalTrades: 124,
      winRate: 68.5,
      profitFactor: 1.42,
      totalPnl: 14250.50,
      bestSetup: "Trend Pullback",
      activeChallenges: 1,
      passedChallenges: 2,
      failedChallenges: 1,
      psychScore: 92,
      disciplineScore: 88,
      consistencyScore: 94
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {user.name}
            {user.role === "ADMIN" && <Badge variant="destructive">ADMIN</Badge>}
            <Badge variant="outline" className="border-primary text-primary">{user.plan} PLAN</Badge>
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Joined {user.joined}</span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-success" /> {user.status}
            </span>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline">Edit User</Button>
          <Button variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-0">Suspend</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Trading Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Trading Performance</CardTitle>
            <CardDescription>All-time statistics across all connected firm accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total P&L</p>
                <p className="text-2xl font-bold text-success">${user.stats.totalPnl.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Win Rate</p>
                <p className="text-2xl font-bold">{user.stats.winRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Profit Factor</p>
                <p className="text-2xl font-bold">{user.stats.profitFactor}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Trades</p>
                <p className="text-2xl font-bold">{user.stats.totalTrades}</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Most Traded Setup</p>
                  <p className="text-xl font-bold text-primary mt-1">{user.stats.bestSetup}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-muted-foreground">Average Risk/Reward</p>
                  <p className="text-xl font-bold text-primary mt-1">1:2.4</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Psychology Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Psychology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold">Overall Psychology</span>
                <span className="font-bold text-success">{user.stats.psychScore}/100</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{width: `${user.stats.psychScore}%`}} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold">Discipline</span>
                <span className="font-bold text-success">{user.stats.disciplineScore}/100</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{width: `${user.stats.disciplineScore}%`}} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold">Consistency</span>
                <span className="font-bold text-success">{user.stats.consistencyScore}/100</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{width: `${user.stats.consistencyScore}%`}} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Challenge History */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Challenge History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.stats.activeChallenges}</p>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active</p>
                </div>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/5 p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.stats.passedChallenges}</p>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Passed</p>
                </div>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.stats.failedChallenges}</p>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Failed</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="p-4 flex items-center justify-between border-b bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-background">Active</Badge>
                  <span className="font-bold">Lucid Funding 100K Evaluation</span>
                </div>
                <span className="text-sm font-medium text-success">+$2,450.00</span>
              </div>
              <div className="p-4 flex items-center justify-between border-b bg-muted/50 opacity-60">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-background border-success text-success">Passed</Badge>
                  <span className="font-bold">Apex 50K Full</span>
                </div>
                <span className="text-sm font-medium text-success">+$3,100.00</span>
              </div>
              <div className="p-4 flex items-center justify-between bg-muted/50 opacity-60">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-background border-destructive text-destructive">Failed</Badge>
                  <span className="font-bold">Topstep 150K Combine</span>
                </div>
                <span className="text-sm font-medium text-destructive">Max Drawdown Hit</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
