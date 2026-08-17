"use client"

import { useEffect, useState } from "react"
import { usePropStore } from "@/lib/store"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Brain, AlertTriangle, Clock, Hourglass, TrendingUp, ShieldCheck, ShieldAlert, ArrowRight, TrendingDown, Sparkles, ThumbsUp, Search } from "lucide-react"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { StatCard } from "./stat-card"

export function AnalysisView() {
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)
  const accountTrades = activeId ? trades.filter((t) => t.accountId === activeId) : trades
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const url = activeId ? `/api/analysis?accountId=${activeId}` : '/api/analysis'
        const res = await fetch(url)
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    if (accountTrades.length >= 5) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [activeId, accountTrades.length])

  if (accountTrades.length < 5) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight">Deep Analysis</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-border py-24 text-center text-muted-foreground bg-muted/20">
          <Brain className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p className="text-lg font-medium">Not enough trades to analyze</p>
          <p className="text-sm mt-1">Add at least 5 trades to unlock deep insights.</p>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-[500px] w-full bg-muted animate-pulse rounded-2xl" />
      </div>
    )
  }

  const { psychology, failures, time, duration, patterns, mcAlignment, insights } = data

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'A': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'B': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'C': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'D': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'F': return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const longData = failures.byDirection.find((d: any) => d.direction === 'long') || { winRate: 0, netPnl: 0, count: 0 }
  const shortData = failures.byDirection.find((d: any) => d.direction === 'short') || { winRate: 0, netPnl: 0, count: 0 }
  const totalDirectionTrades = (longData.count || 0) + (shortData.count || 0)
  const longPct = totalDirectionTrades > 0 ? ((longData.count || 0) / totalDirectionTrades) * 100 : 50

  const durationGap = (duration.winners.avgDurationMinutes > 0 && duration.losers.avgDurationMinutes > duration.winners.avgDurationMinutes) 
    ? (duration.losers.avgDurationMinutes / duration.winners.avgDurationMinutes).toFixed(1) 
    : null

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deep Analysis</h1>
          <p className="text-muted-foreground mt-1 text-sm">Uncover hidden patterns in your trading behavior.</p>
        </div>
      </div>
      
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="mb-8 w-full flex-wrap h-auto justify-start p-1.5 bg-muted/40 rounded-xl">
          <TabsTrigger value="insights" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Sparkles className="mr-2 h-4 w-4" /> Insights</TabsTrigger>
          <TabsTrigger value="mindset" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Brain className="mr-2 h-4 w-4" /> Mindset</TabsTrigger>
          <TabsTrigger value="failures" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><AlertTriangle className="mr-2 h-4 w-4" /> Failures</TabsTrigger>
          <TabsTrigger value="time" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Clock className="mr-2 h-4 w-4" /> Time</TabsTrigger>
          <TabsTrigger value="duration" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Hourglass className="mr-2 h-4 w-4" /> Duration</TabsTrigger>
          <TabsTrigger value="patterns" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><TrendingUp className="mr-2 h-4 w-4" /> Patterns</TabsTrigger>
          <TabsTrigger value="mccheck" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"><ShieldCheck className="mr-2 h-4 w-4" /> MC Check</TabsTrigger>
        </TabsList>
        
        {/* Tab 0: Insights */}
        <TabsContent value="insights" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights?.length > 0 ? insights.map((insight: any, i: number) => {
              let icon, colorClass, bgClass
              if (insight.type === 'strength') {
                icon = <ThumbsUp className="h-6 w-6 text-emerald-500" />
                colorClass = 'text-emerald-500'
                bgClass = 'bg-emerald-500/10 border-emerald-500/20'
              } else if (insight.type === 'weakness') {
                icon = <TrendingDown className="h-6 w-6 text-rose-500" />
                colorClass = 'text-rose-500'
                bgClass = 'bg-rose-500/10 border-rose-500/20'
              } else {
                icon = <Search className="h-6 w-6 text-blue-500" />
                colorClass = 'text-blue-500'
                bgClass = 'bg-blue-500/10 border-blue-500/20'
              }

              return (
                <Card key={i} className={`flex flex-col border ${bgClass}`}>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="p-2 bg-background rounded-lg shadow-sm">
                      {icon}
                    </div>
                    <div>
                      <CardTitle className={`text-lg ${colorClass}`}>{insight.title}</CardTitle>
                      <CardDescription className="uppercase tracking-wider text-xs font-bold mt-1 opacity-80">{insight.type}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{insight.description}</p>
                  </CardContent>
                </Card>
              )
            }) : (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <Sparkles className="mx-auto h-8 w-8 mb-3 opacity-50" />
                <p>Not enough data yet to generate insights. Keep trading!</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 1: Mindset */}
        <TabsContent value="mindset" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conviction vs Win Rate</CardTitle>
                <CardDescription>How your confidence aligns with actual outcomes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {psychology.convictionVsOutcome.map((row: any) => (
                  <div key={row.conviction} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{row.conviction}</span>
                      <span className="text-muted-foreground">{fmtPct(row.winRate, 0)} WR &bull; {fmtCurrency(row.avgPnl, { sign: true })} avg</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.winRate}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-card to-muted/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Emotion Affected</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold">{fmtPct(psychology.emotionAffected.yes.winRate, 0)}</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="text-right">
                        <div className={psychology.emotionAffected.yes.avgPnl < 0 ? "text-rose-500 font-medium" : "text-emerald-500 font-medium"}>{fmtCurrency(psychology.emotionAffected.yes.avgPnl)}</div>
                        <div className="text-xs text-muted-foreground">Avg P&L</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-card to-muted/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Emotion Clear</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold">{fmtPct(psychology.emotionAffected.no.winRate, 0)}</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="text-right">
                        <div className={psychology.emotionAffected.no.avgPnl < 0 ? "text-rose-500 font-medium" : "text-emerald-500 font-medium"}>{fmtCurrency(psychology.emotionAffected.no.avgPnl)}</div>
                        <div className="text-xs text-muted-foreground">Avg P&L</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Execution Grades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {psychology.gradeBreakdown.map((row: any) => (
                      <div key={row.grade} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10 w-full sm:w-[calc(50%-0.375rem)]">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${getGradeColor(row.grade)}`}>
                          {row.grade}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{row.count} trades</div>
                          <div className={`text-xs ${row.avgPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtCurrency(row.avgPnl, { sign: true })} avg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Exit Reasons</CardTitle>
              <CardDescription>What causes you to close your positions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {psychology.exitReasonBreakdown.map((row: any) => (
                  <div key={row.exitReason} className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <Badge variant="outline" className="mb-3">{row.exitReason || "Unknown"}</Badge>
                    <div className="text-2xl font-semibold mb-1">{row.count}</div>
                    <div className="text-sm text-muted-foreground">Count</div>
                    <div className="mt-3 text-sm font-medium">
                      Avg: <span className={row.avgPnl >= 0 ? "text-emerald-500" : "text-rose-500"}>{fmtCurrency(row.avgPnl, { sign: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Failures */}
        <TabsContent value="failures" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm shadow-rose-500/5">
              <CardHeader>
                <CardTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2"><ShieldAlert className="h-5 w-5"/> Stop Loss Hits</CardTitle>
                <CardDescription>Capital lost directly to stopouts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-6">
                  <div>
                    <div className="text-5xl font-bold text-rose-600 dark:text-rose-400">{failures.stopHitTrades.count}</div>
                    <div className="text-sm font-medium text-rose-600/70 mt-2">Trades Hit Stop</div>
                  </div>
                  <div className="space-y-1 pb-1">
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Avg Loss:</span> 
                      <span className="font-semibold text-rose-500">{fmtCurrency(failures.stopHitTrades.avgPnl)}</span>
                    </div>
                    {failures.stopHitTrades.avgAdverseExcursion !== null && (
                      <div className="text-sm">
                        <span className="text-muted-foreground mr-2">Avg Excursion:</span> 
                        <span className="font-semibold">{fmtCurrency(failures.stopHitTrades.avgAdverseExcursion)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Direction Bias</CardTitle>
                <CardDescription>Long vs Short performance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-between text-sm font-medium">
                  <div className="text-blue-500">LONG ({fmtPct(longData.winRate, 0)} WR)</div>
                  <div className="text-orange-500">SHORT ({fmtPct(shortData.winRate, 0)} WR)</div>
                </div>
                <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500" style={{ width: `${longPct}%` }} />
                  <div className="h-full bg-orange-500" style={{ width: `${100 - longPct}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs uppercase mb-1">Net PnL</div>
                    <div className={longData.netPnl >= 0 ? "text-emerald-500" : "text-rose-500"}>{fmtCurrency(longData.netPnl, { sign: true })}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-xs uppercase mb-1">Net PnL</div>
                    <div className={shortData.netPnl >= 0 ? "text-emerald-500" : "text-rose-500"}>{fmtCurrency(shortData.netPnl, { sign: true })}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Instrument Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead className="text-right">Win %</TableHead>
                      <TableHead className="text-right">Profit Factor</TableHead>
                      <TableHead className="text-right">Net P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failures.byInstrument.map((row: any) => (
                      <TableRow key={row.instrument}>
                        <TableCell className="font-medium">{row.instrument}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.winRate >= 50 ? 'default' : 'destructive'} className={row.winRate >= 50 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"} >
                            {fmtPct(row.winRate, 0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{row.profitFactor.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmtCurrency(row.netPnl, { sign: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Time */}
        <TabsContent value="time" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Hour</CardTitle>
              <CardDescription>Win rate visualized by time of day.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-56 items-stretch gap-2 pb-8 border-b border-dashed">
                {time.byHour.map((row: any) => (
                  <div key={row.hour} className="flex-1 flex flex-col items-center justify-end group h-full">
                    <div className="text-xs font-semibold mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {fmtPct(row.winRate, 0)}
                    </div>
                    <div className="w-full flex-1 flex items-end relative min-h-0">
                      <div 
                        className={`w-full rounded-t-md transition-all ${row.winRate >= 50 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'} absolute bottom-0`}
                        style={{ height: `${Math.max(row.winRate, 5)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 rotate-45 origin-left w-6">{row.hour}:00</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {time.bySession.map((row: any) => (
              <Card key={row.session} className="bg-gradient-to-br from-card to-muted/20">
                <CardContent className="p-6">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{row.session}</div>
                  <div className="text-3xl font-bold mb-1">{fmtPct(row.winRate, 0)}</div>
                  <div className={`text-sm font-medium ${row.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmtCurrency(row.netPnl, { sign: true })} net</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>After-Loss Psychology</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Brain className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Next Trade Win Rate</div>
                  <div className="text-2xl font-bold">{fmtPct(time.afterLossNextTrade.winRate, 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Over {time.afterLossNextTrade.count} occurrences</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>First Trade of Day</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Wins ({time.firstTradeOfDay.win.count})</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmtCurrency(time.firstTradeOfDay.win.avgPnl)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                    <span className="text-rose-600 dark:text-rose-400 font-medium">Losses ({time.firstTradeOfDay.loss.count})</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{fmtCurrency(time.firstTradeOfDay.loss.avgPnl)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Duration */}
        <TabsContent value="duration" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {durationGap && (
            <Card className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border-orange-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">Hold Time Discrepancy</h3>
                  <p className="text-orange-600/80 dark:text-orange-300">You hold losing trades <strong className="text-orange-600 dark:text-orange-400">{durationGap}x longer</strong> than winning trades.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-500">Winning Trades</CardTitle>
                <CardDescription>Time spent in profitable positions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex gap-8">
                  <div>
                    <div className="text-3xl font-bold">{Math.round(duration.winners.avgDurationMinutes)}<span className="text-lg text-muted-foreground font-normal">m</span></div>
                    <div className="text-sm text-muted-foreground mt-1">Average</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{Math.round(duration.winners.medianDurationMinutes)}<span className="text-lg text-muted-foreground font-normal">m</span></div>
                    <div className="text-sm text-muted-foreground mt-1">Median</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-rose-500">Losing Trades</CardTitle>
                <CardDescription>Time spent in underwater positions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex gap-8">
                  <div>
                    <div className="text-3xl font-bold">{Math.round(duration.losers.avgDurationMinutes)}<span className="text-lg text-muted-foreground font-normal">m</span></div>
                    <div className="text-sm text-muted-foreground mt-1">Average</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{Math.round(duration.losers.medianDurationMinutes)}<span className="text-lg text-muted-foreground font-normal">m</span></div>
                    <div className="text-sm text-muted-foreground mt-1">Median</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Maximum Favorable Excursion (MFE)</CardTitle>
              </CardHeader>
              <CardContent>
                {duration.mfeStats.avgMfe === null ? (
                  <div className="text-muted-foreground text-sm italic py-4">No excursion data populated</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <span className="font-medium text-muted-foreground">Overall Average</span> 
                      <span className="text-xl font-bold">{fmtCurrency(duration.mfeStats.avgMfe)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-500 font-medium">On Winners</span> 
                      <span className="font-semibold">{fmtCurrency(duration.mfeStats.avgMfeOnWinners)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-rose-500 font-medium">On Losers</span> 
                      <span className="font-semibold">{fmtCurrency(duration.mfeStats.avgMfeOnLosers)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Maximum Adverse Excursion (MAE)</CardTitle>
              </CardHeader>
              <CardContent>
                {duration.maeStats.avgMae === null ? (
                  <div className="text-muted-foreground text-sm italic py-4">No excursion data populated</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <span className="font-medium text-muted-foreground">Overall Average</span> 
                      <span className="text-xl font-bold">{fmtCurrency(duration.maeStats.avgMae)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-500 font-medium">On Winners</span> 
                      <span className="font-semibold">{fmtCurrency(duration.maeStats.avgMaeOnWinners)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-rose-500 font-medium">On Losers</span> 
                      <span className="font-semibold">{fmtCurrency(duration.maeStats.avgMaeOnLosers)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Patterns */}
        <TabsContent value="patterns" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle>PnL Distribution</CardTitle>
                  <CardDescription>Distribution of your trade returns.</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Top 10% Wins</div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{fmtPct(patterns.pnlDistribution.top10PctWinsContributionPct, 0)} of Total Profit</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-end gap-1 mt-6 border-b border-dashed pb-2">
                  {patterns.pnlDistribution.buckets.map((b: any, i: number) => {
                    const maxCount = Math.max(...patterns.pnlDistribution.buckets.map((x: any) => x.count))
                    const h = maxCount > 0 ? (b.count / maxCount) * 100 : 0
                    const isPositive = i >= patterns.pnlDistribution.buckets.length / 2 // Approximation for colors
                    return (
                      <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-2 group relative">
                        <div className="absolute -top-8 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-background border px-2 py-1 rounded shadow-sm z-10 whitespace-nowrap">
                          {b.label}: {b.count} trades
                        </div>
                        <div 
                          className={`w-full rounded-t transition-all ${h > 0 ? (isPositive ? 'bg-blue-500/70 hover:bg-blue-500' : 'bg-slate-500/70 hover:bg-slate-500') : ''}`} 
                          style={{ height: `${Math.max(h, 1)}%` }} 
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span>Largest Loss</span>
                  <span>Break Even</span>
                  <span>Largest Win</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Streaks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Current Streak</div>
                  <div className="text-3xl font-bold flex items-center gap-3">
                    {patterns.streaks.currentStreak.count} 
                    <Badge className={patterns.streaks.currentStreak.type === 'win' ? 'bg-emerald-500' : patterns.streaks.currentStreak.type === 'loss' ? 'bg-rose-500' : 'bg-muted text-foreground'}>
                      {patterns.streaks.currentStreak.type.toUpperCase()}S
                    </Badge>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Longest Win Streak</div>
                  <div className="text-xl font-bold text-emerald-500">{patterns.streaks.longestWinStreak}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Longest Loss Streak</div>
                  <div className="text-xl font-bold text-rose-500">{patterns.streaks.longestLossStreak}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Discipline Impact</CardTitle>
                <CardDescription>Performance based on daily score.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted/40 rounded-xl border border-border/50">
                  <div>
                    <div className="font-bold mb-1">High Discipline</div>
                    <div className="text-xs text-muted-foreground">Score &ge; {patterns.highVsLowDiscipline.high.threshold} &bull; {patterns.highVsLowDiscipline.high.count} trades</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-500 mb-1">{fmtPct(patterns.highVsLowDiscipline.high.winRate, 0)} WR</div>
                    <div className="text-sm font-medium">{fmtCurrency(patterns.highVsLowDiscipline.high.avgPnl)} avg</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/40 rounded-xl border border-border/50">
                  <div>
                    <div className="font-bold mb-1">Low Discipline</div>
                    <div className="text-xs text-muted-foreground">Score &lt; {patterns.highVsLowDiscipline.high.threshold} &bull; {patterns.highVsLowDiscipline.low.count} trades</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold mb-1 ${patterns.highVsLowDiscipline.low.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmtPct(patterns.highVsLowDiscipline.low.winRate, 0)} WR</div>
                    <div className={`text-sm font-medium ${patterns.highVsLowDiscipline.low.avgPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtCurrency(patterns.highVsLowDiscipline.low.avgPnl)} avg</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Contracts Traded</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">WR</TableHead>
                      <TableHead className="text-right">PF</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patterns.byContracts.map((row: any) => (
                      <TableRow key={row.contracts}>
                        <TableCell className="font-medium">{row.contracts}</TableCell>
                        <TableCell className="text-right">{fmtPct(row.winRate, 0)}</TableCell>
                        <TableCell className="text-right">{row.profitFactor.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmtCurrency(row.netPnl, { sign: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 6: MC Check */}
        <TabsContent value="mccheck" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Actual Day Mix vs Simulator</CardTitle>
                <CardDescription>What you do vs what your math says.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">Good Days</div>
                    <div className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">Avg: {fmtCurrency(mcAlignment.actualDayMix.avgGoodDayPnl)}</div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmtPct(mcAlignment.actualDayMix.goodDayPct, 0)}</div>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/40 rounded-xl border">
                  <div className="font-bold text-muted-foreground">Flat Days</div>
                  <div className="text-2xl font-black text-muted-foreground">{fmtPct(mcAlignment.actualDayMix.flatDayPct, 0)}</div>
                </div>
                <div className="flex justify-between items-center p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <div>
                    <div className="font-bold text-rose-600 dark:text-rose-400 mb-1">Bad Days</div>
                    <div className="text-xs font-medium text-rose-600/70 dark:text-rose-400/70">Avg: {fmtCurrency(mcAlignment.actualDayMix.avgBadDayPnl)}</div>
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{fmtPct(mcAlignment.actualDayMix.badDayPct, 0)}</div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-card to-muted/20">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Implied Risk per Trade</div>
                      <div className="text-4xl font-bold">{fmtPct(mcAlignment.impliedRiskPct.avg, 2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground uppercase mb-1">Volatility</div>
                      <Badge variant="outline">{fmtPct(mcAlignment.impliedRiskPct.stdDev, 2)} StdDev</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={mcAlignment.dailyLossLimitBreaches.length > 0 ? "border-rose-500/30" : ""}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${mcAlignment.dailyLossLimitBreaches.length > 0 ? "text-rose-500" : ""}`}>
                    <ShieldAlert className="w-5 h-5"/> Daily Loss Breaches (&gt;3%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mcAlignment.dailyLossLimitBreaches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                      <ShieldCheck className="w-12 h-12 text-emerald-500/50 mb-3" />
                      <p className="font-medium">Perfect Discipline</p>
                      <p className="text-xs mt-1">No daily loss breaches recorded.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mcAlignment.dailyLossLimitBreaches.map((b: any) => (
                        <div key={b.date} className="flex justify-between items-center p-3 bg-rose-500/5 rounded-lg border border-rose-500/10">
                          <span className="font-medium">{b.date}</span>
                          <span className="font-bold text-rose-500">{fmtPct(b.pct, 1)} <span className="text-xs font-normal opacity-80 ml-1">({fmtCurrency(b.pnl)})</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
