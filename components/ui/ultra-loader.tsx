"use client"

import React from "react"
import { Sparkles, Activity } from "lucide-react"

export function UltraLoader({ label = "Loading PropSim..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8 space-y-8 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing aura */}
        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 blur-xl animate-pulse" />
        
        {/* Outer spinning gradient ring */}
        <div className="w-20 h-20 rounded-full border-2 border-transparent border-t-emerald-500 border-r-cyan-400 animate-spin" style={{ animationDuration: "1.2s" }} />

        {/* Inner reverse spinning ring */}
        <div className="absolute w-14 h-14 rounded-full border-2 border-transparent border-b-blue-500 border-l-emerald-400 animate-spin" style={{ animationDuration: "0.8s", animationDirection: "reverse" }} />

        {/* Center glowing logo icon */}
        <div className="absolute p-3 rounded-full bg-background/90 border border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-500/10">
          <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Loading text with glowing badge */}
      <div className="flex flex-col items-center space-y-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wider uppercase backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          <span>PROPSIM ENGINE</span>
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
          {label}
        </p>

        {/* Ultra-modern progress bar */}
        <div className="w-48 h-1 bg-muted/40 rounded-full overflow-hidden relative border border-border/30">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 rounded-full animate-pulse" 
            style={{ width: "70%" }} 
          />
        </div>
      </div>
    </div>
  )
}
