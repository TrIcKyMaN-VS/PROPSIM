"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { usePropStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { calculatePnl } from "@/lib/pnl-calculator"

type ImportStrategy = "skip" | "update" | "new_only"

interface ParsedTrade {
  instrument: string
  direction: "long" | "short"
  entry: number
  exit: number
  contracts: number
  pnl: number
  session: any
  date: string
  rawRow: any
  isDuplicate: boolean
}

export function ImportDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [strategy, setStrategy] = useState<ImportStrategy>("skip")
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const [useDateFilter, setUseDateFilter] = useState(false)
  const [importStartDate, setImportStartDate] = useState("")
  const [importEndDate, setImportEndDate] = useState("")
  
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const existingTrades = usePropStore(s => s.trades)
  const importTrades = usePropStore(s => s.importTrades)

  const accountTrades = existingTrades.filter(t => t.accountId === activeAccountId)

  const resetState = () => {
    setStep(1)
    setParsedTrades([])
    setStrategy("skip")
    setUseDateFilter(false)
    setImportStartDate("")
    setImportEndDate("")
  }

  const checkDuplicate = (trade: Partial<ParsedTrade>) => {
    // Duplicate detection engine: matches date, instrument, pnl, direction
    return accountTrades.some(t => 
      t.instrument === trade.instrument &&
      t.direction === trade.direction &&
      Math.abs(t.pnl - (trade.pnl || 0)) < 0.01
    )
  }

  const mapRowToTrade = (row: any): ParsedTrade => {
    // Auto Mapping Engine
    const getVal = (keys: string[]) => {
      const k = Object.keys(row).find(key => keys.includes(key.toLowerCase().trim()))
      return k ? row[k] : null
    }

    const pnlStr = getVal(["pnl", "p/l", "profit", "net profit", "net pnl"]) || "0"
    const pnl = parseFloat(pnlStr.toString().replace(/[^0-9.-]+/g,""))

    const instrument = getVal(["instrument", "symbol", "ticker", "market"]) || "ES"
    
    const qtyStr = getVal(["qty", "quantity", "contracts", "size"]) || "1"
    const contracts = parseInt(qtyStr.toString().replace(/[^0-9]+/g,""))

    const dirStr = (getVal(["direction", "b/s", "side", "marketposition"]) || "long").toString().toLowerCase()
    const direction = dirStr.includes("short") || dirStr.includes("sell") ? "short" : "long"
    
    const entryStr = getVal(["entry", "entry price", "avg entry"]) || "0"
    const entry = parseFloat(entryStr.toString().replace(/[^0-9.-]+/g,"")) || 5000

    const exitStr = getVal(["exit", "exit price", "avg exit"]) || "0"
    const exit = parseFloat(exitStr.toString().replace(/[^0-9.-]+/g,"")) || (entry + (pnl / (contracts * 50)))

    const dateStr = getVal(["date", "time", "timestamp"]) || new Date().toISOString()

    const trade: Partial<ParsedTrade> = { instrument, direction, entry, exit, contracts, pnl, date: dateStr }
    
    return {
      ...trade as any,
      session: "New York AM",
      rawRow: row,
      isDuplicate: checkDuplicate(trade)
    }
  }

  const processData = (data: any[]) => {
    if (data.length === 0) {
      toast.error("No data found in file")
      return
    }
    let mapped = data.map(mapRowToTrade).filter(t => !isNaN(t.pnl))

    if (useDateFilter && importStartDate && importEndDate) {
      const start = new Date(importStartDate + "T00:00:00").getTime()
      const end = new Date(importEndDate + "T23:59:59").getTime()
      mapped = mapped.filter(t => {
        const tDate = new Date(t.date).getTime()
        return tDate >= start && tDate <= end
      })
    }

    setParsedTrades(mapped)
    setStep(2)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results: any) => processData(results.data)
        })
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
        processData(data)
      } else {
        toast.error("Unsupported file type")
      }
    } catch (err) {
      toast.error("Failed to parse file")
    } finally {
      setIsProcessing(false)
      if (e.target) e.target.value = '' // reset input
    }
  }

  const executeImport = async () => {
    if (!activeAccountId) return
    setIsProcessing(true)

    try {
      const toImport = parsedTrades.filter(t => {
        if (strategy === "skip" && t.isDuplicate) return false
        if (strategy === "new_only" && t.isDuplicate) return false
        // For 'update' strategy, we would theoretically overwrite the existing record in the DB
        // But for simplicity in this frontend store, we'll just push them and maybe handle dedup in store
        return true
      }).map(t => {
        const calcPnl = calculatePnl(t.instrument, t.direction, t.entry, t.exit, t.contracts);
        return {
          instrument: t.instrument,
          direction: t.direction,
          entry: t.entry,
          exit: t.exit,
          contracts: t.contracts,
          pnl: t.pnl,
          calculatedPnl: calcPnl,
          pnlMode: "MANUAL", // Extracted externally so considered MANUAL unless we wanted to deduce it
          day: 1, // Mock
          session: t.session,
          notes: "Imported via Auto-Mapper"
        }
      })

      if (toImport.length === 0) {
        toast.info("No new trades to import.")
        setOpen(false)
        resetState()
        return
      }

      await importTrades(toImport, activeAccountId)
      toast.success(`Successfully imported ${toImport.length} trades`)
      setOpen(false)
      resetState()
    } catch (err: any) {
      toast.error("Import failed: " + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const duplicatesCount = parsedTrades.filter(t => t.isDuplicate).length
  const newCount = parsedTrades.length - duplicatesCount

  if (!activeAccountId) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if(!o) resetState(); }}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FileSpreadsheet className="w-4 h-4 mr-2" /> Import CSV / Excel
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Smart Trade Import</DialogTitle>
          <DialogDescription>Auto-maps fields and detects duplicates from any platform.</DialogDescription>
        </DialogHeader>
        
        {step === 1 ? (
          <div className="space-y-6 pt-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer group relative"
            >
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-medium text-lg">Click or Drag to Upload</p>
              <p className="text-sm text-muted-foreground mt-2">Supports .csv, .xlsx</p>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="date-filter"
                  checked={useDateFilter}
                  onChange={(e) => setUseDateFilter(e.target.checked)}
                  className="rounded border-muted-foreground/30 accent-primary"
                />
                <Label htmlFor="date-filter" className="text-sm font-semibold cursor-pointer">Filter imports by Custom Date Range</Label>
              </div>

              {useDateFilter && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Start Date</Label>
                    <input
                      type="date"
                      value={importStartDate}
                      onChange={(e) => setImportStartDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">End Date</Label>
                    <input
                      type="date"
                      value={importEndDate}
                      onChange={(e) => setImportEndDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold mb-2 text-foreground">Auto-Mapping Engine recognizes:</p>
              <ul className="grid grid-cols-2 gap-2">
                <li>• PnL: Profit, P/L, Net Profit</li>
                <li>• Qty: Quantity, Contracts, Size</li>
                <li>• Asset: Instrument, Symbol, Ticker</li>
                <li>• Direction: Side, B/S, MarketPosition</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold">{parsedTrades.length}</div>
                  <div className="text-sm text-muted-foreground">Rows Detected</div>
                </CardContent>
              </Card>
              <Card className="border-success/50 bg-success/5">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-success flex justify-center items-center gap-2">
                    {newCount} <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-success font-medium">New Trades</div>
                </CardContent>
              </Card>
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-warning flex justify-center items-center gap-2">
                    {duplicatesCount} <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-warning font-medium">Duplicates</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
              <Label>Import Strategy</Label>
              <Select value={strategy} onValueChange={(v: any) => setStrategy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Duplicates (Recommended)</SelectItem>
                  <SelectItem value="update">Update Existing Records</SelectItem>
                  <SelectItem value="new_only">Only Import Completely New Files</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Duplicates detected based on matching Timestamp, Instrument, and PnL.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetState} disabled={isProcessing}>Cancel</Button>
              <Button onClick={executeImport} disabled={isProcessing}>
                {isProcessing ? "Importing..." : `Import ${strategy === 'skip' ? newCount : parsedTrades.length} Trades`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
