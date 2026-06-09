"use client"

import { useState } from "react"
import Papa from "papaparse"
import { usePropStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Upload } from "lucide-react"

export function CSVImport() {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<"tradovate" | "ninjatrader" | "generic">("tradovate")
  const importTrades = usePropStore(s => s.importTrades)
  const activeAccountId = usePropStore(s => s.activeAccountId)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeAccountId) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const trades = []
          for (let i = 0; i < results.data.length; i++) {
            const row: any = results.data[i]
            
            // Map rows based on platform
            let pnl = 0, instrument = "ES", contracts = 1, direction: "long" | "short" = "long", entry = 0, exit = 0

            if (platform === "tradovate") {
              pnl = parseFloat(row["P&L"] || "0")
              instrument = row["Symbol"] || "ES"
              contracts = parseInt(row["Qty"] || "1")
              direction = row["B/S"] === "Buy" ? "long" : "short"
            } else if (platform === "ninjatrader") {
              pnl = parseFloat(row["Profit"] || "0")
              instrument = row["Instrument"] || "ES"
              contracts = parseInt(row["Quantity"] || "1")
              direction = row["MarketPosition"] === "Long" ? "long" : "short"
            } else {
              pnl = parseFloat(row["pnl"] || "0")
              instrument = row["instrument"] || "ES"
              contracts = parseInt(row["contracts"] || "1")
              direction = row["direction"] === "short" ? "short" : "long"
            }

            trades.push({
              instrument,
              direction,
              entry: 5000, // mock entry for simple imports if not present
              exit: 5000 + (pnl / 50),
              contracts,
              pnl,
              day: 1, // Will assign proper days if dates are present, simplified here
              session: "New York AM" as any,
              notes: "Imported via CSV"
            })
          }

          importTrades(trades, activeAccountId).then(() => {
            toast.success(`Imported ${trades.length} trades successfully`)
            setOpen(false)
          }).catch(err => {
            toast.error("Failed to import: " + err.message)
          })

        } catch (err) {
          toast.error("Error mapping CSV data")
        }
      }
    })
  }

  if (!activeAccountId) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="w-4 h-4 mr-2" /> Import CSV
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Trades</DialogTitle>
          <DialogDescription>Upload your trading history from Tradovate or NinjaTrader.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Select Platform</Label>
            <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tradovate">Tradovate</SelectItem>
                <SelectItem value="ninjatrader">NinjaTrader</SelectItem>
                <SelectItem value="generic">Generic CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Upload File</Label>
            <input type="file" accept=".csv" className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" onChange={handleFileUpload} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
