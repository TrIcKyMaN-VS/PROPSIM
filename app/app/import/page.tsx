"use client"

import { useState, useRef } from "react"
import { usePropStore } from "@/lib/store"
import { parseCSVData, isDuplicate, ParsedTrade, ImportStrategy } from "@/lib/import-engine"
import { logManualImport } from "@/app/actions/import-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { FileUp, FileSpreadsheet, Check, AlertTriangle, PlayCircle } from "lucide-react"

export default function ImportCenterPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const addTrade = usePropStore(s => s.addTrade)
  const existingTrades = usePropStore(s => s.trades)
  
  const [fileData, setFileData] = useState<{ platform: string, trades: ParsedTrade[] } | null>(null)
  const [strategy, setStrategy] = useState<ImportStrategy>("Skip")
  const fileInput = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n").filter(l => l.trim())
        if (lines.length < 2) throw new Error("File empty or missing headers")
        
        const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim())
        
        const rows = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.replace(/"/g, "").trim())
          const obj: any = {}
          headers.forEach((h, i) => {
            obj[h] = values[i]
          })
          return obj
        })

        const parsed = parseCSVData(rows)
        setFileData(parsed)
        toast.success(`Detected ${parsed.platform} Export (${parsed.trades.length} trades)`)
      } catch (err) {
        toast.error("Invalid CSV format")
      }
    }
    reader.readAsText(file)
  }

  const handleExecuteImport = async () => {
    if (!fileData || !activeAccountId) {
      toast.error("No file parsed or active account selected")
      return
    }

    setIsProcessing(true)
    let added = 0
    let skipped = 0

    try {
      for (const t of fileData.trades) {
        const dup = isDuplicate(t, existingTrades)
        if (dup && strategy === "Skip") {
          skipped++
          continue
        }
        
        // Mock pushing to the Zustand store (which syncs with DB inside addTrade)
        const entryTimeMs = new Date(t.date).getTime()
        await addTrade({
          accountId: activeAccountId,
          instrument: t.instrument,
          direction: t.direction,
          entry: t.entry,
          exit: t.exit,
          contracts: t.contracts,
          pnl: t.pnl,
          day: 1, // simplified logic, normally calculate day from date
          session: "New York AM",
          timestamp: isNaN(entryTimeMs) ? Date.now() : entryTimeMs,
          exitTime: t.exitTime
        })
        added++
      }

      await logManualImport(
        fileData.platform + " CSV",
        added,
        skipped,
        0,
        "Success",
        `Imported ${added} trades.`
      )

      toast.success(`Import Complete. Added: ${added}, Skipped: ${skipped}`)
      setFileData(null)
      if (fileInput.current) fileInput.current.value = ""
    } catch (e: any) {
      toast.error("Import failed mid-process")
      await logManualImport(fileData.platform + " CSV", added, skipped, 1, "Failed", e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade Import Center</h1>
        <p className="text-muted-foreground">Automatically import, parse, and synchronize your trades from external platforms.</p>
      </div>

      {!fileData ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-dashed border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2">Upload CSV / Excel</h3>
              <p className="text-sm text-muted-foreground mb-6">Drop your exported file from NinjaTrader, Tradovate, TradeLocker, or Quantower. We'll handle the rest.</p>
              <Button onClick={() => fileInput.current?.click()}><FileUp className="w-4 h-4 mr-2" /> Select File</Button>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInput} onChange={handleFileUpload} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-center gap-3"><Badge variant="outline" className="w-24 justify-center">NinjaTrader</Badge> <span className="text-sm text-muted-foreground">Executions or Trades Export</span></li>
                <li className="flex items-center gap-3"><Badge variant="outline" className="w-24 justify-center">Tradovate</Badge> <span className="text-sm text-muted-foreground">Order History CSV</span></li>
                <li className="flex items-center gap-3"><Badge variant="outline" className="w-24 justify-center">TradeLocker</Badge> <span className="text-sm text-muted-foreground">Position Export</span></li>
                <li className="flex items-center gap-3"><Badge variant="secondary" className="w-24 justify-center">Generic</Badge> <span className="text-sm text-muted-foreground">Auto-mapped by Smart Engine</span></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-primary/50">
            <CardHeader className="bg-muted/20 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">Import Preview <Badge className="ml-2 bg-primary/20 text-primary hover:bg-primary/30">{fileData.platform} Detected</Badge></CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Review your parsed data before committing to your journal.</p>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Duplicate Strategy</label>
                    <Select value={strategy} onValueChange={(v: any) => v && setStrategy(v as ImportStrategy)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Skip">Skip Duplicates</SelectItem>
                        <SelectItem value="Update">Update Existing</SelectItem>
                        <SelectItem value="NewOnly">Import as New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleExecuteImport} disabled={isProcessing} className="mt-4"><PlayCircle className="w-4 h-4 mr-2" /> {isProcessing ? "Importing..." : "Execute Import"}</Button>
                  <Button variant="outline" onClick={() => setFileData(null)} disabled={isProcessing} className="mt-4 text-destructive border-destructive/30">Cancel</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Instrument</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Entry</th>
                      <th className="px-6 py-3 text-right">Exit</th>
                      <th className="px-6 py-3 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.trades.map((t, i) => {
                      const isDup = isDuplicate(t, existingTrades)
                      return (
                        <tr key={i} className={`border-b border-border/50 ${isDup && strategy === 'Skip' ? 'opacity-50 bg-muted/20' : ''}`}>
                          <td className="px-6 py-3">
                            {isDup ? <Badge variant="outline" className="text-amber-500 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1"/> Duplicate</Badge> : <Badge variant="outline" className="text-success border-success/30"><Check className="w-3 h-3 mr-1"/> New</Badge>}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">{t.date.split("T")[0]}</td>
                          <td className="px-6 py-3 font-medium">{t.instrument}</td>
                          <td className="px-6 py-3 text-right">{t.contracts}</td>
                          <td className="px-6 py-3 text-right text-muted-foreground">{t.entry}</td>
                          <td className="px-6 py-3 text-right text-muted-foreground">{t.exit}</td>
                          <td className={`px-6 py-3 text-right font-bold ${t.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${t.pnl.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
