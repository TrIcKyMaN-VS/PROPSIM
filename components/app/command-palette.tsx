"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { usePropStore } from "@/lib/store"
import { Search, MonitorPlay, BarChart3, BookOpen, Download, LayoutDashboard, Calculator, CalendarDays } from "lucide-react"

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  
  const accounts = usePropStore((s) => s.accounts)
  const setActiveAccount = usePropStore((s) => s.setActive)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)}>
      <div 
        className="fixed left-[50%] top-[50%] z-50 w-full max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-xl border border-border bg-card shadow-2xl p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command 
          className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground"
          loop
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Type a command or search..." 
              autoFocus
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>
            
            <Command.Group heading="Navigation">
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => runCommand(() => router.push("/app"))}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => runCommand(() => router.push("/app/journal"))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Journal</span>
              </Command.Item>
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => runCommand(() => router.push("/app/calendar"))}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Calendar</span>
              </Command.Item>
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => runCommand(() => router.push("/app/analytics"))}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Analytics</span>
              </Command.Item>
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => runCommand(() => router.push("/app/playbooks"))}>
                <MonitorPlay className="mr-2 h-4 w-4" />
                <span>Playbooks</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Quick Actions">
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground" onSelect={() => runCommand(() => router.push("/app/new"))}>
                <Calculator className="mr-2 h-4 w-4" />
                <span>Create Challenge</span>
              </Command.Item>
              <Command.Item className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground" onSelect={() => runCommand(() => router.push("/app/import"))}>
                <Download className="mr-2 h-4 w-4" />
                <span>Import CSV / Excel</span>
              </Command.Item>
            </Command.Group>

            {accounts.length > 0 && (
              <Command.Group heading="Switch Account">
                {accounts.map(acc => (
                  <Command.Item 
                    key={acc.id} 
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                    onSelect={() => runCommand(() => setActiveAccount(acc.id))}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mr-2" />
                    <span>{acc.sizeLabel} Account ({acc.firmId})</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
