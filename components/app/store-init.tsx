"use client"

import { useEffect, useState } from "react"
import { usePropStore } from "@/lib/store"
import { UltraLoader } from "@/components/ui/ultra-loader"

let hasSyncedInSession = false

export function StoreInit({ children }: { children: React.ReactNode }) {
  const syncWithDb = usePropStore((s) => s.syncWithDb)
  const hasLocalData = usePropStore((s) => s.accounts.length > 0 || s.trades.length > 0)
  
  // Instant render if data exists in localStorage or synced in this session
  const [hydrated, setHydrated] = useState(() => hasSyncedInSession || hasLocalData)

  useEffect(() => {
    // Run sync in the background so navigation is never blocked
    syncWithDb().finally(() => {
      hasSyncedInSession = true
      setHydrated(true)
    })
  }, [syncWithDb])

  if (!hydrated) {
    return <UltraLoader label="Syncing your trading data..." />
  }

  return <>{children}</>
}