"use client"

import { useEffect, useState } from "react"
import { usePropStore } from "@/lib/store"

export function StoreInit({ children }: { children: React.ReactNode }) {
  const syncWithDb = usePropStore((s) => s.syncWithDb)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    syncWithDb().then(() => setHydrated(true))
  }, [syncWithDb])

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return <>{children}</>
}
