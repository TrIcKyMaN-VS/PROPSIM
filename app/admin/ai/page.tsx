import { PrismaClient } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BrainCircuit, Zap, Users, DollarSign } from "lucide-react"

const prisma = new PrismaClient()

export default async function AdminAiPage() {
  const settings = await prisma.userAiSettings.findMany({
    include: { user: true },
    orderBy: { totalTokens: 'desc' }
  })

  const totalRequests = settings.reduce((acc, s) => acc + s.totalRequests, 0)
  const totalTokens = settings.reduce((acc, s) => acc + s.totalTokens, 0)
  const totalCost = settings.reduce((acc, s) => acc + s.estimatedCost, 0)
  const usersWithPersonalKeys = settings.filter(s => s.provider === "OPENAI").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Usage & Architecture</h1>
        <p className="text-muted-foreground">Monitor platform AI usage, token consumption, and estimated costs.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">across all providers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Input + Output</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Platform Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">PROPSIM managed keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BYOK Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithPersonalKeys}</div>
            <p className="text-xs text-muted-foreground">using personal API keys</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top AI Users</CardTitle>
          <CardDescription>Users sorted by total token consumption.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Active Provider</th>
                  <th className="px-4 py-3 font-medium text-right">Requests</th>
                  <th className="px-4 py-3 font-medium text-right">Tokens</th>
                  <th className="px-4 py-3 font-medium text-right">Est. Cost</th>
                  <th className="px-4 py-3 font-medium text-right">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {settings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No AI usage recorded yet.
                    </td>
                  </tr>
                ) : settings.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {s.user.name || s.user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                        {s.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{s.totalRequests.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{s.totalTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${s.estimatedCost.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {s.lastUsage ? new Date(s.lastUsage).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
