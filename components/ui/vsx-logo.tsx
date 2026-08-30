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
        <span className="vsx-cursive text-xl font-black italic tracking-wider bg-gradient-to-r from-white via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-sm select-none">
          VSX
        </span>
      )}
    </div>
  )
}
