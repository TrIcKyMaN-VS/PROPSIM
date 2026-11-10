"use client"

import { useState, useEffect, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { 
  MacroSymbol, 
  SUPPORTED_MACRO_SYMBOLS, 
  CotReportSummary, 
  EconomicEvent,
  AiMacroBriefing 
} from "@/lib/types-macro"
import { 
  getCotReportAction, 
  getEconomicCalendarAction, 
  generateAiMacroBriefingAction 
} from "@/app/actions/macro-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Calendar, 
  Clock, 
  RotateCw, 
  Layers, 
  HelpCircle, 
  ArrowRight, 
  Scale, 
  Flame, 
  FileText, 
  CheckCircle2, 
  Copy, 
  ChevronRight,
  Info,
  Compass
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { fmtCurrency, fmtPnl } from "@/lib/format"

export default function MarketPulsePage() {
  // Default instrument is NQ, but fully changeable
  const [selectedSymbol, setSelectedSymbol] = useState<MacroSymbol>("NQ")
  const [activeTab, setActiveTab] = useState<string>("cot")
  
  // Data States
  const [cotData, setCotData] = useState<CotReportSummary | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>([])
  const [aiBriefing, setAiBriefing] = useState<AiMacroBriefing | null>(null)
  
  // Loading States
  const [loadingCot, setLoadingCot] = useState(true)
  const [loadingCalendar, setLoadingCalendar] = useState(true)
  const [generatingAi, setGeneratingAi] = useState(false)
  
  // Calendar Filters
  const [impactFilter, setImpactFilter] = useState<"all" | "high" | "med_high">("high")
  const [currencyFilter, setCurrencyFilter] = useState<string>("USD")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "upcoming">("all")
  
  // User Trades & Active Account
  const activeAccountId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)
  const accounts = usePropStore((s) => s.accounts)
  const activeAccount = useMemo(() => accounts.find(a => a.id === activeAccountId), [accounts, activeAccountId])

  const accountTrades = useMemo(() => {
    return trades.filter(t => !activeAccountId || t.accountId === activeAccountId)
  }, [trades, activeAccountId])

  const symbolConfig = SUPPORTED_MACRO_SYMBOLS[selectedSymbol] || SUPPORTED_MACRO_SYMBOLS.NQ

  // 1. Fetch COT Data whenever selectedSymbol changes
  const loadCotData = async (symbol: MacroSymbol) => {
    setLoadingCot(true)
    try {
      const res = await getCotReportAction(symbol)
      if (res.success && res.data) {
        setCotData(res.data)
      } else {
        toast.error(res.error || "Failed to load COT report")
      }
    } catch (e: any) {
      toast.error(e.message || "Error loading COT data")
    } finally {
      setLoadingCot(false)
    }
  }

  // 2. Fetch Economic Calendar
  const loadCalendarData = async () => {
    setLoadingCalendar(true)
    try {
      const res = await getEconomicCalendarAction()
      if (res.success && res.data) {
        setCalendarEvents(res.data)
      } else {
        toast.error(res.error || "Failed to load economic calendar")
      }
    } catch (e: any) {
      toast.error(e.message || "Error loading calendar")
    } finally {
      setLoadingCalendar(false)
    }
  }

  useEffect(() => {
    loadCotData(selectedSymbol)
  }, [selectedSymbol])

  useEffect(() => {
    loadCalendarData()
  }, [])

  // 3. Trigger AI Macro Gameplan Synthesis
  const handleGenerateAiBriefing = async () => {
    setGeneratingAi(true)
    try {
      const res = await generateAiMacroBriefingAction(selectedSymbol, accountTrades)
      if (res.success && res.data) {
        setAiBriefing(res.data)
        toast.success(`AI Macro Gameplan generated for ${selectedSymbol}!`)
        setActiveTab("ai")
      } else {
        toast.error(res.error || "Failed to generate AI briefing")
      }
    } catch (e: any) {
      toast.error(e.message || "Error generating AI gameplan")
    } finally {
      setGeneratingAi(false)
    }
  }

  // Next Upcoming Red Folder Event
  const nextRedFolderEvent = useMemo(() => {
    const upcoming = calendarEvents
      .filter(e => e.isRedFolder && e.isUpcoming && (e.country === "USD" || e.country === "ALL"))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return upcoming[0] || null
  }, [calendarEvents])

  // Filtered Calendar Events
  const filteredEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    return calendarEvents.filter(e => {
      // Impact
      if (impactFilter === "high" && !e.isRedFolder) return false
      if (impactFilter === "med_high" && e.impact !== "High" && e.impact !== "Medium") return false

      // Currency
      if (currencyFilter !== "ALL" && e.country !== currencyFilter) return false

      // Date
      if (dateFilter === "today" && e.dateStr !== todayStr) return false
      if (dateFilter === "upcoming" && !e.isUpcoming) return false

      return true
    })
  }, [calendarEvents, impactFilter, currencyFilter, dateFilter])

  // Copy event to clipboard for daily journal
  const handleCopyEvent = (e: EconomicEvent) => {
    const text = `${e.title} (${e.country}) at ${e.timeEST} EST [Impact: ${e.impact}, Forecast: ${e.forecast}]`
    navigator.clipboard.writeText(text)
    toast.success("Event details copied to clipboard! Paste in Daily Journal.")
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── Header Ribbon: Asset Selector & Executive Status ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/70 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Compass className="w-6 h-6 text-primary" />
              Market Pulse &amp; Institutional Macro
            </h1>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 font-bold uppercase text-[10px] px-2 py-0.5">
              CFTC Verified + Live News Feed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Correlate institutional smart money positioning (COT), high-impact economic news, and prop firm compliance.
          </p>
        </div>

        {/* Symbol Selector Dropdown (Default NQ) */}
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Active Macro Asset
            </span>
            <Select 
              value={selectedSymbol} 
              onValueChange={(val) => { if (val) setSelectedSymbol(val as MacroSymbol) }}
            >
              <SelectTrigger className="w-[200px] h-9 bg-background font-bold text-xs">
                <SelectValue placeholder="Select Asset" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SUPPORTED_MACRO_SYMBOLS).map((cfg) => (
                  <SelectItem key={cfg.symbol} value={cfg.symbol} className="text-xs font-medium">
                    <span className="font-bold text-primary mr-1.5">{cfg.symbol}</span>
                    <span>{cfg.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadCotData(selectedSymbol)
              loadCalendarData()
            }}
            disabled={loadingCot || loadingCalendar}
            className="h-9 gap-1.5 text-xs font-semibold mt-4 sm:mt-0"
            title="Refresh CFTC & Calendar data"
          >
            <RotateCw className={cn("w-3.5 h-3.5", (loadingCot || loadingCalendar) && "animate-spin")} />
            Refresh
          </Button>

          <Button
            onClick={handleGenerateAiBriefing}
            disabled={generatingAi}
            size="sm"
            className="h-9 gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 mt-4 sm:mt-0 shadow-sm"
          >
            <Sparkles className={cn("w-3.5 h-3.5", generatingAi && "animate-spin")} />
            {generatingAi ? "Analyzing..." : "Generate AI Gameplan"}
          </Button>
        </div>
      </div>

      {/* ── Key Telemetry Grid: 4 Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Smart Money (Commercials) Net */}
        <Card className="border-border/60 bg-card/60 shadow-sm relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Commercials (Smart Money)</span>
              <Layers className="w-3.5 h-3.5 text-primary/70" />
            </CardDescription>
            <CardTitle className="text-xl font-black font-mono">
              {loadingCot || !cotData ? (
                <span className="text-muted-foreground/60 text-base">Loading...</span>
              ) : (
                <span className={cotData.current.commercialNet >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {cotData.current.commercialNet >= 0 ? "+" : ""}
                  {cotData.current.commercialNet.toLocaleString()} ct
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {cotData && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn(
                  "font-bold font-mono text-[11px]",
                  cotData.current.wowCommercialChange >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {cotData.current.wowCommercialChange >= 0 ? "▲ +" : "▼ "}
                  {cotData.current.wowCommercialChange.toLocaleString()}
                </span>
                <span>WoW Net Shift</span>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground/60 mt-1">
              Institutions &amp; Producers hedging order flow
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Large Speculators (Hedge Funds) */}
        <Card className="border-border/60 bg-card/60 shadow-sm relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Large Speculators (Hedge Funds)</span>
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-xl font-black font-mono">
              {loadingCot || !cotData ? (
                <span className="text-muted-foreground/60 text-base">Loading...</span>
              ) : (
                <span className={cotData.current.nonCommercialNet >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {cotData.current.nonCommercialNet >= 0 ? "+" : ""}
                  {cotData.current.nonCommercialNet.toLocaleString()} ct
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {cotData && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn(
                  "font-bold font-mono text-[11px]",
                  cotData.current.wowNonCommercialChange >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {cotData.current.wowNonCommercialChange >= 0 ? "▲ +" : "▼ "}
                  {cotData.current.wowNonCommercialChange.toLocaleString()}
                </span>
                <span>WoW Net Shift</span>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground/60 mt-1">
              Trend-following CTAs &amp; money managers
            </div>
          </CardContent>
        </Card>

        {/* Card 3: 26-Week COT Index Gauge */}
        <Card className="border-border/60 bg-card/60 shadow-sm relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>26-Week COT Index</span>
              <Scale className="w-3.5 h-3.5 text-amber-400" />
            </CardDescription>
            <CardTitle className="text-xl font-black font-mono flex items-center gap-2">
              {loadingCot || !cotData ? (
                <span className="text-muted-foreground/60 text-base">Loading...</span>
              ) : (
                <>
                  <span>{cotData.cotIndex}%</span>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold uppercase px-1.5 py-0",
                    cotData.cotIndex >= 80 ? "border-rose-500/40 text-rose-400 bg-rose-500/10" :
                    cotData.cotIndex <= 20 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
                    "border-border text-muted-foreground bg-muted/20"
                  )}>
                    {cotData.cotIndex >= 80 ? "Overbought" : cotData.cotIndex <= 20 ? "Oversold" : "Neutral"}
                  </Badge>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {cotData && (
              <div className="space-y-1.5 mt-1">
                <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden border border-border/40">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      cotData.cotIndex >= 80 ? "bg-rose-500" :
                      cotData.cotIndex <= 20 ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.max(5, Math.min(100, cotData.cotIndex))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                  <span>0% (Capitulation)</span>
                  <span>50%</span>
                  <span>100% (Extreme)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Next Red Folder Catalyst */}
        <Card className="border-border/60 bg-card/60 shadow-sm relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Upcoming Red Folder
              </span>
              <Flame className="w-3.5 h-3.5 text-rose-400" />
            </CardDescription>
            <CardTitle className="text-base font-bold truncate">
              {loadingCalendar ? (
                <span className="text-muted-foreground/60 text-sm">Checking news...</span>
              ) : nextRedFolderEvent ? (
                <span className="text-foreground">{nextRedFolderEvent.title}</span>
              ) : (
                <span className="text-emerald-400 text-sm font-semibold">No Red Events Today</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {nextRedFolderEvent ? (
              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {nextRedFolderEvent.timeEST} EST 
                  {nextRedFolderEvent.minutesUntil > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (in {Math.floor(nextRedFolderEvent.minutesUntil / 60)}h {nextRedFolderEvent.minutesUntil % 60}m)
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Apex/Topstep rule: Close open trades ±2m
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground">
                Normal volatility expected; trade setups as planned.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Regime Banner ── */}
      {cotData && (
        <div className={cn(
          "p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs",
          cotData.smartMoneyBias === "BULLISH" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
          cotData.smartMoneyBias === "BEARISH" ? "bg-rose-500/10 border-rose-500/30 text-rose-300" :
          "bg-blue-500/10 border-blue-500/30 text-blue-300"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold",
              cotData.smartMoneyBias === "BULLISH" ? "bg-emerald-500/20 text-emerald-400" :
              cotData.smartMoneyBias === "BEARISH" ? "bg-rose-500/20 text-rose-400" :
              "bg-blue-500/20 text-blue-400"
            )}>
              {cotData.smartMoneyBias === "BULLISH" ? "▲" : cotData.smartMoneyBias === "BEARISH" ? "▼" : "◆"}
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                <span>{cotData.regimeLabel}</span>
                <Badge variant="outline" className="border-current text-current font-bold text-[10px] px-1.5 py-0 uppercase">
                  {cotData.smartMoneyBias} BIAS
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5 max-w-3xl leading-relaxed">
                {cotData.regimeDescription}
              </p>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground shrink-0 font-mono">
            CFTC Report Date: <strong className="text-foreground">{cotData.latestDate}</strong>
          </div>
        </div>
      )}

      {/* ── Main Tabbed Section ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-border/60 p-1 rounded-xl">
          <TabsTrigger value="cot" className="gap-2 text-xs font-bold data-[state=active]:bg-primary/20">
            <Layers className="w-4 h-4 text-primary" />
            Institutional COT Terminal
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 text-xs font-bold data-[state=active]:bg-primary/20 relative">
            <Calendar className="w-4 h-4 text-rose-400" />
            Economic Calendar (Red Folder)
            {nextRedFolderEvent && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 text-xs font-bold data-[state=active]:bg-primary/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
            AI Smart Money Alignment &amp; Leak Audit
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════════════
            TAB 1: INSTITUTIONAL COT TERMINAL
        ════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="cot" className="space-y-5">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-5 pb-3 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    {symbolConfig.name} ({symbolConfig.symbol}) — Positioning History
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {symbolConfig.description} • Tick: {symbolConfig.tickValue}
                  </CardDescription>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Showing last {cotData?.history.length || 0} weekly CFTC releases
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {/* Visual Net Progression Bars */}
              {cotData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Weekly Commercial vs Speculator Net Progression</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-rose-400 font-mono">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Commercials (Hedgers)
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-400 font-mono">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Speculators (Hedge Funds)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {cotData.history.slice().reverse().map((point, idx) => {
                      const maxNetAbs = Math.max(
                        ...cotData.history.map(p => Math.max(Math.abs(p.commercialNet), Math.abs(p.nonCommercialNet)))
                      ) || 1

                      const commWidth = Math.min(100, Math.round((Math.abs(point.commercialNet) / maxNetAbs) * 100))
                      const specWidth = Math.min(100, Math.round((Math.abs(point.nonCommercialNet) / maxNetAbs) * 100))

                      return (
                        <div key={idx} className="p-2.5 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors text-xs font-mono">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-foreground">{point.date}</span>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span>OI: <strong className="text-foreground">{point.openInterest.toLocaleString()}</strong></span>
                              <span>COT Index: <strong className={point.cotIndex >= 80 ? "text-rose-400" : point.cotIndex <= 20 ? "text-emerald-400" : "text-primary"}>{point.cotIndex}%</strong></span>
                            </div>
                          </div>

                          {/* Commercial Net Bar */}
                          <div className="grid grid-cols-12 gap-2 items-center text-[11px]">
                            <span className="col-span-3 text-muted-foreground truncate">Commercial:</span>
                            <div className="col-span-7 bg-muted/40 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-rose-500/80 rounded-full" 
                                style={{ width: `${commWidth}%` }} 
                              />
                            </div>
                            <span className={cn("col-span-2 text-right font-bold", point.commercialNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              {point.commercialNet.toLocaleString()}
                            </span>
                          </div>

                          {/* Speculator Net Bar */}
                          <div className="grid grid-cols-12 gap-2 items-center text-[11px] mt-1">
                            <span className="col-span-3 text-muted-foreground truncate">Speculator:</span>
                            <div className="col-span-7 bg-muted/40 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500/80 rounded-full" 
                                style={{ width: `${specWidth}%` }} 
                              />
                            </div>
                            <span className={cn("col-span-2 text-right font-bold", point.nonCommercialNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              {point.nonCommercialNet.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Institutional Order Flow Breakdown Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                <div className="space-y-1">
                  <div className="font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> 1. Commercials (Smart Money)
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Banks, producers, and dealers who use futures to lock in operational risk. When they heavily buy (net positive), market bottoms usually form.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> 2. Non-Commercials (Hedge Funds)
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Large trend-following funds. When their net long positioning reaches 90%+ extremes, buying power is exhausted and liquidity flushes happen.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> 3. Non-Reportable (Retail)
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Small retail speculators. Often caught on the wrong side at major inflection points. Look for divergence against Commercials.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════════
            TAB 2: ECONOMIC CALENDAR (RED FOLDER GUARDIAN)
        ════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="calendar" className="space-y-5">
          {/* Prop Firm Rule Banner */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-300 uppercase tracking-wide">
                  Prop Firm News Trading Rules (Apex, Topstep, FundedNext, FTMO)
                </h4>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Apex &amp; Topstep prohibit holding active trades ±2 minutes around High-Impact (Red Folder) releases. Violation may result in account breach!
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="bg-rose-500 text-white font-mono shrink-0 uppercase text-[11px]">
              Strict News Holding Warning
            </Badge>
          </div>

          {/* Calendar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/60 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-semibold">Impact:</span>
              <Button
                variant={impactFilter === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setImpactFilter("high")}
                className="h-7 text-xs font-bold gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Red Folder Only ({calendarEvents.filter(e => e.isRedFolder).length})
              </Button>
              <Button
                variant={impactFilter === "med_high" ? "default" : "outline"}
                size="sm"
                onClick={() => setImpactFilter("med_high")}
                className="h-7 text-xs"
              >
                Medium &amp; High
              </Button>
              <Button
                variant={impactFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setImpactFilter("all")}
                className="h-7 text-xs"
              >
                All Events ({calendarEvents.length})
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold">Currency:</span>
                <Select value={currencyFilter} onValueChange={(val) => setCurrencyFilter(val || "ALL")}>
                  <SelectTrigger className="w-[90px] h-7 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD" className="text-xs font-mono font-bold">USD</SelectItem>
                    <SelectItem value="ALL" className="text-xs font-mono">All</SelectItem>
                    <SelectItem value="EUR" className="text-xs font-mono">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-xs font-mono">GBP</SelectItem>
                    <SelectItem value="JPY" className="text-xs font-mono">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold">Timeline:</span>
                <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                  <SelectTrigger className="w-[110px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Week</SelectItem>
                    <SelectItem value="today" className="text-xs">Today Only</SelectItem>
                    <SelectItem value="upcoming" className="text-xs">Upcoming Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Events List */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Scheduled Economic Catalysts ({filteredEvents.length} events)
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">Times shown in EST (New York)</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No economic events matched your filters.
                </div>
              ) : (
                <div className="divide-y divide-border/40 font-mono text-xs">
                  {filteredEvents.map((evt) => (
                    <div 
                      key={evt.id} 
                      className={cn(
                        "p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors",
                        evt.isRedFolder && "bg-rose-500/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Impact Badge */}
                        <div className={cn(
                          "w-3 h-3 rounded-full shrink-0",
                          evt.impact === "High" ? "bg-rose-500 ring-4 ring-rose-500/20" :
                          evt.impact === "Medium" ? "bg-amber-500" : "bg-neutral-600"
                        )} title={`${evt.impact} Impact`} />

                        {/* Country */}
                        <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 border-border">
                          {evt.country}
                        </Badge>

                        {/* Event Title */}
                        <div>
                          <span className="font-sans font-bold text-foreground text-[13px] block">
                            {evt.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-sans">
                            {evt.dateStr} • {evt.timeEST} EST
                          </span>
                        </div>
                      </div>

                      {/* Right Telemetry: Numbers & Countdown */}
                      <div className="flex items-center gap-4 text-[11px] ml-6 sm:ml-0">
                        <div className="space-y-0.5 text-right">
                          <span className="text-[10px] text-muted-foreground uppercase block">Forecast / Prev</span>
                          <span className="font-bold text-foreground">
                            {evt.forecast} <span className="text-muted-foreground font-normal">/ {evt.previous}</span>
                          </span>
                        </div>

                        {evt.isUpcoming ? (
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold px-2 py-0.5 uppercase shrink-0",
                            evt.isRedFolder ? "border-rose-500/40 text-rose-400 bg-rose-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          )}>
                            In {Math.floor(evt.minutesUntil / 60)}h {evt.minutesUntil % 60}m
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground/60 border-border/40 shrink-0">
                            Released
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyEvent(evt)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Copy details for Daily Journal"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════════════
            TAB 3: AI SMART MONEY ALIGNMENT & LEAK AUDIT
        ════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="ai" className="space-y-5">
          {!aiBriefing ? (
            <Card className="border-border/60 bg-card/60 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold">Synthesize AI Macro Gameplan</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Correlate your verified trades on {symbolConfig.name} with institutional order flow, detect whether you trade with or against smart money, and receive an actionable weekly playbook.
                </p>
              </div>
              <Button
                onClick={handleGenerateAiBriefing}
                disabled={generatingAi}
                className="font-bold text-xs gap-2"
              >
                <Sparkles className={cn("w-4 h-4", generatingAi && "animate-spin")} />
                {generatingAi ? "Running AI Macro Audit..." : `Analyze ${selectedSymbol} Trades vs COT`}
              </Button>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Executive Headline Card */}
              <Card className="border-primary/40 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px] font-bold uppercase tracking-wider">
                      AI Macro Gameplan
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      Asset: <strong className="text-foreground">{aiBriefing.symbol}</strong> • Generated just now
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAiBriefing}
                    disabled={generatingAi}
                    className="h-7 text-xs font-semibold gap-1.5"
                  >
                    <RotateCw className={cn("w-3 h-3", generatingAi && "animate-spin")} /> Re-Analyze
                  </Button>
                </div>

                <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-snug">
                  &ldquo;{aiBriefing.headline}&rdquo;
                </h3>
              </Card>

              {/* Trader Correlation Telemetry (Aligned vs Counter) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/60 bg-card/60 p-4 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Institutional Alignment Score
                  </span>
                  <div className="text-2xl font-black font-mono flex items-center gap-2">
                    <span className={aiBriefing.tradeAlignmentScore >= 60 ? "text-emerald-400" : "text-amber-400"}>
                      {aiBriefing.tradeAlignmentScore}%
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {aiBriefing.traderStats.totalTradesAnalyzed} Trades Analyzed
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Percentage of your {symbolConfig.symbol} executions taken in alignment with Smart Money bias.
                  </p>
                </Card>

                <Card className="border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Trades Aligned with Smart Money
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {aiBriefing.traderStats.alignedWinRate}% WR
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({aiBriefing.traderStats.alignedTradesCount} trades)
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    Net: {fmtCurrency(aiBriefing.traderStats.alignedPnL)}
                  </div>
                </Card>

                <Card className="border-rose-500/30 bg-rose-500/5 p-4 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                    Trades Counter to Smart Money
                  </span>
                  <div className="text-2xl font-black font-mono text-rose-400">
                    {aiBriefing.traderStats.counterWinRate}% WR
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({aiBriefing.traderStats.counterTradesCount} trades)
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-rose-400">
                    Net: {fmtCurrency(aiBriefing.traderStats.counterPnL)}
                  </div>
                </Card>
              </div>

              {/* Detailed Findings & Actionable Playbook */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Findings */}
                <Card className="border-border/60 bg-card/60 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Key Institutional Findings
                  </h4>
                  <ul className="space-y-2 text-xs text-foreground/90 leading-relaxed">
                    {aiBriefing.keyFindings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Actionable Playbook Advice */}
                <Card className="border-border/60 bg-card/60 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Actionable Execution Rules
                  </h4>
                  <p className="text-xs text-foreground/90 leading-relaxed p-3 rounded-xl bg-muted/20 border border-border/40 font-mono">
                    {aiBriefing.actionablePlaybookAdvice}
                  </p>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>{aiBriefing.propFirmRuleSafeguard}</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
