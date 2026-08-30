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
          className="object-contain rounded-full shadow-[0_0_10px_rgba(59,130,246,0.35)]" 
        />
      </div>
      {showText && (
        <span className="vsx-cursive text-2xl font-bold tracking-normal select-none leading-none flex items-center">
          <span className="text-white drop-shadow-sm">VS</span>
          <span className="text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)] ml-0.5">X</span>
        </span>
      )}
    </div>
  )
}
