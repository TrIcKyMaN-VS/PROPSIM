"use client"

import { usePropStore } from "@/lib/store"
import { CSVImport } from "@/components/app/csv-import"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

export default function JournalPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades)
  const accountTrades = trades.filter(t => t.accountId === activeAccountId)
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-muted-foreground">Log and review your trading history.</p>
        </div>
        <div className="flex gap-2">
          <CSVImport />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>Your recently closed positions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Contracts</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountTrades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No trades found. Import a CSV to get started.</TableCell>
                </TableRow>
              )}
              {accountTrades.slice().reverse().map(trade => (
                <TableRow 
                  key={trade.id} 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => router.push(`/app/journal/${trade.id}`)}
                >
                  <TableCell className="font-medium">{trade.instrument}</TableCell>
                  <TableCell>
                    <Badge variant={trade.direction === "long" ? "default" : "destructive"}>
                      {trade.direction.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{trade.contracts}</TableCell>
                  <TableCell className={`text-right font-medium ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                    ${trade.pnl.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {trade.tags ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(trade.tags as string);
                          if (Array.isArray(parsed)) {
                            return parsed.map((t: string) => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>);
                          }
                          return <Badge variant="secondary" className="mr-1">{trade.tags}</Badge>;
                        } catch {
                          return <Badge variant="secondary" className="mr-1">{trade.tags}</Badge>;
                        }
                      })()
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
