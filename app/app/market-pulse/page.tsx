"use client"

import { useState, useEffect, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { 
  MacroSymbol, 
  SUPPORTED_MACRO_SYMBOLS, 
  CotReportSummary, 
  EconomicEvent,
  AiMacroBriefing,
  CotDataPoint,
  RealEdgeData,
  DEFAULT_REFERENCE_PRICES
} from "@/lib/types-macro"
import { 
  getCotReportAction, 
  getEconomicCalendarAction, 
  generateAiMacroBriefingAction,
  getRealEdgeDataAction
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
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Gauge
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
  ReferenceLine,
  ReferenceDot
} from "recharts"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { fmtCurrency, fmtPnl } from "@/lib/format"

// Timezone-safe date formatters for CFTC reports (avoids UTC offset day-shift bugs)
function formatCotDate(dateStr?: string) {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  if (!y || !m || !d) return dateStr
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const mName = months[parseInt(m, 10) - 1] || m
  return `${mName} ${parseInt(d, 10)}, ${y}`
}

function formatAxisDate(dateStr?: string) {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  if (!y || !m || !d) return dateStr
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const mName = months[parseInt(m, 10) - 1] || m
  return `${mName} ${parseInt(d, 10)}`
}

export default function MarketPulsePage() {
  // Default symbol is NQ (changeable)
  const [selectedSymbol, setSelectedSymbol] = useState<MacroSymbol>("NQ")
  const [activeTab, setActiveTab] = useState<string>("graph")
  
  // Graph Mode: "long_short" or "net" (matching screenshot)
  const [chartViewMode, setChartViewMode] = useState<"long_short" | "net">("long_short")
  
  // Timeframe: 3M, 6M, 1Y, All
  const [timeframe, setTimeframe] = useState<"3M" | "6M" | "1Y" | "ALL">("1Y")

  // Fullscreen expand mode
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Clean asset title (e.g. "Nasdaq 100" matching screenshot)
  const cleanAssetTitle = useMemo(() => {
    switch (selectedSymbol) {
      case "NQ": return "Nasdaq 100"
      case "ES": return "S&P 500"
      case "YM": return "Dow Jones 30"
      case "RTY": return "Russell 2000"
      case "GC": return "Gold"
      case "CL": return "Crude Oil"
      case "6E": return "Euro FX"
      case "6B": return "British Pound"
      case "BTC": return "Bitcoin Futures"
      default: return selectedSymbol
    }
  }, [selectedSymbol])

  // Data States
  const [cotData, setCotData] = useState<CotReportSummary | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<EconomicEvent[]>([])
  const [aiBriefing, setAiBriefing] = useState<AiMacroBriefing | null>(null)
  const [realEdgeData, setRealEdgeData] = useState<RealEdgeData | null>(null)
  
  // Loading States
  const [loadingCot, setLoadingCot] = useState(true)
  const [loadingCalendar, setLoadingCalendar] = useState(true)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [loadingRealEdge, setLoadingRealEdge] = useState(false)

  // Real Edge Dynamic Price & Toggle States
  const [referencePriceInput, setReferencePriceInput] = useState<string>("27750")
  const [showAiTradeReview, setShowAiTradeReview] = useState(false)
  
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

  // 2. Fetch Real Edge Engine Data (5 modules)
  const loadRealEdge = async (symbol: MacroSymbol, priceOverride?: number) => {
    setLoadingRealEdge(true)
    try {
      const priceToUse = priceOverride !== undefined 
        ? priceOverride 
        : (parseFloat(referencePriceInput) || DEFAULT_REFERENCE_PRICES[symbol] || 27750)
      const res = await getRealEdgeDataAction(symbol, priceToUse)
      if (res.success && res.data) {
        setRealEdgeData(res.data)
      } else {
        toast.error(res.error || "Failed to calculate real edge data")
      }
    } catch (e: any) {
      toast.error(e.message || "Error calculating real edge engine")
    } finally {
      setLoadingRealEdge(false)
    }
  }

  // 3. Fetch Economic Calendar
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
    const defaultPrice = DEFAULT_REFERENCE_PRICES[selectedSymbol] || 27750
    setReferencePriceInput(String(defaultPrice))
    loadCotData(selectedSymbol)
    loadRealEdge(selectedSymbol, defaultPrice)
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

      return {
        date: item.date, // Unique ISO date string e.g. "2026-11-03"
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

  // Latest Data Point for active glowing dots
  const lastDataPoint = useMemo(() => {
    return chartData[chartData.length - 1] || null
  }, [chartData])

  // Computed unique tick dates so ticks never repeat or collide
  const chartTicks = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    
    if (timeframe === "1Y" || timeframe === "ALL") {
      // Pick first report of each month, plus the latest report
      const seenMonths = new Set<string>()
      const ticks: string[] = []
      for (const pt of chartData) {
        const ym = pt.date.slice(0, 7) // "YYYY-MM"
        if (!seenMonths.has(ym)) {
          seenMonths.add(ym)
          ticks.push(pt.date)
        }
      }
      const lastDate = chartData[chartData.length - 1]?.date
      if (lastDate && !ticks.includes(lastDate)) {
        ticks.push(lastDate)
      }
      return ticks
    }

    if (timeframe === "6M") {
      // Pick every 3rd point, plus latest
      const ticks: string[] = []
      for (let i = 0; i < chartData.length; i += 3) {
        ticks.push(chartData[i].date)
      }
      const lastDate = chartData[chartData.length - 1]?.date
      if (lastDate && !ticks.includes(lastDate)) {
        ticks.push(lastDate)
      }
      return ticks
    }

    // 3M timeframe: pick every 2nd point, plus latest (7 distinct ticks)
    const ticks: string[] = []
    for (let i = 0; i < chartData.length; i += 2) {
      ticks.push(chartData[i].date)
    }
    const lastDate = chartData[chartData.length - 1]?.date
    if (lastDate && !ticks.includes(lastDate)) {
      ticks.push(lastDate)
    }
    return ticks
  }, [chartData, timeframe])

  // Format tick labels based on timeframe (YY-MM for 1Y/ALL; Month Day for 3M/6M)
  const formatAxisDate = (dateStr?: string) => {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-")
    if (!y || !m || !d) return dateStr

    if (timeframe === "1Y" || timeframe === "ALL") {
      // Exact match to reference screenshot: "25-10", "25-11", "26-01", "26-09"
      return `${y.slice(2)}-${m}`
    }

    // For 3M and 6M: show Month and Day e.g. "Aug 11", "Sep 8", "Oct 6", "Nov 3"
    // so every date is clear and unambiguous without repeating months!
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const mName = months[parseInt(m, 10) - 1] || m
    return `${mName} ${parseInt(d, 10)}`
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
      const dateFormatted = formatCotDate(data.date)

      return (
        <div className="bg-neutral-900/95 border border-neutral-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono min-w-[190px] space-y-1.5 pointer-events-none">
          <div className="text-[11px] font-bold text-neutral-300 border-b border-neutral-800 pb-1">
            {dateFormatted}
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Net</span>
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
            <span className="text-neutral-400">Long</span>
            <div className="flex items-center gap-1 font-bold text-neutral-200">
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
            <span className="text-neutral-400">Short</span>
            <div className="flex items-center gap-1 font-bold text-neutral-200">
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
                ({cleanAssetTitle})
              </span>
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              As of {cotData ? cotData.latestDate : "2026-09-29"} • CFTC Official Socrata Feed
            </div>
          </div>
        </div>

        {/* Right Section: Action Buttons + Asset Dropdown + Giant Score Badge */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadCotData(selectedSymbol)
              loadCalendarData()
            }}
            disabled={loadingCot}
            className="h-9 text-xs font-semibold gap-1.5 bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
          >
            <RotateCw className={cn("w-3.5 h-3.5", loadingCot && "animate-spin")} />
            Sync CFTC
          </Button>

          <Button
            size="sm"
            onClick={handleGenerateAiBriefing}
            disabled={generatingAi}
            className="h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Sparkles className={cn("w-3.5 h-3.5", generatingAi && "animate-spin")} />
            {generatingAi ? "Calculating Edge..." : "AI Edge Analysis"}
          </Button>

          {/* Asset Switcher (Default NQ) */}
          <Select 
            value={selectedSymbol} 
            onValueChange={(val) => { if (val) setSelectedSymbol(val as MacroSymbol) }}
          >
            <SelectTrigger className="w-[145px] h-9 bg-neutral-900 border-neutral-800 text-white font-bold text-xs">
              <SelectValue placeholder="Select Asset" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
              {Object.values(SUPPORTED_MACRO_SYMBOLS).map((cfg) => (
                <SelectItem key={cfg.symbol} value={cfg.symbol} className="text-xs font-medium focus:bg-neutral-800">
                  <span className="font-bold text-primary mr-1.5">{cfg.symbol}</span>
                  <span>{cfg.name.split(" ")[0]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Giant Score Badge (e.g. +30 LONG matching screenshot) */}
          {cotData && (
            <div className={cn(
              "px-3.5 py-1 rounded-xl border flex flex-col items-center justify-center min-w-[70px] shadow-lg",
              cotData.biasScore >= 0 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            )}>
              <span className="text-lg font-black font-mono leading-tight">
                {cotData.biasScore >= 0 ? "+" : ""}{cotData.biasScore}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider">
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
              {cleanAssetTitle}
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
            <CardTitle className="text-lg font-bold text-white tracking-tight">
              {cleanAssetTitle}
            </CardTitle>

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
                    <span className="text-2xl font-black font-mono text-white">
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
                    <span className="text-2xl font-black font-mono text-white">
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
          {/* Subheader Toolbar: Mode Toggle (Net vs Long/Short) & Timeframes (3M, 6M, 1Y, All) & Expand */}
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

            {/* Timeframe Pills (3M, 6M, 1Y, All) + Maximize Button */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
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

              {/* Expand / Maximize Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Expand Chart"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Interactive Recharts Canvas */}
          <div className={cn("w-full pt-4 transition-all duration-300", isFullscreen ? "h-[540px]" : "h-[320px] sm:h-[380px]")}>
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
                    dataKey="date" 
                    ticks={chartTicks}
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                    tickFormatter={formatAxisDate}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <RechartsTooltip 
                    content={<CustomChartTooltip />} 
                    cursor={{ stroke: "#525252", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
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
                  {/* Glowing Dots on Latest Point (matching screenshot) */}
                  {lastDataPoint && (
                    <>
                      <ReferenceDot 
                        x={lastDataPoint.date} 
                        y={lastDataPoint.long} 
                        r={4.5} 
                        fill="#10b981" 
                        stroke="#047857" 
                        strokeWidth={2} 
                      />
                      <ReferenceDot 
                        x={lastDataPoint.date} 
                        y={lastDataPoint.short} 
                        r={4.5} 
                        fill="#ef4444" 
                        stroke="#b91c1c" 
                        strokeWidth={2} 
                      />
                    </>
                  )}
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
                    dataKey="date" 
                    ticks={chartTicks}
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                    tickFormatter={formatAxisDate}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#737373" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: "#262626" }}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <RechartsTooltip 
                    content={<CustomChartTooltip />} 
                    cursor={{ stroke: "#525252", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fill="url(#netGradient)" 
                  />
                  {lastDataPoint && (
                    <ReferenceDot 
                      x={lastDataPoint.date} 
                      y={lastDataPoint.net} 
                      r={4.5} 
                      fill={lastDataPoint.net >= 0 ? "#10b981" : "#ef4444"} 
                      stroke="#262626" 
                      strokeWidth={2} 
                    />
                  )}
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
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                The Real AI Edge Engine (Beyond Trade History)
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                Institutional Macro Infusion
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              FedWatch rate probabilities, VIX straddle expected move, news reaction divergence tracking, and dynamic price liquidity pools.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dynamic Reference Price Input */}
            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50 text-xs font-mono">
              <span className="text-[11px] text-muted-foreground font-sans font-medium">Ref Price:</span>
              <input
                type="number"
                value={referencePriceInput}
                onChange={(e) => setReferencePriceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    loadRealEdge(selectedSymbol, parseFloat(referencePriceInput) || undefined)
                  }
                }}
                className="w-20 bg-background/90 border border-border/60 rounded px-1.5 py-0.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="27750"
              />
              <span className="text-[10px] text-muted-foreground font-bold">{selectedSymbol}</span>
            </div>

            {realEdgeData && (
              <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 bg-muted/40 border border-border/40 text-muted-foreground">
                VIX: <span className="font-bold text-amber-400 ml-1">{realEdgeData.vixLevel.toFixed(1)}</span>
              </Badge>
            )}

            <Button
              size="sm"
              onClick={() => loadRealEdge(selectedSymbol, parseFloat(referencePriceInput) || undefined)}
              disabled={loadingRealEdge}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <RotateCw className={cn("w-3.5 h-3.5", loadingRealEdge && "animate-spin")} />
              {loadingRealEdge ? "Computing..." : "Update Edge"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!aiBriefing && !generatingAi) {
                  handleGenerateAiBriefing()
                }
                setShowAiTradeReview(!showAiTradeReview)
              }}
              className="h-8 text-xs font-bold gap-1.5 border-border/60"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              {showAiTradeReview ? "Hide Trade Audit" : "AI Trade Audit"}
            </Button>
          </div>
        </div>

        {/* ── MODULE 5: MASTER CONFLUENCE SCORE BANNER ── */}
        {realEdgeData && (
          <Card className="border-border/60 bg-gradient-to-r from-card via-card/90 to-card/60 shadow-lg overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-amber-500/40 text-amber-400 bg-amber-500/10">
                    Master Confluence Engine
                  </Badge>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Institutional Macro Confluence</span>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "font-mono text-sm px-2.5 py-0.5 font-black",
                    realEdgeData.confluence.score >= 50 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                    realEdgeData.confluence.score >= 20 ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" :
                    realEdgeData.confluence.score <= -20 ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" :
                    "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  )}>
                    {realEdgeData.confluence.score > 0 ? `+${realEdgeData.confluence.score}` : realEdgeData.confluence.score} / 100 &bull; {realEdgeData.confluence.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Confluence 5-Component Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">1. COT Bias (35%)</span>
                  <span className="text-xs font-bold text-emerald-400 block font-mono">+{realEdgeData.confluence.components.cotBias.score} pts</span>
                  <p className="text-[11px] text-muted-foreground leading-tight">{realEdgeData.confluence.components.cotBias.label}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">2. FedWatch (20%)</span>
                  <span className="text-xs font-bold text-blue-400 block font-mono">+{realEdgeData.confluence.components.fedWatch.score} pts</span>
                  <p className="text-[11px] text-muted-foreground leading-tight">{realEdgeData.confluence.components.fedWatch.label}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">3. Expected Move (15%)</span>
                  <span className="text-xs font-bold text-primary block font-mono">+{realEdgeData.confluence.components.expectedMove.score} pts</span>
                  <p className="text-[11px] text-muted-foreground leading-tight">{realEdgeData.confluence.components.expectedMove.label}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">4. Reaction Div (20%)</span>
                  <span className="text-xs font-bold text-emerald-400 block font-mono">+{realEdgeData.confluence.components.reactionDivergence.score} pts</span>
                  <p className="text-[11px] text-muted-foreground leading-tight">{realEdgeData.confluence.components.reactionDivergence.label}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">5. Price Level (10%)</span>
                  <span className="text-xs font-bold text-amber-400 block font-mono">+{realEdgeData.confluence.components.priceLevel.score} pts</span>
                  <p className="text-[11px] text-muted-foreground leading-tight">{realEdgeData.confluence.components.priceLevel.label}</p>
                </div>
              </div>

              {/* Prop Firm Safeguard & Risk Warning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <span className="font-bold block font-sans">Prop Firm Execution Rule (Apex / Topstep):</span>
                    <p className="text-foreground/90 leading-relaxed text-[11px] mt-0.5">{realEdgeData.confluence.propFirmEdge}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-bold block font-sans">Trailing Drawdown Protection:</span>
                    <p className="text-foreground/90 leading-relaxed text-[11px] mt-0.5">{realEdgeData.confluence.riskWarning}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 4 DETAIL EDGE MODULES (2x2 GRID) ── */}
        {realEdgeData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── MODULE 1: FEDWATCH RATE PROBABILITY DASHBOARD ── */}
            <Card className="border-border/60 bg-card/60 shadow-md">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                  <span>Module 1: FedWatch Rate Probabilities</span>
                  <Gauge className="w-4 h-4 text-blue-400" />
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center justify-between pt-1">
                  <span>FOMC Decision Probabilities</span>
                  <Badge variant="outline" className="font-mono text-xs border-blue-500/30 text-blue-400">
                    Next: {realEdgeData.fedRate.nextMeetingLabel} ({realEdgeData.fedRate.daysUntilMeeting}d)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between bg-muted/20 p-2.5 rounded-lg border border-border/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Fed Funds Rate</span>
                    <span className="text-lg font-black font-mono text-foreground">{realEdgeData.fedRate.currentRate.toFixed(2)}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Macro Regime Bias</span>
                    <Badge className={cn(
                      "font-mono font-bold text-xs mt-0.5",
                      realEdgeData.fedRate.marketBias === "DOVISH" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      realEdgeData.fedRate.marketBias === "HAWKISH" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                      "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    )}>
                      {realEdgeData.fedRate.marketBias} ({realEdgeData.fedRate.rateTrajectory})
                    </Badge>
                  </div>
                </div>

                {/* Probability Distribution Bars */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Priced-In Distribution (FRED FedFunds Series):
                  </span>
                  
                  {/* Cut probability */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-bold">25bps Rate Cut</span>
                      <span className="font-bold text-foreground">{realEdgeData.fedRate.cutProbability}%</span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${realEdgeData.fedRate.cutProbability}%` }} />
                    </div>
                  </div>

                  {/* Hold probability */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-amber-400 font-bold">Rate Hold (Unchanged)</span>
                      <span className="font-bold text-foreground">{realEdgeData.fedRate.holdProbability}%</span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-700" style={{ width: `${realEdgeData.fedRate.holdProbability}%` }} />
                    </div>
                  </div>

                  {/* Hike probability */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-rose-400 font-bold">Rate Hike</span>
                      <span className="font-bold text-foreground">{realEdgeData.fedRate.hikeProbability}%</span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-700" style={{ width: `${realEdgeData.fedRate.hikeProbability}%` }} />
                    </div>
                  </div>
                </div>

                {/* Actionable Fed Edge */}
                <p className="text-foreground/90 leading-relaxed font-sans text-xs bg-muted/20 p-2.5 rounded-lg border border-border/30">
                  <span className="font-bold text-blue-400 mr-1">Institutional Edge:</span>
                  {realEdgeData.fedRate.edgeSignal}
                </p>
              </CardContent>
            </Card>

            {/* ── MODULE 2: EXPECTED MOVE CALCULATOR (NEWS STRADDLE PRICING) ── */}
            <Card className="border-border/60 bg-card/60 shadow-md">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                  <span>Module 2: Expected Move Calculator</span>
                  <Zap className="w-4 h-4 text-primary" />
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center justify-between pt-1">
                  <span>Catalyst Straddle Move Limits</span>
                  <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                    VIX {realEdgeData.vixLevel.toFixed(1)} &bull; {selectedSymbol} Ref {realEdgeData.referencePrice}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="p-2 rounded bg-muted/20 border border-border/30 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Formula: <code className="text-primary font-mono font-bold">Price &times; (IV / 100) &times; &radic;(DTE / 252)</code></span>
                  <span className="text-[10px] text-muted-foreground">ATM Straddle Implied Move</span>
                </div>

                <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                  {realEdgeData.expectedMoves.map((evt, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-border/40 bg-muted/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          {evt.eventName}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] border-border/50 text-foreground">
                          {evt.timeEST} EST &bull; in {evt.daysUntil}d
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                        <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                          <span className="text-[9px] text-primary block uppercase font-bold font-sans">Expected Move</span>
                          <span className="font-bold text-primary">&plusmn;{evt.expectedMovePts} pts ({evt.movePercent}%)</span>
                        </div>

                        <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[9px] text-amber-400 block uppercase font-bold font-sans">Absorption Zone</span>
                          <span className="font-bold text-amber-300">&lt; {evt.absorptionThreshold} pts</span>
                        </div>

                        <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[9px] text-emerald-400 block uppercase font-bold font-sans">Momentum Break</span>
                          <span className="font-bold text-emerald-300">&gt; {evt.momentumThreshold} pts</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {evt.edgeNote}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── MODULE 3: NEWS REACTION DIVERGENCE SCORE ── */}
            <Card className="border-border/60 bg-card/60 shadow-md">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
                  <span>Module 3: News Reaction Divergence</span>
                  <Crosshair className="w-4 h-4 text-rose-400" />
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center justify-between pt-1">
                  <span>Priced-In vs. Actual Move Score</span>
                  <Badge className={cn(
                    "font-mono text-xs px-2 py-0.5",
                    realEdgeData.divergenceEngine.score >= 25 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    realEdgeData.divergenceEngine.score <= -25 ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                    "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}>
                    Divergence Score: {realEdgeData.divergenceEngine.score > 0 ? `+${realEdgeData.divergenceEngine.score}` : realEdgeData.divergenceEngine.score}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {realEdgeData.divergenceEngine.interpretation}
                </p>

                {/* Last 5 Events Table */}
                <div className="space-y-2 border border-border/40 rounded-xl p-2 bg-muted/10 font-mono text-[11px]">
                  <div className="grid grid-cols-4 pb-1 border-b border-border/30 text-[10px] uppercase font-bold text-muted-foreground font-sans">
                    <span>Event &amp; Print</span>
                    <span className="text-center">Expected</span>
                    <span className="text-center">Actual Reaction</span>
                    <span className="text-right">Divergence Type</span>
                  </div>

                  {realEdgeData.divergenceEngine.events.map((evt, idx) => (
                    <div key={idx} className="grid grid-cols-4 py-1.5 border-b border-border/20 last:border-b-0 items-center">
                      <div>
                        <span className="font-bold text-foreground block font-sans text-xs">{evt.eventName}</span>
                        <span className="text-[10px] text-muted-foreground">{evt.actualPrint}</span>
                      </div>

                      <div className="text-center">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold">
                          {evt.expectedDirection}
                        </Badge>
                      </div>

                      <div className="text-center font-bold text-foreground">
                        {evt.actualMoveLabel}
                      </div>

                      <div className="text-right">
                        <Badge className={cn(
                          "text-[9px] px-1.5 py-0 font-bold",
                          evt.reactionType === "DIVERGENCE_BULLISH" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          evt.reactionType === "ABSORPTION" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          evt.reactionType === "DIVERGENCE_BEARISH" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        )}>
                          {evt.reactionType.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  <span className="font-bold font-sans block">Actionable News Edge:</span>
                  <p className="text-foreground/90 leading-tight mt-0.5">{realEdgeData.divergenceEngine.actionableEdge}</p>
                </div>
              </CardContent>
            </Card>

            {/* ── MODULE 4: DYNAMIC PRICE LEVEL & LIQUIDITY LADDER ── */}
            <Card className="border-border/60 bg-card/60 shadow-md">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Module 4: Dynamic Price Level Ladder</span>
                  <Target className="w-4 h-4 text-emerald-400" />
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center justify-between pt-1">
                  <span>Institutional Liquidity Pools</span>
                  <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-400">
                    ADR: &plusmn;{realEdgeData.priceLevels.dailyAdrEstimate} pts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Levels computed dynamically around current <strong className="text-foreground">{selectedSymbol} reference price ({realEdgeData.referencePrice})</strong>. Algorithms target resting liquidity pools above swing highs and below swing lows:
                </p>

                {/* Visual Ladder */}
                <div className="space-y-1.5 font-mono text-[11px]">
                  {/* PWH / Target */}
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <span className="text-rose-400 font-bold font-sans">Previous Week High Target</span>
                    <span className="font-bold text-foreground">{realEdgeData.priceLevels.prevWeekHigh.toLocaleString()} (+{realEdgeData.priceLevels.prevWeekHigh - realEdgeData.referencePrice} pts)</span>
                  </div>

                  {/* Round number above */}
                  <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/15 flex items-center justify-between">
                    <span className="text-rose-300 font-sans">Major Round Number (Institutional Magnet)</span>
                    <span className="font-bold text-foreground">{realEdgeData.priceLevels.roundNumberAbove.toLocaleString()}</span>
                  </div>

                  {/* Buy-Side Liquidity Pool */}
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-bold font-sans block">Buy-Side Stop Pool (Resting Orders)</span>
                      <span className="text-[10px] text-muted-foreground font-sans">Stop-runs into this pool trigger short squeezes</span>
                    </div>
                    <span className="font-bold text-emerald-400 text-xs">
                      {realEdgeData.priceLevels.buySidePool.low.toLocaleString()} &ndash; {realEdgeData.priceLevels.buySidePool.high.toLocaleString()}
                    </span>
                  </div>

                  {/* Anchor Price */}
                  <div className="p-2.5 rounded-lg bg-primary/20 border-2 border-primary/40 flex items-center justify-between shadow-inner">
                    <span className="text-primary font-bold font-sans uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                      Current Reference Anchor
                    </span>
                    <span className="font-black text-foreground text-sm">{realEdgeData.referencePrice.toLocaleString()}</span>
                  </div>

                  {/* Sell-Side Liquidity Pool */}
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-between">
                    <div>
                      <span className="text-rose-400 font-bold font-sans block">Sell-Side Stop Pool (Resting Orders)</span>
                      <span className="text-[10px] text-muted-foreground font-sans">Break below this pool triggers flush runs</span>
                    </div>
                    <span className="font-bold text-rose-400 text-xs">
                      {realEdgeData.priceLevels.sellSidePool.low.toLocaleString()} &ndash; {realEdgeData.priceLevels.sellSidePool.high.toLocaleString()}
                    </span>
                  </div>

                  {/* Round number below */}
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
                    <span className="text-emerald-300 font-sans">Major Round Number (Support Defense)</span>
                    <span className="font-bold text-foreground">{realEdgeData.priceLevels.roundNumberBelow.toLocaleString()}</span>
                  </div>

                  {/* PWL / Target */}
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <span className="text-emerald-400 font-bold font-sans">Previous Week Low Target</span>
                    <span className="font-bold text-foreground">{realEdgeData.priceLevels.prevWeekLow.toLocaleString()} ({realEdgeData.priceLevels.prevWeekLow - realEdgeData.referencePrice} pts)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── OPTIONAL: COLLAPSIBLE AI TRADER AUDIT (REVIEWS USER'S 60 TRADES) ── */}
        {showAiTradeReview && aiBriefing && (
          <Card className="border-border/60 bg-muted/10 shadow-md">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Personal Account Alignment Audit ({accountTrades.length} Trades Analyzed)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Historical cross-reference between your trade entries and smart money COT regimes
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Alignment: {aiBriefing.tradeAlignmentScore}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-emerald-400 font-bold block">Smart Money Aligned Trades</span>
                  <div className="flex justify-between font-mono text-xs">
                    <span>Trades: {aiBriefing.traderStats.alignedTradesCount}</span>
                    <span>Win Rate: {aiBriefing.traderStats.alignedWinRate}%</span>
                    <span>PnL: {fmtCurrency(aiBriefing.traderStats.alignedPnL, { sign: true })}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <span className="text-rose-400 font-bold block">Counter-Trend Fades</span>
                  <div className="flex justify-between font-mono text-xs">
                    <span>Trades: {aiBriefing.traderStats.counterTradesCount}</span>
                    <span>Win Rate: {aiBriefing.traderStats.counterWinRate}%</span>
                    <span>PnL: {fmtCurrency(aiBriefing.traderStats.counterPnL, { sign: true })}</span>
                  </div>
                </div>
              </div>

              <p className="text-foreground/90 leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/30">
                {aiBriefing.actionablePlaybookAdvice}
              </p>
            </CardContent>
          </Card>
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
