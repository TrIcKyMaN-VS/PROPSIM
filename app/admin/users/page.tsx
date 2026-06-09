"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, UserX, CheckCircle2, Shield } from "lucide-react"
import Link from "next/link"
import { adminGetUsers, adminUpdateUser } from "@/app/actions/admin-user-actions"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

type User = Awaited<ReturnType<typeof adminGetUsers>>[0]

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border-success/30",
  SUSPENDED: "bg-warning/10 text-warning border-warning/30",
  DISABLED: "bg-muted text-muted-foreground",
  BANNED: "bg-destructive/10 text-destructive border-destructive/30",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminGetUsers(search || undefined, statusFilter)
      setUsers(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await adminUpdateUser(userId, { status })
      toast.success(`User ${status.toLowerCase()}.`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage platform users, roles, and account statuses.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b pb-2">
        {["ALL", "ACTIVE", "SUSPENDED", "BANNED", "DISABLED"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users ({users.length})</CardTitle>
              <CardDescription>All registered platform users.</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or email..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Verified</TableHead>
                <TableHead>Integrations</TableHead>
                <TableHead>Challenges</TableHead>
                <TableHead>AI Requests</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Active Devices</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/admin/users/${user.id}`} className="flex items-center gap-2 hover:underline font-medium">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{user.name || "—"}</div>
                        <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {user.role === "ADMIN"
                      ? <Badge variant="destructive" className="text-[10px]">ADMIN</Badge>
                      : <Badge variant="secondary" className="text-[10px]">USER</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${user.plan === "PRO" ? "border-primary text-primary" : ""}`}>{user.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_VARIANTS[user.status] || ""}`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.emailVerified 
                      ? <CheckCircle2 className="h-4 w-4 text-success" /> 
                      : <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const ntToken = (user as any).apiTokens?.find((t: any) => t.provider === "NinjaTrader")
                      if (!ntToken) {
                        return <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Not Configured</span>
                      }
                      const isConnected = ntToken.lastUsed && (Date.now() - new Date(ntToken.lastUsed).getTime() < 65000)
                      return isConnected ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] py-0 h-5">
                          NT8: Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] py-0 h-5">
                          NT8: Offline
                        </Badge>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{user._count.challenges}</span>
                  </TableCell>
                  <TableCell>{user.aiSettings?.totalRequests ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : "Never"}
                  </TableCell>
                  <TableCell>{user._count.deviceSessions}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      {user.status === "ACTIVE" ? (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                          onClick={() => handleStatusChange(user.id, "SUSPENDED")}>
                          <UserX className="h-3.5 w-3.5 mr-1" /> Suspend
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-success hover:text-success"
                          onClick={() => handleStatusChange(user.id, "ACTIVE")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Restore
                        </Button>
                      )}
                    </div>
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
