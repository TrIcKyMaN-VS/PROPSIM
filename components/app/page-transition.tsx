"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { usePropStore } from "@/lib/store"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const animationMode = usePropStore(s => s.animationMode)

  if (animationMode === "Off") return <>{children}</>

  const variants = animationMode === "Reduced" 
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 }
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 }
      }

  return (
    <motion.div
      key={pathname}
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  )
}
