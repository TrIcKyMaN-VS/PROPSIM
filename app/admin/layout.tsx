import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { ShieldAlert, Users, Building2, BarChart3, Activity, Settings, ArrowLeft, LayoutDashboard, HeartPulse } from "lucide-react"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/login")
  }

  const user = session.user as any
  if (user.role !== "ADMIN") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have permission to view the Admin Dashboard.</p>
        <Link href="/app" className="text-primary hover:underline">
          Return to App
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Admin Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex fixed inset-y-0 z-50">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <span>PROPSIM Admin</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-4 text-sm font-medium space-y-1">
            <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary">
              <LayoutDashboard className="h-4 w-4" /> Overview
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary">
              <Users className="h-4 w-4" /> Users
            </Link>
            <Link href="/admin/analytics" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
            <Link href="/admin/firms" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary">
              <Building2 className="h-4 w-4" /> Firms & Templates
            </Link>
            <Link href="/admin/health" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary">
              <HeartPulse className="h-4 w-4" /> System Health
            </Link>
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <Link href="/app" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" /> Exit Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="md:hidden flex items-center gap-2 text-destructive font-bold">
            <ShieldAlert className="h-5 w-5" /> Admin
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{user.name}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
