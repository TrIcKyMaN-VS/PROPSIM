"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, GitCompareArrows, BarChart3, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/firms", label: "Firms", icon: Building2 },
  { href: "/app/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/app/analytics", label: "Stats", icon: BarChart3 },
  { href: "/app/coach", label: "Coach", icon: Brain },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden">
      {nav.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
