import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Settings2, Plus, Copy, Trash2, Edit3 } from "lucide-react"

export default function AdminFirmsPage() {
  const firms = [
    { id: 1, name: "Lucid Funding", challenges: 4, activeUsers: 1250, passRate: 14.2, status: "Active" },
    { id: 2, name: "Apex Trader Funding", challenges: 3, activeUsers: 840, passRate: 18.5, status: "Active" },
    { id: 3, name: "Topstep", challenges: 2, activeUsers: 620, passRate: 12.1, status: "Active" },
    { id: 4, name: "MyFundedFX", challenges: 1, activeUsers: 45, passRate: 9.8, status: "Beta" },
  ]

  const templates = [
    { id: 1, firm: "Lucid Funding", name: "100K Evaluation", type: "1-Step", price: 499, target: "10%", drawdown: "4% Daily / 8% Max" },
    { id: 2, firm: "Apex Trader Funding", name: "50K Full", type: "1-Step", price: 167, target: "6%", drawdown: "$2500 Trailing" },
    { id: 3, firm: "Topstep", name: "150K Combine", type: "2-Step", price: 149, target: "6% / 6%", drawdown: "$4500 EOD" },
    { id: 4, firm: "MyFundedFX", name: "25K Standard", type: "2-Step", price: 139, target: "8% / 5%", drawdown: "5% Daily / 8% Max" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firms & Templates</h1>
          <p className="text-muted-foreground">Manage prop firms, challenge templates, and evaluation rules.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Building2 className="mr-2 h-4 w-4"/> New Firm</Button>
          <Button><Plus className="mr-2 h-4 w-4"/> New Template</Button>
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
                      <Button variant="ghost" size="icon"><Settings2 className="h-4 w-4"/></Button>
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
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div className="font-medium">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">{tpl.firm}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-success">Target: {tpl.target}</div>
                      <div className="text-xs text-destructive">DD: {tpl.drawdown}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit3 className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Copy className="h-3 w-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3 w-3"/></Button>
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
