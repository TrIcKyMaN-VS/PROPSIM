"use client"

import React from "react"
import { Loader2 } from "lucide-react"

export function UltraLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] w-full p-6 space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
      </div>
      {label && (
        <p className="text-xs font-medium text-muted-foreground/70 tracking-wide">
          {label}
        </p>
      )}
    </div>
  )
}
