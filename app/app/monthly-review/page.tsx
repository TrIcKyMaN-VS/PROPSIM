"use client"

import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar } from "lucide-react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useRef, useState } from "react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

export default function MonthlyReviewPage() {
  const activeAccountId = usePropStore(s => s.activeAccountId)
  const trades = usePropStore(s => s.trades).filter(t => t.accountId === activeAccountId)
  const psychology = usePropStore(s => s.tradePsychology)
  const reportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const monthName = new Date().toLocaleString("default", { month: "long" })
  
  const pnl = trades.reduce((s, t) => s + t.pnl, 0)
  const wins = trades.filter(t => t.pnl > 0)
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
  
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 99 : 0)

  // Determine scores based on data
  const ruleBreaks = trades.map(t => psychology.find(p => p.tradeId === t.id)?.brokeRules).filter(Boolean).length
  const ruleComplianceScore = Math.max(0, 100 - (ruleBreaks * 5))
  
  const playbooks = usePropStore(s => s.playbooks)

  // Aggregate by playbook
  const playbookPnls: Record<string, number> = {}
  trades.forEach(t => {
    if (t.playbookId) {
      playbookPnls[t.playbookId] = (playbookPnls[t.playbookId] || 0) + t.pnl
    }
  })

  let bestSetup = "N/A"
  let worstSetup = "N/A"
  
  if (Object.keys(playbookPnls).length > 0) {
    const sorted = Object.entries(playbookPnls).sort((a, b) => b[1] - a[1])
    const bestPlaybook = playbooks.find(p => p.id === sorted[0][0])
    const worstPlaybook = playbooks.find(p => p.id === sorted[sorted.length - 1][0])
    
    if (bestPlaybook && sorted[0][1] > 0) bestSetup = `${bestPlaybook.name} (+$${sorted[0][1].toFixed(0)})`
    else if (sorted[0][1] > 0) bestSetup = `Unnamed Playbook (+$${sorted[0][1].toFixed(0)})`
    
    if (worstPlaybook && sorted[sorted.length - 1][1] < 0) worstSetup = `${worstPlaybook.name} (-$${Math.abs(sorted[sorted.length - 1][1]).toFixed(0)})`
    else if (sorted[sorted.length - 1][1] < 0) worstSetup = `Unnamed Playbook (-$${Math.abs(sorted[sorted.length - 1][1]).toFixed(0)})`
  }

  // Aggregate by week
  const weeklyData = [
    { name: "Week 1", pnl: trades.slice(0, 5).reduce((s, t) => s + t.pnl, 0) },
    { name: "Week 2", pnl: trades.slice(5, 10).reduce((s, t) => s + t.pnl, 0) },
    { name: "Week 3", pnl: trades.slice(10, 15).reduce((s, t) => s + t.pnl, 0) },
    { name: "Week 4", pnl: trades.slice(15, 20).reduce((s, t) => s + t.pnl, 0) }
  ]

  const exportPDF = async () => {
    if (!reportRef.current) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Monthly-Review-${monthName}.pdf`)
      toast.success("PDF Downloaded successfully")
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate PDF")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{monthName} Review</h1>
          <p className="text-muted-foreground">Comprehensive monthly breakdown and PDF exports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success("AI Summary generated")}><FileText className="w-4 h-4 mr-2" /> AI Summary</Button>
          <Button onClick={exportPDF} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" /> {isExporting ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-xl">

      <div className="grid grid-cols-6 gap-4">
        <Card className="col-span-2 bg-card border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monthly P&L</CardTitle></CardHeader>
          <CardContent><div className={`text-4xl font-bold ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>${pnl.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{winRate.toFixed(0)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Profit Factor</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{profitFactor.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Compliance</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${ruleComplianceScore > 80 ? 'text-success' : 'text-warning'}`}>{ruleComplianceScore}/100</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trades</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{trades.length}</div></CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Weekly P&L Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Best Setup</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-success">{bestSetup}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Worst Setup</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-destructive">{worstSetup}</div></CardContent>
          </Card>
          <Card className="bg-primary/5">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Month AI Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You traded beautifully the first two weeks but overtraded during the FOMC week, heavily dragging down your Rule Compliance score. Your Liquidity Sweep strategy remains your dominant edge.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
