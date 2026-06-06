"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Activity, Monitor, RefreshCw, UserX, BrainCircuit, ShieldAlert } from "lucide-react"
import { adminGetDashboardStats, adminGetAuditLog } from "@/app/actions/admin-user-actions"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"

type Stats = Awaited<ReturnType<typeof adminGetDashboardStats>>
type AuditLog = Awaited<ReturnType<typeof adminGetAuditLog>>

const ACTION_BADGE: Record<string, { label: string; style: string }> = {
  LOGIN: { label: "Login", style: "bg-primary/10 text-primary border-primary/20" },
  REGISTER: { label: "Register", style: "bg-success/10 text-success border-success/20" },
  PASSWORD_RESET: { label: "Reset PW", style: "bg-warning/10 text-warning border-warning/20" },
  PASSWORD_RESET_REQUEST: { label: "Reset Request", style: "bg-muted text-muted-foreground" },
  ADMIN_USER_EDIT: { label: "Edit User", style: "bg-primary/10 text-primary border-primary/20" },
  ADMIN_USER_SOFT_DELETE: { label: "User Banned", style: "bg-destructive/10 text-destructive border-destructive/20" },
  ADMIN_USER_DELETE_PERMANENT: { label: "User Deleted", style: "bg-destructive text-destructive-foreground" },
  ADMIN_KILL_SESSION: { label: "Kill Session", style: "bg-muted text-muted-foreground" },
  ADMIN_KILL_ALL_SESSIONS: { label: "Kill All Sessions", style: "bg-destructive/10 text-destructive border-destructive/20" },
  ADMIN_RESET_PASSWORD: { label: "Admin Reset PW", style: "bg-warning/10 text-warning border-warning/20" },
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [log, setLog] = useState<AuditLog>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([adminGetDashboardStats(), adminGetAuditLog(30)])
      setStats(s)
      setLog(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Live platform health and real-time metrics.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, sub: `${stats?.newUsersThisWeek ?? 0} new this week` },
          { label: "Active Users", value: stats?.activeUsers ?? "—", icon: Activity, sub: "STATUS = ACTIVE" },
          { label: "Suspended / Banned", value: stats?.suspendedUsers ?? "—", icon: UserX, sub: "Restricted accounts" },
          { label: "Active Sessions", value: stats?.totalSessions ?? "—", icon: Monitor, sub: "Valid device tokens" },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary" /> AI Platform Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Requests</span>
              <span className="font-bold">{(stats?.totalAiRequests ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Tokens</span>
              <span className="font-bold">{(stats?.totalAiTokens ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. API Cost</span>
              <span className="font-bold text-warning">${(stats?.totalAiCost ?? 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" /> SSO Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {["Google", "GitHub", "Microsoft"].map(p => (
              <div key={p} className="flex items-center justify-between">
                <span>{p}</span>
                <span className="text-xs text-muted-foreground">Configured in Vercel Env</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              <span className="font-bold text-sm">Connected (PostgreSQL)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Supabase · Prisma v5</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Log</CardTitle>
          <CardDescription>Last 30 security and admin events on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium text-left">Time</th>
                  <th className="px-4 py-3 font-medium text-left">Event</th>
                  <th className="px-4 py-3 font-medium text-left">Actor</th>
                  <th className="px-4 py-3 font-medium text-left">Target</th>
                  <th className="px-4 py-3 font-medium text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {log.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit events yet. Try logging in, registering, or performing an admin action.
                    </td>
                  </tr>
                ) : log.map(entry => {
                  const badge = ACTION_BADGE[entry.action] || { label: entry.action, style: "bg-muted text-muted-foreground" }
                  return (
                    <tr key={entry.id} className="border-t">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{entry.user?.name || entry.user?.email || "System"}</td>
                      <td className="px-4 py-3 text-xs">{entry.target?.name || entry.target?.email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.ip || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
