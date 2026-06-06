"use client"

import { usePropStore } from "@/lib/store"
import { ImportDialog } from "@/components/app/import-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { useState } from "react"

export default function JournalPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades)
  const accountTrades = trades.filter(t => t.accountId === activeAccountId)
  const router = useRouter()
  
  const [search, setSearch] = useState("")

  const filteredTrades = accountTrades.filter(t => {
    if (!search) return true
    const s = search.toLowerCase()
    
    // Parse tags safely for searching
    let tagsStr = ""
    if (t.tags) {
      if (Array.isArray(t.tags)) tagsStr = t.tags.join(" ")
      else if (typeof t.tags === "string") {
        try {
          const parsed = JSON.parse(t.tags)
          if (Array.isArray(parsed)) tagsStr = parsed.join(" ")
          else tagsStr = t.tags
        } catch {
          tagsStr = t.tags
        }
      }
    }
    
    return t.instrument.toLowerCase().includes(s) ||
           t.direction.toLowerCase().includes(s) ||
           (t.session || "").toLowerCase().includes(s) ||
           tagsStr.toLowerCase().includes(s)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-muted-foreground">Log and review your trading history.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/app/journal/new')}>
            <Plus className="w-4 h-4 mr-2" /> Manual Entry
          </Button>
          <ImportDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>Your recently closed positions</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search instrument, tag..." 
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Contracts</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search ? "No trades match your search." : "No trades found. Import a CSV to get started."}
                  </TableCell>
                </TableRow>
              )}
              {filteredTrades.slice().reverse().map(trade => {
                const dateObj = new Date(trade.timestamp);
                const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                return (
                <TableRow 
                  key={trade.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors" 
                  onClick={() => router.push(`/app/journal/${trade.id}`)}
                >
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{dateStr}</TableCell>
                  <TableCell className="font-medium">{trade.instrument}</TableCell>
                  <TableCell>
                    <Badge variant={trade.direction === "long" ? "default" : "destructive"}>
                      {trade.direction.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{trade.contracts}</TableCell>
                  <TableCell className={`text-right font-medium ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {trade.tags ? (
                      (() => {
                        let parsed: string[] = []
                        if (Array.isArray(trade.tags)) parsed = trade.tags
                        else if (typeof trade.tags === "string") {
                          try {
                            const p = JSON.parse(trade.tags)
                            if (Array.isArray(p)) parsed = p
                            else parsed = [trade.tags]
                          } catch {
                            parsed = [trade.tags]
                          }
                        }
                        
                        return parsed.map((t: string) => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>);
                      })()
                    ) : null}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
