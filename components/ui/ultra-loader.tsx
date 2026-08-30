"use client"

import React from "react"
import { Activity, ShieldCheck, Cpu, Zap, LineChart } from "lucide-react"

export function UltraLoader({ label = "Syncing PropSim Engine..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] w-full p-6 relative overflow-hidden select-none animate-in fade-in duration-500">
      {/* Background Cyber Grid Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Floating Glassmorphic HUD Container */}
      <div className="relative flex flex-col items-center p-8 md:p-10 rounded-3xl border border-emerald-500/20 bg-card/60 backdrop-blur-2xl shadow-[0_0_80px_rgba(16,185,129,0.12)] max-w-md w-full text-center space-y-7">
        
        {/* Animated HUD Orb & Radar Wave */}
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Emerald Halo */}
          <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 blur-xl animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute w-24 h-24 rounded-full bg-cyan-500/15 blur-lg animate-pulse" />

          {/* Outer Spinning Dash Ring */}
          <div 
            className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/40 animate-spin" 
            style={{ animationDuration: "10s" }} 
          />

          {/* Counter-Spinning Tech Arc */}
          <div 
            className="absolute w-16 h-16 rounded-full border-2 border-transparent border-t-emerald-400 border-r-cyan-400 animate-spin" 
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }} 
          />

          {/* Center Glowing Icon */}
          <div className="absolute p-3.5 rounded-2xl bg-black/80 border border-emerald-500/40 shadow-inner shadow-emerald-500/20">
            <LineChart className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Live Status Badge & Loading Text */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>QUANT ENGINE ONLINE</span>
          </div>

          <h3 className="text-base font-semibold tracking-tight text-foreground/90">
            {label}
          </h3>

          <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-500/80 animate-pulse" />
            <span>Calculating Risk, PnL & Rules...</span>
          </p>
        </div>

        {/* Ultra-Modern Glowing Shimmer Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden relative border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" 
              style={{ width: "85%" }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60 px-1">
            <span>SYNC STATUS</span>
            <span className="text-emerald-400 font-semibold">AUTHENTICATED</span>
          </div>
        </div>

        {/* Minimal Bottom Indicators */}
        <div className="pt-3 flex items-center justify-center gap-6 border-t border-border/40 w-full text-[10px] text-muted-foreground/50 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500/60" /> PROPFIRM SAFE
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-500/60" /> REAL-TIME SYNC
          </span>
        </div>

      </div>
    </div>
  )
}
