"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Building2, GitCompareArrows, BarChart3, NotebookPen,
  Brain, Plus, Home, BookOpen, CheckSquare, CalendarDays, CalendarClock,
  PieChart, Download, ShieldCheck, Plug, Archive, Dices, Calculator,
  ChevronLeft, ChevronRight, Microscope, Target, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

const nav = [
  { href: "/app",                       label: "Dashboard",      icon: LayoutDashboard },
  { href: "/app/history",               label: "History",        icon: Archive },
  { href: "/app/calendar",              label: "Calendar",       icon: CalendarDays },
  { href: "/app/daily",                 label: "Daily Journal",  icon: CheckSquare },
  { href: "/app/playbooks",             label: "Playbooks",      icon: BookOpen },
  { href: "/app/rule-book",             label: "Rule Book",      icon: Target },
  { href: "/app/journal",               label: "Journal",        icon: NotebookPen },
  { href: "/app/notebook",              label: "Notebook",       icon: BookOpen },
  { href: "/app/pnl-calc",              label: "P&L Calculator", icon: Calculator },
  { href: "/app/weekly-review",         label: "Weekly Review",  icon: Target },
  { href: "/app/monthly-review",        label: "Monthly Recap",  icon: Activity },
  { href: "/app/analytics",             label: "Analytics",      icon: BarChart3 },
  { href: "/app/analysis",              label: "Deep Analysis",  icon: Microscope },
  { href: "/app/compliance",            label: "Compliance",     icon: ShieldCheck },
  { href: "/app/coach",                 label: "AI Coach",       icon: Brain },
  { href: "/app/monte-carlo",           label: "Monte Carlo",    icon: Dices },
  { href: "/app/import",                label: "Import Center",  icon: Download },
  { href: "/app/settings/integrations", label: "Integrations",   icon: Plug },
  { href: "/app/firms",                 label: "Firms",          icon: Building2 },
  { href: "/app/compare",               label: "Compare",        icon: GitCompareArrows },
]

const STORAGE_KEY = "propsim-sidebar-collapsed"

// ── Tooltip wrapper for collapsed state ──────────────────────────────────────
function SidebarTooltip({ label, collapsed, children }: {
  label: string
  collapsed: boolean
  children: React.ReactNode
}) {
  if (!collapsed) return <>{children}</>
  return (
    <div className="relative group/tip">
      {children}
      {/* Custom tooltip label */}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        {label}
      </div>
    </div>
  )
}

export function AppSidebar() {
  const pathname  = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === "true")
    setMounted(true)
  }, [])

  const toggle = () => {
    setCollapsed(prev => {
      localStorage.setItem(STORAGE_KEY, String(!prev))
      return !prev
    })
  }

  // SSR placeholder — same width to avoid layout shift
  if (!mounted) {
    return <aside className="hidden w-60 shrink-0 md:flex" />
  }

  return (
    <aside
      className={cn(
        "relative hidden md:flex shrink-0 flex-col border-r border-border bg-card/40",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      {/* ── Logo header ────────────────────────────────────────────────── */}
      <div className={cn(
        "flex h-14 items-center border-b border-border transition-all duration-300",
        collapsed ? "justify-center" : "gap-2 px-5"
      )}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          P
        </div>
        <span className={cn(
          "font-semibold tracking-tight whitespace-nowrap transition-all duration-300 overflow-hidden",
          collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-0"
        )}>
          PROPSIM
        </span>
      </div>

      {/* ── Toggle chevron button ───────────────────────────────────────── */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "absolute -right-3 top-[52px] z-50",
          "flex h-6 w-6 items-center justify-center rounded-full",
          "border border-border bg-background shadow-md",
          "text-muted-foreground",
          "hover:bg-secondary hover:text-foreground hover:shadow-lg",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft  className="h-3 w-3" />
        }
      </button>

      {/* ── Nav items ──────────────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 scrollbar-none">
        {nav.map((item) => {
          const active = item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href)

          return (
            <SidebarTooltip key={item.href} label={item.label} collapsed={collapsed}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center rounded-lg px-2.5 py-2 text-sm font-medium",
                  "transition-all duration-200",
                  collapsed ? "justify-center" : "gap-3",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {/* Active dot when icon-only */}
                {collapsed && active && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                <span className={cn(
                  "whitespace-nowrap overflow-hidden transition-all duration-300",
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>
                  {item.label}
                </span>
              </Link>
            </SidebarTooltip>
          )
        })}

        {/* New Challenge */}
        <SidebarTooltip label="New Challenge" collapsed={collapsed}>
          <Link
            href="/app/new"
            className={cn(
              "mt-1 flex items-center rounded-lg border border-dashed border-border",
              "px-2.5 py-2 text-sm font-medium text-muted-foreground",
              "transition-colors hover:border-primary/50 hover:text-foreground",
              collapsed ? "justify-center" : "gap-3"
            )}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className={cn(
              "whitespace-nowrap overflow-hidden transition-all duration-300",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}>
              New Challenge
            </span>
          </Link>
        </SidebarTooltip>
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border p-2">
        <SidebarTooltip label="Back to site" collapsed={collapsed}>
          <Link
            href="/"
            className={cn(
              "flex items-center rounded-lg px-2.5 py-2 text-sm",
              "text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground",
              collapsed ? "justify-center" : "gap-3"
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            <span className={cn(
              "whitespace-nowrap overflow-hidden transition-all duration-300",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}>
              Back to site
            </span>
          </Link>
        </SidebarTooltip>
      </div>
    </aside>
  )
}


