"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { usePropStore } from "@/lib/store"
import { useEffect, useState } from "react"

function RouteProgressBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setVisible(true)
    setWidth(0)
    const t1 = setTimeout(() => setWidth(65), 60)
    const t2 = setTimeout(() => setWidth(90), 300)
    const t3 = setTimeout(() => setWidth(100), 600)
    const t4 = setTimeout(() => setVisible(false), 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-gradient-to-r from-primary via-primary/80 to-primary/50 transition-all ease-out"
      style={{
        width: `${width}%`,
        transitionDuration: width === 0 ? "0ms" : "300ms",
        boxShadow: "0 0 8px 0 hsl(var(--primary) / 0.6)",
      }}
    />
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const animationMode = usePropStore((s) => s.animationMode)

  if (animationMode === "Off") return <>{children}</>

  const variants =
    animationMode === "Reduced"
      ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
      : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }

  return (
    <>
      {animationMode === "Full" && <RouteProgressBar />}
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        variants={variants}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </>
  )
}