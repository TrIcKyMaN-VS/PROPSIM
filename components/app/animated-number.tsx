"use client"

import { useEffect, useRef } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"
import { usePropStore } from "@/lib/store"

interface AnimatedNumberProps {
  value: number
  format?: (val: number) => string
  className?: string
  enableFlash?: boolean
}

export function AnimatedNumber({ value, format = (v) => v.toString(), className = "", enableFlash = false }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(value)
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "-10px" })
  const animationMode = usePropStore(s => s.animationMode)
  
  const prevValue = useRef(value)

  useEffect(() => {
    if (animationMode === "Off" || animationMode === "Reduced") {
      if (ref.current) {
        ref.current.textContent = format(value)
      }
      return
    }

    if (isInView) {
      motionValue.set(value)
      
      if (enableFlash && prevValue.current !== value && ref.current) {
        const diff = value - prevValue.current
        const flashClass = diff > 0 ? "text-success bg-success/20" : "text-destructive bg-destructive/20"
        ref.current.classList.add(...flashClass.split(" "), "transition-colors", "duration-150")
        
        setTimeout(() => {
          if (ref.current) {
            ref.current.classList.remove(...flashClass.split(" "))
          }
        }, 500)
      }
      
      prevValue.current = value
    }
  }, [motionValue, isInView, value, animationMode, enableFlash, format])

  useEffect(() => {
    if (animationMode === "Off" || animationMode === "Reduced") return
    
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = format(latest)
      }
    })
  }, [springValue, format, animationMode])

  return (
    <span className={className} ref={ref}>
      {format(value)}
    </span>
  )
}
