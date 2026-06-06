"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Shield, Mail, CalendarDays, Activity, Brain, Monitor,
  Trash2, AlertTriangle, RefreshCw, Key, Ban, CheckCircle2, UserX, XCircle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  adminGetUser, adminUpdateUser, adminDeleteUser,
  adminKillSession, adminKillAllUserSessions,
  adminResetUserPassword, adminGetUserImpact
} from "@/app/actions/admin-user-actions"

type UserDetail = Awaited<ReturnType<typeof adminGetUser>>

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border-success/30",
  SUSPENDED: "bg-warning/10 text-warning border-warning/30",
  DISABLED: "bg-muted text-muted-foreground",
  BANNED: "bg-destructive/10 text-destructive border-destructive/30",
}

export default function AdminUserDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<null | "soft" | "hard">(null)
  const [impact, setImpact] = useState<{ tradeCount: number; playbookCount: number; challengeCount: number } | null>(null)

  // Edit form state
  const [edit, setEdit] = useState({ name: "", email: "", role: "", plan: "", status: "", notes: "" })

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminGetUser(params.id)
      setUser(data)
      setEdit({ name: data.name || "", email: data.email || "", role: data.role, plan: data.plan, status: data.status, notes: data.notes || "" })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminUpdateUser(params.id, edit)
      toast.success("User updated successfully.")
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleKillSession = async (sessionId: string) => {
    try {
      await adminKillSession(sessionId)
      toast.success("Session invalidated.")
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleKillAllSessions = async () => {
    try {
      await adminKillAllUserSessions(params.id)
      toast.success("All sessions invalidated.")
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleResetPassword = async () => {
    try {
      const { tempPassword } = await adminResetUserPassword(params.id)
      toast.success(`Temp password generated. Check server console.`, { duration: 8000 })
      console.log(`[ADMIN] Temp password for ${user?.email}: ${tempPassword}`)
    } catch (err: any) { toast.error(err.message) }
  }

  const openDeleteDialog = async (type: "soft" | "hard") => {
    try {
      const data = await adminGetUserImpact(params.id)
      setImpact(data)
      setShowDeleteDialog(type)
    } catch { setShowDeleteDialog(type) }
  }

  const handleDelete = async () => {
    try {
      await adminDeleteUser(params.id, showDeleteDialog === "hard")
      toast.success(showDeleteDialog === "hard" ? "User permanently deleted." : "User banned and sessions invalidated.")
      window.location.href = "/admin/users"
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (!user) return <div className="text-muted-foreground">User not found.</div>

  return (
    <div className="space-y-6">
      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {showDeleteDialog === "hard" ? "Permanently Delete User" : "Soft Delete (Ban) User"}
              </CardTitle>
              <CardDescription>
                {showDeleteDialog === "hard"
                  ? "This will permanently delete this user and ALL their data. This cannot be undone."
                  : "This will ban the user and invalidate all their sessions. Their data will be preserved."}
              </CardDescription>
            </CardHeader>
            {impact && (
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  <p className="font-semibold mb-2">Data impact:</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-background border p-2">
                      <p className="text-xl font-bold">{impact.tradeCount}</p>
                      <p className="text-xs text-muted-foreground">Trades</p>
                    </div>
                    <div className="rounded-md bg-background border p-2">
                      <p className="text-xl font-bold">{impact.challengeCount}</p>
                      <p className="text-xs text-muted-foreground">Challenges</p>
                    </div>
                    <div className="rounded-md bg-background border p-2">
                      <p className="text-xl font-bold">{impact.playbookCount}</p>
                      <p className="text-xs text-muted-foreground">Playbooks</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
            <CardFooter className="gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>
                {showDeleteDialog === "hard" ? "Delete Forever" : "Ban User"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
            {user.name || user.email}
            {user.role === "ADMIN" && <Badge variant="destructive">ADMIN</Badge>}
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_STYLES[user.status]}`}>{user.status}</span>
            <Badge variant="outline" className={user.plan === "PRO" ? "border-primary text-primary" : ""}>{user.plan}</Badge>
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</span>
            {user.emailVerified && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Email Verified</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleResetPassword}><Key className="h-4 w-4 mr-1" /> Reset Password</Button>
          <Button variant="outline" size="sm" className="text-warning border-warning/30 hover:bg-warning/10" onClick={() => openDeleteDialog("soft")}>
            <Ban className="h-4 w-4 mr-1" /> Ban
          </Button>
          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog("hard")}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Trades", value: user.tradeCount },
          { label: "Challenges", value: user._count.challenges },
          { label: "Playbooks", value: user._count.playbooks },
          { label: "AI Requests", value: user.aiSettings?.totalRequests ?? 0 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit Profile</TabsTrigger>
          <TabsTrigger value="sessions">Device Sessions ({user.deviceSessions.length})</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>Update user details, role, plan, and status.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={edit.role} onValueChange={v => setEdit({ ...edit, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={edit.plan} onValueChange={v => setEdit({ ...edit, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">FREE</SelectItem>
                    <SelectItem value="PRO">PRO</SelectItem>
                    <SelectItem value="LIFETIME">LIFETIME</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={edit.status} onValueChange={v => setEdit({ ...edit, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                    <SelectItem value="DISABLED">DISABLED</SelectItem>
                    <SelectItem value="BANNED">BANNED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Admin Notes</Label>
                <Input placeholder="Internal notes about this user..." value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} />
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" /> Active Device Sessions</CardTitle>
                  <CardDescription>Currently authenticated devices for this user.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleKillAllSessions}>
                  <XCircle className="h-4 w-4 mr-1" /> Kill All Sessions
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.deviceSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No active sessions.</p>
              ) : user.deviceSessions.map(s => (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.isValid && new Date(s.expiresAt) > new Date() ? "bg-card" : "bg-muted/30 opacity-60"}`}>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.userAgent || "Unknown Device"}
                      {!s.isValid && <Badge variant="outline" className="text-[10px]">Invalidated</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">IP: {s.ip} · Created {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}</p>
                  </div>
                  {s.isValid && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleKillSession(s.id)}>
                      Kill
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Usage Tab */}
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> AI Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {!user.aiSettings ? (
                <p className="text-sm text-muted-foreground">This user has not used any AI features yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Requests", value: user.aiSettings.totalRequests.toLocaleString() },
                    { label: "Total Tokens", value: user.aiSettings.totalTokens.toLocaleString() },
                    { label: "Est. Cost", value: `$${user.aiSettings.estimatedCost.toFixed(3)}` },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border bg-muted/20 p-4 text-center">
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
