"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, GitCompareArrows, BarChart3, NotebookPen, Brain, Plus, Home, BookOpen, Beaker, PlayCircle, Network, CalendarDays, CheckSquare, CalendarClock, PieChart, Download, Link as LinkIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/daily", label: "Daily Routine", icon: CheckSquare },
  { href: "/app/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/app/journal", label: "Journal", icon: NotebookPen },
  { href: "/app/weekly-review", label: "Weekly Review", icon: CalendarClock },
  { href: "/app/monthly-review", label: "Monthly Review", icon: PieChart },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/coach", label: "AI Coach", icon: Brain },
  { href: "/app/simulator", label: "What-If Simulator", icon: Beaker },
  { href: "/app/replay", label: "Challenge Replay", icon: PlayCircle },
  { href: "/app/rules-builder", label: "Rule Builder", icon: Network },
  { href: "/app/import", label: "Import Center", icon: Download },
  { href: "/app/settings/connections", label: "Connections", icon: LinkIcon },
  { href: "/app/firms", label: "Firms", icon: Building2 },
  { href: "/app/compare", label: "Compare", icon: GitCompareArrows },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          P
        </div>
        <span className="font-semibold tracking-tight">PROPSIM</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div 
                className={cn(
                  "absolute inset-0 rounded-lg bg-secondary transition-opacity duration-300", 
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                )} 
              />
              <item.icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          )
        })}

        <Link
          href="/app/new"
          className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          New Challenge
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Home className="h-4 w-4" />
          Back to site
        </Link>
      </div>
    </aside>
  )
}
