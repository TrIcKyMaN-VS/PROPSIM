"use client"

import { useEffect, useState } from "react"
import { usePropStore } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"

function AppSkeleton() {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-4 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StoreInit({ children }: { children: React.ReactNode }) {
  const syncWithDb = usePropStore((s) => s.syncWithDb)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    syncWithDb().then(() => setHydrated(true))
  }, [syncWithDb])

  if (!hydrated) {
    return <AppSkeleton />
  }

  return <>{children}</>
}