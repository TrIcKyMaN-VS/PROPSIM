"use client"

import { motion } from "framer-motion"
import { usePropStore } from "@/lib/store"
import React from "react"

export function AnimatedCard({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const animationMode = usePropStore(s => s.animationMode)
  
  if (animationMode === "Off") {
    return <div className={className}>{children}</div>
  }

  const variants = animationMode === "Reduced" 
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { delay } }
      }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { delay, type: "spring", bounce: 0, duration: 0.4 } }
      }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      whileHover={animationMode === "Full" ? { y: -2, transition: { duration: 0.1 } } : undefined}
      variants={variants}
      className={`${className} ${animationMode === "Full" ? "hover:shadow-lg hover:shadow-primary/5 transition-shadow" : ""}`}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedButton({ 
  children, 
  onClick, 
  className = "", 
  disabled = false,
  type = "button"
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  className?: string,
  disabled?: boolean,
  type?: "button" | "submit" | "reset"
}) {
  const animationMode = usePropStore(s => s.animationMode)

  if (animationMode === "Off" || animationMode === "Reduced") {
    return <button type={type} className={className} onClick={onClick} disabled={disabled}>{children}</button>
  }

  return (
    <motion.button
      type={type}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}
