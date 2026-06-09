import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Settings2, Plus, Copy, Trash2, Edit3, ShieldAlert } from "lucide-react"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteChallengeTemplate } from "@/app/actions/admin-firm-actions"

const prisma = new PrismaClient()

export default async function AdminFirmsPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.id && (session.user as any).role === "ADMIN"

  const firms = [
    { id: 1, name: "Lucid Funding", challenges: 4, activeUsers: 1250, passRate: 14.2, status: "Active" },
    { id: 2, name: "Apex Trader Funding", challenges: 3, activeUsers: 840, passRate: 18.5, status: "Active" },
    { id: 3, name: "Topstep", challenges: 2, activeUsers: 620, passRate: 12.1, status: "Active" },
    { id: 4, name: "MyFundedFX", challenges: 1, activeUsers: 45, passRate: 9.8, status: "Beta" },
  ]

  let dbTemplates = await prisma.challengeTemplate.findMany({
    orderBy: { createdAt: "desc" }
  })

  // Seed default templates if empty and logged in
  if (dbTemplates.length === 0 && session?.user?.id) {
    const defaultTemplates = [
      { name: "Lucid 25K Plan", balance: 25000, profitTarget: 1500, dailyLoss: 500, maxDrawdown: 1500, drawdownType: "TRAILING", maxContracts: 2, minTradingDays: 5, description: "Lucid Funding 25K Evaluation" },
      { name: "Apex 50K Full", balance: 50000, profitTarget: 3000, dailyLoss: 0, maxDrawdown: 2500, drawdownType: "TRAILING", maxContracts: 10, minTradingDays: 7, description: "Apex Trader Funding 50K Full" },
      { name: "Topstep 150K Combine", balance: 150000, profitTarget: 9000, dailyLoss: 3000, maxDrawdown: 4500, drawdownType: "EOD", maxContracts: 15, minTradingDays: 5, description: "Topstep 150K Combine" },
      { name: "MyFundedFX 25K Standard", balance: 25000, profitTarget: 2000, dailyLoss: 1250, maxDrawdown: 2000, drawdownType: "STATIC", maxContracts: 4, minTradingDays: 5, description: "MyFundedFX 25K Standard" }
    ]

    await prisma.challengeTemplate.createMany({
      data: defaultTemplates.map(t => ({
        userId: session.user.id,
        ...t,
        isPublic: true
      }))
    })

    dbTemplates = await prisma.challengeTemplate.findMany({
      orderBy: { createdAt: "desc" }
    })
  }

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span><strong>Testing Mode Notice:</strong> You are viewing this page without an ADMIN role. DB writes will fail.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firms & Templates</h1>
          <p className="text-muted-foreground">Manage prop firms, challenge templates, and evaluation rules.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled><Building2 className="mr-2 h-4 w-4"/> New Firm</Button>
          <Button disabled><Plus className="mr-2 h-4 w-4"/> New Template</Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase">Most Popular Firm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Lucid Funding</div>
            <p className="text-xs text-muted-foreground">1,250 active challenges</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success uppercase">Highest Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Apex Trader</div>
            <p className="text-xs text-muted-foreground">18.5% completion rate</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive uppercase">Highest Fail Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MyFundedFX</div>
            <p className="text-xs text-muted-foreground">9.8% completion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase">Most Used Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Apex 50K Full</div>
            <p className="text-xs text-muted-foreground">42% of all challenges</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Firms Table */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Prop Firms</CardTitle>
            <CardDescription>Platform-wide configurations for supported firms.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firm</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firms.map((firm) => (
                  <TableRow key={firm.id}>
                    <TableCell>
                      <div className="font-medium">{firm.name}</div>
                      <Badge variant={firm.status === "Active" ? "outline" : "secondary"} className="mt-1 text-[10px]">
                        {firm.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{firm.activeUsers}</TableCell>
                    <TableCell>{firm.passRate}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" disabled><Settings2 className="h-4 w-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Challenge Templates</CardTitle>
            <CardDescription>Pre-configured evaluation rules used for new challenges.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dbTemplates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div className="font-medium">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">{tpl.description || "No description"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-success">Target: ${tpl.profitTarget} ({(tpl.profitTarget/tpl.balance * 100).toFixed(0)}%)</div>
                      <div className="text-xs text-destructive">Drawdown: ${tpl.maxDrawdown} ({tpl.drawdownType})</div>
                      {tpl.dailyLoss > 0 && <div className="text-[10px] text-muted-foreground">Daily Limit: ${tpl.dailyLoss}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled><Edit3 className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled><Copy className="h-3 w-3"/></Button>
                        
                        <form action={async () => {
                          "use server"
                          await deleteChallengeTemplate(tpl.id)
                        }}>
                          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3 w-3"/></Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
