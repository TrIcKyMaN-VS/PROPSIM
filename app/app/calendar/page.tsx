"use client"

import { usePropStore } from "@/lib/store"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  ChevronLeft, 
  ChevronRight, 
  BarChart, 
  Flame, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Award,
  Calendar as CalendarIcon
} from "lucide-react"
import { DailyReplaySheet } from "@/components/app/calendar/daily-replay-sheet"
import { fmtPnl, fmtCurrency } from "@/lib/format"
import { getISOWeekKey } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

export default function CalendarPage() {
  const router = useRouter()
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades)
  const routines = usePropStore(s => s.dailyPerformances)
  const psychology = usePropStore(s => s.tradePsychology)
  const displayTimeMode = usePropStore(s => s.displayTimeMode)
  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode)
  const accounts = usePropStore(s => s.accounts)
  const account = useMemo(() => accounts.find(a => a.id === activeAccountId), [accounts, activeAccountId])
  const accountBalance = account?.rules?.startingBalance ?? 100000

  const accountTrades = useMemo(() => trades.filter(t => t.accountId === activeAccountId), [trades, activeAccountId])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [overlay, setOverlay] = useState<"pnl" | "psychology" | "mistake">("pnl")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"calendar" | "heatmap">("calendar")

  // Generate calendar grid
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const monthName = currentDate.toLocaleString("default", { month: "long" })
  const year = currentDate.getFullYear()
  const monthStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

  const getLocalDateString = (d: Date | number) => {
    const date = new Date(d)
    if (displayTimeMode === "Exchange Time") {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
      const parts = formatter.formatToParts(date)
      const yr = parts.find(p => p.type === "year")?.value || ""
      const m = parts.find(p => p.type === "month")?.value || ""
      const day = parts.find(p => p.type === "day")?.value || ""
      return `${yr}-${m}-${day}`
    } else {
      const yr = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${yr}-${m}-${day}`
    }
  }

  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100

  // Calculate stats per day
  const dailyStats = useMemo(() => {
    const stats: Record<string, {
      pnl: number
      netR: number
      trades: number
      wins: number
      ruleBreaks: number
      emotionDriven: number
    }> = {}
    
    accountTrades.forEach(t => {
      const dateStr = getLocalDateString(t.timestamp)
      if (!stats[dateStr]) {
        stats[dateStr] = { pnl: 0, netR: 0, trades: 0, wins: 0, ruleBreaks: 0, emotionDriven: 0 }
      }
      stats[dateStr].pnl += t.pnl
      stats[dateStr].netR += (t.netR ?? (t.pnl / defaultPlannedRisk))
      stats[dateStr].trades += 1
      if (t.pnl > 0) stats[dateStr].wins += 1

      const p = psychology.find(x => x.tradeId === t.id)
      if (p?.brokeRules) stats[dateStr].ruleBreaks += 1
      if (p?.emotionAffected) stats[dateStr].emotionDriven += 1
    })
    return stats
  }, [accountTrades, psychology, defaultPlannedRisk, displayTimeMode])

  // Comprehensive Month Statistics
  const monthStats = useMemo(() => {
    let totalPnl = 0
    let totalNetR = 0
    let totalTrades = 0
    let winningTrades = 0
    let losingTrades = 0

    let grossProfit = 0
    let grossLoss = 0
    let winRSum = 0
    let lossRSum = 0

    let greenDays = 0
    let redDays = 0
    let breakevenDays = 0
    let activeDays = 0

    let ruleBreaks = 0
    let emotionDrivenTrades = 0

    let bestDay: { date: string; pnl: number; netR: number } | null = null
    let worstDay: { date: string; pnl: number; netR: number } | null = null

    const daysInCurMonth: { date: string; pnl: number; netR: number; trades: number; wins: number; ruleBreaks: number }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`
      const stat = dailyStats[dateStr]
      if (stat && stat.trades > 0) {
        activeDays++
        totalPnl += stat.pnl
        totalNetR += stat.netR
        totalTrades += stat.trades
        winningTrades += stat.wins
        losingTrades += (stat.trades - stat.wins)
        ruleBreaks += stat.ruleBreaks
        emotionDrivenTrades += stat.emotionDriven

        if (stat.pnl > 0) {
          greenDays++
        } else if (stat.pnl < 0) {
          redDays++
        } else {
          breakevenDays++
        }

        if (!bestDay || stat.pnl > bestDay.pnl) {
          bestDay = { date: dateStr, pnl: stat.pnl, netR: stat.netR }
        }
        if (!worstDay || stat.pnl < worstDay.pnl) {
          worstDay = { date: dateStr, pnl: stat.pnl, netR: stat.netR }
        }

        daysInCurMonth.push({ date: dateStr, ...stat })
      }
    }

    accountTrades.forEach(t => {
      const dStr = getLocalDateString(t.timestamp)
      if (dStr.startsWith(monthStr)) {
        const tradeR = t.netR ?? (t.pnl / defaultPlannedRisk)
        if (t.pnl > 0) {
          grossProfit += t.pnl
          winRSum += tradeR
        } else if (t.pnl < 0) {
          grossLoss += Math.abs(t.pnl)
          lossRSum += Math.abs(tradeR)
        }
      }
    })

    // Streaks inside this month
    let curWinningStreak = 0
    let maxWinningStreak = 0
    let curLosingStreak = 0
    let maxLosingStreak = 0

    daysInCurMonth.forEach(d => {
      if (d.pnl > 0) {
        curWinningStreak++
        curLosingStreak = 0
        if (curWinningStreak > maxWinningStreak) maxWinningStreak = curWinningStreak
      } else if (d.pnl < 0) {
        curLosingStreak++
        curWinningStreak = 0
        if (curLosingStreak > maxLosingStreak) maxLosingStreak = curLosingStreak
      } else {
        curWinningStreak = 0
        curLosingStreak = 0
      }
    })

    const tradeWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    const dayWinRate = activeDays > 0 ? (greenDays / activeDays) * 100 : 0
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.9 : 0)
    const avgWinR = winningTrades > 0 ? winRSum / winningTrades : 0
    const avgLossR = losingTrades > 0 ? lossRSum / losingTrades : 0
    const cleanDays = activeDays - daysInCurMonth.filter(d => d.ruleBreaks > 0).length
    const cleanDaysPct = activeDays > 0 ? Math.round((cleanDays / activeDays) * 100) : 100
    const returnPct = accountBalance > 0 ? (totalPnl / accountBalance) * 100 : 0

    return {
      monthStr,
      totalPnl,
      totalNetR,
      totalTrades,
      winningTrades,
      losingTrades,
      tradeWinRate,
      activeDays,
      greenDays,
      redDays,
      breakevenDays,
      dayWinRate,
      grossProfit,
      grossLoss,
      profitFactor,
      avgWinR,
      avgLossR,
      bestDay,
      worstDay,
      ruleBreaks,
      emotionDrivenTrades,
      cleanDaysPct,
      returnPct,
      curWinningStreak,
      maxWinningStreak,
      curLosingStreak,
      maxLosingStreak,
    }
  }, [currentDate, dailyStats, accountTrades, daysInMonth, monthStr, defaultPlannedRisk, accountBalance, displayTimeMode])

  const getDayAndHour = (timestampMs: number) => {
    const date = new Date(timestampMs)
    const timeZone = displayTimeMode === "Exchange Time" ? "America/New_York" : undefined
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      hour: "numeric",
      hour12: false
    })
    
    const parts = formatter.formatToParts(date)
    const weekday = parts.find(p => p.type === "weekday")?.value || ""
    const hourStr = parts.find(p => p.type === "hour")?.value || "0"
    const hour = parseInt(hourStr, 10)
    
    return { weekday, hour }
  }

  const heatmapData = useMemo(() => {
    const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    const matrix: Record<string, { pnl: number; count: number; netR: number }> = {}
    
    daysList.forEach(d => {
      hoursList.forEach(h => {
        matrix[`${d}-${h}`] = { pnl: 0, count: 0, netR: 0 }
      })
    })

    accountTrades.forEach(t => {
      const { weekday, hour } = getDayAndHour(t.timestamp)
      const key = `${weekday}-${hour}`
      if (matrix[key] !== undefined) {
        matrix[key].pnl += t.pnl
        matrix[key].netR += (t.netR ?? (t.pnl / defaultPlannedRisk))
        matrix[key].count += 1
      }
    })

    return matrix
  }, [accountTrades, defaultPlannedRisk, displayTimeMode])

  const getCellBgColor = (pnl: number, count: number) => {
    if (count === 0) return "bg-muted/5 border-muted/10 text-muted-foreground/30"
    if (pnl > 0) {
      if (pnl > 1000) return "bg-emerald-500/25 border-emerald-500/40 text-emerald-400 font-semibold"
      if (pnl > 500) return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    } else if (pnl < 0) {
      const absPnl = Math.abs(pnl)
      if (absPnl > 1000) return "bg-rose-500/25 border-rose-500/40 text-rose-400 font-semibold"
      if (absPnl > 500) return "bg-rose-500/15 border-rose-500/30 text-rose-400"
      return "bg-rose-500/10 border-rose-500/20 text-rose-400"
    }
    return "bg-muted/30 border-muted-foreground/20 text-muted-foreground"
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Calendar</h1>
          <p className="text-muted-foreground">Comprehensive daily execution, Net R analytics, and discipline tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "calendar" && (
            <select 
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={overlay}
              onChange={e => setOverlay(e.target.value as any)}
            >
              <option value="pnl">PnL Overlay</option>
              <option value="psychology">Psychology Overlay</option>
              <option value="mistake">Mistake & Discipline Overlay</option>
            </select>
          )}
          <Button 
            variant={viewMode === "heatmap" ? "default" : "outline"} 
            size="sm"
            onClick={() => setViewMode(viewMode === "calendar" ? "heatmap" : "calendar")}
            className="h-9"
          >
            <BarChart className="w-4 h-4 mr-2" /> 
            {viewMode === "heatmap" ? "Calendar View" : "Hourly Heatmap"}
          </Button>
        </div>
      </div>

      {/* 6-Card Executive Performance HUD */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Monthly Net Return (Hero) */}
        <Card className={`relative overflow-hidden border ${monthStats.totalNetR >= 0 ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-rose-500/30 bg-rose-500/[0.04]"}`}>
          <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" /> Net Return
            </CardTitle>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${monthStats.totalNetR >= 0 ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"}`}>
              Month
            </Badge>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className={`text-2xl font-black tracking-tight leading-none ${monthStats.totalNetR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {monthStats.totalNetR >= 0 ? "+" : ""}{monthStats.totalNetR.toFixed(2)} R
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold mt-1.5">
              <span className={monthStats.totalPnl >= 0 ? "text-emerald-400/90" : "text-rose-400/90"}>
                {fmtPnl(monthStats.totalPnl, pnlDisplayMode, accountBalance, { sign: true })}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground text-[11px]">
                {monthStats.returnPct >= 0 ? "+" : ""}{monthStats.returnPct.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Win Rates (Trade & Day) */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-500" /> Win Rates
            </CardTitle>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {monthStats.winningTrades}W / {monthStats.losingTrades}L
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {monthStats.totalTrades > 0 ? `${monthStats.tradeWinRate.toFixed(1)}%` : "--"}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">Trade</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
              <span>Day WR: <strong className="text-foreground">{monthStats.activeDays > 0 ? `${monthStats.dayWinRate.toFixed(0)}%` : "--"}</strong></span>
              <span>{monthStats.greenDays}G / {monthStats.redDays}R</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Profit Factor & RR */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-500" /> Profit Factor
            </CardTitle>
            <span className="text-[10px] font-semibold text-muted-foreground">Expectancy</span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {monthStats.grossLoss === 0 && monthStats.grossProfit > 0 ? "∞" : monthStats.profitFactor.toFixed(2)}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">PF</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
              <span className="text-emerald-400 font-medium">+{monthStats.avgWinR.toFixed(2)}R win</span>
              <span className="text-rose-400 font-medium">-{monthStats.avgLossR.toFixed(2)}R loss</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Best & Worst Days */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Best / Worst
            </CardTitle>
            <span className="text-[10px] font-semibold text-muted-foreground">Range</span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="flex items-center justify-between leading-none">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-emerald-500/80">Best Day</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5">
                  {monthStats.bestDay ? `${monthStats.bestDay.netR >= 0 ? "+" : ""}${monthStats.bestDay.netR.toFixed(2)}R` : "--"}
                </span>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-rose-500/80">Worst Day</span>
                <span className="text-sm font-bold text-rose-400 mt-0.5">
                  {monthStats.worstDay ? `${monthStats.worstDay.netR >= 0 ? "+" : ""}${monthStats.worstDay.netR.toFixed(2)}R` : "--"}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
              <span>{monthStats.bestDay ? monthStats.bestDay.date.slice(5) : ""}</span>
              <span>{monthStats.worstDay ? monthStats.worstDay.date.slice(5) : ""}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Activity & Streaks */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> Activity
            </CardTitle>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {monthStats.totalTrades} Trades
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {monthStats.activeDays}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">Days Traded</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
              <span className="text-emerald-400 font-medium">Max Strk: {monthStats.maxWinningStreak}d</span>
              <span>Cur: {monthStats.curWinningStreak}d</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Discipline Integrity */}
        <Card className={`border ${monthStats.ruleBreaks === 0 ? "border-emerald-500/25 bg-emerald-500/[0.02]" : "border-rose-500/30 bg-rose-500/[0.02]"}`}>
          <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Discipline
            </CardTitle>
            <span className={`text-[10px] font-bold ${monthStats.ruleBreaks === 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {monthStats.ruleBreaks} Breaks
            </span>
          </CardHeader>
          <CardContent className="px-3.5 pb-3 pt-1">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className={`text-2xl font-bold tracking-tight ${monthStats.cleanDaysPct >= 90 ? "text-emerald-400" : monthStats.cleanDaysPct >= 70 ? "text-amber-400" : "text-rose-400"}`}>
                {monthStats.activeDays > 0 ? `${monthStats.cleanDaysPct}%` : "100%"}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">Clean Days</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center justify-between">
              <span className={monthStats.ruleBreaks === 0 ? "text-emerald-400" : "text-rose-400 font-medium"}>
                {monthStats.ruleBreaks === 0 ? "Zero Breaches" : `${monthStats.ruleBreaks} Rule Breaks`}
              </span>
              <span>{monthStats.emotionDrivenTrades} Emotion</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "heatmap" ? (
        <Card className="border-border/60">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
            <div>
              <CardTitle className="text-xl">Hourly Performance Heatmap</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Cumulative P&L and R grouped by session hours ({displayTimeMode === "Exchange Time" ? "US Eastern Time EST" : "Local Time"}).</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-500/40" /> High Win</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" /> Win</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500/20" /> Loss</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500/25 border border-rose-500/40" /> High Loss</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/5 border border-muted/10" /> No Trades</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <div className="min-w-[800px] space-y-2">
              {/* Header Row: Hours */}
              <div className="grid grid-cols-11 gap-2 text-center text-xs font-semibold text-muted-foreground pb-2 border-b border-border/50">
                <div className="text-left font-bold pl-2">Day of Week</div>
                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => (
                  <div key={h}>{h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}</div>
                ))}
              </div>
              
              {/* Data Rows: Mon-Fri */}
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => (
                <div key={day} className="grid grid-cols-11 gap-2 items-center">
                  <div className="text-sm font-bold text-muted-foreground pl-2">{day}</div>
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => {
                    const cell = heatmapData[`${day}-${hour}`] || { pnl: 0, count: 0, netR: 0 }
                    const cellBg = getCellBgColor(cell.pnl, cell.count)
                    return (
                      <div
                        key={hour}
                        className={`relative group h-14 rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-[1.03] ${cellBg}`}
                      >
                        {cell.count > 0 ? (
                          <>
                            <span className="text-xs font-bold leading-none">
                              {fmtPnl(cell.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                            </span>
                            <span className="text-[10px] font-semibold opacity-85 mt-1 leading-none">
                              {cell.netR >= 0 ? "+" : ""}{cell.netR.toFixed(2)} R
                            </span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-lg bg-popover border border-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-1.5 text-foreground text-left">
                              <div className="text-xs font-bold border-b border-border/50 pb-1">{day} at {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Cumulative P&L:</span>
                                <span className={`font-bold ${cell.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPnl(cell.pnl, pnlDisplayMode, accountBalance, { sign: true })}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Net R:</span>
                                <span className={`font-bold ${cell.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{cell.netR >= 0 ? "+" : ""}{cell.netR.toFixed(2)} R</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Total Trades:</span>
                                <span className="font-bold text-foreground">{cell.count}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Avg Trade:</span>
                                <span className="font-bold text-foreground">{fmtPnl(cell.pnl / cell.count, pnlDisplayMode, accountBalance, { sign: true })}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">-</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Calendar Month Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{monthName} {year}</h2>
              <Badge 
                variant="outline" 
                className={`text-xs font-semibold px-2.5 py-1 ${monthStats.totalNetR >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30"}`}
              >
                {monthStats.totalNetR >= 0 ? "+" : ""}{monthStats.totalNetR.toFixed(2)} R
                <span className="mx-1.5 opacity-40">•</span>
                {fmtPnl(monthStats.totalPnl, pnlDisplayMode, accountBalance, { sign: true })}
                <span className="mx-1.5 opacity-40">•</span>
                {monthStats.totalTrades} Trades ({monthStats.activeDays} Days)
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentDate(new Date())}
                className="text-xs h-8 px-2.5"
              >
                Today
              </Button>
              <div className="flex items-center rounded-md border border-input bg-background">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-r-none" 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="h-4 w-px bg-border" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-l-none" 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar Main Grid */}
            <div className="flex-1 grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-center font-semibold text-xs text-muted-foreground pb-1">{d}</div>
              ))}
              
              {blanks.map(b => (
                <div key={`blank-${b}`} className="min-h-[110px] bg-muted/10 rounded-xl border border-dashed border-border/30" />
              ))}

              {days.map(d => {
                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                const stat = dailyStats[dateStr]
                
                let bgColor = "bg-card/70 border-border/60"
                let textColor = "text-foreground"
                
                if (stat) {
                  if (overlay === "pnl") {
                    if (stat.pnl > 0) {
                      bgColor = stat.pnl > 500 ? "bg-emerald-500/20 border-emerald-500/40" : "bg-emerald-500/10 border-emerald-500/25"
                      textColor = "text-emerald-400"
                    } else if (stat.pnl < 0) {
                      bgColor = stat.pnl < -500 ? "bg-rose-500/20 border-rose-500/40" : "bg-rose-500/10 border-rose-500/25"
                      textColor = "text-rose-400"
                    }
                  } else if (overlay === "mistake") {
                    if (stat.ruleBreaks > 0) {
                      bgColor = "bg-rose-500/25 border-rose-500/50"
                      textColor = "text-rose-400"
                    } else if (stat.emotionDriven > 0) {
                      bgColor = "bg-amber-500/15 border-amber-500/30"
                      textColor = "text-amber-400"
                    } else {
                      bgColor = "bg-emerald-500/10 border-emerald-500/20"
                      textColor = "text-emerald-400"
                    }
                  } else if (overlay === "psychology") {
                    bgColor = stat.emotionDriven > 0 ? "bg-rose-500/15 border-rose-500/30" : "bg-primary/10 border-primary/20"
                  }
                }

                const routine = routines.find(r => r.date === dateStr)
                const isToday = (() => {
                  const now = new Date()
                  return now.getFullYear() === year && now.getMonth() === currentDate.getMonth() && now.getDate() === d
                })()

                return (
                  <div 
                    key={d} 
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative group min-h-[110px] p-2.5 rounded-xl border flex flex-col transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer ${bgColor} ${isToday ? "ring-2 ring-primary/40" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {d}
                        {isToday && <span className="ml-1 text-[9px] font-normal uppercase text-primary tracking-wide">Today</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        {routine && <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.2 rounded font-semibold" title="Routine Logged">R</span>}
                        {stat && stat.ruleBreaks > 0 && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded font-bold" title={`${stat.ruleBreaks} Rule Breaks`}>
                            !
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {stat && (
                      <>
                        <div className="mt-auto space-y-1">
                          <div className={`font-bold text-base leading-none ${textColor}`}>
                            {fmtPnl(stat.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                          </div>
                          <div className="flex justify-between items-baseline text-xs font-medium mt-1">
                            <span className={`font-semibold ${stat.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stat.netR >= 0 ? "+" : ""}{stat.netR.toFixed(2)} R
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {stat.trades}t ({Math.round((stat.wins / stat.trades) * 100)}%)
                            </span>
                          </div>
                        </div>

                        {/* Hover Preview Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 rounded-lg bg-popover border border-border shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-1.5 text-left text-foreground">
                          <div className="text-xs font-bold border-b border-border/50 pb-1 flex justify-between items-center">
                            <span>{new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</span>
                            {stat.ruleBreaks > 0 && (
                              <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-semibold">
                                {stat.ruleBreaks} rule break{stat.ruleBreaks > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Net P&L:</span>
                            <span className={`font-bold ${stat.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {fmtPnl(stat.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Net Return R:</span>
                            <span className={`font-bold ${stat.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stat.netR >= 0 ? "+" : ""}{stat.netR.toFixed(2)} R
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Trades & Win Rate:</span>
                            <span className="font-semibold text-foreground">
                              {stat.trades} trades ({Math.round((stat.wins / stat.trades) * 100)}% WR)
                            </span>
                          </div>
                          {stat.emotionDriven > 0 && (
                            <div className="flex justify-between text-[11px] text-amber-400">
                              <span>Emotion-Tagged:</span>
                              <span className="font-semibold">{stat.emotionDriven}</span>
                            </div>
                          )}
                          <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground text-center">
                            Click to open daily replay & trades ➔
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Weekly PnL & Month Summary Sidebar */}
            <div className="w-full lg:w-72 space-y-4">
              <Card className="bg-card/60 border-border/60">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Weekly Breakdown
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{monthName}</span>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {[1, 2, 3, 4, 5, 6].map(week => {
                    const weekStartDay = (week - 1) * 7 + 1 - firstDayOfMonth
                    let weekPnl = 0
                    let weekNetR = 0
                    let weekTrades = 0
                    let weekWins = 0
                    let firstValidDay = 0

                    for (let i = 0; i < 7; i++) {
                      const d = weekStartDay + i
                      if (d > 0 && d <= daysInMonth) {
                        if (!firstValidDay) firstValidDay = d
                        const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                        const st = dailyStats[dateStr]
                        if (st) {
                          weekPnl += st.pnl
                          weekNetR += st.netR
                          weekTrades += st.trades
                          weekWins += st.wins
                        }
                      }
                    }
                    
                    if (weekStartDay > daysInMonth || firstValidDay === 0) return null

                    const isoWeekKey = getISOWeekKey(new Date(year, currentDate.getMonth(), firstValidDay))
                    
                    return (
                      <div 
                        key={week} 
                        onClick={() => router.push(`/app/weekly-review?week=${isoWeekKey}`)}
                        className="p-3 border rounded-xl hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all bg-card/70 flex flex-col gap-1.5 group"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              Week {week}
                            </span>
                            {weekTrades > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {weekTrades} trade{weekTrades > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <span className={`font-bold text-sm ${weekPnl > 0 ? "text-emerald-400" : weekPnl < 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                            {fmtPnl(weekPnl, pnlDisplayMode, accountBalance, { sign: true })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span className={weekNetR >= 0 ? "text-emerald-400/90 font-semibold" : "text-rose-400/90 font-semibold"}>
                            {weekTrades > 0 ? `${weekNetR >= 0 ? "+" : ""}${weekNetR.toFixed(2)} R` : "0.00 R"}
                          </span>
                          <span className="group-hover:text-foreground transition-colors flex items-center gap-1 text-[11px]">
                            Review <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Monthly Summary Box */}
                  <div className="pt-3 border-t border-border/60 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Month Cumulative Total
                    </div>
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Overall Net Return:</span>
                        <span className={`font-bold text-sm ${monthStats.totalNetR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {monthStats.totalNetR >= 0 ? "+" : ""}{monthStats.totalNetR.toFixed(2)} R
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Overall Net P&L:</span>
                        <span className={`font-semibold ${monthStats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {fmtPnl(monthStats.totalPnl, pnlDisplayMode, accountBalance, { sign: true })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Activity:</span>
                        <span className="text-foreground font-medium">
                          {monthStats.totalTrades} Trades • {monthStats.activeDays} Days
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span className="text-foreground font-medium">
                          {monthStats.tradeWinRate.toFixed(0)}% Trade • {monthStats.dayWinRate.toFixed(0)}% Day
                        </span>
                      </div>
                    </div>
                    <Button 
                      className="w-full text-xs font-semibold justify-center gap-1.5 h-9" 
                      variant="secondary"
                      onClick={() => router.push(`/app/monthly-review?month=${monthStats.monthStr}`)}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Open Monthly Recap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <DailyReplaySheet dateStr={selectedDate} open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)} />
    </div>
  )
}
