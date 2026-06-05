import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function AdminUsersPage() {
  // Mock data for user management
  const users = [
    { id: "usr_1", name: "Vasanth", email: "vasanth@example.com", plan: "PRO", role: "ADMIN", status: "Active", joined: "2023-10-15", challenges: 4 },
    { id: "usr_2", name: "Alex T", email: "alex.t@example.com", plan: "FREE", role: "USER", status: "Active", joined: "2024-01-22", challenges: 1 },
    { id: "usr_3", name: "Sarah M", email: "sarah.m@example.com", plan: "LIFETIME", role: "USER", status: "Active", joined: "2023-11-05", challenges: 12 },
    { id: "usr_4", name: "John D", email: "john.d@example.com", plan: "FREE", role: "USER", status: "Suspended", joined: "2024-02-10", challenges: 0 },
    { id: "usr_5", name: "Emma R", email: "emma.r@example.com", plan: "PRO", role: "USER", status: "Active", joined: "2024-03-01", challenges: 3 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage platform users, roles, and subscriptions.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>A list of all users on the platform.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search users..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Challenges</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/users/${user.id}`} className="hover:underline flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      {user.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.plan === "PRO" ? "border-primary text-primary" : 
                      user.plan === "LIFETIME" ? "border-success text-success" : ""
                    }>
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <Badge variant="destructive">ADMIN</Badge>
                    ) : (
                      <Badge variant="secondary">USER</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "Active" ? "default" : "destructive"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.challenges}</TableCell>
                  <TableCell className="text-muted-foreground">{user.joined}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="ghost" size="sm">
                        View Profile
                      </Button>
                    </Link>
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
