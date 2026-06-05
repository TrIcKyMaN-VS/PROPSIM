"use client"

import { useMemo, useState } from "react"
import { FIRMS } from "@/lib/firms"
import { FirmCard } from "./firm-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

const filters = ["All", "trailing", "eod", "static"] as const

export function FirmsDirectory() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")

  const firms = useMemo(() => {
    return FIRMS.filter((f) => {
      const matchesQuery = f.name.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === "All" || f.drawdownType === filter
      return matchesQuery && matchesFilter
    })
  }, [query, filter])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prop firms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {FIRMS.length} firms modeled rule-for-rule. Pick one to inspect or simulate.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search firms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "eod" ? "EOD" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {firms.map((firm) => (
          <FirmCard key={firm.id} firm={firm} />
        ))}
      </div>

      {firms.length === 0 && (
        <div className="mt-10 text-center text-sm text-muted-foreground">No firms match your search.</div>
      )}
    </div>
  )
}
