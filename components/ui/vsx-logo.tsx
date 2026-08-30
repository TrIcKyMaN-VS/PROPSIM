"use client"

import React from "react"

export function VsxBrandLogo({ 
  showText = true, 
  iconSize = 32, 
  className = "" 
}: { 
  showText?: boolean; 
  iconSize?: number; 
  className?: string 
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <img 
          src="/logo.png" 
          alt="VSX Logo" 
          style={{ width: iconSize, height: iconSize }}
          className="object-contain rounded-full shadow-[0_0_12px_rgba(59,130,246,0.4)]" 
        />
      </div>
      {showText && (
        <span className="vsx-cursive text-xl font-black italic tracking-widest select-none flex items-center">
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-200 bg-clip-text text-transparent drop-shadow-sm">
            VS
          </span>
          <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.75)] ml-0.5">
            X
          </span>
        </span>
      )}
    </div>
  )
}
