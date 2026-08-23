"use client"

import { usePropStore } from "@/lib/store"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, BarChart, Flame, Droplets, Target, AlertTriangle } from "lucide-react"
import { DailyReplaySheet } from "@/components/app/calendar/daily-replay-sheet"
import { fmtPnl } from "@/lib/format"

export default function CalendarPage() {
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
      const year = parts.find(p => p.type === "year")?.value || ""
      const month = parts.find(p => p.type === "month")?.value || ""
      const day = parts.find(p => p.type === "day")?.value || ""
      return `${year}-${month}-${day}`
    } else {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  // Calculate stats per day
  const dailyStats = useMemo(() => {
    const stats: Record<string, any> = {}
    
    accountTrades.forEach(t => {
      const dateStr = getLocalDateString(t.timestamp)
      if (!stats[dateStr]) {
        stats[dateStr] = { pnl: 0, trades: 0, wins: 0, ruleBreaks: 0, emotionDriven: 0 }
      }
      stats[dateStr].pnl += t.pnl
      stats[dateStr].trades += 1
      if (t.pnl > 0) stats[dateStr].wins += 1

      const p = psychology.find(x => x.tradeId === t.id)
      if (p?.brokeRules) stats[dateStr].ruleBreaks += 1
      if (p?.emotionAffected) stats[dateStr].emotionDriven += 1
    })
    return stats
  }, [accountTrades, psychology])

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
    const matrix: Record<string, { pnl: number; count: number }> = {}
    
    daysList.forEach(d => {
      hoursList.forEach(h => {
        matrix[`${d}-${h}`] = { pnl: 0, count: 0 }
      })
    })

    accountTrades.forEach(t => {
      const { weekday, hour } = getDayAndHour(t.timestamp)
      const key = `${weekday}-${hour}`
      if (matrix[key] !== undefined) {
        matrix[key].pnl += t.pnl
        matrix[key].count += 1
      }
    })

    return matrix
  }, [accountTrades])

  let totalPnl = 0
  let totalTrades = 0
  let totalWins = 0

  // Calculate actual Streaks and Days from dailyStats
  const sortedDates = Object.keys(dailyStats).sort()
  let currentWinningStreak = 0
  let currentLosingStreak = 0
  let maxWinningStreak = 0
  let maxLosingStreak = 0
  let greenDays = 0
  let redDays = 0

  sortedDates.forEach(date => {
    const pnl = dailyStats[date].pnl
    if (pnl > 0) {
      greenDays++
      currentWinningStreak++
      currentLosingStreak = 0
      if (currentWinningStreak > maxWinningStreak) maxWinningStreak = currentWinningStreak
    } else if (pnl < 0) {
      redDays++
      currentLosingStreak++
      currentWinningStreak = 0
      if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak
    }
  })

  const getCellBgColor = (pnl: number, count: number) => {
    if (count === 0) return "bg-muted/5 border-muted/10 text-muted-foreground/30"
    if (pnl > 0) {
      if (pnl > 1000) return "bg-success/30 border-success/40 text-success font-semibold"
      if (pnl > 500) return "bg-success/20 border-success/30 text-success"
      return "bg-success/10 border-success/20 text-success"
    } else if (pnl < 0) {
      const absPnl = Math.abs(pnl)
      if (absPnl > 1000) return "bg-destructive/30 border-destructive/40 text-destructive font-semibold"
      if (absPnl > 500) return "bg-destructive/20 border-destructive/30 text-destructive"
      return "bg-destructive/10 border-destructive/20 text-destructive"
    }
    return "bg-muted/30 border-muted-foreground/20 text-muted-foreground"
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Calendar</h1>
          <p className="text-muted-foreground">TradeZella-inspired daily breakdown and psychology tracking.</p>
        </div>
        <div className="flex gap-2">
          {viewMode === "calendar" && (
            <select 
              className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={overlay}
              onChange={e => setOverlay(e.target.value as any)}
            >
              <option value="pnl">PnL Overlay</option>
              <option value="psychology">Psychology Overlay</option>
              <option value="mistake">Mistake Overlay</option>
            </select>
          )}
          <Button 
            variant={viewMode === "heatmap" ? "default" : "outline"} 
            onClick={() => setViewMode(viewMode === "calendar" ? "heatmap" : "calendar")}
          >
            <BarChart className="w-4 h-4 mr-2" /> 
            {viewMode === "heatmap" ? "Calendar View" : "Performance Heatmap"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-success/20 to-transparent border-success/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-success flex items-center gap-2"><Flame className="w-4 h-4"/> Winning Streak</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-success">{currentWinningStreak} Days</div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/20 to-transparent border-destructive/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-destructive flex items-center gap-2"><Droplets className="w-4 h-4"/> Losing Streak</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{currentLosingStreak} Days</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4"/> Green Days</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{greenDays}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Red Days</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{redDays}</div></CardContent>
        </Card>
      </div>

      {viewMode === "heatmap" ? (
        <Card className="border-primary/10">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
            <div>
              <CardTitle className="text-xl">Hourly Performance Heatmap</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Cumulative P&L grouped by US Eastern Time (EST) session hours.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/30 border border-success/40" /> High Win</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/10 border border-success/20" /> Win</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/10 border border-destructive/20" /> Loss</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30 border border-destructive/40" /> High Loss</span>
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
                    const cell = heatmapData[`${day}-${hour}`] || { pnl: 0, count: 0 }
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
                            <span className="text-[9px] opacity-75 mt-1 leading-none">{cell.count} Trades</span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-3 rounded-lg bg-popover border border-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-1.5 text-foreground text-left">
                              <div className="text-xs font-bold border-b border-border/50 pb-1">{day} at {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Cumulative P&L:</span>
                                <span className={`font-bold ${cell.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtPnl(cell.pnl, pnlDisplayMode, accountBalance, { sign: true })}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Total Trades:</span>
                                <span className="font-bold text-foreground">{cell.count}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Avg P&L:</span>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{monthName} {year}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-center font-semibold text-sm text-muted-foreground pb-2">{d}</div>
              ))}
              
              {blanks.map(b => (
                <div key={`blank-${b}`} className="min-h-[120px] bg-muted/20 rounded-xl border border-dashed border-transparent" />
              ))}

              {days.map(d => {
                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                const stat = dailyStats[dateStr]
                
                let bgColor = "bg-card"
                let textColor = "text-foreground"
                
                if (stat) {
                  totalPnl += stat.pnl
                  totalTrades += stat.trades
                  totalWins += stat.wins
                  
                  if (overlay === "pnl") {
                    if (stat.pnl > 0) {
                      bgColor = stat.pnl > 500 ? "bg-success/20 border-success/30" : "bg-success/10 border-success/20"
                      textColor = "text-success"
                    } else if (stat.pnl < 0) {
                      bgColor = stat.pnl < -500 ? "bg-destructive/20 border-destructive/30" : "bg-destructive/10 border-destructive/20"
                      textColor = "text-destructive"
                    }
                  } else if (overlay === "mistake") {
                    if (stat.ruleBreaks > 0) {
                      bgColor = "bg-destructive/30 border-destructive/50"
                    } else if (stat.emotionDriven > 0) {
                      bgColor = "bg-warning/20 border-warning/30"
                    } else {
                      bgColor = "bg-success/10 border-success/20"
                    }
                  } else if (overlay === "psychology") {
                     bgColor = stat.emotionDriven > 1 ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"
                  }
                }

                const routine = routines.find(r => r.date === dateStr)

                return (
                  <div 
                    key={d} 
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative group min-h-[120px] p-3 rounded-xl border flex flex-col transition-all hover:scale-[1.02] cursor-pointer ${bgColor}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-muted-foreground">{d}</span>
                      {routine && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded" title="Routine Logged">R</span>}
                    </div>
                    
                    {stat && (
                      <>
                        <div className="mt-auto space-y-1">
                          <div className={`font-bold text-lg leading-none ${textColor}`}>
                            {fmtPnl(stat.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                          </div>
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>{stat.trades} Trades</span>
                            <span>{Math.round((stat.wins / stat.trades) * 100)}% WR</span>
                          </div>
                        </div>

                        {/* Hover Preview Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-lg bg-popover border border-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-2">
                          <div className="text-sm font-bold border-b border-border/50 pb-1">{new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">P&L:</span>
                            <span className={`font-bold ${stat.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtPnl(stat.pnl, pnlDisplayMode, accountBalance, { sign: true })}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Trades:</span>
                            <span className="font-bold">{stat.trades}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Win Rate:</span>
                            <span className="font-bold">{Math.round((stat.wins / stat.trades) * 100)}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Avg RR:</span>
                            <span className="font-bold">2.1</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Weekly PnL Sidebar */}
            <div className="w-full lg:w-64 space-y-4">
              <Card className="h-full bg-card/50">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg">Weekly P&L</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(week => {
                    // Calculate week PnL
                    const weekStartDay = (week - 1) * 7 + 1 - firstDayOfMonth
                    let weekPnl = 0
                    for (let i = 0; i < 7; i++) {
                      const d = weekStartDay + i
                      if (d > 0 && d <= daysInMonth) {
                        const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
                        if (dailyStats[dateStr]) weekPnl += dailyStats[dateStr].pnl
                      }
                    }
                    
                    // Only show week if it overlaps with month
                    if (weekStartDay > daysInMonth) return null
                    
                    return (
                      <div key={week} onClick={() => toast.info(`Navigating to Week ${week} Review`)} className="p-3 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors bg-card flex justify-between items-center group">
                        <span className="font-medium text-sm text-muted-foreground group-hover:text-primary transition-colors">Week {week}</span>
                      <span className={`font-bold ${weekPnl > 0 ? "text-success" : weekPnl < 0 ? "text-destructive" : ""}`}>
                          {fmtPnl(weekPnl, pnlDisplayMode, accountBalance, { sign: true })}
                        </span>
                      </div>
                    )
                  })}
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
