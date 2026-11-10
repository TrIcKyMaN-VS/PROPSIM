"use client"

import { useState, useEffect, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { 
  MacroSymbol, 
  SUPPORTED_MACRO_SYMBOLS, 
  CotReportSummary, 
  EconomicEvent,
  AiMacroBriefing,
  CotDataPoint 
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
  Compass,
  Maximize2,
  Minimize2,
  Crosshair,
  Target,
  Zap,
  Split,
  CalendarDays
} from "lucide-react"
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  ReferenceLine
} from "recharts"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { fmtCurrency, fmtPnl } from "@/lib/format"

export default function MarketPulsePage() {
  // Default symbol is NQ (changeable)
  const [selectedSymbol, setSelectedSymbol] = useState<MacroSymbol>("NQ")
  const [activeTab, setActiveTab] = useState<string>("graph")
  
  // Graph Mode: "long_short" or "net" (matching screenshot)
  const [chartViewMode, setChartViewMode] = useState<"long_short" | "net">("long_short")
  
  // Timeframe: 3M, 6M, 1Y, All
  const [timeframe, setTimeframe] = useState<"3M" | "6M" | "1Y" | "ALL">("1Y")

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

  // 1. Fetch COT Data
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

  // Auto-generate initial AI briefing on load once cotData is ready
  useEffect(() => {
    if (cotData && !aiBriefing && !generatingAi) {
      handleGenerateAiBriefing()
    }
  }, [cotData])

  // 3. Trigger AI Macro Gameplan Synthesis
  const handleGenerateAiBriefing = async () => {
    setGeneratingAi(true)
    try {
      const res = await generateAiMacroBriefingAction(selectedSymbol, accountTrades)
      if (res.success && res.data) {
        setAiBriefing(res.data)
        toast.success(`AI Macro Edge Engine updated for ${selectedSymbol}!`)
      } else {
        toast.error(res.error || "Failed to generate AI briefing")
      }
    } catch (e: any) {
      toast.error(e.message || "Error generating AI gameplan")
    } finally {
      setGeneratingAi(false)
    }
  }

  // Filtered History for the selected timeframe
  const chartData = useMemo(() => {
    if (!cotData || !cotData.history) return []
    const total = cotData.history.length
    let count = total
    if (timeframe === "3M") count = Math.min(13, total)
    if (timeframe === "6M") count = Math.min(26, total)
    if (timeframe === "1Y") count = Math.min(52, total)

    const slice = cotData.history.slice(total - count)

    return slice.map((item, idx) => {
      // Calculate deltas relative to previous item in array
      const prev = idx > 0 ? slice[idx - 1] : item
      const netDelta = item.nonCommercialNet - prev.nonCommercialNet
      const longDelta = item.nonCommercialLong - prev.nonCommercialLong
      const shortDelta = item.nonCommercialShort - prev.nonCommercialShort

      // Formatted short date for X-axis (e.g. 26-09)
      const parts = item.date.split("-")
      const axisDate = parts.length === 3 ? `${parts[0].slice(2)}-${parts[1]}` : item.date

      return {
        date: item.date,
        axisDate,
        net: item.nonCommercialNet,
        long: item.nonCommercialLong,
        short: item.nonCommercialShort,
        openInterest: item.openInterest,
        netDelta,
        longDelta,
        shortDelta,
      }
    })
  }, [cotData, timeframe])

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
      if (impactFilter === "high" && !e.isRedFolder) return false
      if (impactFilter === "med_high" && e.impact !== "High" && e.impact !== "Medium") return false
      if (currencyFilter !== "ALL" && e.country !== currencyFilter) return false
      if (dateFilter === "today" && e.dateStr !== todayStr) return false
      if (dateFilter === "upcoming" && !e.isUpcoming) return false
      return true
    })
  }, [calendarEvents, impactFilter, currencyFilter, dateFilter])

  // Copy event to clipboard for daily journal
  const handleCopyEvent = (e: EconomicEvent) => {
    const text = `${e.title} (${e.country}) at ${e.timeEST} EST [Impact: ${e.impact}, Forecast: ${e.forecast}]`
    navigator.clipboard.writeText(text)
    toast.success("Event copied to clipboard! Paste in Daily Journal.")
  }

  // Symbol Badge Icon
  const getSymbolBadgeIcon = (sym: MacroSymbol) => {
    if (sym === "NQ") return "100"
    if (sym === "ES") return "500"
    if (sym === "YM") return "30"
    if (sym === "RTY") return "2K"
    if (sym === "GC") return "GC"
    if (sym === "CL") return "CL"
    if (sym === "6E") return "€"
    if (sym === "6B") return "£"
    return "₿"
  }

  // Custom Chart Tooltip (matches exact dark design in screenshot)
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const dateFormatted = new Date(data.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })

      return (
        <div className="bg-neutral-900/95 border border-neutral-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono min-w-[190px] space-y-1.5 pointer-events-none">
          <div className="text-[11px] font-bold text-neutral-300 border-b border-neutral-800 pb-1">
            {dateFormatted}
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Net:</span>
            <div className="flex items-center gap-1 font-bold">
              <span className={data.net >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {data.net >= 0 ? "+" : ""}{data.net.toLocaleString()}
              </span>
              <span className={cn(
                "text-[10px] ml-1",
                data.netDelta >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {data.netDelta >= 0 ? "↑ +" : "↓ "}{data.netDelta.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Long:</span>
            <div className="flex items-center gap-1 font-bold text-emerald-400">
              <span>{data.long.toLocaleString()}</span>
              <span className={cn(
                "text-[10px] ml-1",
                data.longDelta >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {data.longDelta >= 0 ? "↑ +" : "↓ "}{data.longDelta.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Short:</span>
            <div className="flex items-center gap-1 font-bold text-rose-400">
              <span>{data.short.toLocaleString()}</span>
              <span className={cn(
                "text-[10px] ml-1",
                data.shortDelta >= 0 ? "text-rose-400" : "text-emerald-400"
              )}>
                {data.shortDelta >= 0 ? "↑ +" : "↓ "}{data.shortDelta.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* ════════════════════════════════════════════════════════════════════════════
          1. TOP IDENTITY & ASSET SWITCHER (EXACT MATCH TO SCREENSHOT TOP BAR)
      ════════════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Circular Badge Icon (100 for NQ, 500 for ES, etc.) */}
          <div className="w-11 h-11 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
            {getSymbolBadgeIcon(selectedSymbol)}
          </div>

          {/* Asset Title & Date */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {selectedSymbol === "NQ" ? "NAS100" : symbolConfig.symbol}
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                ({symbolConfig.name})
              </span>
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              As of {cotData ? cotData.latestDate : "2026-09-29"} • CFTC Official Socrata Feed
            </div>
          </div>
        </div>

        {/* Right Section: Asset Dropdown + Giant Score Badge */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Asset Switcher (Default NQ) */}
          <Select 
            value={selectedSymbol} 
            onValueChange={(val) => { if (val) setSelectedSymbol(val as MacroSymbol) }}
          >
            <SelectTrigger className="w-[170px] h-9 bg-neutral-900 border-neutral-800 text-white font-bold text-xs">
              <SelectValue placeholder="Select Asset" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
              {Object.values(SUPPORTED_MACRO_SYMBOLS).map((cfg) => (
                <SelectItem key={cfg.symbol} value={cfg.symbol} className="text-xs font-medium focus:bg-neutral-800">
                  <span className="font-bold text-primary mr-1.5">{cfg.symbol}</span>
                  <span>{cfg.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Giant Score Badge (e.g. +30 LONG matching screenshot) */}
          {cotData && (
            <div className={cn(
              "px-3.5 py-1.5 rounded-xl border flex flex-col items-center justify-center min-w-[75px] shadow-lg",
              cotData.biasScore >= 0 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            )}>
              <span className="text-lg font-black font-mono leading-none">
                {cotData.biasScore >= 0 ? "+" : ""}{cotData.biasScore}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
                {cotData.biasLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          2. "WHAT SMART MONEY IS DOING" CARD (EXACT MATCH TO SCREENSHOT)
      ════════════════════════════════════════════════════════════════════════════ */}
      <Card className="border-neutral-800 bg-neutral-950 text-white shadow-xl">
        <CardContent className="p-5 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white tracking-wide">
              What smart money is doing
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-4xl">
              Comparing the latest COT report with the previous two. When large speculators keep adding shorts the bias is bearish; when they keep adding longs it is bullish.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-neutral-900">
            <span className="text-sm font-bold text-neutral-200">
              {symbolConfig.name}
            </span>

            <div className="flex items-center gap-3 flex-wrap">
              {/* 3-Report Sequence: +33,718 ➔ +56,150 ➔ +51,247 */}
              {cotData?.threeReportSequence && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-300">
                  {cotData.threeReportSequence.values.map((v, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      <span className={idx === 2 ? "font-black text-white" : "text-neutral-400"}>
                        {v >= 0 ? "+" : ""}{v.toLocaleString()}
                      </span>
                      {idx < 2 && <span className="text-neutral-600">➔</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* Status Badge: ↑ Adding longs · bullish */}
              {cotData?.threeReportSequence && (
                <div className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border",
                  cotData.threeReportSequence.isBullish
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                )}>
                  <span>{cotData.threeReportSequence.isBullish ? "↑" : "↓"}</span>
                  <span>{cotData.threeReportSequence.label}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════════════
          3. MAIN INSTITUTIONAL COT GRAPH CARD (EXACT GRAPH FORMAT FROM SCREENSHOT)
      ════════════════════════════════════════════════════════════════════════════ */}
      <Card className="border-neutral-800 bg-neutral-950 text-white shadow-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-neutral-900">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white tracking-tight">
                {symbolConfig.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadCotData(selectedSymbol)
                    loadCalendarData()
                  }}
                  disabled={loadingCot}
                  className="h-8 text-xs font-semibold gap-1.5 bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                >
                  <RotateCw className={cn("w-3.5 h-3.5", loadingCot && "animate-spin")} />
                  Sync CFTC
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerateAiBriefing}
                  disabled={generatingAi}
                  className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Sparkles className={cn("w-3.5 h-3.5", generatingAi && "animate-spin")} />
                  {generatingAi ? "Calculating Edge..." : "AI Edge Analysis"}
                </Button>
              </div>
            </div>

            {/* 3 Top Metric Columns: NET, LONG, SHORT (matching screenshot) */}
            {cotData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* NET */}
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    NET
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-2xl font-black font-mono",
                      cotData.current.nonCommercialNet >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {cotData.current.nonCommercialNet >= 0 ? "+" : ""}
                      {cotData.current.nonCommercialNet.toLocaleString()}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0 border",
                      cotData.netDelta >= 0 
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" 
                        : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                    )}>
                      {cotData.netDelta >= 0 ? "↑ +" : "↓ "}{cotData.netDelta.toLocaleString()}
                    </Badge>
                  </div>
                </div>

                {/* LONG */}
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    LONG
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {cotData.current.nonCommercialLong.toLocaleString()}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0 border",
                      cotData.longDelta >= 0 
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" 
                        : "border-rose-500/40 text-rose-400 bg-rose-500/10"
                    )}>
                      {cotData.longDelta >= 0 ? "↑ +" : "↓ "}{cotData.longDelta.toLocaleString()}
                    </Badge>
                  </div>
                </div>

                {/* SHORT */}
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    SHORT
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-rose-400">
                      {cotData.current.nonCommercialShort.toLocaleString()}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0 border",
                      cotData.shortDelta >= 0 
                        ? "border-rose-500/40 text-rose-400 bg-rose-500/10" 
                        : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    )}>
                      {cotData.shortDelta >= 0 ? "↑ +" : "↓ "}{cotData.shortDelta.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Subheader Toolbar: Mode Toggle (Net vs Long/Short) & Timeframes (3M, 6M, 1Y, All) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* View Mode Pills (Net vs Long/Short) */}
            <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setChartViewMode("net")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all",
                  chartViewMode === "net"
                    ? "bg-neutral-800 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Net
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("long_short")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all",
                  chartViewMode === "long_short"
                    ? "bg-neutral-800 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Long / Short
              </button>
            </div>

            {/* Timeframe Pills (3M, 6M, 1Y, All) */}
            <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800 self-end sm:self-auto">
              {(["3M", "6M", "1Y", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all",
                    timeframe === tf
                      ? "bg-neutral-800 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Recharts Canvas */}
          <div className="w-full h-[320px] sm:h-[380px] pt-4">
            {loadingCot ? (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs font-mono animate-pulse">
                Loading CFTC positioning history...
              </div>
            ) : chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                No positioning data found.
              </div>
            ) : chartViewMode === "long_short" ? (
              /* Long / Short Line Chart (Green Line vs Red Line) */
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="axisDate" 
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                  />
                  <YAxis 
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="long" 
                    name="Long" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={false}
                    activeDot={{ r: 5, fill: "#10b981", stroke: "#047857", strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="short" 
                    name="Short" 
                    stroke="#ef4444" 
                    strokeWidth={2.5} 
                    dot={false}
                    activeDot={{ r: 5, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              /* Net Positioning Area Chart (Green/Red Baseline) */
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="axisDate" 
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                  />
                  <YAxis 
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fill="url(#netGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-mono text-neutral-400">
            {chartViewMode === "long_short" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Long</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Short</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Net Position (Non-Commercial Speculators)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════════════
          4. THE REAL AI EDGE: BEYOND TRADE REVIEW (INSTITUTIONAL AI INFUSION)
      ════════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              The Real AI Edge Engine (Beyond Trade History)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Predictive liquidity squeeze models, pre-news execution scenarios, and institutional session roadmaps.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleGenerateAiBriefing}
            disabled={generatingAi}
            className="h-8 text-xs font-bold gap-1.5 self-start sm:self-auto"
          >
            <RotateCw className={cn("w-3.5 h-3.5", generatingAi && "animate-spin")} />
            {generatingAi ? "Synthesizing..." : "Refresh Edge Model"}
          </Button>
        </div>

        {aiBriefing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── EDGE CARD 1: Squeeze & Liquidity Trap Gauge ── */}
            <Card className="border-border/60 bg-card/60 shadow-md">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
                  <span>1. Liquidity Squeeze Model</span>
                  <Crosshair className="w-4 h-4 text-rose-400" />
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center justify-between pt-1">
                  <span>Squeeze Probability</span>
                  <Badge variant="destructive" className="font-mono text-sm px-2 py-0.5">
                    {aiBriefing.squeezeProbability}% Risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {/* Visual meter */}
                <div className="space-y-1">
                  <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden border border-border/40">
                    <div 
                      className={cn(
                        "h-full transition-all duration-700",
                        aiBriefing.squeezeProbability >= 70 ? "bg-rose-500" :
                        aiBriefing.squeezeProbability <= 35 ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${aiBriefing.squeezeProbability}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Low Risk (0%)</span>
                    <span>High Flush Risk (100%)</span>
                  </div>
                </div>

                <p className="text-foreground/90 leading-relaxed font-sans text-xs bg-muted/20 p-2.5 rounded-lg border border-border/30">
                  {aiBriefing.squeezeWarning}
                </p>

                {/* Key Stop Liquidity Targets */}
                <div className="space-y-2 pt-1 border-t border-border/40 font-mono">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block font-sans">
                    Institutional Stop-Loss Liquidity Pools:
                  </span>
                  
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">Buy-Side Pool:</span>
                    <span className="font-bold text-foreground">{aiBriefing.liquidityPoolTargets.buySide}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                    <span className="text-rose-400 font-bold">Sell-Side Pool:</span>
                    <span className="font-bold text-foreground">{aiBriefing.liquidityPoolTargets.sellSide}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── EDGE CARD 2: Pre-News "If-Then" Scenario Matrix ── */}
            <Card className="border-border/60 bg-card/60 shadow-md lg:col-span-2">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                  <span>2. Pre-News Catalyst Execution Matrix</span>
                  <Zap className="w-4 h-4 text-primary" />
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center gap-2 pt-1">
                  <span>If-Then Scenario Simulator (Don&apos;t Gamble on News)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Before high-impact events drop, institutions pre-position for 3 outcomes. Follow this probabilistic execution plan:
                </p>

                <div className="space-y-2.5">
                  {aiBriefing.economicScenarioMatrix.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-border/50 bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          {item.eventName} ({item.timeEST} EST)
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase border-rose-500/30 text-rose-400">
                          {item.impact} Impact
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                        {/* Hot Scenario */}
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 space-y-1">
                          <span className="font-bold text-rose-400 block font-sans">IF HOT / HAWKISH</span>
                          <p className="text-foreground/90 leading-tight">{item.hotScenario}</p>
                        </div>

                        {/* Cool Scenario */}
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                          <span className="font-bold text-emerald-400 block font-sans">IF COOL / DOVISH</span>
                          <p className="text-foreground/90 leading-tight">{item.coolScenario}</p>
                        </div>

                        {/* In-Line Scenario */}
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                          <span className="font-bold text-amber-400 block font-sans">IF IN-LINE / CHOP</span>
                          <p className="text-foreground/90 leading-tight">{item.inlineScenario}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── EDGE CARD 3: Weekly Session-by-Session Master Plan ── */}
            <Card className="border-border/60 bg-card/60 shadow-md lg:col-span-2">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>3. Weekly Session Roadmap (Mon &rarr; Fri)</span>
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                </CardDescription>
                <CardTitle className="text-base font-bold pt-1">
                  Institutional Weekly Cycle Playbook
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {aiBriefing.weeklySessionPlan.map((dayPlan, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-border/40 bg-muted/10 space-y-1.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-foreground text-xs uppercase">{dayPlan.day}</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-bold px-1 py-0 uppercase",
                            dayPlan.riskLevel === "HIGH" ? "border-rose-500/40 text-rose-400" :
                            dayPlan.riskLevel === "MEDIUM" ? "border-amber-500/40 text-amber-400" :
                            "border-emerald-500/40 text-emerald-400"
                          )}>
                            {dayPlan.riskLevel}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-primary font-mono font-bold block">{dayPlan.phase}</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                          {dayPlan.tacticalAction}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── EDGE CARD 4: Intermarket Macro Divergence ── */}
            <Card className="border-border/60 bg-card/60 shadow-md">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                  <span>4. Intermarket Divergence Scanner</span>
                  <Split className="w-4 h-4 text-blue-400" />
                </CardDescription>
                <CardTitle className="text-base font-bold pt-1">
                  {aiBriefing.macroDivergence.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-foreground/90 leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/40">
                  {aiBriefing.macroDivergence.analysis}
                </p>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Apex/Topstep Rule: {aiBriefing.propFirmRuleSafeguard}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          5. LIVE ECONOMIC NEWS CALENDAR (RED FOLDER GUARDIAN)
      ════════════════════════════════════════════════════════════════════════════ */}
      <Card className="border-neutral-800 bg-neutral-950 text-white shadow-xl">
        <CardHeader className="p-5 pb-3 border-b border-neutral-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-400" />
                Live Economic News Calendar (Red Folder Guardian)
              </CardTitle>
              <CardDescription className="text-xs text-neutral-400 mt-0.5">
                Real-time releases with countdown timers &bull; Strict news holding violation safeguard
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={impactFilter === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setImpactFilter("high")}
                className="h-7 text-xs font-bold gap-1 bg-neutral-900 border-neutral-800"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Red Folder ({calendarEvents.filter(e => e.isRedFolder).length})
              </Button>
              <Button
                variant={impactFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setImpactFilter("all")}
                className="h-7 text-xs bg-neutral-900 border-neutral-800 text-neutral-300"
              >
                All ({calendarEvents.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No economic releases matching filters.
            </div>
          ) : (
            <div className="divide-y divide-neutral-900 font-mono text-xs">
              {filteredEvents.slice(0, 15).map((evt) => (
                <div 
                  key={evt.id} 
                  className={cn(
                    "p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/50 transition-colors",
                    evt.isRedFolder && "bg-rose-500/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      evt.impact === "High" ? "bg-rose-500 ring-4 ring-rose-500/20" :
                      evt.impact === "Medium" ? "bg-amber-500" : "bg-neutral-600"
                    )} />

                    <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 border-neutral-800 text-neutral-300">
                      {evt.country}
                    </Badge>

                    <div>
                      <span className="font-sans font-bold text-white text-[13px] block">
                        {evt.title}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-sans">
                        {evt.dateStr} • {evt.timeEST} EST
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] ml-6 sm:ml-0">
                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] text-neutral-400 uppercase block">Forecast / Prev</span>
                      <span className="font-bold text-white">
                        {evt.forecast} <span className="text-neutral-500 font-normal">/ {evt.previous}</span>
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
                      <Badge variant="outline" className="text-[10px] text-neutral-500 border-neutral-800 shrink-0">
                        Released
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyEvent(evt)}
                      className="h-7 w-7 text-neutral-400 hover:text-white hover:bg-neutral-800"
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
    </div>
  )
}
